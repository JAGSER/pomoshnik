"use strict";

/* ===== Состояние ===== */
let CFG = null;          // config.json
let SESSION = null;      // { user, password, models, webSearch }
let CHAT = null;         // текущий разговор
let PENDING = [];        // приложенные файлы до отправки
let ABORT = null;        // остановка ответа

const $ = (s) => document.querySelector(s);
const show = (id) => {
  document.querySelectorAll(".screen").forEach((s) => (s.hidden = s.id !== id));
};

function appName() { return LANG === "en" ? EN_APP : CFG.appName || "Помощник AI"; }
// язык человека: выбранный в настройках → указанный в config.json → язык телефона
function userLang(id) {
  const saved = store.get("lang:" + id);
  if (saved) return saved;
  const u = CFG.users[id] || {};
  if (u.lang) return u.lang;
  return /^(ru|uk|be|kk)/i.test(navigator.language || "") ? "ru" : "en";
}
const EN_SYSTEM = "IMPORTANT: this person does not speak Russian — ignore the instruction above to answer in Russian. Answer in English, unless their preferences below ask for another language or they write in another language.";

/* ===== Звук на iPhone =====
   iPhone разрешает сайту звук только из элемента, который «разбудили» касанием пользователя.
   Поэтому держим один общий проигрыватель и общий AudioContext и будим их при первом касании. */
const PLAYER = new Audio();
let AC_SHARED = null, AUDIO_UNLOCKED = false;
const IS_APPLE = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Android/.test(navigator.userAgent));
function silentWavUrl() {
  const n = 800, b = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o, t) => { for (let i = 0; i < t.length; i++) b.setUint8(o + i, t.charCodeAt(i)); };
  w(0, "RIFF"); b.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, "data"); b.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b.buffer], { type: "audio/wav" }));
}
function sharedAC() {
  if (!AC_SHARED || AC_SHARED.state === "closed") { try { AC_SHARED = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { AC_SHARED = null; } }
  return AC_SHARED;
}
function unlockAudio() {
  // iPhone (iOS 17+): звук сайта не глушится переключателем «без звука»
  try { if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback"; } catch (_) {}
  const ac = sharedAC(); if (ac && ac.state === "suspended") ac.resume().catch(() => {});
  if (AUDIO_UNLOCKED) return;
  AUDIO_UNLOCKED = true;
  try { if (!PLAYER.src || PLAYER.paused) { PLAYER.src = silentWavUrl(); PLAYER.play().then(() => PLAYER.pause()).catch(() => { AUDIO_UNLOCKED = false; }); } } catch (_) { AUDIO_UNLOCKED = false; }
  try { if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } } catch (_) {}
}
["pointerdown", "touchend", "click", "keydown"].forEach((ev) => document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));
// звук всегда играем через общий проигрыватель
function audioFor(url) {
  try { PLAYER.pause(); } catch (_) {}
  PLAYER.onended = PLAYER.onerror = PLAYER.onpause = null;
  PLAYER.src = url;
  return PLAYER;
}

/* ===== Персонализация: что Claude знает о собеседнике ===== */
function profile() {
  const u = me();
  const pf = (SESSION && store.get("profile:" + SESSION.user)) || {};
  return { name: pf.name || u.name, form: pf.form ?? (u.form || ""), about: pf.about || u.about || "", style: pf.style || u.style || "" };
}
function personalOn() { return !SESSION || store.get("personal:" + SESSION.user) !== false; }
function personalSystem() {
  if (!personalOn()) return "Не обращайся к собеседнику по имени и не делай предположений о нём.";
  const pf = profile();
  return [
    `Собеседник: ${pf.name}.`,
    pf.form === "вы" ? "Обращайся на «вы»." : pf.form === "ты" ? "Обращайся на «ты»." : "",
    pf.about ? `О собеседнике: ${pf.about}` : "",
    pf.style ? `Пожелания к ответам: ${pf.style}` : "",
  ].filter(Boolean).join("\n");
}

/* ===== Статистика (Umami): только события, без текста разговоров ===== */
function track(name, data) {
  try { if (window.umami && umami.track) umami.track(name, Object.assign({ who: SESSION ? SESSION.user : "гость" }, data || {})); } catch (_) {}
}

/* ===== Хранилище (IndexedDB) ===== */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      // Новое отдельное хранилище: старые версии приложения его не трогают и не блокируют
      const r = indexedDB.open("pomoshnik-chats", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("chats", { keyPath: "id" }).createIndex("user", "user");
      r.onsuccess = () => {
        this.db = r.result;
        this.db.onversionchange = () => { try { this.db.close(); } catch (_) {} this.db = null; };
        res();
        this.migrate();
      };
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error("blocked"));
    });
  },
  // Один раз переносим разговоры из старого хранилища «pomoshnik»; если оно занято — попробуем при следующем запуске
  migrate() {
    if (store.get("migrated-v2")) return;
    let done = false;
    const finish = () => { done = true; };
    setTimeout(finish, 4000);
    try {
      const r = indexedDB.open("pomoshnik");
      r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (_) {} };
      r.onsuccess = () => {
        const old = r.result;
        if (done || !old.objectStoreNames.contains("chats")) { old.close(); if (!done) store.set("migrated-v2", true); return; }
        const g = old.transaction("chats").objectStore("chats").getAll();
        g.onsuccess = () => {
          const list = g.result || [];
          old.close();
          if (!this.db) return;
          const tx = this.db.transaction("chats", "readwrite");
          const st = tx.objectStore("chats");
          list.forEach((c) => { const q = st.get(c.id); q.onsuccess = () => { if (!q.result) st.put(c); }; });
          tx.oncomplete = () => {
            store.set("migrated-v2", true);
            if (list.length && SESSION && !$("#screen-home").hidden) startHome();
          };
        };
        g.onerror = () => old.close();
      };
      r.onerror = r.onblocked = () => {};
    } catch (_) {}
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

