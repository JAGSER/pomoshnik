"use strict";

/* ===== Состояние ===== */
let CFG = null;          // config.json
let SESSION = null;      // { user, password, models, webSearch }
let CHAT = null;         // текущий разговор
let PENDING = [];        // приложенные файлы до отправки
let ABORT = null;        // остановка ответа
let MODEL = null;

const $ = (s) => document.querySelector(s);
const show = (id) => {
  document.querySelectorAll(".screen").forEach((s) => (s.hidden = s.id !== id));
};

/* ===== Хранилище (IndexedDB) ===== */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open("pomoshnik", 1);
      r.onupgradeneeded = () => {
        const s = r.result.createObjectStore("chats", { keyPath: "id" });
        s.createIndex("user", "user");
      };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(mode) { return this.db.transaction("chats", mode).objectStore("chats"); },
  put(chat) {
    return new Promise((res, rej) => { const r = this.tx("readwrite").put(chat); r.onsuccess = res; r.onerror = () => rej(r.error); });
  },
  del(id) {
    return new Promise((res) => { const r = this.tx("readwrite").delete(id); r.onsuccess = res; r.onerror = res; });
  },
  byUser(user) {
    return new Promise((res) => {
      const r = this.tx("readonly").index("user").getAll(user);
      r.onsuccess = () => res(r.result.sort((a, b) => b.updated - a.updated));
      r.onerror = () => res([]);
    });
  },
};

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  del(k) { try { localStorage.removeItem(k); } catch (_) {} },
};

