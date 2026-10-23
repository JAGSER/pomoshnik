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
  document.title = CFG.appName || "Помощник AI";
  $("#app-name").textContent = CFG.appName || "Помощник AI";
  // не ждём хранилище дольше 3 секунд — без истории приложение тоже работает
  try { await Promise.race([DB.open(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]); } catch (_) {}
  ADB.open();

  SESSION = store.get("session");
  if (SESSION && CFG.users[SESSION.user]) startHome();
  else startLogin();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
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
  if (p.greeting) addNotice(p.greeting);
  chat.messages.forEach((m) => renderMessage(m));
  scrollDown();
  if (!matchMedia("(pointer: coarse)").matches) $("#input").focus();
}
$("#btn-back").onclick = () => { if (ABORT) ABORT.abort(); stopListening(); startHome(); };

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
      body: JSON.stringify({ user: SESSION.user, password: SESSION.password, text: `Вопрос: ${q}\n\nНачало ответа: ${a.slice(0, 600)}` }),
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
  };
  const copy = el("button");
  copy.textContent = "📋 Копия";
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(text); copy.textContent = "✓ Готово"; }
    catch (_) { copy.textContent = "Не вышло"; }
    setTimeout(() => (copy.textContent = "📋 Копия"), 1800);
  };
  const vid = el("button");
  vid.className = "vid-btn";
  vid.textContent = "🎬 Видео";
  vid.title = "Сохранить ответ как видео с озвучкой (9:16)";
  vid.setAttribute("aria-label", vid.title);
  vid.onclick = () => videoButton(vid, text, msg);
  a.append(speak, copy, vid);
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
  // Чтение вслух начинается, пока Claude ещё пишет ответ
  stopSpeaking();
  const autoRead = $("#autoread").checked;
  const live = autoRead && useGemini() ? new Speaker() : null;
  let pre = null;
  try {
    const r = await fetch(CFG.proxy + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: SESSION.user, password: SESSION.password, model: me().model, think: $("#think").checked, system, messages: contextMessages() }),
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
          if (!started) { started = true; body.classList.remove("typing"); }
          full += ev.delta.text;
          body.innerHTML = md(full);
          if (live) live.push(full);
          // предзапись первой фразы, даже если чтение вслух выключено, — чтобы «Вслух» звучал сразу
          else if (!pre && useGemini()) { const c = firstChunk(plain(full), false); if (c) { pre = c; ttsFetch(c).catch(() => {}); } }
          scrollDown();
        } else if (ev.type === "error") {
          throw new Error(ev.error?.type === "overloaded_error" ? "Claude перегружен, попробуйте через минуту" : "Ошибка при ответе");
        }
      }
    }
    if (!full) throw new Error("Пришёл пустой ответ, попробуйте ещё раз");
    const msg = { role: "assistant", content: [{ type: "text", text: full }] };
    CHAT.messages.push(msg);
    const acts = actions(full, msg);
    bubble.append(acts);
    await save();
    autoTitle(CHAT);
    const btn = acts.querySelector(".speak-btn");
    if (!live && useGemini()) {
      if (!pre) { pre = firstChunk(plain(full), true); if (pre) ttsFetch(pre).catch(() => {}); }
      if (pre && !msg.tts) { msg.tts = [pre]; save(); }
    }
    if (live) { live.end(); rememberChunks(msg, live); if (SPEAKER === live) live.setOwner(btn); }
    else if (autoRead && $("#autoread").checked) speakText(full, btn, msg);
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
        this.audio = new Audio(url);
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
  const ru = voices.find((v) => v.lang === "ru-RU" && /google|natural|online/i.test(v.name)) || voices.find((v) => v.lang?.startsWith("ru"));
  // длинный текст читаем кусками — иначе на Android обрывается
  const chunks = splitText(t, 220);
  chunks.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c);
    u.lang = "ru-RU";
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
      me_.audio = new Audio(url);
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
  const key = "sample|" + voice;
  let blob = TTS_MEM.get(key) || await ADB.get(key);
  if (!blob) {
    let r = await fetch(CFG.proxy + "/sample?voice=" + encodeURIComponent(voice)).catch(() => null);
    if (!r || !r.ok) {
      // образца ещё нет — создаём его (один раз для всех)
      await ttsSlot();
      try {
        r = await fetch(CFG.proxy + "/sample", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: SESSION.user, password: SESSION.password, voice }),
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
        PREVIEW = new Audio(url);
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
  const outroBox = $("#set-outro");
  outroBox.checked = videoOutroOn();
  outroBox.onchange = () => store.set("outro:" + SESSION.user, outroBox.checked);
  $("#creative-block").hidden = !me().admin;
  if (me().admin) {
    const cr = $("#set-creative");
    cr.checked = store.get("creative:" + SESSION.user) !== false;
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
    try { await INSTALL_EVT.userChoice; } catch (_) {}
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
  if (d.toDateString() === today.toDateString()) return "сегодня, " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
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
async function videoButton(btn, text, msg) {
  if (btn._ready) return saveVideo(btn._ready, btn);
  if (VIDEO_BUSY) { toast("Подождите, видео ещё собирается"); return; }
  if (!useGemini()) { toast("Для видео нужен голос Gemini — сейчас он недоступен"); return; }
  VIDEO_BUSY = true;
  btn.disabled = true;
  const label = (s) => { btn.textContent = s; };
  try {
    const chat = CHAT;
    const p = CFG.presets[chat.preset] || {};
    const emoji = chat.emoji || p.icon || "💬";
    const title = chat.title || p.title || "Разговор";
    const chunks = planChunks(text, msg && msg.tts);
    // 1) озвучка всех кусков (уже записанные берутся из памяти бесплатно)
    const ac = new OfflineAudioContext(1, 1, VRATE);
    const parts = [];
    let done = 0;
    label(`⏳ 0/${chunks.length}`);
    const blobs = await Promise.all(chunks.map((c) => ttsBlob(c).then((b) => { done++; label(`⏳ ${done}/${chunks.length}`); return b; })));
    for (const b of blobs) parts.push((await ac.decodeAudioData(await b.arrayBuffer())).getChannelData(0));
    if (msg && (!msg.tts || msg.tts.length < chunks.length)) { msg.tts = chunks.slice(); save(); }
    const total = parts.reduce((n, a) => n + a.length, 0);
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
    // 2) сборка видео
    let scene = null;
    if (creativeOn()) {
      try { scene = await makeCreativeScene({ emoji, title, subs, speech, duration: pcm.length / VRATE, outro }, label); }
      catch (e) { console.warn("Творческий режим:", e); toast("Творческое видео не получилось (" + (e.message || e) + ") — делаю обычное"); }
    }
    label("⏳ 0%");
    if (!scene) scene = makeScene(emoji, title, subs, pcm.length / VRATE, speech, outro);
    let blob;
    try { blob = await encodeVideo(scene, pcm, (k) => label(`⏳ ${Math.round(k * 100)}%`)); }
    finally { if (scene.destroy) scene.destroy(); }
    const name = (title.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "Ответ") + (blob.type.includes("webm") ? ".webm" : ".mp4");
    btn._ready = new File([blob], name, { type: blob.type });
    btn.disabled = false;
    label("💾 Видео");
    btn.classList.add("ready");
    toast("Видео готово — нажмите «💾 Видео», чтобы сохранить");
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    label("🎬 Видео");
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
  const brand = CFG.appName || "Помощник AI", isz = 48, gap = 14;
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
      if (outro && t >= speech) { outroDraw(g, t - speech, CFG.appName || "Помощник AI"); return; }
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

async function encodeVideo(scene, pcm, progress) {
  if (window.VideoEncoder && window.AudioEncoder) {
    try { return await encodeFast(scene, pcm, progress); }
    catch (e) { console.warn("WebCodecs:", e); if (scene.frame) throw e; }
  }
  return await encodeRealtime(scene, pcm, progress);
}

// Быстрый путь: кодируем кадры и звук напрямую, без проигрывания (десятки секунд вместо минут)
async function encodeFast(scene, pcm, progress) {
  if (!window.Mp4Muxer) await loadScript("mp4-muxer.js?v=26");
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
  if (!acfg) throw new Error("кодек звука не поддерживается");
  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: vcodec, width: VW, height: VH, frameRate: VFPS },
    audio: { codec: acodec, sampleRate: VRATE, numberOfChannels: 1 },
    fastStart: "in-memory",
  });
  let fail = null;
  const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (fail = e) });
  ve.configure(vcfg);
  const ae = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => (fail = e) });
  ae.configure(acfg);
  // звук
  const step = VRATE / 10;
  for (let i = 0; i < pcm.length; i += step) {
    const data = pcm.slice(i, Math.min(pcm.length, i + step));
    const ad = new AudioData({ format: "f32", sampleRate: VRATE, numberOfFrames: data.length, numberOfChannels: 1, timestamp: Math.round(i * 1e6 / VRATE), data });
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
  await ve.flush(); await ae.flush();
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
  const ctx = new AudioContext({ sampleRate: VRATE });
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
  ctx.close().catch(() => {});
  return new Blob(parts, { type: (mime || "video/webm").split(";")[0] });
}