// Отдельное хранилище для готового звука озвучки
const ADB = {
  db: null,
  open() {
    return new Promise((res) => {
      try {
        const r = indexedDB.open("pomoshnik-audio", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("tts", { keyPath: "k" }).createIndex("t", "t");
        r.onsuccess = () => { this.db = r.result; res(); };
        r.onerror = r.onblocked = () => res();
      } catch (_) { res(); }
    });
  },
  get(k) {
    return new Promise((res) => {
      if (!this.db) return res(null);
      try { const r = this.db.transaction("tts").objectStore("tts").get(k); r.onsuccess = () => res(r.result ? r.result.blob : null); r.onerror = () => res(null); }
      catch (_) { res(null); }
    });
  },
  put(k, blob) {
    if (!this.db) return;
    try {
      const st = this.db.transaction("tts", "readwrite").objectStore("tts");
      st.put({ k, blob, t: Date.now() });
      // храним не больше 80 последних кусков, старые удаляем
      const c = st.count();
      c.onsuccess = () => {
        let extra = c.result - 80;
        if (extra <= 0) return;
        st.index("t").openCursor().onsuccess = (e) => { const cur = e.target.result; if (cur && extra-- > 0) { cur.delete(); cur.continue(); } };
      };
    } catch (_) {}
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
  document.title = appName();
  $("#app-name").textContent = appName();
  // не ждём хранилище дольше 3 секунд — без истории приложение тоже работает
  try { await Promise.race([DB.open(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]); } catch (_) {}
  ADB.open();
  // переезд со старого адреса: забираем вход, настройки и разговоры
  const mig = location.hash.match(/^#m=([a-f0-9]{32})$/);
  if (mig) await importMigration(mig[1]);

  SESSION = store.get("session");
  if (SESSION && CFG.users[SESSION.user] && userLang(SESSION.user) !== LANG) { setLang(userLang(SESSION.user)); return; }
  if (SESSION && CFG.users[SESSION.user]) startHome();
  else startLogin();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
}

async function importMigration(code) {
  history.replaceState(null, "", location.pathname);
  try {
    const r = await fetch(CFG.proxy + "/migrate?code=" + code, { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    Object.entries(d.ls || {}).forEach(([k, v]) => { if (localStorage.getItem(k) == null) try { localStorage.setItem(k, v); } catch (_) {} });
    if (DB.db && Array.isArray(d.chats) && d.chats.length) {
      await new Promise((res) => {
        const tx = DB.db.transaction("chats", "readwrite"), st = tx.objectStore("chats");
        d.chats.forEach((c) => { const q = st.get(c.id); q.onsuccess = () => { if (!q.result || (q.result.updated || 0) < (c.updated || 0)) st.put(c); }; });
        tx.oncomplete = tx.onerror = tx.onabort = res;
      });
    }
    store.set("migrated-v2", true);
    setTimeout(() => { toast("Добро пожаловать на новый адрес — pomoshnik.ai. Разговоры перенесены."); track("Переезд", { chats: (d.chats || []).length }); }, 800);
  } catch (_) {}
}

/* ===== Вход (только пароль — прослойка сама находит человека) ===== */
function startLogin() {
  document.documentElement.classList.remove("big");
  show("screen-login");
  $("#login-error").textContent = "";
  $("#login-pass").value = "";
  $("#login-pass").type = "password";
  $("#pass-toggle").textContent = "Показать";
  if (!matchMedia("(pointer: coarse)").matches) $("#login-pass").focus();
}
// В поле пароля многие Android-клавиатуры дают только английскую раскладку.
// «Показать» делает поле обычным — тогда доступна и русская.
$("#pass-toggle").onclick = () => {
  const f = $("#login-pass");
  const showIt = f.type === "password";
  f.type = showIt ? "text" : "password";
  $("#pass-toggle").textContent = showIt ? "Скрыть" : "Показать";
  f.blur(); setTimeout(() => f.focus(), 50);
};
$("#login-form").onsubmit = async (e) => {
  e.preventDefault();
  const password = $("#login-pass").value.trim();
  if (!password) return;
  $("#login-error").textContent = "Проверяю…";
  try {
    const r = await fetch(CFG.proxy + "/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { $("#login-error").textContent = d.error || "Не получилось войти"; return; }
    if (!CFG.users[d.user]) { $("#login-error").textContent = "Пользователь не найден в настройках приложения"; return; }
    SESSION = { user: d.user, password, models: d.models, webSearch: d.webSearch };
    store.set("session", SESSION);
    track("Вход");
    if (userLang(d.user) !== LANG) { setLang(userLang(d.user)); return; }
    startHome();
  } catch (_) {
    $("#login-error").textContent = "Нет связи с помощником. Проверьте интернет.";
  }
};

/* ===== Главная ===== */
function me() { return CFG.users[SESSION.user]; }

async function startHome() {
  stopSnippet();
  stopSpeaking();
  const u = me();
  document.documentElement.classList.toggle("big", !!u.bigText);
  show("screen-home");
  $("#hello").textContent = personalOn() ? `Здравствуйте, ${profile().name}!` : "Здравствуйте!";

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
  // плитка «Помощники» — сразу открывает список готовых помощников
  if (helpersOn()) {
    const b = el("button", "preset preset-helpers");
    b.innerHTML = `<span class="pi">⭐</span><span><span class="pt">Помощники</span><span class="ps">Готовые помощники на разные случаи</span></span>`;
    b.onclick = openHelpers;
    grid.append(b);
  }

  const list = $("#history");
  list.innerHTML = "";
  const chats = DB.db ? await DB.byUser(SESSION.user) : [];
  $("#history-title").hidden = !chats.length;
  chats.sort((x, y) => (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0) || y.updated - x.updated);
  chats.slice(0, 40).forEach((c) => {
    const p = CFG.presets[c.preset] || {};
    const li = document.createElement("li");
    if (c.pinned) li.className = "pinned";
    const open = el("button", "hopen");
    open.innerHTML = `<span style="min-width:0"><span class="htitle">${esc(c.title || p.title || "Разговор")}</span><span class="hdate">${c.pinned ? "📌 закреплён · " : ""}${fmtDate(c.updated)}</span></span>`;
    open.onclick = () => openChat(c);
    // эмодзи — кнопка: проигрывает первую фразу последнего ответа (она уже записана заранее)
    const emo = el("button", "hemoji");
    emo.textContent = c.emoji || p.icon || "💬";
    emo.setAttribute("aria-label", "Послушать начало последнего ответа");
    emo.onclick = () => playSnippet(c, emo);
    const pin = el("button", "icon-btn hdel" + (c.pinned ? " on" : ""));
    pin.textContent = "📌";
    pin.setAttribute("aria-label", c.pinned ? "Открепить разговор" : "Закрепить разговор");
    pin.title = c.pinned ? "Открепить" : "Закрепить наверху";
    pin.onclick = async () => { c.pinned = !c.pinned; if (DB.db) { try { await DB.put(c); } catch (_) {} } startHome(); };
    const ren = el("button", "icon-btn hdel");
    ren.textContent = "✏️";
    ren.setAttribute("aria-label", "Переименовать разговор");
    ren.onclick = async () => { if (await renameChat(c)) startHome(); };
    const del = el("button", "icon-btn hdel");
    del.textContent = "✕";
    del.setAttribute("aria-label", "Удалить разговор");
    del.onclick = async () => {
      if (!confirm("Удалить этот разговор?")) return;
      await DB.del(c.id);
      startHome();
    };
    li.append(emo, open, pin, ren, del);
    list.append(li);
  });
  // один раз показываем, что эмодзи можно нажать: пульсирует, как во время воспроизведения
  const hintKey = "emojiHint:" + SESSION.user;
  if (!store.get(hintKey)) {
    const shown = chats.slice(0, 40);
    const i = shown.findIndex((c) => (c.messages || []).some((m) => m.role === "assistant"));
    const emo = i >= 0 ? list.querySelectorAll(".hemoji")[i] : null;
    if (emo) {
      store.set(hintKey, true);
      setTimeout(() => { emo.classList.add("hint"); emo.addEventListener("animationend", () => emo.classList.remove("hint"), { once: true }); }, 500);
    }
  }
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
  stopSnippet();
  track(chat.messages && chat.messages.length ? "Открыт разговор" : "Новый разговор", { preset: chat.preset });
  CHAT = chat;
  PENDING = [];
  renderAttachments();
  const p = CFG.presets[chat.preset] || {};
  $("#chat-title").textContent = chatTitle(chat);
  $("#btn-attach").hidden = p.allowFiles === false;

  $("#think").checked = false; // «Подумать» по умолчанию выключено
  const ar = store.get(autoReadKey());
  $("#autoread").checked = ar === null ? !!me().readAloud : !!ar;

  show("screen-chat");
  const box = $("#messages");
  box.innerHTML = "";
  const hpc = chat.helper && CFG.helpers ? CFG.helpers[chat.helper] : null;
  if (hpc && hHint(hpc)) addNotice(hHint(hpc)); else if (p.greeting) addNotice(p.greeting);
  chat.messages.forEach((m) => renderMessage(m));
  if (chat.messages.length) { const last = chat.messages[chat.messages.length - 1]; if (last.role === "assistant" && last.options) showFollowups(last.options); }
  renderHelperChip();
  if (p.allowFiles !== false) {
    const ec = el("div", "empty-chat" + (chat.messages.length ? " compact" : "")); ec.id = "empty-chat";
    const mk = (ico, label, fn, cls) => { const b = el("button", "ec-btn" + (cls ? " " + cls : "")); b.type = "button"; b.innerHTML = `<span class="ec-ico">${ico}</span><span class="ec-full">${label}</span><span class="ec-short">${label.split(" ")[0]}</span>`; b.onclick = fn; return b; };
    ec.append(
      mk("🎥", "Живой режим", startLive, "ec-live"),
      mk("🖼️", "Фото", () => pickFiles("image/*")),
      mk("📄", "Документ", () => pickFiles("application/pdf,.pdf,.txt,.md,.csv")),
      mk("🎬", "Видео", () => pickFiles("video/*")),
    );
    if (chat.messages.length || chat.helper) { ec.classList.add("compact"); box.prepend(ec); } else box.append(ec);
  }
  // готовые вопросы, чтобы можно было просто нажать
  if (!chat.messages.length) showStarters(chat);
  scrollDown();
  if (!matchMedia("(pointer: coarse)").matches) $("#input").focus();
}
$("#btn-back").onclick = () => { if (ABORT) ABORT.abort(); stopAutoSend(); stopListening(); startHome(); };

/* ===== Названия разговоров ===== */
function chatTitle(c) {
  const p = CFG.presets[c.preset] || {};
  if (c.emoji || c.renamed) return `${c.emoji || p.icon || "💬"} ${c.title || p.title || "Разговор"}`;
  return `${p.icon || "💬"} ${p.title || "Разговор"}`;
}
const EMOJI_RE = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u;
// Переименование: можно поменять и эмодзи — он берётся из начала строки
async function renameChat(c) {
  const p = CFG.presets[c.preset] || {};
  const cur = `${c.emoji || p.icon || "💬"} ${c.title || p.title || "Разговор"}`;
  const v = prompt("Название разговора (в начале можно поставить свой эмодзи):", cur);
  if (v == null || !v.trim()) return false;
  const m = v.trim().match(EMOJI_RE);
  c.emoji = m ? m[1] : (c.emoji || p.icon || "💬");
  c.title = (m ? v.trim().slice(m[0].length) : v.trim()).slice(0, 60) || c.title;
  c.renamed = true;
  c.updated = c.updated || Date.now();
  if (DB.db) { try { await DB.put(c); } catch (_) {} }
  return true;
}
$("#chat-title").onclick = async () => { if (CHAT && await renameChat(CHAT)) $("#chat-title").textContent = chatTitle(CHAT); };
// После первого ответа Claude сам придумывает эмодзи и короткое название
async function autoTitle(chat) {
  if (chat.emoji || chat.renamed) return;
  const q = textOf(chat.messages.find((m) => m.role === "user") || { content: [] });
  const a = textOf(chat.messages.find((m) => m.role === "assistant") || { content: [] });
  try {
    const r = await fetch(CFG.proxy + "/title", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: SESSION.user, password: SESSION.password, lang: LANG, text: `Вопрос: ${q}\n\nНачало ответа: ${a.slice(0, 600)}` }),
    });
    if (!r.ok) return;
    const d = await r.json();
    if (chat.renamed) return;
    chat.emoji = d.emoji || "💬";
    if (d.title) chat.title = d.title;
    if (DB.db) { try { await DB.put(chat); } catch (_) {} }
    if (CHAT === chat && !$("#screen-chat").hidden) $("#chat-title").textContent = chatTitle(chat);
  } catch (_) {}
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
    const nImg = m.content.filter((b) => b.type === "image").length;
    let iImg = 0;
    m.content.forEach((b) => {
      if (b.type === "image" && nImg > 4 && ++iImg > 3) { if (iImg === 4) d.append(chip(`+${nImg - 3} кадров`)); return; }
      if (b.type === "image") {
        const img = el("img", "thumb");
        img.src = `data:${b.source.media_type};base64,${b.source.data}`;
        img.alt = "Фото";
        d.append(img);
      } else if (b.type === "document") {
        d.append(chip("📄 " + (b.title || "Документ")));
      } else if (b.type === "text" && b._file) {
        d.append(chip((b.text.startsWith("Видео «") ? "🎬 " : "📄 ") + b._file));
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
    d.append(actions(textOf(m), m));
  }
  $("#messages").append(d);
  return d;
}

function chip(text) { const s = el("span", "file-chip"); s.textContent = text; return s; }

function actions(text, msg) {
  const a = el("div", "msg-actions");
  const speak = el("button", "speak-btn");
  setSpeakBtn(speak, "idle");
  speak.onclick = () => {
    // та же кнопка: пауза / продолжить, если сейчас читается именно этот ответ
    if (SPEAKER && SPEAKER.owner === speak) { SPEAKER.paused ? SPEAKER.resume() : SPEAKER.pause(); return; }
    speakText(text, speak, msg);
    track("Вслух");
  };
  const copy = el("button");
  copy.textContent = "📋 Копия";
  copy.onclick = async () => {
    try { await copyRich(text); copy.textContent = "✓ Готово"; }
    catch (_) { copy.textContent = "Не вышло"; }
    setTimeout(() => (copy.textContent = "📋 Копия"), 1800);
  };
  const vid = el("button");
  vid.className = "vid-btn";
  vid.textContent = "🎬 Видео";
  vid.title = "Сохранить ответ как видео с озвучкой (9:16)";
  vid.setAttribute("aria-label", vid.title);
  vid.onclick = () => videoButton(vid, text, msg);
  const timer = el("span", "vid-timer");
  timer.hidden = true;
  a.append(speak, copy, timer, vid);
  return a;
}
// Две скорости: «1×» на деле читает в 1,2 раза быстрее (так приятнее на слух), «1,5×» — как написано
const RATES = [1.2, 1.5];
const RATE_LABELS = { 1.2: "1", 1.5: "1,5" };
let RATE = RATES.includes(Number(store.get("rate"))) ? Number(store.get("rate")) : 1.2;
function rateLabel() { return "⏩ " + RATE_LABELS[RATE] + "×"; }
$("#rate-btn").textContent = rateLabel();
$("#rate-btn").onclick = () => {
  RATE = RATES[(RATES.indexOf(RATE) + 1) % RATES.length];
  store.set("rate", RATE);
  $("#rate-btn").textContent = rateLabel();
  if (SPEAKER && SPEAKER.setRate) SPEAKER.setRate(RATE);
};
// «Читать вслух»: запоминается для каждого человека; по умолчанию — как в настройках
function autoReadKey() { return "autoread:" + (SESSION ? SESSION.user : ""); }
$("#autoread").onchange = () => {
  store.set(autoReadKey(), $("#autoread").checked);
  if (!$("#autoread").checked) stopSpeaking();
};
function setSpeakBtn(btn, state) {
  if (!btn) return;
  btn.textContent = state === "playing" ? "⏸ Пауза" : state === "paused" ? "▶ Дальше" : "🔊 Вслух";
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
  stopAutoSend();
  if (ABORT) { ABORT.abort(); return; }
  stopListening();
  const text = $("#input").value.trim();
  if (!text && !PENDING.length) return;
  track("Вопрос", { preset: CHAT.preset, think: $("#think").checked, files: PENDING.length });

  const content = [...PENDING.map((p) => p.block)];
  if (text) content.push({ type: "text", text });
  else content.push({ type: "text", text: "Посмотри, пожалуйста, что я приложил(а)." });
  const userMsg = { role: "user", content };
  liftPanel(); clearFollowups();
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
  const today = new Date().toLocaleDateString(LOCALE(), { day: "numeric", month: "long", year: "numeric", weekday: "long" });
  const hp = activeHelper();
  const FOLLOW = LIVE ? "" : "В самом конце ответа добавь одну строку вида [[кнопки: вариант | вариант | вариант]] — 2-4 коротких варианта (до 6 слов каждый), которые человек может просто нажать вместо того, чтобы печатать: от его лица, на языке разговора. Если ты задаёшь вопрос — варианты это готовые ответы на него. Если вопроса нет — что логично спросить или сделать дальше. Эту строку не упоминай в тексте.";
  const system = [CFG.baseSystem, LANG === "en" ? EN_SYSTEM : "", `Сегодня ${today}.`, personalSystem(), p.system, hp ? `Сейчас включён помощник «${hTitle(hp)}». ${hp.system}` : "", FOLLOW, LIVE ? LIVE_SYSTEM + (LIVE.fw ? `\nРазмер кадра: ${LIVE.fw}×${LIVE.fh} пикселей.` : "") : ""].filter(Boolean).join("\n\n");

  const bubble = el("div", "msg assistant");
  const body = el("div", "md typing");
  body.textContent = "Думаю…";
  bubble.append(body);
  $("#messages").append(bubble);
  scrollDown();

  setBusy(true);
  ABORT = new AbortController();
  let full = "";
  // Чтение вслух начинается, пока Claude ещё пишет ответ
  stopSpeaking();
  const autoRead = LIVE ? true : $("#autoread").checked;
  const live = LIVE ? new LiveSpeaker() : autoRead && useGemini() ? new Speaker() : null;
  let pre = null;
  try {
    const r = await fetch(CFG.proxy + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(LIVE
        ? { user: SESSION.user, password: SESSION.password, model: liveModel(), purpose: "live", web: false, think: false, system, messages: liveContext() }
        : { user: SESSION.user, password: SESSION.password, model: me().model, think: $("#think").checked, system, messages: contextMessages() }),
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
        } else if (ev.type === "content_block_start" && ev.content_block?.type === "thinking") {
          if (!started) body.textContent = "Обдумываю…";
        } else if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
          if (!started) { started = true; body.classList.remove("typing"); if (LIVE && LIVE.t0) liveTime(); }
          full += ev.delta.text;
          const shown = LIVE ? liveClean(full) : optClean(full);
          body.innerHTML = md(shown);
          if (live) live.push(shown);
          if (LIVE) $("#live-answer").textContent = liveTail(plain(shown));
          // предзапись первой фразы, даже если чтение вслух выключено, — чтобы «Вслух» звучал сразу
          else if (!pre && useGemini()) { const c = firstChunk(plain(full), false); if (c) { pre = c; ttsFetch(c).catch(() => {}); } }
          scrollDown();
        } else if (ev.type === "error") {
          throw new Error(ev.error?.type === "overloaded_error" ? "Claude перегружен, попробуйте через минуту" : "Ошибка при ответе");
        }
      }
    }
    if (!full) throw new Error("Пришёл пустой ответ, попробуйте ещё раз");
    let rawMarks = null, opts = [];
    if (!LIVE) { opts = optParse(full); full = optClean(full); body.innerHTML = md(full); }
    if (LIVE) { rawMarks = [...full.matchAll(MARK_RE)].map((m) => m[0]); if (rawMarks.length) rawMarks.push(`кадр ${LIVE.fw}×${LIVE.fh}`); liveShowMarks(liveParseMarks(full)); full = liveClean(full); body.innerHTML = md(full); }
    const msg = { role: "assistant", content: [{ type: "text", text: full }] };
    if (rawMarks && rawMarks.length) msg.marks = rawMarks;
    if (opts.length) msg.options = opts;
    CHAT.messages.push(msg);
    const acts = actions(full, msg);
    bubble.append(acts);
    if (msg.options) showFollowups(msg.options);
    await save();
    autoTitle(CHAT);
    const btn = acts.querySelector(".speak-btn");
    if (!live && useGemini()) {
      if (!pre) { pre = firstChunk(plain(full), true); if (pre) ttsFetch(pre).catch(() => {}); }
      if (pre && !msg.tts) { msg.tts = [pre]; save(); }
    }
    if (live) { live.end(); rememberChunks(msg, live); if (SPEAKER === live) live.setOwner(btn); }
    else if (autoRead && (LIVE || $("#autoread").checked)) speakText(full, btn, msg);
  } catch (err) {
    if (live) live.stop();
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

// четыре кнопки не исчезают: после первого вопроса поднимаются наверх в один ряд
function liftPanel() { const ec = $("#empty-chat"); if (ec && !ec.classList.contains("compact")) { ec.classList.add("compact"); $("#messages").prepend(ec); } }

/* ===== Кнопки-подсказки: чтобы не нужно было придумывать, что спросить ===== */
const OPT_RE = /\[\[\s*(?:кнопки|buttons|butang|pilihan)\s*:([^\]]*)\]\]/i;
function optParse(s) { const m = s.match(OPT_RE); return m ? m[1].split("|").map((x) => x.trim()).filter(Boolean).slice(0, 4) : []; }
function optClean(s) { return s.replace(new RegExp(OPT_RE.source, "gi"), "").replace(/\[\[[^\]]*$/, "").replace(/\[$/, "").trimEnd(); }
function clearFollowups() { document.querySelectorAll(".followups").forEach((x) => x.remove()); }
function quickSend(text) {
  clearFollowups();
  // «Сфотографирую…» — сразу открываем выбор фото, «Покажу…» — камеру
  if (/^(Сфотографирую|I'll take a photo)/i.test(text)) { pickFiles("image/*"); return; }
  if (/^(Покажу|I'll show)/i.test(text)) { startLive(); return; }
  $("#input").value = text; send();
}
function chipsRow(list, cls) {
  const row = el("div", "followups " + cls);
  list.forEach((t) => { const b = el("button", "fu-chip"); b.type = "button"; b.textContent = t; b.onclick = () => quickSend(t); row.append(b); });
  return row;
}
function showFollowups(list) { clearFollowups(); if (!list || !list.length) return; $("#messages").append(chipsRow(list, "after")); scrollDown(); }
function showStarters(chat) {
  const hp = chat.helper && CFG.helpers ? CFG.helpers[chat.helper] : null;
  const src = hp || CFG.presets[chat.preset] || {};
  const list = (LANG === "en" && src.examples_en) || src.examples;
  if (!list || !list.length) return;
  $("#messages").append(chipsRow(list, "start"));
}

/* ===== Помощники: готовые режимы с крупными плитками ===== */
// помощники, которые положены этому человеку (в config.json у каждого есть список "for")
function myHelpers(uid) { uid = uid || SESSION.user; return Object.entries(CFG.helpers || {}).filter(([, h]) => !h.for || h.for.includes(uid)); }
// админ может посмотреть, какой список помощников видит каждый человек
let HELPERS_VIEW = null;
function helpersOn() { return myHelpers().length > 0; }
const hTitle = (h) => (LANG === "en" && h.title_en ? h.title_en : h.title);
const hHint = (h) => (LANG === "en" && h.hint_en ? h.hint_en : h.hint);
function activeHelper() { return CHAT && CHAT.helper && CFG.helpers ? CFG.helpers[CHAT.helper] || null : null; }
function renderHelperChip() {
  const c = $("#helper-chip"), h = activeHelper();
  c.hidden = !h;
  if (!h) return;
  c.innerHTML = "";
  const t = el("span"); t.textContent = `${h.icon} ${hTitle(h)}`;
  const x = el("button"); x.type = "button"; x.textContent = "✕"; x.setAttribute("aria-label", "Выключить помощника");
  x.onclick = () => { CHAT.helper = null; save(); renderHelperChip(); toast("Помощник выключен"); };
  c.append(t, x);
}
function openHelpers() {
  const g = $("#helpers-grid"); g.innerHTML = "";
  const viewer = me().admin && HELPERS_VIEW ? HELPERS_VIEW : SESSION.user;
  const vEn = (CFG.users[viewer] || {}).lang === "en";
  const tOf = (h) => (vEn && h.title_en ? h.title_en : vEn ? T(h.title) : hTitle(h));
  // переключатель «чей список» — только у администратора
  if (me().admin) {
    const seg = el("div", "helpers-who");
    Object.entries(CFG.users).sort(([a], [b]) => (b === SESSION.user) - (a === SESSION.user)).forEach(([uid, u]) => {
      const b = el("button", uid === viewer ? "on" : ""); b.type = "button";
      b.textContent = `${u.avatar || ""} ${uid === SESSION.user ? "Я" : u.name} · ${myHelpers(uid).length}`;
      b.onclick = () => { HELPERS_VIEW = uid; openHelpers(); };
      seg.append(b);
    });
    g.append(seg);
  }
  // школьные помощники — отдельным блоком сверху
  const list = myHelpers(viewer), groups = [["school", "🍎 Для школы"], ["", "🏠 На каждый день"]];
  const grouped = list.some(([, h]) => h.group);
  groups.forEach(([gid, gname]) => {
  const part = list.filter(([, h]) => (h.group || "") === gid);
  if (!part.length) return;
  if (grouped) { const hh = el("h3", "helpers-group"); hh.textContent = gname; g.append(hh); }
  part.forEach(([id, h]) => {
    const b = el("button", "helper-tile" + (CHAT && CHAT.helper === id ? " on" : "")); b.type = "button";
    b.innerHTML = `<span class="ht-ico">${esc(h.icon)}</span><span class="ht-title">${esc(tOf(h))}</span>`;
    b.onclick = () => pickHelper(id);
    g.append(b);
  });
  });
  $("#helpers-sheet").hidden = false;
}
function closeHelpers() { $("#helpers-sheet").hidden = true; }
function pickHelper(id) {
  const h = CFG.helpers[id];
  closeHelpers();
  track("Помощник", { helper: id });
  // новый разговор, в котором Claude уже работает как выбранный помощник
  const chat = newChat("ask");
  chat.helper = id; chat.title = T(hTitle(h)); chat.emoji = h.icon;
  openChat(chat);
  if (h.action === "photo") pickFiles("image/*");
  else if (h.action === "live") startLive();
  else $("#input").focus();
}
$("#helpers-close").onclick = closeHelpers;
$("#helpers-sheet").onclick = (e) => { if (e.target.id === "helpers-sheet") closeHelpers(); };

/* ===== Видео: кадры для Claude + расшифровка звука ===== */
async function videoToBlocks(file) {
  toast("Готовлю видео: беру кадры и звук…");
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
  await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error("не открылось")); });
  const dur = isFinite(v.duration) ? v.duration : 0;
  const n = Math.max(1, Math.min(16, Math.ceil(dur / 3)));
  const k = Math.min(1, 768 / Math.max(v.videoWidth || 768, v.videoHeight || 768));
  const c = document.createElement("canvas"); c.width = Math.round((v.videoWidth || 768) * k); c.height = Math.round((v.videoHeight || 432) * k);
  const g = c.getContext("2d");
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = dur ? Math.min(dur - 0.05, (i + 0.5) * dur / n) : 0;
    await new Promise((res) => { const done = () => { v.onseeked = null; res(); }; v.onseeked = done; v.currentTime = t; setTimeout(done, 3000); });
    g.drawImage(v, 0, 0, c.width, c.height);
    frames.push({ t, data: c.toDataURL("image/jpeg", 0.75) });
  }
  URL.revokeObjectURL(url);
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  let speech = "";
  try { speech = await transcribeVideo(file); } catch (e) { speech = `(звук не расшифрован: ${e.message || e})`; }
  const blocks = [];
  frames.forEach((f, i) => {
    const item = { name: i === 0 ? file.name : `${file.name} · ${fmt(f.t)}`, block: { type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data.split(",")[1] } } };
    if (i === 0) item.preview = f.data; else item.hiddenChip = true;
    blocks.push(item);
  });
  blocks.push({ name: "🎬 " + file.name, hiddenChip: true, block: { type: "text", _file: file.name, text:
    `Видео «${file.name}», длительность ${fmt(dur)}. Выше по порядку кадры из видео (${frames.length} шт.) (моменты: ${frames.map((f) => fmt(f.t)).join(", ")}).\nРечь и звук из видео:\n${speech || "(тишина)"}` } });
  return blocks;
}
async function transcribeVideo(file) {
  if (file.size > 300 * 1024 * 1024) throw new Error("видео слишком большое");
  const buf = await file.arrayBuffer();
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  let au;
  try { au = await ac.decodeAudioData(buf); } finally { ac.close && ac.close(); }
  const RATE16 = 16000, secs = Math.min(au.duration, 600);
  const off = new OfflineAudioContext(1, Math.ceil(secs * RATE16), RATE16);
  const src = off.createBufferSource(); src.buffer = au; src.connect(off.destination); src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const wav = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) wav.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); wav.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt "); wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true); wav.setUint16(22, 1, true); wav.setUint32(24, RATE16, true); wav.setUint32(28, RATE16 * 2, true);
  wav.setUint16(32, 2, true); wav.setUint16(34, 16, true); w(36, "data"); wav.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) wav.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  const b64 = await toBase64(new Blob([wav.buffer], { type: "audio/wav" }));
  const r = await fetch(CFG.proxy + "/transcribe", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: SESSION.user, password: SESSION.password, audio: b64, mime: "audio/wav" }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "сервер не ответил");
  return d.text;
}

/* ===== Живой режим: камера + голос, ответы сразу вслух ===== */
const LIVE_SYSTEM = `Сейчас живой режим: человек говорит с тобой голосом и показывает камеру телефона. К каждой реплике приложен кадр — это то, что камера видит прямо сейчас. Отвечай как в живом разговоре: коротко (1–3 предложения), просто, без списков и разметки. Если на кадре не видно того, о чём спрашивают, попроси показать поближе или повернуть камеру.
Ты можешь показывать предметы прямо на экране. Когда речь о конкретном предмете в кадре (что это, где он, куда нажать, что взять), добавь в самом конце ответа для каждого такого предмета отдельную строку:
[[метка: короткое название; x, y, w, h]]
где x, y — левый верхний угол рамки предмета, w, h — её ширина и высота, в пикселях приложенного кадра (размер кадра указан ниже). Рамку подбирай плотно по предмету, внимательно сверяясь с кадром. Приложение нарисует её на экране и будет вести за предметом, когда камера двигается. Метки не читаются вслух, поэтому в тексте говори «вот здесь, я обвёл» вместо координат. Не больше 4 меток.`;
// голос телефона в живом режиме: начинает говорить с первой же законченной фразы, без задержки на запись
class LiveSpeaker {
  constructor() { this.spoken = 0; this.text = ""; this.left = 0; this.ended = false; this.owner = null; this.stopped = false; SPEAKER = this; speechSynthesis.cancel(); }
  setOwner(btn) { this.owner = btn; }
  say(t) {
    if (!t.trim() || this.stopped) return;
    const voices = speechSynthesis.getVoices();
    const ru = voices.find((v) => v.lang === SR_LANG() && /google|natural|online/i.test(v.name)) || voices.find((v) => v.lang?.startsWith(LANG));
    splitText(t, 220).forEach((c) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = SR_LANG(); if (ru) u.voice = ru; u.rate = 1.05 * RATE;
      this.left++;
      u.onend = u.onerror = () => { this.left--; this.check(); };
      speechSynthesis.speak(u);
    });
  }
  push(full) {
    this.text = plain(full);
    const rest = this.text.slice(this.spoken);
    const re = /[.!?…]+["»)]*\s+/g; let end = -1, m;
    while ((m = re.exec(rest))) end = m.index + m[0].length;
    if (end > 0) { this.say(rest.slice(0, end)); this.spoken += end; }
  }
  end() { this.ended = true; this.say(this.text.slice(this.spoken)); this.spoken = this.text.length; this.check(); }
  check() { if (this.ended && this.left <= 0 && SPEAKER === this) SPEAKER = null; }
  pause() { speechSynthesis.pause(); } resume() { speechSynthesis.resume(); } setRate() {}
  stop() { this.stopped = true; speechSynthesis.cancel(); if (SPEAKER === this) SPEAKER = null; }
}
// крупный текст ответа: показываем только последние слова, чтобы помещались
function liveTail(t) { t = t.trim(); if (t.length <= 110) return t; const cut = t.slice(-110); return "…" + cut.slice(cut.indexOf(" ") + 1); }
const MARK_RE = /\[\[\s*метка\s*:\s*([^;\]]+?)\s*;\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\]\]/gi;
function liveParseMarks(s) {
  const W = (LIVE && LIVE.fw) || 1000, H = (LIVE && LIVE.fh) || 1000;
  return [...s.matchAll(MARK_RE)].slice(0, 4).map((m) => ({ label: m[1], x: +m[2] / W, y: +m[3] / H, w: Math.max(0.03, +m[4] / W), h: Math.max(0.03, +m[5] / H) }));
}
function liveClean(s) { return s.replace(MARK_RE, "").replace(/\[\[[^\]]*$/, "").replace(/\[$/, "").trimEnd(); }

/* Трекинг меток: маленькая серая копия кадра, поиск шаблона рядом с прошлым местом */
const TW = 192;
function liveGray(src, w, h, mirror) {
  const c = LIVE.gc || (LIVE.gc = document.createElement("canvas"));
  c.width = TW; c.height = Math.round(TW * h / w);
  const g = c.getContext("2d", { willReadFrequently: true });
  g.save(); if (mirror) { g.translate(c.width, 0); g.scale(-1, 1); }
  g.drawImage(src, 0, 0, c.width, c.height); g.restore();
  const d = g.getImageData(0, 0, c.width, c.height).data, out = new Float32Array(c.width * c.height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11;
  return { px: out, w: c.width, h: c.height };
}
const TS = 14; // шаблон 14×14 точек внутри рамки
function liveSample(img, bx, by, bw, bh) {
  const t = new Float32Array(TS * TS); let sum = 0;
  for (let j = 0; j < TS; j++) for (let i = 0; i < TS; i++) {
    const x = Math.min(img.w - 1, Math.max(0, Math.round(bx + (i + 0.5) * bw / TS))), y = Math.min(img.h - 1, Math.max(0, Math.round(by + (j + 0.5) * bh / TS)));
    const v = img.px[y * img.w + x]; t[j * TS + i] = v; sum += v;
  }
  const mean = sum / t.length; let dev = 0;
  for (let k = 0; k < t.length; k++) { t[k] -= mean; dev += Math.abs(t[k]); }
  return { t, dev: dev / t.length || 1 };
}
function liveScore(a, b) { let s = 0; for (let k = 0; k < a.t.length; k++) s += Math.abs(a.t[k] - b.t[k]); return s / a.t.length / Math.max(8, a.dev); }
function liveSearch(img, mk, rad, step, far) {
  let best = { s: Infinity, x: mk.bx, y: mk.by };
  const pen = 3 / img.w; // чем дальше от прошлого места, тем строже: на повторяющемся узоре рамка не прыгает
  for (let dy = -rad; dy <= rad; dy += step) for (let dx = -rad; dx <= rad; dx += step) {
    const x = mk.bx + dx, y = mk.by + dy;
    if (x < -mk.bw / 2 || y < -mk.bh / 2 || x > img.w - mk.bw / 2 || y > img.h - mk.bh / 2) continue;
    const s = liveScore(mk.tpl, liveSample(img, x + mk.tx, y + mk.ty, mk.tw, mk.th)) + pen * Math.hypot(dx, dy);
    if (s < best.s) best = { s, x, y };
  }
  return best;
}
function liveShowMarks(marks) {
  liveClearMarks();
  if (!marks.length || !LIVE || !LIVE.capture) return;
  const cap = LIVE.capture;
  LIVE.marks = marks.map((m) => {
    const mk = { label: m.label, bx: m.x * cap.w, by: m.y * cap.h, bw: m.w * cap.w, bh: m.h * cap.h, ok: 1, born: performance.now() };
    // следим не только за самим предметом, но и за его окружением — так не перепутать с похожим узором рядом
    const ex = Math.max(mk.bw, 14) * 0.6, ey = Math.max(mk.bh, 14) * 0.6;
    mk.tx = -ex; mk.ty = -ey; mk.tw = mk.bw + ex * 2; mk.th = mk.bh + ey * 2;
    mk.tpl = liveSample(cap, mk.bx + mk.tx, mk.by + mk.ty, mk.tw, mk.th);
    return mk;
  });
  // первый поиск — по всему кадру: камера могла сдвинуться, пока Claude думал
  const v = $("#live-video");
  if (v.videoWidth) {
    const img = liveGray(v, v.videoWidth, v.videoHeight, LIVE.facing === "user");
    LIVE.marks.forEach((mk) => {
      if (mk.tpl.dev < 6) return; // однотонное место — следить не за что, рамка стоит на месте
      // пока Claude думал, камера обычно сдвигается немного — ищем рядом
      const keep = { bx: mk.bx, by: mk.by };
      let b = liveSearch(img, mk, Math.round(img.w * 0.12), 2); mk.bx = b.x; mk.by = b.y;
      b = liveSearch(img, mk, 2, 1);
      if (b.s < 0.75) { mk.bx = b.x; mk.by = b.y; mk.ok = 1; } else { mk.bx = keep.bx; mk.by = keep.by; mk.ok = 0.7; }
    });
  }
  LIVE.trackTimer = setInterval(liveTrack, 70);
  liveDraw();
}
function liveClearMarks() {
  if (!LIVE) return;
  clearInterval(LIVE.trackTimer); cancelAnimationFrame(LIVE.raf);
  LIVE.marks = [];
  const c = $("#live-marks"); c.getContext("2d").clearRect(0, 0, c.width, c.height);
}
function liveTrack() {
  if (!LIVE || !LIVE.marks.length) return;
  const v = $("#live-video"); if (!v.videoWidth) return;
  const img = liveGray(v, v.videoWidth, v.videoHeight, LIVE.facing === "user");
  LIVE.marks.forEach((mk) => {
    if (mk.tpl.dev < 6) return;
    let b = liveSearch(img, mk, 8, 2);
    const save = { bx: mk.bx, by: mk.by }; mk.bx = b.x; mk.by = b.y;
    b = liveSearch(img, mk, 2, 1);
    if (b.s < 0.75) {
      mk.bx = b.x; mk.by = b.y; mk.ok = Math.min(1, mk.ok + 0.25);
      // шаблон чуть подстраивается под свет и поворот
      const cur = liveSample(img, mk.bx + mk.tx, mk.by + mk.ty, mk.tw, mk.th);
      for (let k = 0; k < cur.t.length; k++) mk.tpl.t[k] = mk.tpl.t[k] * 0.9 + cur.t[k] * 0.1;
    } else { mk.bx = save.bx; mk.by = save.by; mk.ok = Math.max(0.25, mk.ok - 0.2); }
  });
  LIVE.trackW = img.w; LIVE.trackH = img.h;
  // метки живут 40 секунд или до следующего вопроса
  if (performance.now() - LIVE.marks[0].born > 40000) liveClearMarks();
}
function liveDraw() {
  if (!LIVE || !LIVE.marks.length) return;
  const c = $("#live-marks"), v = $("#live-video"), dpr = devicePixelRatio || 1;
  const W = c.clientWidth, H = c.clientHeight;
  if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const vw = v.videoWidth || 1, vh = v.videoHeight || 1, s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
  const cw = LIVE.capture.w, ch = LIVE.capture.h, t = performance.now() / 1000;
  LIVE.marks.forEach((mk) => {
    // плавное движение рамки на экране
    mk.sx = mk.sx == null ? mk.bx : mk.sx + (mk.bx - mk.sx) * 0.35; mk.sy = mk.sy == null ? mk.by : mk.sy + (mk.by - mk.sy) * 0.35;
    let x = ox + mk.sx / cw * vw * s, y = oy + mk.sy / ch * vh * s, w = mk.bw / cw * vw * s, h = mk.bh / ch * vh * s;
    if (w < 64) { x -= (64 - w) / 2; w = 64; } if (h < 64) { y -= (64 - h) / 2; h = 64; }
    const pad = 6 + 3 * Math.sin(t * 5);
    g.globalAlpha = mk.ok;
    g.lineWidth = 6; g.strokeStyle = "#FFD23F"; g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 10;
    g.beginPath(); g.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 18); g.stroke();
    g.shadowBlur = 0;
    g.font = `800 30px ${VFONT}`;
    const lw = g.measureText(mk.label).width + 32, lx = Math.min(W - lw - 8, Math.max(8, x + w / 2 - lw / 2)), ly = y - pad - 60 < 70 ? y + h + pad + 10 : y - pad - 60;
    g.fillStyle = "#FFD23F"; g.beginPath(); g.roundRect(lx, ly, lw, 50, 25); g.fill();
    g.fillStyle = "#1b1b1b"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(mk.label, lx + lw / 2, ly + 26);
    g.globalAlpha = 1;
  });
  LIVE.raf = requestAnimationFrame(liveDraw);
}
let LIVE = null;
function liveModel() { return store.get("liveModel:" + SESSION.user) || "claude-haiku-5-5"; }
// в живом режиме — только последние реплики и только текущий кадр: меньше данных, быстрее ответ
function liveContext() {
  let msgs = CHAT.messages.slice(-7);
  while (msgs.length && msgs[0].role !== "user") msgs = msgs.slice(1);
  return msgs.map((m, i) => ({ role: m.role, content: m.content.map((b) => {
    if (b.type === "image") return i === msgs.length - 1 ? { type: "image", source: b.source } : { type: "text", text: "[кадр с камеры]" };
    if (b.type === "document") return { type: "text", text: `[документ: ${b.title || ""}]` };
    return { type: "text", text: b.text };
  }) }));
}
// сколько секунд прошло от конца фразы до первого слова ответа
function liveTime() { const t = ((performance.now() - LIVE.t0) / 1000).toFixed(1).replace(".", ","); $("#live-time").textContent = `⏱ ${t} с`; LIVE.t0 = 0; }
async function startLive() {
  if (!SR) { alert("В этом браузере нет распознавания речи. Откройте приложение в Chrome."); return; }
  if (!navigator.mediaDevices?.getUserMedia) { alert("Этот браузер не даёт доступ к камере."); return; }
  stopSpeaking();
  track("Живой режим");
  LIVE = { facing: "environment", stream: null, rec: null, busy: false, closed: false, marks: [] };
  $("#live").hidden = false;
  $("#live-heard").textContent = ""; $("#live-answer").textContent = "";
  try { await liveCamera(); } catch (e) { stopLive(); alert("Нет доступа к камере. Разрешите камеру для сайта в настройках браузера."); return; }
  liveListen();
}
async function liveCamera() {
  if (LIVE.stream) LIVE.stream.getTracks().forEach((t) => t.stop());
  LIVE.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: LIVE.facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  const v = $("#live-video"); v.srcObject = LIVE.stream; v.classList.toggle("mirror", LIVE.facing === "user");
  await v.play().catch(() => {});
}
function liveState(t, cls) { const b = $("#live-state"); b.textContent = t; b.className = "live-state" + (cls ? " " + cls : ""); }
function liveListen() {
  if (!LIVE || LIVE.closed) return;
  stopSpeaking();
  liveState("🎤 Слушаю… говорите", "listening");
  const r = new SR(); LIVE.rec = r;
  r.lang = SR_LANG(); r.interimResults = true; r.continuous = false;
  let said = "", hush = 0;
  // не ждём, пока телефон сам решит, что фраза закончилась: 0,8 с тишины — и отправляем
  r.onresult = (e) => {
    said = [...e.results].map((x) => x[0].transcript).join(" ").trim(); $("#live-heard").textContent = said;
    clearTimeout(hush); hush = setTimeout(() => { try { r.stop(); } catch (_) {} }, 800);
  };
  r.onerror = (e) => { if (e.error === "not-allowed") { liveState("Нет доступа к микрофону — разрешите его в браузере"); LIVE.rec = null; } };
  r.onend = () => {
    if (!LIVE || LIVE.closed || LIVE.rec !== r) return;
    LIVE.rec = null; clearTimeout(hush);
    if (said) { LIVE.t0 = performance.now(); liveAsk(said); } else setTimeout(liveListen, 250);
  };
  try { r.start(); } catch (_) { setTimeout(liveListen, 500); }
}
function liveFrame() {
  const v = $("#live-video");
  if (!v.videoWidth) return null;
  const k = Math.min(1, 512 / Math.max(v.videoWidth, v.videoHeight));
  const c = document.createElement("canvas"); c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
  LIVE.fw = c.width; LIVE.fh = c.height;
  const g = c.getContext("2d");
  if (LIVE.facing === "user") { g.translate(c.width, 0); g.scale(-1, 1); }
  g.drawImage(v, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.6).split(",")[1];
}
async function liveAsk(text) {
  LIVE.busy = true;
  liveClearMarks();
  liveState("💭 Думаю…", "thinking");
  $("#live-answer").textContent = "";
  const frame = liveFrame();
  const v = $("#live-video");
  LIVE.capture = v.videoWidth ? liveGray(v, v.videoWidth, v.videoHeight, LIVE.facing === "user") : null;
  const content = [];
  if (frame) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: frame } });
  content.push({ type: "text", text });
  const userMsg = { role: "user", content, live: true };
  liftPanel(); clearFollowups();
  CHAT.messages.push(userMsg);
  if (!CHAT.title) CHAT.title = text.slice(0, 60);
  renderMessage(userMsg);
  await save();
  const watch = setInterval(() => { if (LIVE && speechSynthesis.speaking) liveState("🔊 Отвечаю… нажмите, чтобы перебить", "speaking"); }, 300);
  try { await ask(); } catch (_) {}
  // ждём, пока ответ дочитается вслух, и снова слушаем
  while (LIVE && !LIVE.closed && (SPEAKER || ("speechSynthesis" in window && speechSynthesis.speaking))) await new Promise((r) => setTimeout(r, 250));
  clearInterval(watch);
  if (!LIVE || LIVE.closed) return;
  LIVE.busy = false;
  $("#live-heard").textContent = "";
  liveListen();
}
function stopLive() {
  if (!LIVE) return;
  liveClearMarks();
  LIVE.closed = true;
  if (LIVE.rec) { try { LIVE.rec.abort(); } catch (_) {} }
  if (LIVE.stream) LIVE.stream.getTracks().forEach((t) => t.stop());
  if (ABORT) ABORT.abort();
  stopSpeaking();
  LIVE = null;
  $("#live").hidden = true;
  $("#live-video").srcObject = null;
  scrollDown();
}
$("#live-close").onclick = stopLive;
$("#live-flip").onclick = async () => { if (!LIVE) return; LIVE.facing = LIVE.facing === "user" ? "environment" : "user"; try { await liveCamera(); } catch (_) { toast("Не удалось переключить камеру"); } };
// нажатие на кнопку состояния: во время ответа — перебить и слушать, во время слушания — закончить фразу
$("#live-state").onclick = () => {
  if (!LIVE) return;
  if (SPEAKER || LIVE.busy) { if (ABORT) ABORT.abort(); stopSpeaking(); }
  else if (LIVE.rec) { try { LIVE.rec.stop(); } catch (_) {} }
  else liveListen();
};

