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
  // основной адрес приложения и старый, с которого идёт переезд, разрешены всегда
  const list = allowed.split(",").map((s) => s.trim()).concat(["https://pomoshnik.ai", "https://www.pomoshnik.ai", "https://ai.duetplay.app"]);
  const ok = list.includes("*") || list.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? (list.includes("*") ? "*" : origin) : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// Генерация речи через Gemini; модели пробуем по очереди — у каждой свой лимит в минуту
async function geminiTTS(text, voiceIn, modelIn) {
  const gkey = env("GEMINI_KEY");
  if (!gkey) return { error: "Голос Gemini не настроен", status: 501 };
  const voice = /^[A-Za-z]{3,20}$/.test(voiceIn || "") ? voiceIn : env("GEMINI_VOICE", "Sulafat");
  const first = TTS_MODELS.includes(modelIn) ? modelIn : env("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts");
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
  }
  if (!r.ok) {
    const wait = Number((lastErr.match(/retry in (\d+)s/) || [])[1]) || 0;
    return r.status === 429
      ? { error: "Слишком много запросов озвучки, подождите минуту", retryAfter: wait, details: lastErr, status: 429 }
      : { error: "Gemini не смог озвучить", details: lastErr, status: 502 };
  }
  const audio = findAudio(await r.json());
  if (!audio) return { error: "Gemini вернул ответ без звука", status: 502 };
  let bytes = Uint8Array.from(atob(audio.data), (c) => c.charCodeAt(0));
  if (!/wav/i.test(audio.mime || "") && !(bytes[0] === 0x52 && bytes[1] === 0x49)) bytes = pcmToWav(bytes, 24000);
  return { bytes };
}