/* ===== Запуск ===== */
async function init() {
  try {
    const r = await fetch("config.json?t=" + Date.now(), { cache: "no-store" });
    CFG = await r.json();
  } catch (_) {
    document.body.innerHTML = "<p style='padding:24px'>Не удалось загрузить настройки. Проверьте интернет и обновите страницу.</p>";
    return;
  }
  document.title = CFG.appName || "Помощник";
  $("#app-name").textContent = CFG.appName || "Помощник";
  try { await DB.open(); } catch (_) { /* без истории тоже работаем */ }

  SESSION = store.get("session");
  if (SESSION && CFG.users[SESSION.user]) startHome();
  else startLogin();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

/* ===== Вход ===== */
let loginUser = null;
function startLogin() {
  document.documentElement.classList.remove("big");
  show("screen-login");
  $("#login-form").hidden = true;
  const tiles = $("#user-tiles");
  tiles.hidden = false;
  tiles.innerHTML = "";
  Object.entries(CFG.users).forEach(([id, u]) => {
    const b = el("button", "user-tile");
    b.innerHTML = `<span class="av">${esc(u.avatar || "🙂")}</span>${esc(u.name)}`;
    b.onclick = () => pickUser(id);
    tiles.append(b);
  });
}
function pickUser(id) {
  loginUser = id;
  const u = CFG.users[id];
  $("#user-tiles").hidden = true;
  $("#login-form").hidden = false;
  $("#login-avatar").textContent = u.avatar || "🙂";
  $("#login-name").textContent = u.name;
  $("#login-error").textContent = "";
  $("#login-pass").value = "";
  $("#login-pass").type = "password";
  $("#pass-toggle").textContent = "Показать";
  $("#login-pass").focus();
}
$("#login-back").onclick = startLogin;
// В поле пароля многие Android-клавиатуры дают только английскую раскладку.
// «Показать» делает поле обычным — тогда доступна и русская.
$("#pass-toggle").onclick = () => {
  const f = $("#login-pass");
  const show = f.type === "password";
  f.type = show ? "text" : "password";
  $("#pass-toggle").textContent = show ? "Скрыть" : "Показать";
  f.blur(); setTimeout(() => f.focus(), 50);
};
$("#login-form").onsubmit = async (e) => {
  e.preventDefault();
  const password = $("#login-pass").value.trim();
  $("#login-error").textContent = "Проверяю…";
  try {
    const r = await fetch(CFG.proxy + "/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: loginUser, password }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { $("#login-error").textContent = d.error || "Не получилось войти"; return; }
    SESSION = { user: loginUser, password, models: d.models, webSearch: d.webSearch };
    store.set("session", SESSION);
    startHome();
  } catch (_) {
    $("#login-error").textContent = "Нет связи с помощником. Проверьте интернет.";
  }
};

/* ===== Главная ===== */
function me() { return CFG.users[SESSION.user]; }

async function startHome() {
  stopSpeaking();
  const u = me();
  document.documentElement.classList.toggle("big", !!u.bigText);
  show("screen-home");
  $("#hello").textContent = `Здравствуйте, ${u.name}!`;

  const grid = $("#preset-grid");
  grid.innerHTML = "";
  (u.presets || Object.keys(CFG.presets)).forEach((pid) => {
    const p = CFG.presets[pid];
    if (!p) return;
    const b = el("button", "preset");
    b.innerHTML = `<span class="pi">${esc(p.icon || "💬")}</span><span><span class="pt">${esc(p.title)}</span>${p.subtitle ? `<span class="ps">${esc(p.subtitle)}</span>` : ""}</span>`;
    b.onclick = () => openChat(newChat(pid));
    grid.append(b);
  });

  const list = $("#history");
  list.innerHTML = "";
  const chats = DB.db ? await DB.byUser(SESSION.user) : [];
  $("#history-title").hidden = !chats.length;
  chats.slice(0, 30).forEach((c) => {
    const p = CFG.presets[c.preset] || {};
    const li = document.createElement("li");
    const open = el("button", "hopen");
    open.innerHTML = `<span>${esc(p.icon || "💬")}</span><span style="min-width:0"><span class="htitle">${esc(c.title || p.title || "Разговор")}</span><span class="hdate">${fmtDate(c.updated)}</span></span>`;
    open.onclick = () => openChat(c);
    const del = el("button", "icon-btn hdel");
    del.textContent = "✕";
    del.setAttribute("aria-label", "Удалить разговор");
    del.onclick = async () => {
      if (!confirm("Удалить этот разговор?")) return;
      await DB.del(c.id);
      startHome();
    };
    li.append(open, del);
    list.append(li);
  });
}
$("#btn-logout").onclick = () => {
  if (!confirm("Выйти? Потом нужно будет снова ввести пароль.")) return;
  store.del("session");
  SESSION = null;
  startLogin();
};

/* ===== Разговор ===== */
function newChat(presetId) {
  return { id: "c" + Date.now() + Math.random().toString(36).slice(2, 6), user: SESSION.user, preset: presetId, title: "", updated: Date.now(), messages: [] };
}

function openChat(chat) {
  CHAT = chat;
  PENDING = [];
  renderAttachments();
  const p = CFG.presets[chat.preset] || {};
  $("#chat-title").textContent = `${p.icon || ""} ${p.title || "Разговор"}`;
  $("#btn-attach").hidden = p.allowFiles === false;

  const models = SESSION.models || [];
  const sel = $("#model-select");
  MODEL = models.includes(me().model) ? me().model : models[0];
  if (models.length > 1) {
    sel.hidden = false;
    sel.innerHTML = models.map((m) => `<option value="${esc(m)}">${esc(modelName(m))}</option>`).join("");
    sel.value = MODEL;
    sel.onchange = () => (MODEL = sel.value);
  } else sel.hidden = true;

  show("screen-chat");
  const box = $("#messages");
  box.innerHTML = "";
  if (p.greeting) addNotice(p.greeting);
  chat.messages.forEach((m) => renderMessage(m));
  scrollDown();
  if (!matchMedia("(pointer: coarse)").matches) $("#input").focus();
}
$("#btn-back").onclick = () => { if (ABORT) ABORT.abort(); stopListening(); startHome(); };

function modelName(m) {
  if (m.includes("opus")) return "Opus — самый умный";
  if (m.includes("sonnet")) return "Sonnet — обычный";
  if (m.includes("haiku")) return "Haiku — быстрый";
  return m;
}

/* ===== Отображение ===== */
function addNotice(text) {
  const d = el("div", "msg notice");
  d.textContent = text;
  $("#messages").append(d);
}

function renderMessage(m) {
  const d = el("div", "msg " + m.role);
  if (m.role === "user") {
    m.content.forEach((b) => {
      if (b.type === "image") {
        const img = el("img", "thumb");
        img.src = `data:${b.source.media_type};base64,${b.source.data}`;
        img.alt = "Фото";
        d.append(img);
      } else if (b.type === "document") {
        d.append(chip("📄 " + (b.title || "Документ")));
      } else if (b.type === "text" && b._file) {
        d.append(chip("📄 " + b._file));
      } else if (b.type === "text") {
        const t = el("div");
        t.textContent = b.text;
        d.append(t);
      }
    });
  } else {
    const t = el("div", "md");
    t.innerHTML = md(textOf(m));
    d.append(t);
    d.append(actions(textOf(m)));
  }
  $("#messages").append(d);
  return d;
}

function chip(text) { const s = el("span", "file-chip"); s.textContent = text; return s; }

function actions(text) {
  const a = el("div", "msg-actions");
  const speak = el("button");
  speak.textContent = "🔊 Вслух";
  speak.onclick = () => {
    if (speechSynthesis.speaking) { stopSpeaking(); speak.textContent = "🔊 Вслух"; return; }
    speak.textContent = "⏹ Стоп";
    speakText(text, () => (speak.textContent = "🔊 Вслух"));
  };
  const copy = el("button");
  copy.textContent = "📋 Копия";
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(text); copy.textContent = "✓ Готово"; }
    catch (_) { copy.textContent = "Не вышло"; }
    setTimeout(() => (copy.textContent = "📋 Копия"), 1800);
  };
  if (!("speechSynthesis" in window)) speak.hidden = true;
  a.append(speak, copy);
  return a;
}