/* ===== Финальная заставка и настройки видео ===== */
const OUTRO_SEC = 3;
function videoOutroOn() { return !SESSION || store.get("outro:" + SESSION.user) !== false; }
function creativeOn() { return !!(me().admin && store.get("creative:" + SESSION.user) !== false && window.VideoEncoder && window.Worker && window.OffscreenCanvas); }
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
function outroDraw(g, s, app) {
  const W = 1080, H = 1920, F = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const cl = (x) => Math.max(0, Math.min(1, x));
  const back = (x) => { x = cl(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#F8F3EB"); gr.addColorStop(1, "#EADCC8");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const p = back(s / 0.6);
  if (p > 0) mascotDraw(g, W / 2, 720, 300 * p, s, s > 0.5 && s < 2);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.globalAlpha = cl((s - 0.4) / 0.5); g.fillStyle = "#1F1B16"; g.font = `900 84px ${F}`; g.fillText("Спросите о своём", W / 2, 1020);
  g.globalAlpha = cl((s - 0.6) / 0.5); g.fillStyle = "#B5532E"; g.fillText(`в «${app}»`, W / 2, 1130);
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
  const K = {
    W, H, SAFE, text, path, card, emoji, sub, ease, clamp, rand,
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
    if (outro && t >= speech) { outroDraw(g, t - speech, brief.app); return; }
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
      if (m.cmd === "load") {
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
  onmessage = (e) => { if (e.source === parent) w.postMessage(e.data); };
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
  async call(msg, ms = 8000) {
    await this.ready;
    const id = ++this.id;
    return new Promise((res, rej) => {
      const timer = setTimeout(() => { this.wait.delete(id); rej(new Error("код ролика завис")); }, ms);
      this.wait.set(id, { res, rej, timer });
      this.frameEl.contentWindow.postMessage({ ...msg, id }, "*");
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

КАЧЕСТВО:
- Текст на экране — короткие ключевые слова, числа, заголовки (до ~7 слов), а не полные фразы озвучки.
- Одновременно не больше 2–3 текстовых блоков; они не налезают друг на друга и на рисунки.
- У каждой сцены появление (0,3–0,6 с), жизнь (лёгкое движение) и уход. Плавно, через k.ease. Разные приёмы в разных сценах.
- Первые 1–2 секунды — цепляющее появление темы.
- Кадр рисуется быстро (<10 мс): не больше ~300 фигур, без тяжёлых циклов.
- Если пришлют замечания или кадры — ответь исправленным кодом целиком.`;

async function directorCall(messages, onChars) {
  const r = await fetch(CFG.proxy + "/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: SESSION.user, password: SESSION.password, model: creativeModel(), web: false, system: DIRECTOR_PROMPT, messages }),
  });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Claude не ответил"); }
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = "", out = "";
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
      else if (ev.type === "error") throw new Error("Claude прервал ответ");
    }
  }
  return out;
}
function extractCode(s) {
  const m = s.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/i) || s.match(/```(?:js|javascript)?\s*\n([\s\S]*)$/i);
  return m ? m[1].trim() : null;
}

async function makeCreativeScene(v, label) {
  const brief = {
    title: v.title, emojiMain: v.emoji, speech: v.speech, app: CFG.appName || "Помощник AI",
    subs: v.subs.map((s) => ({ t0: +s.t0.toFixed(2), t1: +s.t1.toFixed(2), text: s.text })),
  };
  const ask = [
    `Ролик 9:16 по ответу помощника. Тема: ${v.emoji} ${v.title}. Длительность речи: ${v.speech.toFixed(1)} с (k.duration).`,
    `Фразы озвучки с таймингом (секунды):`,
    ...brief.subs.map((s) => `[${s.t0.toFixed(2)}–${s.t1.toFixed(2)}] ${s.text}`),
    `Придумай идею и запрограммируй ролик.`,
  ].join("\n");
  const msgs = [{ role: "user", content: ask }];
  const write = async (what) => {
    const txt = await directorCall(msgs, (n) => label(`✨ ${what} ${Math.min(99, Math.round(n / 120))}%`));
    const code = extractCode(txt);
    msgs.push({ role: "assistant", content: txt });
    return code;
  };
  const sb = new Sandbox();
  try {
    label("✨ Идея…");
    let code = await write("Код");
    if (!code) throw new Error("Claude не прислал код");
    // запуск и автопроверка: до двух исправлений, запоминаем лучший вариант
    const times = []; for (let t = 0.3; t < v.speech; t += 0.5) times.push(+t.toFixed(2));
    const test = async (c) => {
      const r = await sb.load(c, brief, v.outro);
      if (!r.ok) return { problem: `Код упал с ошибкой: ${r.error}` };
      if (r.ms > 60) return { problem: `Кадр рисуется слишком долго (${Math.round(r.ms)} мс) — упрости.` };
      const ch = await sb.call({ cmd: "check", times }, 30000);
      if (ch.error) return { problem: `Во время ролика ошибка: ${ch.error}` };
      return { n: ch.issues.length, problem: ch.issues.length ? "Автопроверка нашла проблемы:\n- " + ch.issues.join("\n- ") : null };
    };
    let best = null;
    for (let round = 0; round < 3; round++) {
      label("✨ Проверка…");
      const r = await test(code);
      if (r.n != null && (!best || r.n < best.n)) best = { code, n: r.n };
      if (!r.problem || round === 2) break;
      msgs.push({ role: "user", content: r.problem + "\nИсправь и пришли код целиком." });
      code = (await write("Правка")) || code;
    }
    if (!best) throw new Error("код ролика не заработал");
    let good = best.code;
    await sb.load(good, brief, v.outro);
    // взгляд арт-директора на кадры
    label("✨ Кадры…");
    const shotTimes = [0.8, v.speech * 0.2, v.speech * 0.4, v.speech * 0.6, v.speech * 0.8, Math.max(0, v.speech - 0.4)].map((t) => +t.toFixed(2));
    const sh = await sb.call({ cmd: "shots", times: shotTimes }, 30000);
    if (sh.ok) {
      if (msgs[msgs.length - 1].role !== "assistant") msgs.push({ role: "assistant", content: "```js\n" + good + "\n```" });
      else if (good !== code) msgs.push({ role: "user", content: "Берём этот вариант кода:\n```js\n" + good + "\n```" }, { role: "assistant", content: "Хорошо." });
      msgs.push({ role: "user", content: [
        ...sh.shots.map((d) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: d } })),
        { type: "text", text: `Кадры ролика в моменты ${shotTimes.join(", ")} с. Посмотри как арт-директор: читаемость, налезания, обрезанный текст, пустые или скучные кадры, контраст. Если всё хорошо — ответь одним словом OK. Если есть что улучшить — пришли исправленный код целиком.` },
      ] });
      const txt = await directorCall(msgs, (n) => label(`✨ Улучшаю ${Math.min(99, Math.round(n / 120))}%`));
      const better = /^\s*OK\b/i.test(txt) ? null : extractCode(txt);
      if (better) {
        const r = await test(better);
        if (r.n != null && r.n <= best.n) good = better;
        else await sb.load(good, brief, v.outro);
      }
    }
    return {
      duration: v.duration,
      frame: async (t, amp) => (await sb.call({ cmd: "frame", t, amp }, 5000)).bmp,
      destroy: () => sb.destroy(),
    };
  } catch (e) { sb.destroy(); throw e; }
}