// Хранилище образцов голосов (Deno KV). Значение в KV — до 64 КБ, поэтому режем на части
const SAMPLE_TEXT = "Здравствуйте! Так звучит мой голос. Я буду читать вам ответы.";
const SAMPLE_VER = "v1";
let KV = null, KV_TRIED = false;
async function kvOpen() {
  if (KV || KV_TRIED) return KV;
  KV_TRIED = true;
  try { if (typeof Deno !== "undefined" && Deno.openKv) KV = await Deno.openKv(); } catch (e) { console.log("KV недоступен", String(e)); }
  return KV;
}
async function sampleGet(voice) {
  const kv = await kvOpen();
  if (!kv) return null;
  const n = (await kv.get(["sample", SAMPLE_VER, voice, "n"])).value;
  if (!n) return null;
  const parts = [];
  for (let i = 0; i < n; i++) { const p = (await kv.get(["sample", SAMPLE_VER, voice, i])).value; if (!p) return null; parts.push(p); }
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function samplePut(voice, bytes) {
  const kv = await kvOpen();
  if (!kv) return;
  const size = 60000, n = Math.ceil(bytes.length / size);
  try {
    for (let i = 0; i < n; i++) await kv.set(["sample", SAMPLE_VER, voice, i], bytes.slice(i * size, (i + 1) * size));
    await kv.set(["sample", SAMPLE_VER, voice, "n"], n);
  } catch (e) { console.log("KV запись не удалась", String(e)); }
}

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
  // готовый образец голоса отдаём без пароля — генерировать новые может только вошедший пользователь
  if (req.method === "GET" && url.pathname === "/sample") {
    const voice = url.searchParams.get("voice") || "";
    const bytes = /^[A-Za-z]{3,20}$/.test(voice) ? await sampleGet(voice) : null;
    if (!bytes) return json({ error: "Образца пока нет" }, 404, h);
    return new Response(bytes, { status: 200, headers: { ...h, "Content-Type": "audio/wav", "Cache-Control": "public, max-age=31536000" } });
  }
  if (url.pathname === "/samples") {
    const have = [];
    const kv = await kvOpen();
    if (kv) { for await (const e of kv.list({ prefix: ["sample", SAMPLE_VER] })) if (e.key[3] === "n") have.push(e.key[2]); }
    return json({ have }, 200, h);
  }
  // Переезд на новый адрес: забрать упакованные данные (один раз, по секретному коду)
  if (req.method === "GET" && url.pathname === "/migrate") {
    const code = url.searchParams.get("code") || "";
    const kv = await kvOpen();
    if (!kv || !/^[a-f0-9]{32}$/.test(code)) return json({ error: "Нет данных" }, 404, h);
    const n = (await kv.get(["mig", code, "n"])).value;
    if (!n) return json({ error: "Данные не найдены или уже перенесены" }, 404, h);
    let data = "";
    for (let i = 0; i < n; i++) { data += (await kv.get(["mig", code, i])).value || ""; await kv.delete(["mig", code, i]); }
    await kv.delete(["mig", code, "n"]);
    return new Response(data, { status: 200, headers: { ...h, "Content-Type": "application/json; charset=utf-8" } });
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
  // Переезд: положить данные приложения на час, вернуть одноразовый код
  if (url.pathname === "/migrate") {
    const data = String(body.data || "");
    if (!data || data.length > 30_000_000) return json({ error: "Слишком много данных" }, 413, h);
    const kv = await kvOpen();
    if (!kv) return json({ error: "Хранилище недоступно" }, 500, h);
    const code = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const parts = Math.ceil(data.length / 30000), ttl = { expireIn: 3600_000 };
    for (let i = 0; i < parts; i++) await kv.set(["mig", code, i], data.slice(i * 30000, (i + 1) * 30000), ttl);
    await kv.set(["mig", code, "n"], parts, ttl);
    return json({ ok: true, code }, 200, h);
  }

  const key = user.key || env("ANTHROPIC_KEY");
  if (!key) return json({ error: "Ключ не настроен" }, 500, h);

  // Название и эмодзи для разговора — коротко и дёшево, через Haiku
  if (url.pathname === "/title") {
    const text = String(body.text || "").slice(0, 3000);
    const r = await callAnthropic(key, {
      model: env("TITLE_MODEL", "claude-haiku-5-5"),
      max_tokens: 60,
      system: body.lang === "en"
        ? "Come up with one fitting emoji and a short title of 2–5 words in English for this chat. Reply with exactly one line: emoji, space, title. No quotes, no period."
        : "Придумай для разговора одно подходящее по смыслу эмодзи и короткое название из 2–5 слов на русском. Ответь строго одной строкой: эмодзи, пробел, название. Без кавычек и точки.",
      messages: [{ role: "user", content: text }],
    });
    if (!r.ok) return json({ error: "Не удалось придумать название" }, 502, h);
    const d = await r.json();
    const line = (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim().split("\n")[0];
    const m = line.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.*)$/u);
    return json({ emoji: m ? m[1] : "💬", title: (m ? m[2] : line).replace(/^["«]|["».]$/g, "").slice(0, 60) }, 200, h);
  }

  // Расшифровка звука из видео (Gemini слышит, Claude — нет)
  if (url.pathname === "/transcribe") {
    const gkey = env("GEMINI_KEY");
    if (!gkey) return json({ error: "Нет ключа Gemini" }, 500, h);
    const data = String(body.audio || "");
    if (!data || data.length > 19_000_000) return json({ error: "Звук слишком длинный" }, 400, h);
    const models = [env("GEMINI_STT_MODEL", ""), "gemini-3.8-flash", "gemini-3-flash", "gemini-2.5-flash"].filter(Boolean);
    let last = "";
    for (const m of models) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${gkey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [
          { inline_data: { mime_type: body.mime || "audio/wav", data } },
          { text: "Дословно расшифруй речь из этой аудиодорожки видео на языке оригинала. Если речи нет — коротко опиши, что слышно (музыка, шум, тишина). Только текст, без пояснений." },
        ] }], generationConfig: { temperature: 0 } }),
      });
      if (r.status === 404) { last = m + ": нет модели"; continue; }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { last = d.error?.message || ("Gemini " + r.status); continue; }
      const text = (d.candidates?.[0]?.content?.parts || []).map((x) => x.text || "").join("").trim();
      return json({ text, model: m }, 200, h);
    }
    return json({ error: "Не удалось расшифровать звук: " + last }, 502, h);
  }

  // Озвучка ответа голосом Gemini. Ключ — переменная GEMINI_KEY
  if (url.pathname === "/tts") {
    const text = String(body.text || "").slice(0, 5000);
    if (!text.trim()) return json({ error: "Пустой текст" }, 400, h);
    const res = await geminiTTS(text, body.voice, body.model);
    if (res.error) return json(res, res.status, h);
    return new Response(res.bytes, { status: 200, headers: { ...h, "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  }

  // Образец голоса: генерируется один раз и хранится на сервере для всех
  if (url.pathname === "/sample") {
    const voice = /^[A-Za-z]{3,20}$/.test(body.voice || "") ? body.voice : null;
    if (!voice) return json({ error: "Не указан голос" }, 400, h);
    let bytes = await sampleGet(voice);
    if (!bytes) {
      const res = await geminiTTS(SAMPLE_TEXT, voice);
      if (res.error) return json(res, res.status, h);
      bytes = res.bytes;
      await samplePut(voice, bytes);
    }
    return new Response(bytes, { status: 200, headers: { ...h, "Content-Type": "audio/wav", "Cache-Control": "public, max-age=31536000" } });
  }


  if (url.pathname !== "/chat") return json({ error: "Не найдено" }, 404, h);

  // живой режим: быстрые модели доступны всем (они дешевле основной)
  const LIVE_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"];
  const isLive = body.purpose === "live";
  const model = isLive && LIVE_MODELS.includes(body.model) ? body.model : models.includes(body.model) ? body.model : models[0];
  if (!Array.isArray(body.messages) || !body.messages.length) {
    return json({ error: "Пустой разговор" }, 400, h);
  }

  const think = !!body.think && !isLive;
  const payload = {
    model,
    // творческое видео: длинный код ролика — даём больший запас длины ответа
    max_tokens: isLive ? 600 : body.purpose === "video" ? 32000 : Math.min(Math.max(Number(user.maxTokens) || 8000, think ? 16000 : 0), 32000),
    stream: true,
    messages: body.messages,
  };
  // «Подумать»: модель сначала рассуждает, сама решая, сколько думать
  if (think) {
    payload.thinking = { type: "adaptive" };
    payload.output_config = { effort: "high" };
  }
  if (body.system) payload.system = String(body.system).slice(0, 20000);
  if (user.webSearch && body.web !== false && !isLive) {
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