function textOf(m) {
  return (m.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}
function scrollDown() { const b = $("#messages"); b.scrollTop = b.scrollHeight; }

/* ===== Отправка ===== */
$("#composer").onsubmit = (e) => { e.preventDefault(); send(); };
$("#input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer: coarse)").matches) { e.preventDefault(); send(); }
});
$("#input").addEventListener("input", autoGrow);
function autoGrow() { const t = $("#input"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, innerHeight * 0.4) + "px"; }

async function send() {
  if (ABORT) { ABORT.abort(); return; }
  stopListening();
  const text = $("#input").value.trim();
  if (!text && !PENDING.length) return;

  const content = [...PENDING.map((p) => p.block)];
  if (text) content.push({ type: "text", text });
  else content.push({ type: "text", text: "Посмотри, пожалуйста, что я приложил(а)." });
  const userMsg = { role: "user", content };
  CHAT.messages.push(userMsg);
  if (!CHAT.title) CHAT.title = (text || PENDING[0]?.name || "Разговор").slice(0, 60);
  renderMessage(userMsg);
  $("#input").value = "";
  autoGrow();
  PENDING = [];
  renderAttachments();
  scrollDown();
  await save();
  await ask();
}

async function ask() {
  const p = CFG.presets[CHAT.preset] || {};
  const u = me();
  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
  const system = [CFG.baseSystem, `Сегодня ${today}. Собеседник: ${u.name}.`, p.system].filter(Boolean).join("\n\n");

  const bubble = el("div", "msg assistant");
  const body = el("div", "md typing");
  body.textContent = "Думаю…";
  bubble.append(body);
  $("#messages").append(bubble);
  scrollDown();

  setBusy(true);
  ABORT = new AbortController();
  let full = "";
  try {
    const r = await fetch(CFG.proxy + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: SESSION.user, password: SESSION.password, model: MODEL, system, messages: contextMessages() }),
      signal: ABORT.signal,
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      if (r.status === 401 && /пароль/i.test(d.error || "")) { store.del("session"); throw new Error("Пароль больше не подходит. Войдите заново."); }
      throw new Error(d.error || "Не получилось получить ответ");
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let started = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        let ev;
        try { ev = JSON.parse(line.slice(5)); } catch (_) { continue; }
        if (ev.type === "content_block_start" && ev.content_block?.type === "server_tool_use") {
          if (!started) body.textContent = "Ищу в интернете…";
        } else if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
          if (!started) { started = true; body.classList.remove("typing"); }
          full += ev.delta.text;
          body.innerHTML = md(full);
          scrollDown();
        } else if (ev.type === "error") {
          throw new Error(ev.error?.type === "overloaded_error" ? "Claude перегружен, попробуйте через минуту" : "Ошибка при ответе");
        }
      }
    }
    if (!full) throw new Error("Пришёл пустой ответ, попробуйте ещё раз");
    const msg = { role: "assistant", content: [{ type: "text", text: full }] };
    CHAT.messages.push(msg);
    bubble.append(actions(full));
    await save();
    if (u.readAloud) speakText(full);
  } catch (err) {
    if (full) {
      // ответ оборвали — сохраняем то, что успело прийти
      CHAT.messages.push({ role: "assistant", content: [{ type: "text", text: full + "\n\n…(ответ остановлен)" }] });
      body.innerHTML = md(full + "\n\n…(ответ остановлен)");
      await save();
    } else {
      bubble.remove();
      CHAT.messages.pop(); // вопрос без ответа убираем из контекста, но показываем ошибку
      const e = el("div", "msg err");
      e.textContent = err.name === "AbortError" ? "Остановлено." : err.message;
      if (err.name !== "AbortError") {
        const retry = el("button");
        retry.textContent = "Повторить";
        retry.style.cssText = "margin-left:10px;border:1px solid currentColor;background:none;color:inherit;border-radius:10px;padding:6px 12px;cursor:pointer";
        const last = lastUserFromDom();
        retry.onclick = () => { e.remove(); if (last) { CHAT.messages.push(last); ask(); } };
        e.append(retry);
      }
      $("#messages").append(e);
      scrollDown();
      if (/Войдите заново/.test(err.message)) setTimeout(startLogin, 2500);
    }
  } finally {
    ABORT = null;
    setBusy(false);
  }
}