async function save() {
  CHAT.updated = Date.now();
  if (DB.db) { try { await DB.put(CHAT); } catch (_) {} }
}

/* ===== Файлы ===== */
const FILE_ACCEPT = "image/*,video/*,application/pdf,.txt,.md,.csv";
function pickFiles(accept) { const fi = $("#file-input"); fi.accept = accept || FILE_ACCEPT; fi.click(); setTimeout(() => { fi.accept = FILE_ACCEPT; }, 1000); }
$("#btn-attach").onclick = () => pickFiles();

$("#file-input").onchange = async (e) => {
  for (const f of e.target.files) {
    try {
      if (f.type.startsWith("video/")) {
        const v = await videoToBlocks(f);
        PENDING.push(...v);
      } else if (f.type.startsWith("image/")) {
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
    if (p.hiddenChip) return;
    const a = el("div", "att");
    if (p.preview) { const img = el("img"); img.src = p.preview; img.alt = ""; a.append(img); }
    else a.append(document.createTextNode("📄 " + p.name));
    const x = el("button");
    x.textContent = "✕";
    x.setAttribute("aria-label", "Убрать");
    // у видео убираем сразу все его кадры и расшифровку
    x.onclick = () => { let n = 1; while (PENDING[i + n] && PENDING[i + n].hiddenChip) n++; PENDING.splice(i, n); renderAttachments(); };
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
$("#btn-mic").onclick = () => {
  // во время отсчёта нажатие на микрофон отменяет отправку и стирает сообщение
  if (AUTO) { stopAutoSend(); $("#input").value = ""; autoGrow(); toast("Отправка отменена"); return; }
  rec ? stopListening() : startListening();
};
// После голосового ввода — 3 секунды на проверку, затем сообщение уходит само
const AUTO_MS = 3000;
let AUTO = null;
function startAutoSend() {
  stopAutoSend();
  const b = $("#btn-mic"), start = performance.now();
  b.classList.add("countdown");
  AUTO = { raf: 0 };
  const step = (now) => {
    if (!AUTO) return;
    const p = Math.min(1, (now - start) / AUTO_MS);
    b.style.setProperty("--p", p);
    if (p >= 1) { stopAutoSend(); send(); return; }
    AUTO.raf = requestAnimationFrame(step);
  };
  AUTO.raf = requestAnimationFrame(step);
}
function stopAutoSend() {
  if (!AUTO) return;
  cancelAnimationFrame(AUTO.raf);
  AUTO = null;
  const b = $("#btn-mic"); b.classList.remove("countdown"); b.style.removeProperty("--p");
}
// нажали на поле с текстом или начали печатать — отправку останавливаем, текст остаётся
["pointerdown", "keydown", "focus"].forEach((ev) => $("#input").addEventListener(ev, () => { if (AUTO) { stopAutoSend(); toast("Автоотправка остановлена — можно поправить текст"); } }));
function startListening() {
  stopSpeaking();
  rec = new SR();
  rec.lang = SR_LANG();
  rec.interimResults = true;
  rec.continuous = false;
  const base = $("#input").value ? $("#input").value.trim() + " " : "";
  let heard = false;
  rec.onresult = (e) => {
    heard = true;
    let t = "";
    for (const r of e.results) t += r[0].transcript;
    $("#input").value = base + t;
    autoGrow();
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed") alert("Разрешите доступ к микрофону в настройках браузера.");
  };
  rec.onend = () => {
    rec = null; $("#btn-mic").classList.remove("on");
    if (heard && $("#input").value.trim()) startAutoSend();
  };
  $("#btn-mic").classList.add("on");
  try { rec.start(); } catch (_) { rec = null; $("#btn-mic").classList.remove("on"); }
}
function stopListening() { if (rec) { try { rec.stop(); } catch (_) {} } }

/* ===== Голос: чтение вслух ===== */
function plain(text) {
  // Убираем разметку и превращаем заголовки и пункты списка в обычные фразы,
  // чтобы голос читал текст связно, а не кусками
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`>|#]/g, "")
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .map((l, i, arr) => (i < arr.length - 1 && !/[.!?…:;,]$/.test(l) ? l + "." : l))
    .join(" ")
    .replace(/\s{2,}/g, " ");
}
function splitText(t, max) {
  const parts = t.match(/[^.!?…]+[.!?…]*\s*/g) || [t];
  const out = [];
  let cur = "";
  parts.forEach((p) => { if ((cur + p).length > max && cur) { out.push(cur); cur = p; } else cur += p; });
  if (cur.trim()) out.push(cur);
  return out;
}

// Озвучка: голос Gemini через прослойку, при сбое — встроенный голос телефона.
// Текст режется на куски по предложениям; первый кусок короткий, чтобы голос зазвучал быстро,
// следующие готовятся, пока звучит предыдущий. Можно подавать текст по мере того, как Claude его пишет.
let SPEAKER = null;
let GEMINI_OFF = false;
function isSpeaking() { return !!SPEAKER; }
function useGemini() { return (CFG.voice || {}).engine === "gemini" && !GEMINI_OFF; }

function speakText(text, owner, msg) {
  stopSpeaking();
  const t = plain(text).trim();
  if (!t) return;
  const sp = useGemini() ? new Speaker() : new BrowserSpeaker();
  sp.setOwner(owner);
  if (sp.preset && msg && msg.tts) sp.preset(text, msg.tts);
  sp.push(text);
  sp.end();
  rememberChunks(msg, sp);
}
// запоминаем, как текст был разрезан, — для повторного воспроизведения из кэша
function rememberChunks(msg, sp) {
  if (!msg || !sp.all || !sp.all.length) return;
  const same = msg.tts && msg.tts.join("") === sp.all.join("");
  if (same) return;
  msg.tts = sp.all.slice();
  save();
}

const TTS_MEM = new Map();
// 30 голосов Gemini: все одинаковые по цене, говорят по-русски
const VOICES = [
  ["Sulafat", "тёплый"], ["Vindemiatrix", "нежный"], ["Achird", "дружелюбный"], ["Gacrux", "зрелый"], ["Schedar", "ровный"],
  ["Callirrhoe", "спокойный"], ["Umbriel", "спокойный"], ["Algieba", "плавный"], ["Despina", "плавный"], ["Achernar", "мягкий"],
  ["Charon", "дикторский"], ["Rasalgethi", "дикторский"], ["Iapetus", "чёткий"], ["Erinome", "чёткий"], ["Sadaltager", "знающий"],
  ["Kore", "твёрдый"], ["Orus", "твёрдый"], ["Alnilam", "твёрдый"], ["Zubenelgenubi", "непринуждённый"], ["Aoede", "лёгкий"],
  ["Leda", "молодой"], ["Puck", "бодрый"], ["Laomedeia", "бодрый"], ["Sadachbia", "живой"], ["Zephyr", "яркий"],
  ["Autonoe", "яркий"], ["Fenrir", "эмоциональный"], ["Pulcherrima", "напористый"], ["Enceladus", "с придыханием"], ["Algenib", "с хрипотцой"],
];
function userVoice() {
  return (SESSION && store.get("voice:" + SESSION.user)) || me().voice || (CFG.voice || {}).name || "Algieba";
}
async function ttsBlob(chunk, voice) {
  voice = voice || userVoice();
  const key = ttsKey(chunk, voice);
  let blob = TTS_MEM.get(key) || await ADB.get(key);
  if (blob) { TTS_MEM.set(key, blob); return blob; }
  blob = await ttsLoad(chunk, voice);
  TTS_MEM.set(key, blob);
  ADB.put(key, blob);
  return blob;
}
async function ttsFetch(chunk, voice) { return URL.createObjectURL(await ttsBlob(chunk, voice)); }
// Не больше двух запросов озвучки одновременно — у Google лимит в минуту
let TTS_ACTIVE = 0;
const TTS_WAIT = [];
async function ttsSlot() {
  if (TTS_ACTIVE < 2) { TTS_ACTIVE++; return; }
  await new Promise((r) => TTS_WAIT.push(r));
  TTS_ACTIVE++;
}
function ttsRelease() { TTS_ACTIVE--; const n = TTS_WAIT.shift(); if (n) n(); }
async function ttsLoad(chunk, voice) {
  await ttsSlot();
  try {
    for (let attempt = 0; ; attempt++) {
      try { return await ttsLoadOnce(chunk, voice); }
      catch (err) {
        // лимит в минуту: один раз ждём, сколько просит Google (не дольше 25 секунд), и пробуем снова
        if (err.retryAfter && attempt === 0 && err.retryAfter <= 25) { await new Promise((r) => setTimeout(r, err.retryAfter * 1000)); continue; }
        throw err;
      }
    }
  } finally { ttsRelease(); }
}
async function ttsLoadOnce(chunk, voice) {
  const v = CFG.voice || {};
  const r = await fetch(CFG.proxy + "/tts", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: SESSION.user, password: SESSION.password, text: chunk, voice: voice || userVoice(), model: v.model }),
  });
  if (r.status === 501) GEMINI_OFF = true;
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    const e = new Error(d.error || "Голос Gemini недоступен");
    if (r.status === 429) e.retryAfter = Math.max(3, Number(d.retryAfter) || 20);
    throw e;
  }
  return await r.blob();
}

// Первый кусок ответа — по тем же правилам, что и при чтении (50–260 символов, до конца предложения)
function firstChunk(t, final) {
  if (t.length < 50) return final && t.trim() ? t : null;
  const re = /[.!?…]+["»)]*\s+/g;
  let end = -1, m;
  while ((m = re.exec(t))) { const e = m.index + m[0].length; if (e <= 260 || end < 0) end = e; if (e >= 260) break; }
  if (end >= 50) return t.slice(0, end);
  return final ? t : null;
}

class Speaker {
  constructor() {
    this.full = ""; this.used = 0; this.queue = []; this.ended = false;
    this.stopped = false; this.audio = null; this.wake = null; this.count = 0;
    this.paused = false; this.owner = null; this.resumeWait = null; this.fallback = null; this.all = [];
    SPEAKER = this;
    this.run();
  }
  setOwner(btn) { this.owner = btn; setSpeakBtn(btn, this.paused ? "paused" : "playing"); }
  pause() {
    this.paused = true;
    if (this.audio) this.audio.pause();
    if (this.fallback) this.fallback.pause();
    setSpeakBtn(this.owner, "paused");
  }
  resume() {
    this.paused = false;
    if (this.audio) this.audio.play().catch(() => {});
    if (this.fallback) this.fallback.resume();
    if (this.resumeWait) { const r = this.resumeWait; this.resumeWait = null; r(); }
    setSpeakBtn(this.owner, "playing");
  }
  setRate(r) { if (this.audio) this.audio.playbackRate = r; }
  // full — весь текст ответа на данный момент (растёт, пока Claude пишет)
  push(full) { this.full = full; this.cut(false); }
  end() { this.ended = true; this.cut(true); }
  cut(final) {
    const t = plain(this.full);
    let rest = t.slice(this.used);
    for (;;) {
      // первый кусок короткий (голос стартует быстрее), остальные крупные (меньше пауз)
      const first = this.count === 0;
      const min = first ? 50 : 300, max = first ? 260 : 2000;
      if (!final && rest.length < (first ? min : 1200)) break;
      const re = /[.!?…]+["»)]*\s+/g;
      let end = -1, m;
      while ((m = re.exec(rest))) {
        const e = m.index + m[0].length;
        if (e <= max || end < 0) end = e;
        if (e >= max) break;
      }
      if (end < 0 || (!final && end < min)) {
        if (final && rest.trim()) { this.add(rest); this.used = t.length; }
        break;
      }
      this.add(rest.slice(0, end)); this.used += end; rest = rest.slice(end);
    }
    // будим очередь, только когда есть что читать или текст закончился
    if (this.wake && (this.queue.length || this.ended)) { const w = this.wake; this.wake = null; w(); }
  }
  // каждый кусок сразу отправляем на озвучку — пока звучит первый, остальные уже готовятся
  add(chunk) {
    if (!chunk.trim()) return;
    const item = { text: chunk, p: useGemini() ? ttsFetch(chunk) : null };
    if (item.p) item.p.catch(() => {});
    this.queue.push(item); this.all.push(chunk); this.count++;
  }
  // повтор: режем текст так же, как в прошлый раз, чтобы взять звук из кэша
  preset(full, chunks) {
    this.full = full;
    const t = plain(full);
    let pos = 0;
    for (const c of chunks) { if (t.slice(pos, pos + c.length) !== c) break; this.add(c); pos += c.length; }
    this.used = pos;
  }
  next() {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    if (this.ended || this.stopped) return Promise.resolve(null);
    return new Promise((res) => { this.wake = () => res(this.next()); });
  }
  async run() {
    let item = await this.next();
    while (item && !this.stopped) {
      let url;
      try { url = await item.p; }
      catch (err) {
        if (this.stopped) return;
        toast((err && err.message ? err.message : "Голос Gemini недоступен") + " — читаю голосом телефона");
        // Gemini не ответил — дочитываем встроенным голосом
        const left = [item.text, ...this.queue.map((q) => q.text)].join(" ");
        this.queue = [];
        this.fallback = new BrowserSpeaker(true);
        this.fallback.onDone = () => this.finish();
        this.fallback.push(left); this.fallback.end();
        if (this.paused) this.fallback.pause();
        return;
      }
      if (this.stopped) { URL.revokeObjectURL(url); return; }
      if (this.paused) await new Promise((r) => (this.resumeWait = r));
      if (this.stopped) { URL.revokeObjectURL(url); return; }
      await new Promise((res) => {
        this.audio = audioFor(url);
        this.audio.playbackRate = RATE;
        this.audio.onended = this.audio.onerror = () => { URL.revokeObjectURL(url); res(); };
        this.audio.play().catch(() => res());
      });
      this.audio = null;
      item = await this.next();
    }
    this.finish();
  }
  finish() { if (SPEAKER === this) SPEAKER = null; if (!this.stopped) setSpeakBtn(this.owner, "idle"); }
  stop() {
    this.stopped = true;
    setSpeakBtn(this.owner, "idle");
    if (this.fallback) this.fallback.stop();
    if (this.resumeWait) { const r = this.resumeWait; this.resumeWait = null; r(); }
    if (this.audio) { try { this.audio.pause(); } catch (_) {} }
    if (this.wake) { const w = this.wake; this.wake = null; w(); }
    if (SPEAKER === this) SPEAKER = null;
  }
}

// Встроенный голос телефона — с тем же управлением (пауза, скорость)
class BrowserSpeaker {
  constructor(inner) { this.text = ""; this.paused = false; this.owner = null; this.onDone = null; this.inner = inner; if (!inner) SPEAKER = this; }
  setOwner(btn) { this.owner = btn; setSpeakBtn(btn, "playing"); }
  push(full) { this.text = plain(full); }
  end() {
    browserSpeak(this.text, () => {
      if (!this.inner && SPEAKER === this) SPEAKER = null;
      setSpeakBtn(this.owner, "idle");
      if (this.onDone) this.onDone();
    });
  }
  pause() { this.paused = true; if ("speechSynthesis" in window) speechSynthesis.pause(); setSpeakBtn(this.owner, "paused"); }
  resume() { this.paused = false; if ("speechSynthesis" in window) speechSynthesis.resume(); setSpeakBtn(this.owner, "playing"); }
  setRate() {}
  stop() { if ("speechSynthesis" in window) speechSynthesis.cancel(); setSpeakBtn(this.owner, "idle"); if (!this.inner && SPEAKER === this) SPEAKER = null; }
}

function browserSpeak(t, onEnd) {
  if (!("speechSynthesis" in window)) { if (onEnd) onEnd(); return; }
  const voices = speechSynthesis.getVoices();
  const ru = voices.find((v) => v.lang === SR_LANG() && /google|natural|online/i.test(v.name)) || voices.find((v) => v.lang?.startsWith(LANG));
  // длинный текст читаем кусками — иначе на Android обрывается
  const chunks = splitText(t, 220);
  chunks.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c);
    u.lang = SR_LANG();
    if (ru) u.voice = ru;
    u.rate = 0.95 * RATE;
    if (i === chunks.length - 1 && onEnd) u.onend = onEnd;
    speechSynthesis.speak(u);
  });
}
function stopSpeaking() {
  if (SPEAKER) { SPEAKER.stop(); SPEAKER = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
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
// Обычный текст ответа — как на экране: без звёздочек и решёток, с номерами и точками списков
function mdText(src) {
  return String(src)
    .replace(/```[^\n]*\n?([\s\S]*?)(```|$)/g, "$1")
    .split("\n").map((l) => l
      .replace(/^#{1,6}\s+/, "")
      .replace(/^(\s*)[-*]\s+/, "$1• ")
      .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)"))
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
async function copyRich(src) {
  const plainText = mdText(src);
  try {
    if (window.ClipboardItem && navigator.clipboard.write) {
      const html = `<meta charset="utf-8"><div>${md(src)}</div>`;
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      })]);
      return;
    }
  } catch (_) {}
  await navigator.clipboard.writeText(plainText);
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
    else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { closeList(); out.push('<ul class="mk">'); list = "ul"; } out.push(`<li><span class="mk-n">•</span><span>${inline(m[1])}</span></li>`); }
    else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)/))) { if (list !== "ol") { closeList(); out.push('<ol class="mk">'); list = "ol"; } out.push(`<li><span class="mk-n">${m[1]}.</span><span>${inline(m[2])}</span></li>`); }
    else if (!line.trim()) { closeList(); }
    else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  });
  closeList();
  return out.join("").replace(/\u0000(\d+)\u0000/g, (_, i) => `<pre><code>${blocks[i]}</code></pre>`);
}

/* ===== Быстрое прослушивание начала ответа по нажатию на эмодзи разговора ===== */
let SNIPPET = null;
function stopSnippet() {
  if (!SNIPPET) return;
  try { SNIPPET.audio && SNIPPET.audio.pause(); } catch (_) {}
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  SNIPPET.btn.classList.remove("playing");
  SNIPPET = null;
}
function ttsKey(chunk, voice) {
  return [voice || userVoice(), (CFG.voice || {}).model || "", chunk.trim()].join("|");
}
async function ttsHas(chunk) {
  const key = ttsKey(chunk);
  return TTS_MEM.has(key) || !!(await ADB.get(key));
}
async function playSnippet(chat, btn) {
  const was = SNIPPET && SNIPPET.btn === btn;
  stopSnippet();
  stopSpeaking();
  if (was) return;
  const last = [...chat.messages].reverse().find((m) => m.role === "assistant");
  if (!last) { toast("В этом разговоре пока нет ответа"); return; }
  const first = (last.tts && last.tts[0]) || firstChunk(plain(textOf(last)), true);
  if (!first) return;
  const me_ = { btn, audio: null };
  SNIPPET = me_;
  btn.classList.add("playing");
  const done = () => { if (SNIPPET === me_) { btn.classList.remove("playing"); SNIPPET = null; } };
  if (!useGemini()) { browserSpeak(first, done); return; }
  // всё, что уже записано подряд с начала, играем целиком; иначе — только первую фразу
  let parts = [first];
  if (last.tts && last.tts.length > 1) {
    parts = [];
    for (const c of last.tts) { if (await ttsHas(c)) parts.push(c); else break; }
    if (!parts.length) parts = [first];
  }
  try {
    for (const part of parts) {
      const url = await ttsFetch(part);
      if (SNIPPET !== me_) return;
      me_.audio = audioFor(url);
      me_.audio.playbackRate = RATE;
      await new Promise((res, rej) => {
        me_.audio.onended = res;
        me_.audio.onerror = rej;
        me_.audio.onpause = () => { if (SNIPPET !== me_) res(); };
        me_.audio.play().catch(rej);
      });
      if (SNIPPET !== me_) return;
    }
    done();
  } catch (err) {
    if (SNIPPET !== me_) return;
    browserSpeak(first, done);
  }
}

/* ===== Образцы голосов: общие для всех, хранятся на сервере ===== */
async function sampleUrl(voice) {
  const key = "sample|" + voice + (LANG === "en" ? "|en" : "");
  let blob = TTS_MEM.get(key) || await ADB.get(key);
  if (!blob) {
    let r = await fetch(CFG.proxy + "/sample?voice=" + encodeURIComponent(voice) + (LANG === "en" ? "&lang=en" : "")).catch(() => null);
    if (!r || !r.ok) {
      // образца ещё нет — создаём его (один раз для всех)
      await ttsSlot();
      try {
        r = await fetch(CFG.proxy + "/sample", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: SESSION.user, password: SESSION.password, voice, lang: LANG }),
        });
      } finally { ttsRelease(); }
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        const e = new Error(d.error || "Не удалось загрузить голос");
        if (r.status === 429) e.retryAfter = Math.max(3, Number(d.retryAfter) || 20);
        throw e;
      }
    }
    blob = await r.blob();
    TTS_MEM.set(key, blob);
    ADB.put(key, blob);
  }
  return URL.createObjectURL(blob);
}

async function prepareAllSamples(btn) {
  btn.disabled = true;
  let have = [];
  try { have = (await fetch(CFG.proxy + "/samples").then((r) => r.json())).have || []; } catch (_) {}
  const todo = VOICES.map((v) => v[0]).filter((n) => !have.includes(n));
  let done = VOICES.length - todo.length;
  btn.textContent = `Готово ${done} из ${VOICES.length}`;
  for (const name of todo) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try { await sampleUrl(name); done++; break; }
      catch (err) { if (err.retryAfter) await new Promise((r) => setTimeout(r, err.retryAfter * 1000)); else break; }
    }
    btn.textContent = `Готово ${done} из ${VOICES.length}`;
    // не больше 8 в минуту — чтобы не упереться в лимит Google
    await new Promise((r) => setTimeout(r, 7500));
  }
  btn.textContent = done === VOICES.length ? "Все образцы готовы ✓" : `Готово ${done} из ${VOICES.length} — нажмите ещё раз`;
  btn.disabled = done === VOICES.length;
}

/* ===== Настройки ===== */
$("#btn-settings").onclick = openSettings;
$("#settings-back").onclick = () => { stopPreview(); startHome(); };
let PREVIEW = null;
function stopPreview() {
  if (PREVIEW) { try { PREVIEW.pause(); } catch (_) {} PREVIEW = null; }
  document.querySelectorAll(".voice-play").forEach((b) => (b.textContent = "▶"));
}
function openSettings() {
  stopSpeaking();
  show("screen-settings");
  const list = $("#voice-list");
  list.innerHTML = "";
  const cur = userVoice();
  document.querySelectorAll("#lang-seg button").forEach((b) => {
    b.classList.toggle("on", b.dataset.lang === LANG);
    b.onclick = () => { store.set("lang:" + SESSION.user, b.dataset.lang); setLang(b.dataset.lang); };
  });
  document.querySelectorAll("#live-seg button").forEach((b) => {
    b.classList.toggle("on", b.dataset.model === liveModel());
    b.onclick = () => { store.set("liveModel:" + SESSION.user, b.dataset.model); document.querySelectorAll("#live-seg button").forEach((x) => x.classList.toggle("on", x === b)); };
  });
  const vt = $("#voice-toggle"), vb = $("#voice-box");
  const curDesc = (VOICES.find((x) => x[0] === cur) || [])[1] || "";
  vt.innerHTML = `<span>🎙 ${esc(cur)}</span><span class="vdesc">${esc(curDesc)}</span><span class="vt-arrow">${vb.hidden ? "Выбрать ›" : "Свернуть ˄"}</span>`;
  vt.setAttribute("aria-expanded", String(!vb.hidden));
  vt.onclick = () => { vb.hidden = !vb.hidden; if (vb.hidden) stopPreview(); openSettings(); };
  VOICES.forEach(([name, desc]) => {
    const li = el("li", "voice" + (name === cur ? " on" : ""));
    const pick = el("button", "voice-pick");
    pick.innerHTML = `<span class="vname">${esc(name)}</span><span class="vdesc">${esc(desc)}</span>${name === cur ? '<span class="vcheck">✓</span>' : ""}`;
    pick.onclick = () => { store.set("voice:" + SESSION.user, name); openSettings(); toast("Голос выбран: " + name); };
    const play = el("button", "icon-btn voice-play");
    play.textContent = "▶";
    play.setAttribute("aria-label", "Послушать голос " + name);
    play.onclick = async () => {
      const was = play.textContent;
      stopPreview();
      if (was !== "▶") return;
      play.textContent = "⏳";
      try {
        const url = await sampleUrl(name);
        if (play.textContent !== "⏳") return;
        PREVIEW = audioFor(url);
        PREVIEW.playbackRate = RATE;
        play.textContent = "⏹";
        PREVIEW.onended = () => { play.textContent = "▶"; PREVIEW = null; };
        PREVIEW.play().catch(() => (play.textContent = "▶"));
      } catch (err) {
        play.textContent = "▶";
        toast(err && err.message ? err.message : "Не удалось загрузить голос");
      }
    };
    li.append(pick, play);
    list.append(li);
  });
  const prep = $("#prep-samples");
  prep.hidden = !me().admin;
  if (!prep.disabled) { prep.textContent = "Подготовить все образцы голосов"; prep.onclick = () => prepareAllSamples(prep); }
  const pBox = $("#set-personal");
  pBox.checked = personalOn();
  pBox.onchange = () => store.set("personal:" + SESSION.user, pBox.checked);
  $("#btn-profile").onclick = openProfile;
  const outroBox = $("#set-outro");
  outroBox.checked = videoOutroOn();
  outroBox.onchange = () => store.set("outro:" + SESSION.user, outroBox.checked);
  $("#creative-block").hidden = !creativeAllowed();
  if (creativeAllowed()) {
    const lg = store.get("creativeLog:" + SESSION.user);
    $("#creative-log").textContent = lg ? `Последний творческий ролик (${new Date(lg.at).toLocaleString(LOCALE())}, ${lg.model.includes("opus") ? "Opus" : "Sonnet"}):\n` + lg.steps.join("\n") : "";
    const cr = $("#set-creative");
    cr.checked = creativePref();
    cr.onchange = () => store.set("creative:" + SESSION.user, cr.checked);
    document.querySelectorAll("#creative-model button").forEach((b) => {
      b.classList.toggle("on", b.dataset.model === creativeModel());
      b.onclick = () => {
        store.set("creativeModel:" + SESSION.user, b.dataset.model);
        document.querySelectorAll("#creative-model button").forEach((x) => x.classList.toggle("on", x === b));
      };
    });
  }
  document.querySelectorAll("#rate-seg button").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.rate) === RATE);
    b.onclick = () => {
      RATE = Number(b.dataset.rate);
      store.set("rate", RATE);
      $("#rate-btn").textContent = rateLabel();
      document.querySelectorAll("#rate-seg button").forEach((x) => x.classList.toggle("on", x === b));
    };
  });
}

/* ===== Экран «Обо мне» ===== */
let PF_FORM = "";
function openProfile() {
  stopPreview();
  show("screen-profile");
  const pf = profile();
  $("#pf-name").value = pf.name;
  $("#pf-about").value = pf.about;
  $("#pf-style").value = pf.style;
  PF_FORM = pf.form;
  document.querySelectorAll("#pf-form button").forEach((b) => {
    b.classList.toggle("on", b.dataset.form === PF_FORM);
    b.onclick = () => { PF_FORM = b.dataset.form; document.querySelectorAll("#pf-form button").forEach((x) => x.classList.toggle("on", x === b)); };
  });
}
$("#profile-back").onclick = () => openSettings();
$("#pf-save").onclick = () => {
  store.set("profile:" + SESSION.user, {
    name: $("#pf-name").value.trim() || me().name,
    form: PF_FORM,
    about: $("#pf-about").value.trim(),
    style: $("#pf-style").value.trim(),
  });
  toast("Сохранено — Claude будет это учитывать");
  openSettings();
};

/* ===== Установка на рабочий стол ===== */
let INSTALL_EVT = null;
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
function isStandalone() { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; }
function updateInstall() {
  const can = !isStandalone() && (INSTALL_EVT || IS_IOS);
  document.querySelectorAll(".install-btn").forEach((b) => (b.hidden = !can));
}
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); INSTALL_EVT = e; updateInstall(); });
window.addEventListener("appinstalled", () => { INSTALL_EVT = null; updateInstall(); });
document.querySelectorAll(".install-btn").forEach((b) => (b.onclick = async () => {
  if (INSTALL_EVT) {
    INSTALL_EVT.prompt();
    try { const c = await INSTALL_EVT.userChoice; track("Установка", { result: c && c.outcome }); } catch (_) {}
    INSTALL_EVT = null;
    updateInstall();
  } else if (IS_IOS) {
    alert("Чтобы установить на iPhone: нажмите кнопку «Поделиться» (квадрат со стрелкой) внизу экрана Safari и выберите «На экран Домой».");
  }
}));
updateInstall();

/* ===== Мелочи ===== */
let TOAST_T = null;
function toast(text) {
  let t = document.querySelector(".toast");
  if (!t) { t = el("div", "toast"); t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(TOAST_T);
  TOAST_T = setTimeout(() => t.classList.remove("show"), 5000);
}
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function fmtDate(t) {
  const d = new Date(t);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "сегодня, " + d.toLocaleTimeString(LOCALE(), { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(LOCALE(), { day: "numeric", month: "long" });
}

init();

/* ===== Видео 9:16 из ответа: озвучка + эмодзи и тема разговора + субтитры ===== */
const VW = 1080, VH = 1920, VFPS = 15, VRATE = 48000;

// Режем текст так же, как при чтении вслух, — тогда уже записанные куски берутся из кэша
function planChunks(full, prev) {
  const t = plain(full);
  const out = [];
  let pos = 0;
  if (prev) for (const c of prev) { if (t.slice(pos, pos + c.length) !== c) break; out.push(c); pos += c.length; }
  let rest = t.slice(pos);
  while (rest.trim()) {
    const max = out.length === 0 ? 260 : 2000;
    const re = /[.!?…]+["»)]*\s+/g;
    let end = -1, m;
    while ((m = re.exec(rest))) { const e = m.index + m[0].length; if (e <= max || end < 0) end = e; if (e >= max) break; }
    if (end < 0) { out.push(rest); break; }
    out.push(rest.slice(0, end)); rest = rest.slice(end);
  }
  return out.filter((c) => c.trim());
}

let VIDEO_BUSY = false;
// Кнопки под ответом должны стоять в одну строку: если не влезают — делаем мельче
function fitRow(row) {
  if (!row) return;
  const over = () => [...row.children].some((b) => !b.hidden && b.scrollWidth > b.clientWidth + 1) || row.scrollWidth > row.clientWidth + 1;
  row.classList.remove("tight", "tighter");
  if (over()) row.classList.add("tight");
  if (over()) row.classList.add("tighter");
}
addEventListener("resize", () => document.querySelectorAll(".msg-actions").forEach(fitRow));
function vidNote(btn, text) {
  const row = btn.closest(".msg-actions");
  let n = row.nextElementSibling;
  if (!n || !n.classList.contains("vid-note")) { n = el("div", "vid-note"); row.after(n); }
  n.textContent = text;
}
async function videoButton(btn, text, msg) {
  if (btn._ready) { track("Видео сохранено"); return saveVideo(btn._ready, btn); }
  if (VIDEO_BUSY) { toast("Подождите, видео ещё собирается"); return; }
  if (!useGemini()) { toast("Для видео нужен голос Gemini — сейчас он недоступен"); return; }
  VIDEO_BUSY = true;
  btn.disabled = true;
  const label = (s) => { btn.textContent = s; fitRow(btn.closest(".msg-actions")); };
  // секундомер: идёт, пока видео собирается, и остаётся с итоговым временем
  const timer = btn.previousElementSibling && btn.previousElementSibling.classList.contains("vid-timer") ? btn.previousElementSibling : null;
  const t0 = Date.now();
  const fmt = () => { const sec = Math.round((Date.now() - t0) / 1000); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
  let tick = null;
  if (timer) { timer.hidden = false; timer.textContent = "0:00"; timer.classList.remove("done"); tick = setInterval(() => (timer.textContent = fmt()), 1000); fitRow(btn.closest(".msg-actions")); }
  const stopTimer = (ok) => { if (!timer) return; clearInterval(tick); timer.textContent = fmt(); if (ok) timer.classList.add("done"); else timer.hidden = true; };
  try {
    const chat = CHAT;
    const p = CFG.presets[chat.preset] || {};
    const emoji = chat.emoji || p.icon || "💬";
    const title = chat.title || p.title || "Разговор";
    const chunks = planChunks(text, msg && msg.tts);
    const tStart = Date.now();
    // 1) озвучка всех кусков (уже записанные берутся из памяти бесплатно)
    const ac = new OfflineAudioContext(1, 1, VRATE);
    const parts = [];
    let done = 0;
    label(`⏳ 0/${chunks.length}`);
    const blobs = await Promise.all(chunks.map((c) => ttsBlob(c).then((b) => { done++; label(`⏳ ${done}/${chunks.length}`); return b; })));
    for (const b of blobs) parts.push((await ac.decodeAudioData(await b.arrayBuffer())).getChannelData(0));
    if (msg && (!msg.tts || msg.tts.length < chunks.length)) { msg.tts = chunks.slice(); save(); }
    const total = parts.reduce((n, a) => n + a.length, 0);
    const tVoice = Math.round((Date.now() - tStart) / 1000);
    const outro = videoOutroOn();
    const speech = total / VRATE;
    // в конце — тишина под финальную заставку (или короткая пауза, если заставка выключена)
    const pcm = new Float32Array(total + Math.round(VRATE * (outro ? OUTRO_SEC : 0.6)));
    const subs = [];
    let off = 0;
    parts.forEach((a, i) => {
      pcm.set(a, off);
      subTimes(chunks[i], off / VRATE, (off + a.length) / VRATE, subs);
      off += a.length;
    });
    // 2) сборка видео (если в разговоре есть фото — получится слайдшоу из них)
    const photos = await chatPhotos(msg);
    let scene = null;
    if (creativeOn()) {
      try { scene = await makeCreativeScene({ emoji, title, subs, speech, duration: pcm.length / VRATE, outro, photos }, label); }
      catch (e) {
        console.warn("Творческий режим:", e);
        vidNote(btn, "⚠️ Творческое видео не получилось: " + (e.message || e) + ". Сделано обычное. Подробности — в ⚙️ → Видео.");
      }
    } else if (creativeAllowed() && creativePref()) {
      const why = !creativePref() ? "творческий режим выключен в настройках"
        : !window.VideoEncoder || !window.OffscreenCanvas || !window.Worker ? "этот браузер не умеет творческие видео (нет WebCodecs/OffscreenCanvas)" : "неизвестно";
      vidNote(btn, "ℹ️ Обычное видео: " + why + ".");
    }
    label("⏳ 0%");
    if (!scene) scene = photos.length ? makePhotoScene(emoji, title, subs, pcm.length / VRATE, speech, outro, photos) : makeScene(emoji, title, subs, pcm.length / VRATE, speech, outro);
    let blob;
    const tEnc = Date.now();
    try { blob = await encodeVideo(scene, pcm, (k) => label(`⏳ ${Math.round(k * 100)}%`)); }
    finally { if (scene.destroy) scene.destroy(); }
    if (scene.log) scene.log(`видео собрано за ${Math.round((Date.now() - tEnc) / 1000)} с; озвучка заняла ${tVoice} с; всего ${Math.round((Date.now() - tStart) / 1000)} с`);
    const name = (title.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "Ответ") + (blob.type.includes("webm") ? ".webm" : ".mp4");
    btn._ready = new File([blob], name, { type: blob.type });
    if (IS_APPLE || me().admin || me().creative) {
      let peak = 0; for (let i = 0; i < pcm.length; i += 64) { const x = Math.abs(pcm[i]); if (x > peak) peak = x; }
      const a = (await audioInFile(blob)) + (peak > 0.02 ? "" : "-silent");
      vidNote(btn, /-silent$/.test(a) ? "⚠️ Голос не записался: озвучка пришла пустой (тишина)" : a === "AAC-nocfg" ? "⚠️ Звук AAC без настройки — iPhone может его не проиграть" : a === "AAC" ? `🔊 Звук в файле: AAC ✓${VIDEO_PATH ? " (" + VIDEO_PATH + ")" : ""}` : a === "Opus" ? "⚠️ Звук в файле: Opus — iPhone его не проигрывает" : "⚠️ В файле нет звука" + (VIDEO_PATH ? " (" + VIDEO_PATH + ")" : ""));
    }
    track("Видео", { mode: scene.frame ? "творческое" : "обычное", sec: Math.round(pcm.length / VRATE) });
    btn.disabled = false;
    label("💾 Видео");
    btn.classList.add("ready");
    stopTimer(true);
    toast("Видео готово — нажмите «💾 Видео», чтобы сохранить");
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    label("🎬 Видео");
    stopTimer(false);
    toast("Не получилось сделать видео: " + (err.message || err));
  } finally { VIDEO_BUSY = false; }
}

async function saveVideo(file, btn) {
  // на телефоне — меню «Поделиться» (сохранить в галерею, отправить в мессенджер); иначе — скачивание
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: file.name }); return; }
    catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

// Субтитры: кусок делится на фразы, время — пропорционально длине фраз
function subTimes(chunk, t0, t1, out) {
  const sent = chunk.match(/[^.!?…]+[.!?…]*["»)]*\s*/g) || [chunk];
  const blocks = [];
  let cur = "";
  sent.forEach((s) => { if ((cur + s).length > 170 && cur) { blocks.push(cur.trim()); cur = s; } else cur += s; });
  if (cur.trim()) blocks.push(cur.trim());
  const len = blocks.reduce((n, b) => n + b.length, 0) || 1;
  let t = t0;
  blocks.forEach((b) => { const d = (t1 - t0) * b.length / len; out.push({ t0: t, t1: t + d, text: b[0].toUpperCase() + b.slice(1) }); t += d; });
}

function wrapLines(g, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const tryL = cur ? cur + " " + w : w;
    if (g.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL;
  }
  if (cur) lines.push(cur);
  return lines;
}

const VFONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// Фото, которые человек прикладывал в этом разговоре до этого ответа (не больше 20)
async function chatPhotos(msg) {
  const idx = CHAT.messages.indexOf(msg);
  const src = [];
  CHAT.messages.slice(0, idx < 0 ? CHAT.messages.length : idx).forEach((m) => {
    if (m.role === "user" && !m.live) (m.content || []).forEach((b) => { if (b.type === "image" && b.source && b.source.data) src.push(b.source); });
  });
  const out = [];
  for (const s of src.slice(-20)) {
    try { out.push(await createImageBitmap(await (await fetch(`data:${s.media_type};base64,${s.data}`)).blob())); } catch (_) {}
  }
  return out;
}

// Слайдшоу: фото с плавным наездом и панорамой, переходы, заголовок, субтитры, заставка в конце
function makePhotoScene(emoji, title, subs, duration, speech, outro, photos) {
  const cv = document.createElement("canvas"); cv.width = VW; cv.height = VH;
  const g = cv.getContext("2d");
  // размытый фон для каждого фото (маленький холст — дёшево и красиво)
  const bgs = photos.map((img) => {
    const c = document.createElement("canvas"); c.width = 135; c.height = 240;
    const x = c.getContext("2d"); x.filter = "blur(6px) brightness(.55)";
    const k = Math.max(c.width / img.width, c.height / img.height);
    x.drawImage(img, (c.width - img.width * k) / 2, (c.height - img.height * k) / 2, img.width * k, img.height * k);
    return c;
  });
  const n = photos.length, per = speech / n, FADE = Math.min(0.6, per / 3);
  g.font = `700 58px ${VFONT}`;
  subs.forEach((s) => { s.plines = wrapLines(g, s.text, 940).slice(0, 4); });
  function photo(i, p, alpha) {
    const img = photos[i];
    g.save(); g.globalAlpha = alpha;
    g.imageSmoothingQuality = "high";
    g.drawImage(bgs[i], 0, 0, VW, VH);
    const portrait = img.height / img.width > 1.3;
    const zoom = 1 + 0.12 * p, dir = [[-1, 0], [1, 0], [0, -1], [0, 1]][i % 4];
    let k = portrait ? Math.max(VW / img.width, VH / img.height) : Math.min(1000 / img.width, 1400 / img.height);
    k *= zoom;
    const w = img.width * k, h = img.height * k;
    const x = (VW - w) / 2 + dir[0] * 40 * (p - 0.5), y = (VH - h) / 2 - (portrait ? 0 : 60) + dir[1] * 40 * (p - 0.5);
    if (!portrait) { g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 40; }
    g.drawImage(img, x, y, w, h);
    g.restore();
  }
  let si = 0;
  return {
    canvas: cv, duration,
    draw(t) {
      if (outro && t >= speech) { outroDraw(g, t - speech, appName(), T("Спросите о своём"), T(`в «${appName()}»`)); return; }
      g.fillStyle = "#000"; g.fillRect(0, 0, VW, VH);
      const i = Math.min(n - 1, Math.floor(t / per)), tt = t - i * per;
      photo(i, tt / per, 1);
      if (i < n - 1 && tt > per - FADE) photo(i + 1, 0, (tt - (per - FADE)) / FADE);
      // заголовок в первые секунды
      const ta = Math.min(1, t / 0.4) * (1 - Math.max(0, Math.min(1, (t - 2.6) / 0.5)));
      if (ta > 0) {
        g.save(); g.globalAlpha = ta;
        const gr = g.createLinearGradient(0, 0, 0, 520); gr.addColorStop(0, "rgba(0,0,0,.65)"); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr; g.fillRect(0, 0, VW, 520);
        g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000";
        g.font = `120px ${VFONT}`; g.fillText(emoji, VW / 2, 190);
        g.fillStyle = "#FFFDF9"; g.font = `800 64px ${VFONT}`;
        wrapLines(g, title, 960).slice(0, 2).forEach((l, j) => g.fillText(l, VW / 2, 330 + j * 76));
        g.restore();
      }
      // субтитры снизу
      while (si < subs.length - 1 && t >= subs[si].t1) si++;
      while (si > 0 && t < subs[si].t0) si--;
      const s = subs[si];
      if (s && s.plines.length) {
        const gr = g.createLinearGradient(0, VH - 760, 0, VH); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(.45, "rgba(0,0,0,.6)"); gr.addColorStop(1, "rgba(0,0,0,.8)");
        g.fillStyle = gr; g.fillRect(0, VH - 760, VW, 760);
        g.font = `700 58px ${VFONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#FFFDF9";
        const y0 = VH - 290 - (s.plines.length - 1) * 74;
        s.plines.forEach((l, j) => g.fillText(l, VW / 2, y0 + j * 74));
      }
      g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(140, VH - 150, VW - 280, 8);
      g.fillStyle = "#E07A50"; g.fillRect(140, VH - 150, (VW - 280) * Math.min(1, t / speech), 8);
      g.font = `500 36px ${VFONT}`; g.fillStyle = "rgba(255,253,249,.8)"; g.textAlign = "center";
      g.fillText(appName(), VW / 2, VH - 90);
    },
  };
}
function makeScene(emoji, title, subs, duration, speech, outro) {
  speech = speech || duration;
  const cv = document.createElement("canvas");
  cv.width = VW; cv.height = VH;
  const g = cv.getContext("2d");
  // неподвижный фон с названием рисуем один раз
  const base = document.createElement("canvas");
  base.width = VW; base.height = VH;
  const b = base.getContext("2d");
  const grad = b.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, "#F8F3EB"); grad.addColorStop(1, "#EADCC8");
  b.fillStyle = grad; b.fillRect(0, 0, VW, VH);
  b.fillStyle = "rgba(181,83,46,0.08)";
  b.beginPath(); b.arc(VW / 2, 330, 250, 0, Math.PI * 2); b.fill();
  b.fillStyle = "#1F1B16"; b.textAlign = "center"; b.textBaseline = "alphabetic";
  let fs = 76;
  b.font = `700 ${fs}px ${VFONT}`;
  let tl = wrapLines(b, title, 940);
  while (tl.length > 3 && fs > 48) { fs -= 6; b.font = `700 ${fs}px ${VFONT}`; tl = wrapLines(b, title, 940); }
  tl = tl.slice(0, 3);
  tl.forEach((l, i) => b.fillText(l, VW / 2, 700 + i * fs * 1.25));
  const titleEnd = 700 + (tl.length - 1) * fs * 1.25 + 40;
  b.fillStyle = "#B5532E"; b.fillRect(VW / 2 - 60, titleEnd, 120, 6);
  b.fillStyle = "#6E655A"; b.font = `500 40px ${VFONT}`;
  // значок приложения и название — одной группой по центру
  const brand = appName(), isz = 48, gap = 14;
  const bw = isz + gap + b.measureText(brand).width;
  const lx = (VW - bw) / 2, ly = VH - 90 - 38, k = isz / 512;
  b.textAlign = "left";
  b.fillText(brand, lx + isz + gap, VH - 90);
  b.save(); b.translate(lx, ly); b.scale(k, k);
  b.fillStyle = "#B5532E"; b.beginPath(); b.roundRect(0, 0, 512, 512, 112); b.fill();
  b.strokeStyle = "#FFFDF9"; b.lineWidth = 34; b.lineCap = "round";
  b.beginPath(); b.arc(256, 250, 110, 0, Math.PI); b.stroke();
  b.fillStyle = "#FFFDF9"; b.beginPath(); b.arc(256, 186, 48, 0, Math.PI * 2); b.fill();
  b.restore();
  b.textAlign = "center";
  const subTop = titleEnd + 120, subBottom = VH - 260;
  // заранее раскладываем субтитры по строкам
  subs.forEach((s) => {
    let f = 62;
    g.font = `500 ${f}px ${VFONT}`;
    let lines = wrapLines(g, s.text, 940);
    while (lines.length * f * 1.4 > subBottom - subTop && f > 36) { f -= 4; g.font = `500 ${f}px ${VFONT}`; lines = wrapLines(g, s.text, 940); }
    s.f = f; s.lines = lines;
  });
  let si = 0, level = 0;
  return {
    canvas: cv, duration,
    draw(t, amp) {
      if (outro && t >= speech) { outroDraw(g, t - speech, appName(), T("Спросите о своём"), T(`в «${appName()}»`)); return; }
      level = level * 0.6 + Math.min(1, amp * 5) * 0.4;
      g.drawImage(base, 0, 0);
      // эмодзи «дышит» в такт голосу
      const sc = 1 + level * 0.1;
      g.save(); g.translate(VW / 2, 330); g.scale(sc, sc);
      g.font = `260px ${VFONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000";
      g.fillText(emoji, 0, 10); g.restore();
      while (si < subs.length - 1 && t >= subs[si].t1) si++;
      while (si > 0 && t < subs[si].t0) si--;
      const s = subs[si];
      if (s) {
        g.fillStyle = "#1F1B16"; g.textAlign = "center"; g.textBaseline = "alphabetic";
        g.font = `500 ${s.f}px ${VFONT}`;
        const h = s.lines.length * s.f * 1.4;
        const y0 = subTop + Math.max(0, (subBottom - subTop - h) / 2) + s.f;
        s.lines.forEach((l, i) => g.fillText(l, VW / 2, y0 + i * s.f * 1.4));
      }
      // полоска прогресса
      g.fillStyle = "rgba(31,27,22,0.12)"; g.fillRect(140, VH - 190, VW - 280, 10);
      g.fillStyle = "#B5532E"; g.fillRect(140, VH - 190, (VW - 280) * Math.min(1, t / speech), 10);
    },
  };
}

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("нет связи")); document.head.append(s); });
}
function rmsAt(pcm, t) {
  const n = Math.round(VRATE / VFPS), i0 = Math.floor(t * VRATE);
  let sum = 0, c = 0;
  for (let i = i0; i < i0 + n && i < pcm.length; i += 4) { sum += pcm[i] * pcm[i]; c++; }
  return c ? Math.sqrt(sum / c) : 0;
}

let VIDEO_PATH = "";
async function aacSelfTest(pcm) {
  if (!window.AudioDecoder) return null;
  try {
    let s0 = 0; while (s0 < pcm.length && Math.abs(pcm[s0]) < 0.05) s0++;
    if (s0 >= pcm.length) return null;
    const seg = pcm.slice(s0, Math.min(pcm.length, s0 + VRATE * 2));
    let inPeak = 0; for (const x of seg) inPeak = Math.max(inPeak, Math.abs(x));
    const chunks = []; let desc = null;
    const enc = new AudioEncoder({ output: (c, m) => {
      let d = new Uint8Array(c.byteLength); c.copyTo(d);
      if (d[0] === 0xff && (d[1] & 0xf6) === 0xf0) d = d.subarray(d[1] & 1 ? 7 : 9);
      chunks.push({ ts: c.timestamp, d });
      if (!desc && m && m.decoderConfig && m.decoderConfig.description && m.decoderConfig.description.byteLength) desc = ascFrom(m.decoderConfig.description);
    }, error: () => {} });
    enc.configure({ codec: "mp4a.40.2", sampleRate: VRATE, numberOfChannels: 1, bitrate: 128000 });
    const step = VRATE / 10;
    for (let i = 0; i < seg.length; i += step) {
      const data = seg.slice(i, Math.min(seg.length, i + step));
      const ad = new AudioData({ format: "f32-planar", sampleRate: VRATE, numberOfFrames: data.length, numberOfChannels: 1, timestamp: Math.round(i * 1e6 / VRATE), data });
      enc.encode(ad); ad.close();
    }
    await Promise.race([enc.flush(), new Promise((r) => setTimeout(r, 5000))]);
    try { enc.close(); } catch (_) {}
    if (!chunks.length) return { ok: false, inPeak, outPeak: 0 };
    let outPeak = 0;
    const dec = new AudioDecoder({ output: (a) => {
      const n = a.numberOfFrames, buf = new Float32Array(n);
      try { a.copyTo(buf, { planeIndex: 0, format: "f32-planar" }); for (const x of buf) outPeak = Math.max(outPeak, Math.abs(x)); } catch (_) {}
      a.close();
    }, error: () => {} });
    dec.configure({ codec: "mp4a.40.2", sampleRate: VRATE, numberOfChannels: 1, description: desc || aacConfig(VRATE, 1) });
    for (const c of chunks) dec.decode(new EncodedAudioChunk({ type: "key", timestamp: c.ts, data: c.d }));
    await Promise.race([dec.flush(), new Promise((r) => setTimeout(r, 5000))]);
    try { dec.close(); } catch (_) {}
    return { ok: outPeak > Math.min(0.01, inPeak / 5), inPeak, outPeak };
  } catch (e) { console.warn("Проверка AAC:", e); return null; }
}
// iPhone отдаёт настройку AAC завёрнутой в ES-дескриптор (03…04…05…) — достаём из неё саму AudioSpecificConfig (тег 05)
function ascFrom(desc) {
  try {
    const b = desc instanceof Uint8Array ? desc : new Uint8Array(desc.buffer ? desc.buffer.slice(desc.byteOffset, desc.byteOffset + desc.byteLength) : desc);
    const okAsc = (x) => x.length >= 2 && x.length <= 5 && (x[0] >> 3) >= 1 && (x[0] >> 3) <= 5;
    if (okAsc(b)) return b;
    for (let i = 0; i < b.length - 2; i++) {
      if (b[i] !== 0x05) continue;
      let j = i + 1, len = 0;
      for (let k = 0; k < 4; k++) { const v = b[j++]; len = (len << 7) | (v & 0x7f); if (!(v & 0x80)) break; }
      const asc = b.subarray(j, j + len);
      if (okAsc(asc)) return asc;
    }
  } catch (_) {}
  return null;
}
// AudioSpecificConfig для AAC-LC: тип 2, частота, каналы
function aacConfig(rate, ch) {
  const idx = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000].indexOf(rate);
  const v = (2 << 11) | ((idx < 0 ? 3 : idx) << 7) | (ch << 3);
  return new Uint8Array([v >> 8, v & 255]);
}
// какой звук оказался в готовом файле — чтобы видеть, где он теряется
async function audioInFile(blob) {
  try {
    const head = new Uint8Array(await blob.slice(0, 2e6).arrayBuffer()), tail = new Uint8Array(await blob.slice(Math.max(0, blob.size - 2e6)).arrayBuffer());
    const b = new Uint8Array(head.length + tail.length); b.set(head); b.set(tail, head.length);
    const has = (t) => { const c = [...t].map((x) => x.charCodeAt(0)); outer: for (let i = 0; i < b.length - c.length; i++) { for (let j = 0; j < c.length; j++) if (b[i + j] !== c[j]) continue outer; return true; } return false; };
    if (has("mp4a")) {
      // в esds должна быть настройка звука (тег 05) — без неё iPhone молчит
      const e = [...b].length && (() => { for (let i = 0; i < b.length - 4; i++) if (b[i] === 0x65 && b[i + 1] === 0x73 && b[i + 2] === 0x64 && b[i + 3] === 0x73) return i; return -1; })();
      if (e >= 0) { for (let i = e; i < Math.min(b.length - 1, e + 80); i++) if (b[i] === 0x05) { let j = i + 1; while (b[j] === 0x80) j++; const L = b[j]; if (L >= 2 && L <= 5 && (b[j + 1] >> 3) >= 1 && (b[j + 1] >> 3) <= 5 && ((((b[j + 1] & 7) << 1) | (b[j + 2] >> 7)) <= 11) && ((b[j + 2] >> 3) & 15) >= 1) return "AAC"; return "AAC-nocfg"; } return "AAC-nocfg"; }
      return "AAC";
    }
    if (has("A_AAC")) return "AAC";
    if (has("Opus") || has("A_OPUS")) return "Opus";
    return "";
  } catch (_) { return "?"; }
}
async function encodeVideo(scene, pcm, progress) {
  VIDEO_PATH = "";
  // iPhone без AAC в быстром кодировщике: картинка быстро, звук — записью самого iPhone
  const appleRemux = window.VideoEncoder && window.MediaRecorder && (store.get("forceRemux") || (IS_APPLE && !(window.AudioEncoder && await aacSupported())));
  // самопроверка: кодируем кусочек голоса в AAC и декодируем обратно — если вышла тишина, кодировщик сломан
  let remux = appleRemux;
  if (!remux && window.VideoEncoder && window.AudioEncoder && window.MediaRecorder && await aacSupported()) {
    const t = await aacSelfTest(pcm);
    if (t && !t.ok) { remux = true; VIDEO_PATH = "проверка: быстрый кодировщик дал тишину → звук записью iPhone"; }
  }
  if (remux) {
    VIDEO_PATH = VIDEO_PATH || "картинка — быстро, звук — записью iPhone";
    const silent = await encodeFast(scene, pcm, (k) => progress(k * 0.6), true);
    return await addAudioRealtime(silent, pcm, (k) => progress(0.6 + k * 0.4));
  }
  if (window.VideoEncoder && window.AudioEncoder) {
    try { return await encodeFast(scene, pcm, progress); }
    catch (e) { console.warn("WebCodecs:", e); if (scene.frame) throw e; }
  }
  return await encodeRealtime(scene, pcm, progress);
}

// Быстрый путь: кодируем кадры и звук напрямую, без проигрывания (десятки секунд вместо минут)
async function encodeFast(scene, pcm, progress, noAudio) {
  if (!window.Mp4Muxer) await loadScript("mp4-muxer.js?v=57");
  // H.264 открывается везде; VP9 — запасной вариант, если H.264 кодировать нечем
  let vcfg = null, vcodec = null;
  for (const [codec, mc] of [["avc1.640028", "avc"], ["avc1.4d0028", "avc"], ["avc1.42002a", "avc"], ["avc1.420034", "avc"], ["vp09.00.40.08", "vp9"]]) {
    const c = { codec, width: VW, height: VH, bitrate: 2_500_000, framerate: VFPS };
    try { if ((await VideoEncoder.isConfigSupported(c)).supported) { vcfg = c; vcodec = mc; break; } } catch (_) {}
  }
  if (!vcfg) throw new Error("кодек видео не поддерживается");
  let acfg = null, acodec = null;
  for (const [codec, mc] of [["mp4a.40.2", "aac"], ["opus", "opus"]]) {
    const c = { codec, sampleRate: VRATE, numberOfChannels: 1, bitrate: 128000 };
    try { if ((await AudioEncoder.isConfigSupported(c)).supported) { acfg = c; acodec = mc; break; } } catch (_) {}
  }
  if (!acfg && !noAudio) throw new Error("кодек звука не поддерживается");
  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: vcodec, width: VW, height: VH, frameRate: VFPS },
    ...(noAudio ? {} : { audio: { codec: acodec, sampleRate: VRATE, numberOfChannels: 1 } }),
    fastStart: "in-memory",
  });
  let fail = null;
  const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (fail = e) });
  ve.configure(vcfg);
  // iPhone отдаёт AAC без служебной настройки (AudioSpecificConfig) и иногда с ADTS-заголовками —
  // без настройки плеер не играет звук, поэтому вписываем её сами и снимаем заголовки
  let aFirst = true;
  const aacOut = (c, m) => {
    if (acodec !== "aac") return muxer.addAudioChunk(c, m);
    let data = new Uint8Array(c.byteLength); c.copyTo(data);
    if (data[0] === 0xff && (data[1] & 0xf6) === 0xf0) {
      const hl = data[1] & 1 ? 7 : 9;
      data = data.subarray(hl);
      c = new EncodedAudioChunk({ type: c.type, timestamp: c.timestamp, duration: c.duration ?? undefined, data });
    }
    if (aFirst) {
      aFirst = false;
      const d = (m && m.decoderConfig) || {};
      const desc = (d.description && d.description.byteLength && ascFrom(d.description)) || aacConfig(VRATE, 1);
      m = { decoderConfig: { codec: "mp4a.40.2", sampleRate: VRATE, numberOfChannels: 1, ...d, description: desc } };
    } else m = undefined;
    muxer.addAudioChunk(c, m);
  };
  const ae = noAudio ? null : new AudioEncoder({ output: aacOut, error: (e) => (fail = e) });
  if (ae) ae.configure(acfg);
  // звук
  const step = VRATE / 10;
  for (let i = 0; ae && i < pcm.length; i += step) {
    const data = pcm.slice(i, Math.min(pcm.length, i + step));
    const ad = new AudioData({ format: "f32-planar", sampleRate: VRATE, numberOfFrames: data.length, numberOfChannels: 1, timestamp: Math.round(i * 1e6 / VRATE), data });
    ae.encode(ad); ad.close();
  }
  // кадры
  const frames = Math.ceil(scene.duration * VFPS);
  for (let i = 0; i < frames; i++) {
    if (fail) throw fail;
    const t = i / VFPS;
    let src = scene.canvas;
    if (scene.frame) src = await scene.frame(t, rmsAt(pcm, t)); else scene.draw(t, rmsAt(pcm, t));
    const f = new VideoFrame(src, { timestamp: Math.round(i * 1e6 / VFPS), duration: Math.round(1e6 / VFPS) });
    ve.encode(f, { keyFrame: i % (VFPS * 2) === 0 });
    f.close();
    if (src !== scene.canvas && src.close) src.close();
    while (ve.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
    if (i % 15 === 0) { progress(i / frames); await new Promise((r) => setTimeout(r, 0)); }
  }
  await ve.flush(); if (ae) await ae.flush();
  if (fail) throw fail;
  muxer.finalize();
  progress(1);
  return new Blob([muxer.target.buffer], { type: "video/mp4" });
}

// Запасной путь (старые телефоны): записываем видео в реальном времени
async function encodeRealtime(scene, pcm, progress) {
  if (scene.frame) throw new Error("этот браузер не умеет быстро собирать видео");
  if (!window.MediaRecorder || !scene.canvas.captureStream) throw new Error("этот браузер не умеет записывать видео");
  const mime = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
  const ctx = sharedAC() || new AudioContext();
  const buf = ctx.createBuffer(1, pcm.length, VRATE);
  buf.copyToChannel(pcm, 0);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const dest = ctx.createMediaStreamDestination(); src.connect(dest);
  const stream = new MediaStream([...scene.canvas.captureStream(VFPS).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2_500_000 } : {});
  const parts = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));
  scene.draw(0, 0);
  rec.start(1000);
  await ctx.resume();
  const t0 = ctx.currentTime, w0 = performance.now();
  src.start();
  await new Promise((res) => {
    let fin = false;
    src.onended = () => { fin = true; res(); };
    const tick = () => {
      if (fin) return;
      // время звука; если звуковой часы «встали» — по обычным часам
      const t = Math.max(ctx.currentTime - t0, (performance.now() - w0) / 1000 - 0.3);
      if (t > scene.duration + 0.5) { fin = true; return res(); }
      scene.draw(t, rmsAt(pcm, t)); progress(Math.min(1, t / scene.duration));
      setTimeout(tick, 1000 / VFPS);
    };
    tick();
  });
  rec.stop();
  await Promise.race([stopped, new Promise((r) => setTimeout(r, 3000))]);
  try { src.disconnect(); } catch (_) {}
  return new Blob(parts, { type: (mime || "video/webm").split(";")[0] });
}

// iPhone: быстрый кодировщик звука даёт формат, который iPhone сам не играет (звук пропадает при сохранении).
// Поэтому картинку собираем быстро, а звук добавляем прогоном готового видео через запись самого iPhone (AAC).
async function addAudioRealtime(videoBlob, pcm, progress) {
  const mime = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
  const v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.preload = "auto";
  const vurl = URL.createObjectURL(videoBlob); v.src = vurl;
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error("не открылось видео")); setTimeout(res, 5000); });
  const cv = document.createElement("canvas"); cv.width = VW; cv.height = VH;
  const g = cv.getContext("2d");
  g.drawImage(v, 0, 0, VW, VH);
  const ctx = sharedAC() || new AudioContext();
  const buf = ctx.createBuffer(1, pcm.length, VRATE); buf.copyToChannel(pcm, 0);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const dest = ctx.createMediaStreamDestination(); src.connect(dest);
  const stream = new MediaStream([...cv.captureStream(VFPS * 2).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 3_000_000 } : {});
  const parts = []; rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.start(1000);
  await ctx.resume().catch(() => {});
  const dur = pcm.length / VRATE, w0 = performance.now();
  await v.play().catch(() => {});
  src.start();
  await new Promise((res) => {
    let fin = false;
    const done = () => { if (!fin) { fin = true; res(); } };
    v.onended = done;
    const tick = () => {
      if (fin) return;
      g.drawImage(v, 0, 0, VW, VH);
      const t = (performance.now() - w0) / 1000;
      progress(Math.min(1, t / dur));
      if (t > dur + 1) return done();
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tick); else setTimeout(tick, 1000 / (VFPS * 2));
    };
    tick();
    setTimeout(done, (dur + 2) * 1000);
  });
  g.drawImage(v, 0, 0, VW, VH);
  rec.stop();
  await Promise.race([stopped, new Promise((r) => setTimeout(r, 3000))]);
  try { src.disconnect(); } catch (_) {}
  URL.revokeObjectURL(vurl);
  return new Blob(parts, { type: (mime || "video/webm").split(";")[0] });
}
async function aacSupported() {
  try { return !!(await AudioEncoder.isConfigSupported({ codec: "mp4a.40.2", sampleRate: VRATE, numberOfChannels: 1, bitrate: 128000 })).supported; } catch (_) { return false; }
}

/* ===== Финальная заставка и настройки видео ===== */
const OUTRO_SEC = 3;
function videoOutroOn() { return !SESSION || store.get("outro:" + SESSION.user) !== false; }
function creativeAllowed() { return !!(me().admin || me().creative); }
// творческий режим включён по умолчанию только у администратора; остальным — простое видео, пока сами не включат
function creativePref() { const v = store.get("creative:" + SESSION.user); return v === null || v === undefined ? !!me().admin : v !== false; }
function creativeOn() { return !!(creativeAllowed() && creativePref() && window.VideoEncoder && window.Worker && window.OffscreenCanvas); }
function creativeModel() { return store.get("creativeModel:" + SESSION.user) || "claude-opus-5-5"; }

// Талисман и заставка — обычные функции без внешних зависимостей: их же получает песочница
function mascotDraw(g, cx, cy, size, t, talk) {
  const k = size / 512;
  g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(k, k);
  g.fillStyle = "#B5532E"; g.beginPath(); g.roundRect(0, 0, 512, 512, 112); g.fill();
  const open = talk ? 0.55 + 0.45 * Math.abs(Math.sin(t * 11)) * (0.6 + 0.4 * Math.sin(t * 3.1)) : 1;
  const blink = t % 3.2 > 3.05 ? 0.15 : 1;
  g.strokeStyle = "#FFFDF9"; g.lineWidth = 34; g.lineCap = "round";
  g.save(); g.translate(256, 250); g.scale(1, open); g.beginPath(); g.arc(0, 0, 110, 0, Math.PI); g.restore(); g.stroke();
  g.fillStyle = "#FFFDF9"; g.save(); g.translate(256, 186); g.scale(1, blink); g.beginPath(); g.arc(0, 0, 48, 0, Math.PI * 2); g.fill(); g.restore();
  g.restore();
}
function outroDraw(g, s, app, l1, l2) {
  const W = 1080, H = 1920, F = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const cl = (x) => Math.max(0, Math.min(1, x));
  const back = (x) => { x = cl(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#F8F3EB"); gr.addColorStop(1, "#EADCC8");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const p = back(s / 0.6);
  if (p > 0) mascotDraw(g, W / 2, 720, 300 * p, s, s > 0.5 && s < 2);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.globalAlpha = cl((s - 0.4) / 0.5); g.fillStyle = "#1F1B16"; g.font = `900 84px ${F}`; g.fillText(l1 || "Спросите о своём", W / 2, 1020);
  g.globalAlpha = cl((s - 0.6) / 0.5); g.fillStyle = "#B5532E"; g.fillText(l2 || `в «${app}»`, W / 2, 1130);
  g.restore();
}

/* ===== Песочница: код ролика от Claude выполняется отдельно от приложения =====
   iframe без доступа к сайту (sandbox, без same-origin, сеть запрещена) + Worker внутри него,
   чтобы зависший код можно было просто выбросить, не повесив страницу. */
function WORKER_MAIN() {
  const W = 1080, H = 1920, FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const SAFE = { x0: 60, x1: 1020, y0: 110, y1: 1690 };
  const cv = new OffscreenCanvas(W, H), g = cv.getContext("2d");
  const small = new OffscreenCanvas(540, 960), sg = small.getContext("2d");
  const info = new Map(), seen = new Set();
  let boxes = [], userDraw = null, brief = null, outro = false, speech = 1, level = 0, lastErr = null, curT = 0;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = {
    out: (x) => 1 - Math.pow(1 - clamp(x), 3),
    inOut: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    back: (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    elastic: (x) => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1; },
  };
  function rand(seed) { let s = (Math.abs(Math.floor(seed * 9973)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function record(kind, x, y, w, h, label) {
    if (g.globalAlpha < 0.35) return;
    const m = g.getTransform();
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    boxes.push({ kind, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), label });
  }
  function wrap(str, maxW) {
    const out = [];
    String(str).split("\n").forEach((para) => {
      let cur = "";
      para.split(/\s+/).filter(Boolean).forEach((w) => {
        const t = cur ? cur + " " + w : w;
        if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
      });
      out.push(cur);
    });
    return out;
  }
  function text(str, x, y, o = {}) {
    str = String(str == null ? "" : str); if (!str.trim()) return { w: 0, h: 0, size: 0 };
    const weight = o.weight || 700, align = o.align || "center", lh = o.lineHeight || 1.2, maxLines = o.maxLines || 3, minSize = o.minSize || 26;
    const m = g.getTransform(), sx = Math.hypot(m.a, m.b) || 1;
    let maxW = o.maxWidth;
    if (!maxW) {
      const gx = m.a * x + m.c * y + m.e; // ширина до краёв безопасной зоны в экранных точках
      const room = align === "center" ? 2 * Math.min(gx - SAFE.x0, SAFE.x1 - gx) : align === "left" ? SAFE.x1 - gx : gx - SAFE.x0;
      maxW = room / sx;
    }
    maxW = Math.max(40, maxW);
    let f = o.size || 64, lines;
    for (;;) {
      g.font = `${weight} ${f}px ${o.font || FONT}`;
      lines = wrap(str, maxW);
      const wide = Math.max(...lines.map((l) => g.measureText(l).width));
      if ((lines.length <= maxLines && wide <= maxW) || f <= minSize) break;
      f = Math.max(minSize, Math.floor(f * 0.92));
    }
    lines = lines.slice(0, maxLines);
    g.save();
    g.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    g.fillStyle = o.color || "#1F1B16"; g.textAlign = align; g.textBaseline = "middle";
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.strokeWidth || 8; g.lineJoin = "round"; }
    const step = f * lh, top = y - (lines.length * step) / 2 + step / 2;
    lines.forEach((l, i) => { if (o.stroke) g.strokeText(l, x, top + i * step); g.fillText(l, x, top + i * step); });
    const w = Math.max(...lines.map((l) => g.measureText(l).width));
    const bx = align === "center" ? x - w / 2 : align === "left" ? x : x - w;
    record("text", bx, y - (lines.length * step) / 2, w, lines.length * step, str.slice(0, 40));
    g.restore();
    return { w, h: lines.length * step, size: f };
  }
  function path(d, k, x, y, o = {}) {
    if (!d) return;
    seen.add(d);
    const meta = info.get(d) || { len: 3000, box: null };
    const s = o.scale || 1;
    g.save(); g.translate(x, y); g.scale(s, s);
    const p = new Path2D(d);
    if (o.fill && k > 0) { g.save(); g.globalAlpha *= clamp(k); g.fillStyle = o.fill; g.fill(p); g.restore(); }
    if (k > 0 && o.color !== null) {
      g.strokeStyle = o.color || "#1F1B16"; g.lineWidth = (o.width || 8) / s; g.lineCap = "round"; g.lineJoin = "round";
      g.setLineDash([meta.len, meta.len]); g.lineDashOffset = meta.len * (1 - clamp(k));
      g.stroke(p);
    }
    if (meta.box && k > 0.2) record("icon", meta.box.x, meta.box.y, meta.box.w, meta.box.h, "рисунок");
    g.restore();
  }
  function card(x, y, w, h, o = {}) {
    g.save();
    if (o.shadow) { g.shadowColor = "rgba(31,27,22,0.15)"; g.shadowBlur = 30; g.shadowOffsetY = 10; }
    g.fillStyle = o.color || "#FFFDF9"; g.beginPath(); g.roundRect(x, y, w, h, o.r == null ? 36 : o.r); g.fill();
    g.restore();
  }
  function emoji(ch, x, y, size) {
    g.save(); g.fillStyle = "#000"; g.font = `${size || 160}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, x, y);
    record("icon", x - size / 2, y - size / 2, size, size, "эмодзи"); g.restore();
  }
  function sub(t) {
    const subs = brief.subs; let i = 0;
    while (i < subs.length - 1 && t >= subs[i].t1) i++;
    const s = subs[i] || { t0: 0, t1: speech, text: "" };
    return { i, text: s.text, t0: s.t0, t1: s.t1, p: clamp((t - s.t0) / Math.max(0.01, s.t1 - s.t0)) };
  }
  let PH = [];
  function photo(i, x, y, w, h, o = {}) {
    const img = PH[i]; if (!img) return;
    g.save(); g.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    if (o.r) { g.beginPath(); g.roundRect(x, y, w, h, o.r); g.clip(); } else { g.beginPath(); g.rect(x, y, w, h); g.clip(); }
    const z = o.zoom || 1, fit = o.fit === "contain" ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height);
    const k = fit * z, iw = img.width * k, ih = img.height * k;
    const px = o.panX || 0, py = o.panY || 0;
    g.drawImage(img, x + (w - iw) / 2 + px * (iw - w) / 2, y + (h - ih) / 2 + py * (ih - h) / 2, iw, ih);
    g.restore();
  }
  const K = {
    W, H, SAFE, text, path, card, emoji, sub, ease, clamp, rand, photo,
    get photos() { return PH.length; }, photoSize: (i) => (PH[i] ? { w: PH[i].width, h: PH[i].height } : null),
    prog: (t, a, b) => clamp((t - a) / (b - a)),
    lerp: (a, b, x) => a + (b - a) * x,
    mascot: (cx, cy, size, talk) => { mascotDraw(g, cx, cy, size, curT, talk); record("icon", cx - size / 2, cy - size / 2, size, size, "талисман"); },
    palette: { bg: "#F6F1E9", ink: "#1F1B16", accent: "#B5532E", soft: "#F3E1D6", white: "#FFFDF9", muted: "#6E655A" },
    get g() { return g; }, get amp() { return level; },
  };
  function footer(t) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    g.fillStyle = "rgba(31,27,22,0.14)"; g.fillRect(140, H - 190, W - 280, 10);
    g.fillStyle = "#B5532E"; g.fillRect(140, H - 190, (W - 280) * clamp(t / speech), 10);
    g.font = `500 40px ${FONT}`; const app = brief.app; const bw = 62 + g.measureText(app).width, lx = (W - bw) / 2;
    g.fillStyle = "rgba(246,241,233,0.85)"; g.beginPath(); g.roundRect(lx - 20, H - 132, bw + 40, 64, 32); g.fill();
    mascotDraw(g, lx + 24, H - 100, 48, t, false);
    g.fillStyle = "#6E655A"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(app, lx + 62, H - 99);
    g.restore();
  }
  function render(t, amp) {
    boxes = []; curT = t;
    level = level * 0.6 + Math.min(1, (amp || 0) * 5) * 0.4;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.setLineDash([]);
    g.fillStyle = "#F6F1E9"; g.fillRect(0, 0, W, H);
    if (outro && t >= speech) { outroDraw(g, t - speech, brief.app, brief.o1, brief.o2); return; }
    g.save();
    try { userDraw(Math.min(t, speech - 0.001), K); } catch (e) { lastErr = lastErr || (e && e.message) || String(e); }
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.setLineDash([]); g.shadowColor = "transparent";
    footer(t);
  }
  function overlap(a, b) {
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    return w > 0 && h > 0 ? w * h : 0;
  }
  function analyze(t) {
    const out = [], txt = boxes.filter((b) => b.kind === "text"), ic = boxes.filter((b) => b.kind === "icon");
    const tt = t.toFixed(1);
    txt.forEach((b) => {
      if (b.x0 < SAFE.x0 - 6 || b.x1 > SAFE.x1 + 6 || b.y0 < SAFE.y0 - 6 || b.y1 > SAFE.y1 + 6) out.push(`на ${tt} с текст «${b.label}» выходит за безопасную зону экрана`);
    });
    for (let i = 0; i < txt.length; i++) for (let j = i + 1; j < txt.length; j++) {
      const a = txt[i], b = txt[j], o = overlap(a, b), m = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
      if (m > 0 && o / m > 0.08) out.push(`на ${tt} с тексты «${a.label}» и «${b.label}» налезают друг на друга`);
    }
    txt.forEach((a) => ic.forEach((b) => {
      const o = overlap(a, b), m = (a.x1 - a.x0) * (a.y1 - a.y0);
      if (m > 0 && o / m > 0.15) out.push(`на ${tt} с текст «${a.label}» налезает на ${b.label}`);
    }));
    return out;
  }
  onmessage = async (e) => {
    const m = e.data;
    try {
      if (m.cmd === "photos") {
        PH = m.bitmaps || [];
        postMessage({ id: m.id, ok: true });
      } else if (m.cmd === "load") {
        brief = m.brief; outro = m.outro; speech = m.brief.speech; lastErr = null; level = 0;
        K.title = brief.title; K.emojiMain = brief.emojiMain; K.duration = speech; K.subs = brief.subs;
        userDraw = new Function(m.code + "\n;return typeof draw === 'function' ? draw : null;")();
        if (!userDraw) throw new Error("в коде нет функции draw(t, k)");
        const tests = [0, 0.5, speech * 0.25, speech * 0.5, speech * 0.75, speech - 0.05];
        const t0 = performance.now();
        tests.forEach((t) => render(t, 0.2));
        const ms = (performance.now() - t0) / tests.length;
        postMessage({ id: m.id, ok: !lastErr, error: lastErr, ms, paths: [...seen].filter((d) => !info.has(d)) });
      } else if (m.cmd === "info") {
        m.list.forEach(([d, v]) => info.set(d, v));
        postMessage({ id: m.id, ok: true });
      } else if (m.cmd === "check") {
        lastErr = null;
        const issues = new Set();
        m.times.forEach((t) => { render(t, 0.2); analyze(t).forEach((x) => issues.add(x)); });
        postMessage({ id: m.id, ok: true, issues: [...issues].slice(0, 12), error: lastErr });
      } else if (m.cmd === "shots") {
        const shots = [];
        for (const t of m.times) {
          render(t, 0.2);
          sg.drawImage(cv, 0, 0, 540, 960);
          const b = await small.convertToBlob({ type: "image/jpeg", quality: 0.72 });
          const buf = new Uint8Array(await b.arrayBuffer());
          let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
          shots.push(btoa(s));
        }
        postMessage({ id: m.id, ok: true, shots });
      } else if (m.cmd === "frame") {
        render(m.t, m.amp);
        const bmp = cv.transferToImageBitmap();
        postMessage({ id: m.id, ok: true, bmp }, [bmp]);
      }
    } catch (err) {
      postMessage({ id: m.id, ok: false, error: (err && err.message) || String(err) });
    }
  };
}

