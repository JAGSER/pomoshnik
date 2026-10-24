// сборка: обновлены переменные (Vie)
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
    "Access-Control-Allow-Headers": "Content-Type, X-User, X-Pass, X-Meta",
    "Access-Control-Expose-Headers": "X-TTS-Model",
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
    // можно пользоваться ключом другого человека: "keyFrom":"yuri"
    if (!u.key && cfg.keyFrom && env("KEY_" + String(cfg.keyFrom).toUpperCase())) u.key = env("KEY_" + String(cfg.keyFrom).toUpperCase()).trim();
    all[id.toLowerCase()] = u;
  }
  return { all };
}

// Возвращает пользователя или { err, status } с понятной причиной.
// Без имени (вход только по паролю) ищем человека по паролю; пароли у всех должны быть разными.
async function auth(body, ip) {
  const rawId = String(body.user || "").toLowerCase();
  if (/^[gu]_[a-z0-9]{8,}$/.test(rawId)) return acctAuth(rawId, body.password, ip);
  return envAuth(body, ip);
}
function envAuth(body, ip) {
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

/* ===== Аккаунты без регистрации, тарифы и лимиты (хранятся в KV) ===== */
const DAY = () => new Date().toISOString().slice(0, 10), MONTH = () => new Date().toISOString().slice(0, 7);
const rnd = (n) => { const a = "abcdefghijkmnpqrstuvwxyz23456789"; return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => a[b % a.length]).join(""); };
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha(s) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))); }
async function pwHash(pw, salt) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(norm(pw)), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 60000 }, k, 256));
}
// тарифы: что можно и сколько
const PLANS = {
  trial: { title: "Пробный", models: ["claude-sonnet-5-5", "claude-opus-5-5"], chatDay: 50, web: true, ttsDialog: true, creativeTotal: 3, videoSec: 180, maxTokens: 8000 },
  free: { title: "Бесплатный", models: ["claude-haiku-5-5"], chatDay: 10, web: false, ttsDialog: false, ttsDayChars: 4000, creativeMonth: 1, videoSec: 40, maxTokens: 2500 },
  family: { title: "Семья", models: ["claude-sonnet-5-5"], chatDay: 300, web: true, ttsDialog: true, creativeMonth: 30, videoSec: 180, maxTokens: 8000 },
  familyplus: { title: "Семья+", models: ["claude-sonnet-5-5", "claude-opus-5-5"], chatDay: 500, web: true, ttsDialog: true, creativeMonth: 100, videoSec: 180, maxTokens: 16000, rename: true },
};
const TRIAL_DAYS = 7;
// счётчики в KV хранятся как Deno.KvU64 — достаём число в любом виде
const u64 = (v) => (v == null ? 0 : Number(typeof v === "object" && "value" in v ? v.value : v));
async function kvNum(kv, key) { return u64((await kv.get(key)).value); }
async function kvInc(kv, key, n = 1, ttlDays = 40) { await kv.atomic().sum(key, BigInt(n)).commit(); if (ttlDays) { const v = (await kv.get(key)).value; await kv.set(key, v, { expireIn: ttlDays * 86400_000 }); } }
async function acctGet(id) { const kv = await kvOpen(); return kv ? (await kv.get(["acct", id])).value : null; }
async function acctPut(a) { const kv = await kvOpen(); await kv.set(["acct", a.id], a); }
async function acctAuth(id, password, ip) {
  const limitKey = "a:" + id;
  if (tooManyFails(limitKey)) return { err: "Слишком много неверных попыток. Подождите 10 минут.", status: 429 };
  const a = await acctGet(id);
  if (!a) return { err: "Аккаунт не найден. Войдите заново.", status: 401, gone: true };
  const ok = a.pw ? safeEqual(await pwHash(password, a.pw.salt), a.pw.hash) : safeEqual(await sha(String(password || "")), a.secret || "");
  if (!ok) { addFail(limitKey); return { err: "Неверный пароль", status: 401 }; }
  return { id, acct: a, key: env("GUEST_KEY") || env("ANTHROPIC_KEY") || env("KEY_YURI").trim() };
}
// действующий тариф: пробный кончается через 7 дней или после 3 творческих роликов, оплаченный — в дату окончания
async function planOf(user) {
  const a = user.acct; if (!a) return null;
  const kv = await kvOpen();
  let p = a.plan || "free";
  if (p === "trial" && (Date.now() > a.trialEnds || (await kvNum(kv, ["cvt", a.id])) >= PLANS.trial.creativeTotal)) p = "free";
  if ((p === "family" || p === "familyplus") && a.planUntil && Date.now() > a.planUntil) p = "free";
  if (p !== a.plan) { a.plan = p; await acctPut(a); }
  return p;
}
async function usageOf(user, plan) {
  const kv = await kvOpen(), P = PLANS[plan], id = user.id;
  const creativeUsed = P.creativeTotal ? await kvNum(kv, ["cvt", id]) : await kvNum(kv, ["cvm", id, MONTH()]);
  const creativeLimit = P.creativeTotal || P.creativeMonth || 0;
  return { chatToday: await kvNum(kv, ["q", id, DAY()]), chatDay: P.chatDay, creativeUsed, creativeLimit, creativeLeft: Math.max(0, creativeLimit - creativeUsed) };
}
const ADMINS = () => env("ADMIN_USERS", "yuri").split(",").map((x) => x.trim().toLowerCase());

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
  let r = null, lastErr = "", usedModel = "";
  const t0 = Date.now();
  for (let i = 0; i < order.length; i++) {
    const model = order[i];
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
    if (r.ok) { usedModel = model; break; }
    lastErr = `${model}: ${r.status} ${(await r.text()).slice(0, 300)}`;
    console.log("TTS error", lastErr);
    // основной голос упёрся в лимит в минуту: лучше подождать несколько секунд, чем переключаться на голос похуже
    const wait = Number((lastErr.match(/retry in ([\d.]+)s/) || [])[1]) || 0;
    const daily = /per.?day|PerDay|daily/i.test(lastErr);
    if (r.status === 429 && i === 0 && !daily && Date.now() - t0 < 30000) {
      await new Promise((res) => setTimeout(res, Math.min(Math.max(wait, 3), 20) * 1000));
      i--; if (Date.now() - t0 > 28000) i++;
      continue;
    }
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
  return { bytes, model: usedModel, backup: usedModel !== first };
}