let lastUser = null;
function lastUserFromDom() { return lastUser; }

function setBusy(on) {
  $("#btn-send").textContent = on ? "■" : "➤";
  $("#btn-send").setAttribute("aria-label", on ? "Остановить" : "Отправить");
}

// В Claude отправляем последние сообщения; старые фото и документы заменяем пометкой — так дешевле
function contextMessages() {
  let msgs = CHAT.messages.slice(-30);
  while (msgs.length && msgs[0].role !== "user") msgs = msgs.slice(1);
  lastUser = CHAT.messages[CHAT.messages.length - 1];
  return msgs.map((m, i) => {
    const recent = i >= msgs.length - 4;
    return {
      role: m.role,
      content: m.content.map((b) => {
        if (!recent && b.type === "image") return { type: "text", text: "[раньше было приложено фото]" };
        if (!recent && b.type === "document") return { type: "text", text: `[раньше был приложен документ: ${b.title || ""}]` };
        if (b.type === "text") return { type: "text", text: b.text };
        const { title, ...rest } = b;
        return b.type === "document" ? { ...rest, title } : rest;
      }),
    };
  });
}

async function save() {
  CHAT.updated = Date.now();
  if (DB.db) { try { await DB.put(CHAT); } catch (_) {} }
}

/* ===== Файлы ===== */
$("#btn-attach").onclick = () => $("#file-input").click();
$("#file-input").onchange = async (e) => {
  for (const f of e.target.files) {
    try {
      if (f.type.startsWith("image/")) {
        const { data, type, url } = await shrinkImage(f);
        PENDING.push({ name: f.name, preview: url, block: { type: "image", source: { type: "base64", media_type: type, data } } });
      } else if (f.type === "application/pdf") {
        if (f.size > 25 * 1024 * 1024) { alert("Файл слишком большой (больше 25 МБ)"); continue; }
        PENDING.push({ name: f.name, block: { type: "document", title: f.name, source: { type: "base64", media_type: "application/pdf", data: await toBase64(f) } } });
      } else {
        const text = (await f.text()).slice(0, 200000);
        PENDING.push({ name: f.name, block: { type: "text", _file: f.name, text: `Файл «${f.name}»:\n\n${text}` } });
      }
    } catch (_) { alert("Не удалось открыть файл " + f.name); }
  }
  e.target.value = "";
  renderAttachments();
};
function renderAttachments() {
  const box = $("#attachments");
  box.innerHTML = "";
  PENDING.forEach((p, i) => {
    const a = el("div", "att");
    if (p.preview) { const img = el("img"); img.src = p.preview; img.alt = ""; a.append(img); }
    else a.append(document.createTextNode("📄 " + p.name));
    const x = el("button");
    x.textContent = "✕";
    x.setAttribute("aria-label", "Убрать");
    x.onclick = () => { PENDING.splice(i, 1); renderAttachments(); };
    a.append(x);
    box.append(a);
  });
}
function shrinkImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const max = 1568;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(img.src);
      res({ data: url.split(",")[1], type: "image/jpeg", url });
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ===== Голос: ввод ===== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
if (!SR) $("#btn-mic").hidden = true;
$("#btn-mic").onclick = () => (rec ? stopListening() : startListening());
function startListening() {
  stopSpeaking();
  rec = new SR();
  rec.lang = "ru-RU";
  rec.interimResults = true;
  rec.continuous = false;
  const base = $("#input").value ? $("#input").value.trim() + " " : "";
  rec.onresult = (e) => {
    let t = "";
    for (const r of e.results) t += r[0].transcript;
    $("#input").value = base + t;
    autoGrow();
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed") alert("Разрешите доступ к микрофону в настройках браузера.");
  };
  rec.onend = () => { rec = null; $("#btn-mic").classList.remove("on"); };
  $("#btn-mic").classList.add("on");
  try { rec.start(); } catch (_) { rec = null; $("#btn-mic").classList.remove("on"); }
}
function stopListening() { if (rec) { try { rec.stop(); } catch (_) {} } }

