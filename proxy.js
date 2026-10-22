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

// Загружает всех пользователей вместе с паролями и ключами из переменных
function loadAll() {
  let users;
  try { users = JSON.parse(env("USERS", "")); }
  catch (_) { return { err: "Ошибка в настройке USERS: сбиты кавычки или скобки.", status: 500 }; }
  if (!users || typeof users !== "object") return { err: "Настройка USERS пустая.", status: 500 };
  const all = {};
  for (const [id, cfg] of Object.entries(users)) {
    const u = { ...cfg };
    const ID = id.toUpperCase();
    // Пароль и ключ хранятся отдельными переменными: PASSWORD_MAMA, KEY_MAMA
    if (env("PASSWORD_" + ID)) u.password = env("PASSWORD_" + ID);
    if (env("KEY_" + ID)) u.key = env("KEY_" + ID).trim();
    all[id.toLowerCase()] = u;
  }
  return { all };
}

// Возвращает пользователя или { err, status } с понятной причиной.
// Без имени (вход только по паролю) ищем человека по паролю; пароли у всех должны быть разными.
function auth(body, ip) {
  const loaded = loadAll();
  if (loaded.err) return loaded;
  const all = loaded.all;
  const pass = norm(body.password);
  const limitKey = body.user ? "u:" + String(body.user).toLowerCase() : "ip:" + ip;
  if (tooManyFails(limitKey)) return { err: "Слишком много неверных попыток. Подождите 10 минут.", status: 429 };

  if (body.user) {
    const id = String(body.user).toLowerCase();
    const u = all[id];
    if (!u) return { err: "Неверный пароль", status: 401 };
    if (!u.password || !safeEqual(norm(u.password), pass)) { addFail(limitKey); return { err: "Неверный пароль", status: 401 }; }
    return { id, ...u };
  }

  if (pass.length < 1) return { err: "Введите пароль", status: 401 };
  const found = Object.entries(all).filter(([, u]) => u.password && safeEqual(norm(u.password), pass));
  if (found.length > 1) return { err: "Этот пароль задан у нескольких людей — пароли должны быть разными.", status: 500 };
  if (!found.length) { addFail(limitKey); return { err: "Неверный пароль", status: 401 }; }
  const [id, u] = found[0];
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

const TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-3.8-flash-lite-tts"];

// Ищем в ответе Gemini звук в base64 (поле data рядом с mime_type/audio)
function findAudio(o, depth = 0) {
  if (!o || typeof o !== "object" || depth > 8) return null;
  if (typeof o.data === "string" && o.data.length > 200) {
    const mime = o.mime_type || o.mimeType || o.type || "";
    return { data: o.data, mime };
  }
  for (const v of Object.values(o)) { const f = findAudio(v, depth + 1); if (f) return f; }
  return null;
}
// Сырой PCM 16 бит моно -> WAV
function pcmToWav(pcm, rate) {
  const buf = new Uint8Array(44 + pcm.length);
  const dv = new DataView(buf.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
  w(0, "RIFF"); dv.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, "data"); dv.setUint32(40, pcm.length, true); buf.set(pcm, 44);
  return buf;
}

export async function handler(req, info) {
  const ip = info?.remoteAddr?.hostname || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
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

  const user = auth(body, ip);
  if (user.err) return json({ error: user.err }, user.status, h);

  const models = user.models && user.models.length ? user.models : ["claude-sonnet-5-5"];

  if (url.pathname === "/login") {
    return json({ ok: true, user: user.id, models, webSearch: !!user.webSearch }, 200, h);
  }

  const key = user.key || env("ANTHROPIC_KEY");
  if (!key) return json({ error: "Ключ не настроен" }, 500, h);

  // Название и эмодзи для разговора — коротко и дёшево, через Haiku
  if (url.pathname === "/title") {
    const text = String(body.text || "").slice(0, 3000);
    const r = await callAnthropic(key, {
      model: env("TITLE_MODEL", "claude-haiku-5-5"),
      max_tokens: 60,
      system: "Придумай для разговора одно подходящее по смыслу эмодзи и короткое название из 2–5 слов на русском. Ответь строго одной строкой: эмодзи, пробел, название. Без кавычек и точки.",
      messages: [{ role: "user", content: text }],
    });
    if (!r.ok) return json({ error: "Не удалось придумать название" }, 502, h);
    const d = await r.json();
    const line = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim().split("\n")[0];
    const m = line.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.*)$/u);
    return json({ emoji: m ? m[1] : "💬", title: (m ? m[2] : line).replace(/^["«]|["».]$/g, "").slice(0, 60) }, 200, h);
  }

  // Озвучка ответа голосом Gemini. Ключ — переменная GEMINI_KEY
  if (url.pathname === "/tts") {
    const gkey = env("GEMINI_KEY");
    if (!gkey) return json({ error: "Голос Gemini не настроен" }, 501, h);
    const text = String(body.text || "").slice(0, 5000);
    if (!text.trim()) return json({ error: "Пустой текст" }, 400, h);
    const voice = /^[A-Za-z]{3,20}$/.test(body.voice || "") ? body.voice : env("GEMINI_VOICE", "Sulafat");
    // пробуем модели по очереди: выбранную, затем запасные — и пишем причину ошибок в журнал
    const first = TTS_MODELS.includes(body.model) ? body.model : env("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts");
    const order = [first, ...TTS_MODELS.filter((m) => m !== first)];
    let r = null, lastErr = "";
    for (const model of order) {
      r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "x-goog-api-key": gkey, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          input: [{ type: "user_input", content: [{ type: "text", text,
            annotations: [{ type: "speech_metadata", style: env("GEMINI_STYLE", "спокойно, тепло и неторопливо, как добрый собеседник") }] }] }],
          response_format: { type: "audio" },
          generation_config: { speech_config: [{ voice }] },
        }),
      });
      if (r.ok) break;
      lastErr = `${model}: ${r.status} ${(await r.text()).slice(0, 300)}`;
      console.log("TTS error", lastErr);
      if (r.status === 429) break; // лимит ключа — другие модели не помогут
    }
    if (!r.ok) return json({ error: r.status === 429 ? "Закончился лимит озвучки Gemini" : "Gemini не смог озвучить", details: lastErr }, 502, h);
    const audio = findAudio(await r.json());
    if (!audio) return json({ error: "Gemini вернул ответ без звука" }, 502, h);
    let bytes = Uint8Array.from(atob(audio.data), (c) => c.charCodeAt(0));
    if (!/wav/i.test(audio.mime || "") && !(bytes[0] === 0x52 && bytes[1] === 0x49)) bytes = pcmToWav(bytes, 24000);
    return new Response(bytes, { status: 200, headers: { ...h, "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  }

  if (url.pathname !== "/chat") return json({ error: "Не найдено" }, 404, h);

  const model = models.includes(body.model) ? body.model : models[0];
  if (!Array.isArray(body.messages) || !body.messages.length) {
    return json({ error: "Пустой разговор" }, 400, h);
  }

  const think = !!body.think;
  const payload = {
    model,
    max_tokens: Math.min(Math.max(Number(user.maxTokens) || 8000, think ? 16000 : 0), 32000),
    stream: true,
    messages: body.messages,
  };
  // «Подумать»: модель сначала рассуждает, сама решая, сколько думать
  if (think) {
    payload.thinking = { type: "adaptive" };
    payload.output_config = { effort: "high" };
  }
  if (body.system) payload.system = String(body.system).slice(0, 20000);
  if (user.webSearch && body.web !== false) {
    payload.tools = [{
      type: env("WEB_SEARCH_TOOL", "web_search_20250305"),
      name: "web_search",
      max_uses: 5,
    }];
  }

  let res = await callAnthropic(key, payload);
  // Если что-то из дополнительных настроек не принято — повторяем без него
  for (let i = 0; i < 2 && res.status === 400; i++) {
    const text = await res.text();
    if (payload.thinking && /thinking|effort|output_config/i.test(text)) { delete payload.thinking; delete payload.output_config; }
    else if (payload.tools && /tool/i.test(text)) delete payload.tools;
    else return json({ error: "Ошибка запроса", details: text.slice(0, 500) }, 400, h);
    res = await callAnthropic(key, payload);
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = "Claude сейчас недоступен, попробуйте позже";
    if (res.status === 401) msg = "Ключ API недействителен";
    if (res.status === 429) msg = "Слишком много запросов или закончился лимит — подождите немного";
    if (res.status === 529) msg = "Claude перегружен, попробуйте через минуту";
    if (res.status === 403) msg = "Anthropic отказал в доступе (ключ или регион)";
    if (/credit|billing|spend/i.test(text)) msg = "Закончился лимит на этот месяц";
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