// Внутри iframe: запускает Worker и пересылает сообщения; заодно меряет SVG-пути (в Worker нет DOM)
function FRAME_MAIN(workerSrc) {
  const w = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: "text/javascript" })));
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.appendChild(p); document.body.appendChild(svg);
  w.onmessage = (e) => {
    const m = e.data;
    if (m.paths && m.paths.length) {
      const list = m.paths.map((d) => {
        try { p.setAttribute("d", d); const b = p.getBBox(); return [d, { len: Math.max(1, p.getTotalLength()), box: { x: b.x, y: b.y, w: b.width, h: b.height } }]; }
        catch (_) { return [d, { len: 3000, box: null }]; }
      });
      w.postMessage({ cmd: "info", id: -1, list });
    }
    if (m.id === -1) return;
    parent.postMessage(m, "*", m.bmp ? [m.bmp] : []);
  };
  w.onerror = (e) => parent.postMessage({ id: -2, ok: false, error: e.message || "ошибка в коде ролика" }, "*");
  onmessage = (e) => { if (e.source === parent) w.postMessage(e.data, e.data && e.data.bitmaps ? e.data.bitmaps : []); };
}

class Sandbox {
  constructor() {
    this.id = 0; this.wait = new Map();
    const workerSrc = `${mascotDraw}\n${outroDraw}\n(${WORKER_MAIN})();`;
    const html = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; img-src data: blob:; style-src 'unsafe-inline'"><body><script>(${FRAME_MAIN})(${JSON.stringify(workerSrc)});<\/script></body>`;
    this.frameEl = document.createElement("iframe");
    this.frameEl.setAttribute("sandbox", "allow-scripts");
    this.frameEl.style.cssText = "position:fixed;width:1px;height:1px;left:-10px;top:-10px;border:0;opacity:0;pointer-events:none";
    this.frameEl.srcdoc = html;
    this.onMsg = (e) => {
      if (e.source !== this.frameEl.contentWindow) return;
      const m = e.data || {};
      if (m.id === -2) { this.wait.forEach((w) => w.rej(new Error(m.error))); this.wait.clear(); return; }
      const w = this.wait.get(m.id); if (!w) return;
      this.wait.delete(m.id); clearTimeout(w.timer); w.res(m);
    };
    addEventListener("message", this.onMsg);
    this.ready = new Promise((r) => (this.frameEl.onload = r));
    document.body.append(this.frameEl);
  }
  async call(msg, ms = 8000, transfer) {
    await this.ready;
    const id = ++this.id;
    return new Promise((res, rej) => {
      const timer = setTimeout(() => { this.wait.delete(id); rej(new Error("код ролика завис")); }, ms);
      this.wait.set(id, { res, rej, timer });
      this.frameEl.contentWindow.postMessage({ ...msg, id }, "*", transfer || []);
    });
  }
  async load(code, brief, outro) {
    const r = await this.call({ cmd: "load", code, brief, outro }, 10000);
    if (r.ok && r.paths && r.paths.length) await new Promise((res) => setTimeout(res, 150)); // пусть пути измерятся
    return r;
  }
  destroy() { removeEventListener("message", this.onMsg); this.frameEl.remove(); this.wait.clear(); }
}