/* ===== Голос: чтение вслух ===== */
function plain(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>|]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\n{2,}/g, ". ");
}
function speakText(text, onEnd) {
  if (!("speechSynthesis" in window)) return;
  stopSpeaking();
  const voices = speechSynthesis.getVoices();
  const ru = voices.find((v) => v.lang === "ru-RU" && /google|natural|online/i.test(v.name)) || voices.find((v) => v.lang?.startsWith("ru"));
  // длинный текст читаем кусками — иначе на Android обрывается
  const parts = plain(text).match(/[^.!?…]+[.!?…]*\s*/g) || [plain(text)];
  const chunks = [];
  let cur = "";
  parts.forEach((p) => { if ((cur + p).length > 220) { chunks.push(cur); cur = p; } else cur += p; });
  if (cur.trim()) chunks.push(cur);
  chunks.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c);
    u.lang = "ru-RU";
    if (ru) u.voice = ru;
    u.rate = 0.95;
    if (i === chunks.length - 1 && onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  });
}
function stopSpeaking() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => {};

/* ===== Мини-разметка ответов ===== */
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function md(src) {
  const blocks = [];
  src = esc(src).replace(/```[^\n]*\n?([\s\S]*?)(```|$)/g, (_, code) => { blocks.push(code); return `\u0000${blocks.length - 1}\u0000`; });
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  src.split("\n").forEach((line) => {
    let m;
    if ((m = line.match(/^\u0000(\d+)\u0000$/))) { closeList(); out.push(`<pre><code>${blocks[m[1]]}</code></pre>`); }
    else if ((m = line.match(/^#{1,6}\s+(.*)/))) { closeList(); out.push(`<h3>${inline(m[1])}</h3>`); }
    else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if (!line.trim()) { closeList(); }
    else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  });
  closeList();
  return out.join("").replace(/\u0000(\d+)\u0000/g, (_, i) => `<pre><code>${blocks[i]}</code></pre>`);
}

/* ===== Мелочи ===== */
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function fmtDate(t) {
  const d = new Date(t);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "сегодня, " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

init();
