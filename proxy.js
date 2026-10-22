// Прослойка «Помощник» — хранит ключи Anthropic и пароли родственников.
// Ключи и пароли задаются ТОЛЬКО в секретных переменных окружения сервиса,
// в коде их нет.
//
// Переменные окружения:
//   USERS           — JSON с пользователями, пример в README
//   ANTHROPIC_KEY   — общий ключ (если у пользователя нет своего "key")
//   ALLOWED_ORIGIN  — адрес приложения, например https://ai.duetplay.app
//   WEB_SEARCH_TOOL — версия инструмента поиска (по умолчанию web_search_20250305)

const API = "https://api.anthropic.com/v1/messages";

function env(name, def = "") {
  try {
    if (typeof Deno !== "undefined") return Deno.env.get(name) ?? def;
  } catch (_) { /* нет доступа к env */ }
  if (typeof process !== "undefined" && process.env) return process.env[name] ?? def;
  return def;
}

function loadUsers() {
  try { return JSON.parse(env("USERS", "{}")); } catch (_) { return {}; }
}

function cors(origin) {
  const allowed = env("ALLOWED_ORIGIN", "*");
  const list = allowed.split(",").map((s) => s.trim());
  const ok = list.includes("*") || list.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? (list.includes("*") ? "*" : origin) : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

function safeEqual(a, b) {
  a = String(a || ""); b = String(b || "");
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// Простая защита от подбора пароля: не больше 8 неудачных попыток за 10 минут
const fails = new Map();
function tooManyFails(id) {
  const now = Date.now();
  const list = (fails.get(id) || []).filter((t) => now - t < 600000);
  fails.set(id, list);
  return list.length >= 8;
}
function addFail(id) { (fails.get(id) || fails.set(id, []).get(id)).push(Date.now()); }

// Пароль сравниваем без пробелов по краям и в единой форме букв (й/ё и т.п.)
const norm = (s) => String(s ?? "").trim().normalize("NFC");

// Возвращает пользователя или { err, status } с понятной причиной
function auth(body) {
  let users;
  try { users = JSON.parse(env("USERS", "")); }
  catch (_) { return { err: "Ошибка в настройке USERS: сбиты кавычки или скобки. Сообщите Юре.", status: 500 }; }
  if (!users || typeof users !== "object") return { err: "Настройка USERS пустая. Сообщите Юре.", status: 500 };
  const id = String(body.user || "").toLowerCase();
  if (!users[id]) return { err: `В настройке USERS нет пользователя «${id}». Сообщите Юре.`, status: 401 };
  // Пароль и ключ можно хранить отдельными переменными: PASSWORD_MAMA, KEY_MAMA
  const u = { ...users[id] };
  const ID = id.toUpperCase();
  if (env("PASSWORD_" + ID)) u.password = env("PASSWORD_" + ID);
  if (env("KEY_" + ID)) u.key = env("KEY_" + ID).trim();
  if (!u.password) return { err: `Для «${id}» не задан пароль (PASSWORD_${ID}). Сообщите Юре.`, status: 500 };
  if (tooManyFails(id)) return { err: "Слишком много неверных попыток. Подождите 10 минут.", status: 429 };
  if (!safeEqual(norm(u.password), norm(body.password))) { addFail(id); return { err: "Неверный пароль", status: 401 }; }
  return { id, ...u };
}

async function callAnthropic(key, payload) {
  return fetch(API, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function handler(req) {
  const origin = req.headers.get("Origin") || "";
  const h = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/") {
    return json({ ok: true, service: "pomoshnik-proxy" }, 200, h);
  }
  if (req.method !== "POST") return json({ error: "Метод не поддерживается" }, 405, h);

  let body;
  try { body = await req.json(); } catch (_) { return json({ error: "Неверный запрос" }, 400, h); }

  const user = auth(body);
  if (user.err) return json({ error: user.err }, user.status, h);

  const models = user.models && user.models.length ? user.models : ["claude-sonnet-5-5"];

  if (url.pathname === "/login") {
    return json({ ok: true, user: user.id, models, webSearch: !!user.webSearch }, 200, h);
  }

  if (url.pathname !== "/chat") return json({ error: "Не найдено" }, 404, h);

  const key = user.key || env("ANTHROPIC_KEY");
  if (!key) return json({ error: "Ключ не настроен" }, 500, h);

  const model = models.includes(body.model) ? body.model : models[0];
  if (!Array.isArray(body.messages) || !body.messages.length) {
    return json({ error: "Пустой разговор" }, 400, h);
  }

  const payload = {
    model,
    max_tokens: Math.min(Number(user.maxTokens) || 8000, 32000),
    stream: true,
    messages: body.messages,
  };
  if (body.system) payload.system = String(body.system).slice(0, 20000);
  if (user.webSearch && body.web !== false) {
    payload.tools = [{
      type: env("WEB_SEARCH_TOOL", "web_search_20250305"),
      name: "web_search",
      max_uses: 5,
    }];
  }

  let res = await callAnthropic(key, payload);
  // Если поиск не принят (например, сменилась версия инструмента) — повторяем без него
  if (res.status === 400 && payload.tools) {
    const text = await res.text();
    if (/tool/i.test(text)) {
      delete payload.tools;
      res = await callAnthropic(key, payload);
    } else {
      return json({ error: "Ошибка запроса", details: text.slice(0, 500) }, 400, h);
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = "Claude сейчас недоступен, попробуйте позже";
    if (res.status === 401) msg = "Ключ API недействителен — сообщите Юре";
    if (res.status === 429) msg = "Слишком много запросов или закончился лимит — подождите немного";
    if (res.status === 529) msg = "Claude перегружен, попробуйте через минуту";
    if (res.status === 403) msg = "Anthropic отказал в доступе (ключ или регион) — сообщите Юре";
    if (/credit|billing|spend/i.test(text)) msg = "Закончился лимит трат — сообщите Юре";
    // Ошибки Anthropic отдаём как 502, чтобы приложение не путало их с неверным паролем
    return json({ error: msg, details: text.slice(0, 500) }, res.status === 401 || res.status === 403 ? 502 : res.status, h);
  }

  return new Response(res.body, {
    status: 200,
    headers: { ...h, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve(handler);
}

export default { fetch: handler };