/* ===== Режиссёр: Claude придумывает и программирует ролик ===== */
const DIRECTOR_PROMPT = `Ты — сильный моушн-дизайнер и программист. По тексту озвучки ты придумываешь и программируешь вертикальный ролик 1080×1920 на Canvas 2D. Каждый ролик уникален: своя идея, композиция, палитра, ритм. Не делай слайды с текстом — делай анимацию: предметы и метафоры, схемы, линии, которые рисуются, числа, которые набегают, движение камеры, смену планов.

ФОРМАТ ОТВЕТА: только один блок \`\`\`js … \`\`\` без пояснений. В нём функция draw(t, k), которая рисует кадр в момент t (секунды, 0…k.duration). Рядом можно объявить свои функции и константы. Кадры рисуются независимо и не по порядку — всё вычисляй из t, не храни состояние между вызовами. Нельзя: сеть, картинки, DOM, setTimeout, Math.random (используй k.rand(seed)).

ХОЛСТ: k.g — CanvasRenderingContext2D, k.W=1080, k.H=1920. Фон рисуешь сам (первым делом залей весь холст). Внизу (y > 1690) приложение рисует свою подпись — там ничего важного. Безопасная зона: x 60…1020, y 110…1690 (k.SAFE).

СИНХРОН С ГОЛОСОМ: k.subs — фразы озвучки [{t0,t1,text}]. k.sub(t) → {i, text, t0, t1, p} — текущая фраза (p — доля 0…1). Меняй сцены вместе с фразами. k.amp — громкость голоса 0…1 (для пульса, «дыхания»).

КИСТИ:
- k.text(str, x, y, opts) — ВЕСЬ текст рисуй только им: он сам уменьшает шрифт и переносит строки, чтобы влезть в экран. opts: size (64), weight (700), color, align ('center'|'left'|'right'), maxWidth, maxLines (3), lineHeight (1.2), alpha, font, stroke (цвет обводки), strokeWidth. y — центр блока. Возвращает {w,h,size}.
- k.path(d, progress, x, y, {scale, color, width, fill}) — SVG-путь с координатами вокруг 0,0; прорисовывается штрихом по мере progress 0…1; fill — заливка, проявляется вместе с progress. color: null — без обводки.
- k.card(x, y, w, h, {r, color, shadow}) — скруглённая подложка (x,y — левый верхний угол).
- k.emoji(символ, x, y, size); k.mascot(cx, cy, size, talking) — талисман приложения (терракотовый квадрат с улыбкой).
- k.prog(t,a,b) → 0…1; k.ease.out / inOut / back / elastic; k.lerp; k.clamp; k.rand(seed) → генератор 0…1.
- k.palette = {bg:'#F6F1E9', ink:'#1F1B16', accent:'#B5532E', soft:'#F3E1D6', white:'#FFFDF9', muted:'#6E655A'} — фирменная; можно придумать свою под тему, но текст должен хорошо читаться.
- k.title, k.emojiMain — тема ролика; k.duration — длина в секундах.

ФОТО (если пришли): k.photos — сколько фото, k.photoSize(i) → {w,h}. k.photo(i, x, y, w, h, {fit:'cover'|'contain', zoom, panX, panY (-1…1), alpha, r}) рисует фото i в рамку (обрезает по рамке, r — скругление). Фото — главный материал ролика: показывай их крупно, оживляй наездом и панорамой (zoom/panX/panY от t), монтируй под фразы, подписи и оформление — вокруг фото. Текст поверх фото — на тёмной плашке или с обводкой, чтобы читался.

КАЧЕСТВО:
- Текст на экране — короткие ключевые слова, числа, заголовки (до ~7 слов), а не полные фразы озвучки.
- Одновременно не больше 2–3 текстовых блоков; они не налезают друг на друга и на рисунки.
- У каждой сцены появление (0,3–0,6 с), жизнь (лёгкое движение) и уход. Плавно, через k.ease. Разные приёмы в разных сценах.
- Первые 1–2 секунды — цепляющее появление темы.
- Кадр рисуется быстро (<10 мс): не больше ~300 фигур, без тяжёлых циклов.
- Код компактный (до ~350 строк): сцены описывай массивом данных и общими функциями, без копирования одинаковых кусков.
- Если пришлют замечания или кадры — ответь исправленным кодом целиком.`;