// Хранилище образцов голосов (Deno KV). Значение в KV — до 64 КБ, поэтому режем на части
const SAMPLE_TEXT = "Здравствуйте! Так звучит мой голос. Я буду читать вам ответы.";
const SAMPLE_TEXT_EN = "Hello! This is how my voice sounds. I will read the answers to you.";
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

// ===== Ролики, которыми делятся: хранятся в KV частями, живут полгода =====
const VID_TTL = { expireIn: 180 * 24 * 3600_000 };
const VID_MEM = new Map();
function vidId() { const a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return [...crypto.getRandomValues(new Uint8Array(8))].map((b) => a[b % a.length]).join(""); }
async function blobPut(kv, prefix, bytes) {
  const size = 60000, n = Math.ceil(bytes.length / size);
  for (let i = 0; i < n; i += 10) {
    const op = kv.atomic();
    for (let j = i; j < Math.min(n, i + 10); j++) op.set([...prefix, j], bytes.slice(j * size, (j + 1) * size), VID_TTL);
    await op.commit();
  }
  return n;
}
async function blobGet(kv, prefix, n) {
  const keys = []; for (let i = 0; i < n; i++) keys.push([...prefix, i]);
  const parts = [];
  for (let i = 0; i < keys.length; i += 10) { const got = await kv.getMany(keys.slice(i, i + 10)); for (const g of got) { if (!g.value) return null; parts.push(g.value); } }
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function vidCounts(kv, id) {
  const [v, hh] = await kv.getMany([["vidc", id, "views"], ["vidc", id, "hearts"]]);
  return { views: u64(v.value), hearts: u64(hh.value) };
}
function rangeResponse(req, bytes, type, h) {
  const base = { ...h, "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes", "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges" };
  const rg = (req.headers.get("Range") || "").match(/bytes=(\d*)-(\d*)/);
  if (rg) {
    const a = rg[1] === "" ? Math.max(0, bytes.length - Number(rg[2])) : Number(rg[1]);
    const b = Math.min(rg[1] !== "" && rg[2] !== "" ? Number(rg[2]) : bytes.length - 1, bytes.length - 1);
    if (a > b) return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${bytes.length}` } });
    return new Response(bytes.slice(a, b + 1), { status: 206, headers: { ...base, "Content-Range": `bytes ${a}-${b}/${bytes.length}`, "Content-Length": String(b - a + 1) } });
  }
  return new Response(bytes, { status: 200, headers: { ...base, "Content-Length": String(bytes.length) } });
}
const REACT_HITS = new Map();
function reactLimited(ip) {
  const now = Date.now(), arr = (REACT_HITS.get(ip) || []).filter((t) => now - t < 3600_000);
  arr.push(now); REACT_HITS.set(ip, arr);
  return arr.length > 40;
}
async function headerAuth(req, ip) {
  const dec = (v) => { try { return decodeURIComponent(v || ""); } catch (_) { return ""; } };
  return auth({ user: dec(req.headers.get("X-User")), password: dec(req.headers.get("X-Pass")) }, ip);
}

// Музыка для видео (сгенерирована в Runway) — хранится в KV частями по 60 КБ
async function musicGet(id) {
  const kv = await kvOpen(); if (!kv) return null;
  const n = (await kv.get(["music", id, "n"])).value; if (!n) return null;
  const keys = []; for (let i = 0; i < n; i++) keys.push(["music", id, i]);
  const parts = [];
  for (let i = 0; i < keys.length; i += 10) { const got = await kv.getMany(keys.slice(i, i + 10)); for (const g of got) { if (!g.value) return null; parts.push(g.value); } }
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function musicPut(id, bytes) {
  const kv = await kvOpen(); if (!kv) throw new Error("хранилище недоступно");
  const size = 60000, n = Math.ceil(bytes.length / size);
  for (let i = 0; i < n; i++) await kv.set(["music", id, i], bytes.slice(i * size, (i + 1) * size));
  await kv.set(["music", id, "n"], n);
}
const MUSIC_MEM = new Map();

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
    const en = url.searchParams.get("lang") === "en";
    const bytes = /^[A-Za-z]{3,20}$/.test(voice) ? await sampleGet(en ? voice + "@en" : voice) : null;
    if (!bytes) return json({ error: "Образца пока нет" }, 404, h);
    return new Response(bytes, { status: 200, headers: { ...h, "Content-Type": "audio/wav", "Cache-Control": "public, max-age=31536000" } });
  }
  // музыка для видео — без пароля, с поддержкой Range (iPhone просит звук кусками)
  const mm = url.pathname.match(/^\/music\/([a-z0-9]{2,24})\.mp3$/);
  if (req.method === "GET" && mm) {
    let bytes = MUSIC_MEM.get(mm[1]);
    if (!bytes) { bytes = await musicGet(mm[1]); if (bytes && MUSIC_MEM.size < 30) MUSIC_MEM.set(mm[1], bytes); }
    if (!bytes) return json({ error: "Трека нет" }, 404, h);
    const base = { ...h, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes", "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges" };
    const rg = (req.headers.get("Range") || "").match(/bytes=(\d*)-(\d*)/);
    if (rg) {
      let a = rg[1] === "" ? Math.max(0, bytes.length - Number(rg[2])) : Number(rg[1]);
      let b = rg[1] !== "" && rg[2] !== "" ? Number(rg[2]) : bytes.length - 1;
      b = Math.min(b, bytes.length - 1);
      if (a > b) return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${bytes.length}` } });
      return new Response(bytes.slice(a, b + 1), { status: 206, headers: { ...base, "Content-Range": `bytes ${a}-${b}/${bytes.length}`, "Content-Length": String(b - a + 1) } });
    }
    return new Response(bytes, { status: 200, headers: { ...base, "Content-Length": String(bytes.length) } });
  }
  // ===== ролики =====
  const vm = url.pathname.match(/^\/video\/([A-Za-z0-9]{8})\.(mp4|webm|jpg)$/);
  if (req.method === "GET" && vm) {
    const kv = await kvOpen(); if (!kv) return json({ error: "Хранилище недоступно" }, 500, h);
    const meta = (await kv.get(["vid", vm[1], "meta"])).value;
    if (!meta) return json({ error: "Ролик не найден или срок хранения истёк" }, 404, h);
    if (vm[2] === "jpg") {
      if (!meta.posterN) return json({ error: "Нет обложки" }, 404, h);
      const img = await blobGet(kv, ["vid", vm[1], "p"], meta.posterN);
      return img ? new Response(img, { status: 200, headers: { ...h, "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } }) : json({ error: "Нет обложки" }, 404, h);
    }
    let bytes = VID_MEM.get(vm[1]);
    if (!bytes) { bytes = await blobGet(kv, ["vid", vm[1], "d"], meta.n); if (bytes && VID_MEM.size < 12) VID_MEM.set(vm[1], bytes); }
    if (!bytes) return json({ error: "Ролик повреждён" }, 404, h);
    return rangeResponse(req, bytes, meta.type || "video/mp4", h);
  }
  const vmeta = url.pathname.match(/^\/video-meta\/([A-Za-z0-9]{8})$/);
  if (req.method === "GET" && vmeta) {
    const kv = await kvOpen(); const meta = kv && (await kv.get(["vid", vmeta[1], "meta"])).value;
    if (!meta) return json({ error: "Ролик не найден" }, 404, h);
    return json({ id: meta.id, title: meta.title, caption: meta.caption, name: meta.name, lang: meta.lang, created: meta.created, type: meta.type, poster: !!meta.posterN, ...(await vidCounts(kv, meta.id)) }, 200, h);
  }
  // просмотр и реакции — без пароля (их оставляют получатели)
  if (req.method === "POST" && (url.pathname === "/video-view" || url.pathname === "/video-react")) {
    let b; try { b = await req.json(); } catch (_) { return json({ error: "Неверный запрос" }, 400, h); }
    const id = String(b.id || ""); if (!/^[A-Za-z0-9]{8}$/.test(id)) return json({ error: "Неверный ролик" }, 400, h);
    const kv = await kvOpen(); if (!kv) return json({ error: "Хранилище недоступно" }, 500, h);
    if (!(await kv.get(["vid", id, "meta"])).value) return json({ error: "Ролик не найден" }, 404, h);
    const ipKey = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + id)))].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
    if (url.pathname === "/video-view") {
      const seenKey = ["vidv", id, ipKey];
      if (!(await kv.get(seenKey)).value) await kv.atomic().set(seenKey, 1, { expireIn: 6 * 3600_000 }).sum(["vidc", id, "views"], 1n).commit();
      return json({ ok: true, ...(await vidCounts(kv, id)) }, 200, h);
    }
    if (reactLimited(ip)) return json({ error: "Слишком много, попробуйте позже" }, 429, h);
    const kind = b.kind === "reply" ? "reply" : "heart";
    const text = String(b.text || "").trim().slice(0, 500), name = String(b.name || "").trim().slice(0, 40);
    if (kind === "reply" && !text) return json({ error: "Пустой ответ" }, 400, h);
    const at = Date.now(), op = kv.atomic().set(["vidr", id, at + "-" + ipKey], { kind, text, name, at }, VID_TTL);
    if (kind === "heart") op.sum(["vidc", id, "hearts"], 1n);
    await op.commit();
    return json({ ok: true, ...(await vidCounts(kv, id)) }, 200, h);
  }
  // загрузка ролика: тело — сам файл, пароль в заголовках
  if (req.method === "POST" && (url.pathname === "/video-upload" || url.pathname === "/video-poster")) {
    const user = await headerAuth(req, ip);
    if (user.err) return json({ error: user.err }, user.status, h);
    const kv = await kvOpen(); if (!kv) return json({ error: "Хранилище недоступно" }, 500, h);
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (url.pathname === "/video-poster") {
      const id = url.searchParams.get("id") || "";
      const meta = /^[A-Za-z0-9]{8}$/.test(id) && (await kv.get(["vid", id, "meta"])).value;
      if (!meta || meta.user !== user.id) return json({ error: "Ролик не найден" }, 404, h);
      if (bytes.length > 600_000) return json({ error: "Обложка слишком большая" }, 413, h);
      meta.posterN = await blobPut(kv, ["vid", id, "p"], bytes);
      await kv.set(["vid", id, "meta"], meta, VID_TTL);
      return json({ ok: true }, 200, h);
    }
    if (bytes.length < 10_000 || bytes.length > 40_000_000) return json({ error: "Размер ролика не подходит" }, 413, h);
    let m = {}; try { m = JSON.parse(decodeURIComponent(req.headers.get("X-Meta") || "{}")); } catch (_) {}
    const id = vidId(), created = Date.now();
    const n = await blobPut(kv, ["vid", id, "d"], bytes);
    const meta = { id, user: user.id, name: String(m.name || "").slice(0, 40), title: String(m.title || "").slice(0, 80), caption: String(m.caption || "").slice(0, 600),
      lang: m.lang === "en" ? "en" : "ru", type: /webm/.test(req.headers.get("Content-Type") || "") ? "video/webm" : "video/mp4", size: bytes.length, n, created };
    await kv.atomic().set(["vid", id, "meta"], meta, VID_TTL).set(["vidu", user.id, created, id], 1, VID_TTL).commit();
    return json({ ok: true, id }, 200, h);
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

  // новый гость: заходит без регистрации, получает свой аккаунт с пробным периодом
  if (url.pathname === "/guest") {
    const kv = await kvOpen(); if (!kv) return json({ error: "Хранилище недоступно" }, 500, h);
    const hour = new Date().toISOString().slice(0, 13), ipKey = ["gip", await sha(ip), hour];
    if ((await kvNum(kv, ipKey)) >= Number(env("GUESTS_PER_IP_HOUR", "6"))) return json({ error: "Слишком много новых входов с этого адреса. Попробуйте через час." }, 429, h);
    await kvInc(kv, ipKey, 1, 1);
    const id = "g_" + rnd(12), secret = rnd(28), now = Date.now();
    await acctPut({ id, kind: "guest", plan: "trial", created: now, trialEnds: now + TRIAL_DAYS * 86400_000, secret: await sha(secret), lang: body.lang === "en" ? "en" : "ru", ref: String(body.ref || "").slice(0, 20) });
    return json({ ok: true, user: id, password: secret }, 200, h);
  }
  // вход по имени и паролю (зарегистрированные); без имени — как раньше, только по паролю
  if (url.pathname === "/login" && body.login) {
    const kv = await kvOpen(); if (!kv) return json({ error: "Хранилище недоступно" }, 500, h);
    const login = norm(body.login).toLowerCase();
    if (tooManyFails("l:" + login)) return json({ error: "Слишком много неверных попыток. Подождите 10 минут." }, 429, h);
    const id = (await kv.get(["login", login])).value;
    const a = id && (await acctGet(id));
    if (!a || !a.pw || !safeEqual(await pwHash(body.password, a.pw.salt), a.pw.hash)) { addFail("l:" + login); return json({ error: "Неверное имя или пароль" }, 401, h); }
    const plan = await planOf({ id, acct: a });
    return json({ ok: true, user: id, models: PLANS[plan].models, webSearch: PLANS[plan].web, plan }, 200, h);
  }

  const user = await auth(body, ip);
  if (user.err) return json({ error: user.err, gone: !!user.gone }, user.status, h);
  const plan = user.acct ? await planOf(user) : null, P = plan ? PLANS[plan] : null;
  if (P) { user.models = P.models; user.webSearch = P.web; user.maxTokens = P.maxTokens; }

  const models = user.models && user.models.length ? user.models : ["claude-sonnet-5-5"];

  if (url.pathname === "/login") {
    return json({ ok: true, user: user.id, models, webSearch: !!user.webSearch, plan: plan || "owner" }, 200, h);
  }
  // тариф, лимиты и расход — для экрана «Тарифы»
  if (url.pathname === "/me") {
    if (!plan) return json({ ok: true, plan: "owner", registered: true, admin: ADMINS().includes(user.id) }, 200, h);
    const a = user.acct;
    return json({ ok: true, plan, title: P.title, registered: !!a.pw, login: a.login || "", name: a.name || "", trialEnds: a.trialEnds, planUntil: a.planUntil || 0,
      ttsDialog: P.ttsDialog, videoSec: P.videoSec, rename: !!P.rename, usage: await usageOf(user, plan) }, 200, h);
  }
  // сохранить аккаунт: имя для входа и свой пароль; всё, что гость сделал, остаётся
  if (url.pathname === "/register") {
    if (!user.acct) return json({ error: "Этот аккаунт уже сохранён" }, 400, h);
    const kv = await kvOpen(), login = norm(body.login).toLowerCase(), pw = norm(body.newPassword);
    if (!/^[\p{L}\p{N}._@+-]{3,40}$/u.test(login)) return json({ error: "Имя для входа: от 3 до 40 букв или цифр, без пробелов" }, 400, h);
    if (pw.length < 6) return json({ error: "Пароль должен быть не короче 6 символов" }, 400, h);
    const taken = (await kv.get(["login", login])).value;
    if (taken && taken !== user.id) return json({ error: "Это имя уже занято, придумайте другое" }, 409, h);
    const a = user.acct, salt = rnd(16);
    if (a.login && a.login !== login) await kv.delete(["login", a.login]);
    Object.assign(a, { kind: "user", login, name: String(body.name || "").trim().slice(0, 40), pw: { salt, hash: await pwHash(pw, salt) } });
    delete a.secret;
    await kv.atomic().set(["acct", a.id], a).set(["login", login], a.id).commit();
    return json({ ok: true, user: a.id, login }, 200, h);
  }
  // заявка на тариф (оплата подключается позже)
  if (url.pathname === "/lead") {
    const kv = await kvOpen(); if (!kv) return json({ error: "Хранилище недоступно" }, 500, h);
    const lead = { at: Date.now(), user: user.id, plan: String(body.plan || "").slice(0, 20), contact: String(body.contact || "").trim().slice(0, 120), note: String(body.note || "").trim().slice(0, 600), company: String(body.company || "").trim().slice(0, 120) };
    if (!lead.contact) return json({ error: "Оставьте телефон, Telegram или почту" }, 400, h);
    await kv.set(["lead", lead.at + "-" + rnd(4)], lead);
    return json({ ok: true }, 200, h);
  }
  // администратор: заявки и ручная смена тарифа
  if (url.pathname === "/admin") {
    if (!ADMINS().includes(user.id) || user.acct) return json({ error: "Нет доступа" }, 403, h);
    const kv = await kvOpen();
    if (body.action === "plan") {
      let id = String(body.id || "").toLowerCase();
      if (!/^[gu]_/.test(id)) id = (await kv.get(["login", id])).value || id;
      const a = await acctGet(id); if (!a || !PLANS[body.plan]) return json({ error: "Нет такого аккаунта или тарифа" }, 404, h);
      a.plan = body.plan; a.planUntil = body.months ? Date.now() + Number(body.months) * 31 * 86400_000 : 0; await acctPut(a);
      return json({ ok: true, id, plan: a.plan }, 200, h);
    }
    const leads = []; for await (const e of kv.list({ prefix: ["lead"] }, { reverse: true, limit: 100 })) leads.push(e.value);
    let guests = 0, users = 0; for await (const e of kv.list({ prefix: ["acct"] }, { limit: 5000 })) e.value.pw ? users++ : guests++;
    return json({ ok: true, leads, guests, users, today: await kvNum(kv, ["q", "_guests", DAY()]) }, 200, h);
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

  // мои ролики: просмотры, сердечки, ответы; и ролики семьи за неделю
  if (url.pathname === "/video-stats") {
    const kv = await kvOpen(); if (!kv) return json({ error: "Хранилище недоступно" }, 500, h);
    const mine = [], family = [], every = [], weekAgo = Date.now() - 7 * 24 * 3600_000;
    // круги семьи: кто чьи ролики видит (Vie отдельно от русскоязычной семьи; администратор видит всех)
    let circles = { mama: ["ru"], papa: ["ru"], sister: ["ru"], yuri: ["ru", "vie"], vie: ["vie"] };
    try { if (env("FAMILY_CIRCLES")) circles = JSON.parse(env("FAMILY_CIRCLES")); } catch (_) {}
    const myCircles = user.acct ? [] : circles[user.id] || [];
    const isAdmin = !user.acct && ADMINS().includes(user.id);
    for await (const e of kv.list({ prefix: ["vidu"] }, { reverse: true, limit: 1000 })) {
      const [, uid, created, id] = e.key;
      const isMine = uid === user.id;
      const theirs = circles[uid] ? circles[uid][0] : null;
      const inFamily = !isMine && created >= weekAgo && theirs && myCircles.includes(theirs);
      if (isAdmin && every.length < 150) {
        const meta = (await kv.get(["vid", id, "meta"])).value;
        if (meta) every.push({ id, title: meta.title, name: meta.name || (/^[gu]_/.test(uid) ? "" : uid), user: uid, created, poster: !!meta.posterN, ...(await vidCounts(kv, id)) });
      }
      if (!isMine && !inFamily) continue;
      const meta = (await kv.get(["vid", id, "meta"])).value; if (!meta) continue;
      const c = await vidCounts(kv, id);
      const item = { id, title: meta.title, name: meta.name, user: uid, created, poster: !!meta.posterN, ...c };
      if (isMine) {
        item.replies = [];
        for await (const r of kv.list({ prefix: ["vidr", id] }, { reverse: true, limit: 20 })) if (r.value.kind === "reply") item.replies.push(r.value);
        mine.push(item);
      }
      if (created >= weekAgo) family.push(item);
    }
    mine.sort((a, b) => b.created - a.created); family.sort((a, b) => b.views + b.hearts * 3 - (a.views + a.hearts * 3));
    every.sort((a, b) => b.created - a.created);
    return json({ mine: mine.slice(0, 50), family: family.slice(0, 20), all: isAdmin ? every : undefined }, 200, h);
  }

  // забрать треки из Runway (только с его CDN) и положить в хранилище; уже лежащие не трогаем
  if (url.pathname === "/music-import") {
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
    const kv = await kvOpen(); if (!kv) return json({ error: "Хранилище недоступно" }, 500, h);
    const out = [];
    for (const it of items) {
      const id = String(it.id || ""), src = String(it.url || "");
      if (!/^[a-z0-9]{2,24}$/.test(id) || !/^https:\/\/dnznrvs05pmza\.cloudfront\.net\/lyria3-pro\//.test(src)) { out.push({ id, error: "неверные данные" }); continue; }
      if ((await kv.get(["music", id, "n"])).value) { out.push({ id, ok: true, existed: true }); continue; }
      try {
        const r = await fetch(src); if (!r.ok) throw new Error("CDN " + r.status);
        const bytes = new Uint8Array(await r.arrayBuffer());
        if (bytes.length > 9_000_000 || bytes.length < 50_000) throw new Error("размер " + bytes.length);
        await musicPut(id, bytes); out.push({ id, ok: true, size: bytes.length });
      } catch (e) { out.push({ id, error: String(e.message || e) }); }
    }
    return json({ ok: true, items: out }, 200, h);
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

  // подпись к ролику для мессенджера — от лица отправителя
  if (url.pathname === "/caption") {
    const text = String(body.text || "").slice(0, 2500);
    const r = await callAnthropic(key, {
      model: env("TITLE_MODEL", "claude-haiku-5-5"),
      max_tokens: 160,
      system: body.lang === "en"
        ? "Write a short warm message (1–2 sentences, up to 200 characters) that a person sends to family or friends together with a short video about the text below. First person, natural, like a real message in a messenger, one fitting emoji. No hashtags, no quotes, do not mention AI or apps."
        : "Напиши короткое тёплое сообщение (1–2 предложения, до 200 символов), которое человек отправляет родным или друзьям вместе с коротким видео по тексту ниже. От первого лица, живо, как в мессенджере, одно подходящее эмодзи. Без хэштегов и кавычек, не упоминай ИИ и приложения.",
      messages: [{ role: "user", content: (body.title ? "Тема: " + String(body.title).slice(0, 80) + "\n\n" : "") + text }],
    });
    if (!r.ok) return json({ error: "Не удалось придумать подпись" }, 502, h);
    const d = await r.json();
    return json({ caption: (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim().replace(/^["«]|["»]$/g, "").slice(0, 300) }, 200, h);
  }

  // Расшифровка звука из видео (Gemini слышит, Claude — нет)
  if (url.pathname === "/transcribe" && plan === "free") return json({ error: "Расшифровка видео есть на тарифе «Семья»", code: "plan" }, 402, h);
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
    let ttsModel = body.model;
    if (P) {
      if (!P.ttsDialog && body.purpose !== "video") return json({ error: "Чтение вслух живым голосом есть на тарифе «Семья»", code: "tts_plan" }, 402, h);
      if (P.ttsDayChars) {
        const kv = await kvOpen(), k = ["tts", user.id, DAY()];
        if ((await kvNum(kv, k)) + text.length > P.ttsDayChars) return json({ error: "На сегодня озвучка на бесплатном тарифе закончилась. Завтра снова можно.", code: "tts_limit" }, 402, h);
        await kvInc(kv, k, text.length, 3);
        ttsModel = "gemini-3.8-flash-lite-tts";
      }
    }
    const res = await geminiTTS(text, body.voice, ttsModel);
    if (res.error) return json(res, res.status, h);
    return new Response(res.bytes, { status: 200, headers: { ...h, "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-TTS-Model": (res.backup ? "backup:" : "") + (res.model || "") } });
  }

  // Образец голоса: генерируется один раз и хранится на сервере для всех
  if (url.pathname === "/sample") {
    const voice = /^[A-Za-z]{3,20}$/.test(body.voice || "") ? body.voice : null;
    if (!voice) return json({ error: "Не указан голос" }, 400, h);
    const en = body.lang === "en", skey = en ? voice + "@en" : voice;
    let bytes = await sampleGet(skey);
    if (!bytes) {
      const res = await geminiTTS(en ? SAMPLE_TEXT_EN : SAMPLE_TEXT, voice);
      if (res.error) return json(res, res.status, h);
      bytes = res.bytes;
      await samplePut(skey, bytes);
    }
    return new Response(bytes, { status: 200, headers: { ...h, "Content-Type": "audio/wav", "Cache-Control": "public, max-age=31536000" } });
  }


  if (url.pathname !== "/chat") return json({ error: "Не найдено" }, 404, h);

  // живой режим: быстрые модели доступны всем (они дешевле основной)
  const LIVE_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"];
  const isLive = body.purpose === "live";
  const liveOk = isLive && LIVE_MODELS.includes(body.model) && (!user.acct || (user.models || []).includes(body.model) || body.model === "claude-haiku-5-5");
  const model = liveOk ? body.model : (user.models || models).includes(body.model) ? body.model : (user.models || models)[0];
  if (!Array.isArray(body.messages) || !body.messages.length) {
    return json({ error: "Пустой разговор" }, 400, h);
  }

  if (P) {
    const kv = await kvOpen();
    if (body.purpose === "video") {
      const vid = String(body.videoId || "").slice(0, 40);
      if (!vid) return json({ error: "Нет номера ролика" }, 400, h);
      const callsKey = ["cvid", user.id, vid], calls = await kvNum(kv, callsKey);
      if (!calls) {
        const u = await usageOf(user, plan);
        if (u.creativeLeft <= 0) return json({ error: plan === "free" ? "Творческий ролик на бесплатном тарифе: 1 в месяц. Сделаю обычный ролик." : "Творческие ролики на этот месяц закончились. Сделаю обычный ролик.", code: "creative_limit" }, 402, h);
        await kvInc(kv, ["cvt", user.id], 1, 0); await kvInc(kv, ["cvm", user.id, MONTH()], 1, 40);
      } else if (calls >= 6) return json({ error: "Слишком много правок одного ролика", code: "creative_calls" }, 429, h);
      await kvInc(kv, callsKey, 1, 2);
    } else {
      const u = await usageOf(user, plan);
      if (u.chatToday >= P.chatDay) return json({ error: plan === "free" ? `На бесплатном тарифе ${P.chatDay} вопросов в день. Завтра снова можно, а без ограничений на тарифе «Семья».` : "На сегодня вопросы закончились, завтра снова можно.", code: "chat_limit" }, 402, h);
      const all = await kvNum(kv, ["q", "_guests", DAY()]);
      if (all >= Number(env("GUEST_DAILY", "500"))) return json({ error: "Сейчас очень много желающих. Попробуйте чуть позже.", code: "busy" }, 503, h);
      await kvInc(kv, ["q", user.id, DAY()], 1, 3); await kvInc(kv, ["q", "_guests", DAY()], 1, 3);
    }
    if (isLive && !P.models.includes(body.model)) body.model = P.models[0];
  }
  const think = !!body.think && !isLive && (!P || plan !== "free");
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