async function directorCall(messages, onChars, model) {
  const r = await fetch(CFG.proxy + "/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: SESSION.user, password: SESSION.password, model: model || creativeModel(), web: false, purpose: "video", system: DIRECTOR_PROMPT, messages }),
  });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Claude не ответил"); }
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = "", out = "", stop = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      let ev; try { ev = JSON.parse(line.slice(5)); } catch (_) { continue; }
      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") { out += ev.delta.text; if (onChars) onChars(out.length); }
      else if (ev.type === "message_delta" && ev.delta?.stop_reason) stop = ev.delta.stop_reason;
      else if (ev.type === "error") throw new Error("Claude прервал ответ");
    }
  }
  return { text: out, stop };
}
function extractCode(s) {
  const m = s.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/i) || s.match(/```(?:js|javascript)?\s*\n([\s\S]*)$/i);
  return m ? m[1].trim() : null;
}

async function makeCreativeScene(v, label) {
  const brief = {
    title: v.title, emojiMain: v.emoji, speech: v.speech, app: appName(), o1: T("Спросите о своём"), o2: T(`в «${appName()}»`),
    subs: v.subs.map((s) => ({ t0: +s.t0.toFixed(2), t1: +s.t1.toFixed(2), text: s.text })),
  };
  const photos = v.photos || [];
  const ask = [
    `Ролик 9:16 по ответу помощника. Тема: ${v.emoji} ${v.title}. Длительность речи: ${v.speech.toFixed(1)} с (k.duration).`,
    photos.length ? `Фото от пользователя: ${photos.length} шт. (k.photo(0…${photos.length - 1})) — уменьшенные копии приложены выше по порядку. Сделай ролик из этих фото.` : ``,
    `Фразы озвучки с таймингом (секунды):`,
    ...brief.subs.map((s) => `[${s.t0.toFixed(2)}–${s.t1.toFixed(2)}] ${s.text}`),
    brief.subs.length > 14 ? `Фраз много — объединяй соседние в 8–14 сцен и держи код компактным.` : ``,
    LANG === "en" ? `ВАЖНО: зритель говорит по-английски — весь текст на экране (заголовки, подписи, надписи) пиши только на английском.` : ``,
    `Придумай идею и запрограммируй ролик.`,
  ].join("\n");
  const log = { at: new Date().toISOString(), model: creativeModel(), steps: [] };
  const T0 = Date.now(), sec = () => Math.round((Date.now() - T0) / 1000);
  // бюджет на работу Claude: после него правки и просмотр кадров пропускаются, берём лучшее, что есть
  const BUDGET = 150;
  const note = (x) => { log.steps.push(`[${sec()} с] ${x}`); try { store.set("creativeLog:" + SESSION.user, log); } catch (_) {} };
  // уменьшенные копии фото, чтобы Claude видел, что на них
  const thumbs = [];
  for (const b of photos.slice(0, 12)) {
    try {
      const k = Math.min(1, 384 / Math.max(b.width, b.height)), c = new OffscreenCanvas(Math.round(b.width * k), Math.round(b.height * k));
      c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
      const bytes = new Uint8Array(await (await c.convertToBlob({ type: "image/jpeg", quality: 0.7 })).arrayBuffer());
      let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      thumbs.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: btoa(s) } });
    } catch (_) {}
  }
  const msgs = [{ role: "user", content: thumbs.length ? [...thumbs, { type: "text", text: ask }] : ask }];
  // фото в песочницу (копии — оригиналы нужны для обычного видео, если творческое не выйдет)
  const sendPhotos = async (box) => {
    if (!photos.length) return;
    const copies = await Promise.all(photos.map((b) => createImageBitmap(b)));
    await box.call({ cmd: "photos", bitmaps: copies }, 10000, copies);
  };
  let cut = false;
  // правки пишет быстрый Sonnet: он только чинит готовый код
  const write = async (what, fast) => {
    const { text: txt, stop } = await directorCall(msgs, (n) => label(`✨ ${what} ${Math.min(99, Math.round(n / 120))}%`), fast ? "claude-sonnet-5-5" : null);
    cut = stop === "max_tokens";
    const code = extractCode(txt);
    note(`${what}: ${txt.length} симв.${cut ? ", оборвался по длине" : ""}${code ? "" : ", кода нет"}`);
    msgs.push({ role: "assistant", content: txt });
    return code;
  };
  let sb = new Sandbox();
  try {
    await sendPhotos(sb);
    label("✨ Идея…");
    let code = await write("Код");
    if (!code) throw new Error("Claude не прислал код");
    // запуск и автопроверка: до двух исправлений, запоминаем лучший вариант
    // точки проверки: каждые 0,5 с, но не больше ~120 на ролик
    const step = Math.max(0.5, v.speech / 120);
    const times = []; for (let t = 0.3; t < v.speech; t += step) times.push(+t.toFixed(2));
    const test = async (c) => {
      try {
        const r = await sb.load(c, brief, v.outro);
        if (!r.ok) return { problem: (cut ? "Код оборвался по лимиту длины — напиши короче, через данные и циклы. " : "") + `Код упал с ошибкой: ${r.error}` };
        const ch = await sb.call({ cmd: "check", times }, Math.max(30000, times.length * Math.max(400, r.ms * 3)));
        if (ch.error) return { problem: `Во время ролика ошибка: ${ch.error}` };
        const slow = r.ms > 150; // на телефоне кадр рисуется медленнее — это не провал, а повод упростить
        const issues = ch.issues.concat(slow ? [`кадр рисуется долго (${Math.round(r.ms)} мс) — упрости тяжёлые места`] : []);
        return { n: issues.length + (slow ? 4 : 0), problem: issues.length ? "Автопроверка нашла проблемы:\n- " + issues.join("\n- ") : null };
      } catch (e) {
        if (/завис/.test(e.message)) { sb.destroy(); sb = new Sandbox(); await sendPhotos(sb); }
        return { problem: `Код ролика завис или работает слишком медленно (${e.message}) — упрости.` };
      }
    };
    let best = null;
    for (let round = 0; round < 3; round++) {
      label("✨ Проверка…");
      const r = await test(code);
      note(`проверка ${round + 1}: ${r.problem ? r.problem.slice(0, 140) : "чисто"}`);
      if (r.n != null && (!best || r.n < best.n)) best = { code, n: r.n };
      if (!r.problem || round === 2) break;
      if (best && sec() > BUDGET) { note("время вышло — беру лучший вариант"); break; }
      msgs.push({ role: "user", content: r.problem + "\nИсправь и пришли код целиком." });
      code = (await write("Правка", true)) || code;
    }
    if (!best) throw new Error("код ролика не заработал");
    let good = best.code;
    await sb.load(good, brief, v.outro);
    // взгляд арт-директора на кадры
    label("✨ Кадры…");
    const shotTimes = [0.8, v.speech * 0.2, v.speech * 0.4, v.speech * 0.6, v.speech * 0.8, Math.max(0, v.speech - 0.4)].map((t) => +t.toFixed(2));
    const sh = sec() > BUDGET ? { ok: false } : await sb.call({ cmd: "shots", times: shotTimes }, 30000);
    if (!sh.ok && sec() > BUDGET) note("просмотр кадров пропущен — время вышло");
    if (sh.ok) {
      if (msgs[msgs.length - 1].role !== "assistant") msgs.push({ role: "assistant", content: "```js\n" + good + "\n```" });
      else if (good !== code) msgs.push({ role: "user", content: "Берём этот вариант кода:\n```js\n" + good + "\n```" }, { role: "assistant", content: "Хорошо." });
      msgs.push({ role: "user", content: [
        ...sh.shots.map((d) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: d } })),
        { type: "text", text: `Кадры ролика в моменты ${shotTimes.join(", ")} с. Посмотри как арт-директор: читаемость, налезания, обрезанный текст, пустые или скучные кадры, контраст. Если всё хорошо — ответь одним словом OK. Если есть что улучшить — пришли исправленный код целиком.` },
      ] });
      const { text: txt } = await directorCall(msgs, (n) => label(`✨ Улучшаю ${Math.min(99, Math.round(n / 120))}%`), "claude-sonnet-5-5");
      note(/^\s*OK\b/i.test(txt) ? "кадры: OK" : "кадры: прислал улучшение");
      const better = /^\s*OK\b/i.test(txt) ? null : extractCode(txt);
      if (better) {
        const r = await test(better);
        if (r.n != null && r.n <= best.n) good = better;
        else await sb.load(good, brief, v.outro);
      }
    }
    note("код готов, дальше сборка видео");
    return {
      log: (x) => note(x),
      duration: v.duration,
      frame: async (t, amp) => (await sb.call({ cmd: "frame", t, amp }, 8000)).bmp,
      destroy: () => sb.destroy(),
    };
  } catch (e) { note("ошибка: " + (e.message || e)); sb.destroy(); throw e; }
}
