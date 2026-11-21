// Модуль «Советник»: всё лениво, чтобы сбой KV или npm не ронял основной сервер Помощника
let _kv = null;
async function KV() { return _kv || (_kv = await Deno.openKv()); }
let _wp = null;
async function WP() { return _wp || (_wp = (await import("npm:web-push@3.6.7")).default); }

const API = "https://api.xpiki.com/v1/messages";
const MODEL = "claude-opus-5-5";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-PA-Token"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" }
  });
}

function text(data, status = 200) {
  return new Response(data, {
    status,
    headers: { ...CORS, "content-type": "text/plain; charset=utf-8" }
  });
}

async function hash(value) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return [...new Uint8Array(bytes)]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

async function ownerHash() {
  return (await (await KV()).get(["pa", "owner"])).value;
}

async function authorized(req) {
  const token = req.headers.get("X-PA-Token");
  if (!token) return false;
  const saved = await ownerHash();
  return !!saved && saved === await hash(token);
}

async function body(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function noLinks(x) {
  return String(x || "")
    .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, "")
    .replace(/\[([^\]]*)\]\(https?:[^)]*\)/g, "$1")
    .replace(/\s*\(?https?:\/\/\S+\)?/g, "")
    .replace(/[ \t]+([.,;:])/g, "$1")
    .trim();
}

async function saveMessage(role, kind, messageText, title, thread) {
  messageText = noLinks(messageText);
  const t = Date.now();
  const id = crypto.randomUUID();
  const message = {
    id,
    t,
    role,
    kind,
    text: String(messageText || "")
  };
  if (title) message.title = String(title);
  if (thread) message.thread = String(thread);
  await (await KV()).set(["pa", "feed", t, id], message);
  return message;
}

async function isStarred(id) {
  return !!(await (await KV()).get(["pa", "star", id])).value;
}

async function threadCounts() {
  const result = {};
  for await (const item of (await KV()).list({ prefix: ["pa", "feed"] })) {
    const m = item.value;
    if (m?.thread) result[m.thread] = (result[m.thread] || 0) + 1;
  }
  return result;
}

async function feed(after = 0) {
  const result = [];
  const counts = await threadCounts();

  for await (const item of (await KV()).list({ prefix: ["pa", "feed"] })) {
    if (item.value?.t > after) {
      const message = {
        ...item.value,
        text: noLinks(item.value.text),
        starred: await isStarred(item.value.id)
      };
      if (message.kind === "idea") {
        message.threadCount = counts[message.id] || 0;
      }
      result.push(message);
    }
  }

  result.sort((a, b) => a.t - b.t);
  return result.slice(-300);
}

async function contextText() {
  const parts = [];
  for await (const item of (await KV()).list({ prefix: ["pa", "context"] })) {
    if (item.key.length === 3) parts.push(item.value || "");
  }
  parts.sort((a, b) => a[0] - b[0]);
  return parts.join("");
}

async function notes() {
  const result = [];
  for await (const item of (await KV()).list({ prefix: ["pa", "notes"] })) {
    if (item.value?.text) result.push(item.value);
  }
  return result.sort((a, b) => a.t - b.t);
}

async function recentIdeas() {
  const since = Date.now() - 30 * 86400000;
  const result = [];

  for await (const item of (await KV()).list({ prefix: ["pa", "feed"] })) {
    const m = item.value;
    if (m?.kind === "idea" && !m.thread && m.t >= since) {
      result.push(
        `${new Date(m.t).toLocaleDateString("ru-RU")}: ${m.title}: ${m.text}`
      );
    }
  }

  return result.sort();
}

function baliNow() {
  return new Date(Date.now() + 8 * 3600000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16);
}

async function systemPrompt(extra = "") {
  const c = await contextText();
  const n = await notes();
  const i = await recentIdeas();

  return [
    "Ты Советник, личный проактивный помощник Юрия Школуна. Отвечай только по-русски. Без длинных тире, вместо них запятые, двоеточия, точки или дефис. Без ссылок и URL в тексте. Без вступлений, анонсов темы и итоговых пересказов, одну мысль не повторяй. Пиши коротко и по делу, отвечай только на то, что спросили.",
    "БАЗА ЗНАНИЙ О ЮРИИ:\n" + (c || "пока не загружена"),
    "ЗАМЕТКИ (что Юрий говорил, принял и отверг):\n" +
      (n.length
        ? n.map(x => `${new Date(x.t).toLocaleDateString("ru-RU")}: ${x.text}`).join("\n")
        : "нет"),
    "ПОСЛЕДНИЕ ИДЕИ, КОТОРЫЕ ТЫ УЖЕ ПРЕДЛАГАЛ (не повторяй и не перефразируй):\n" +
      (i.length ? i.join("\n") : "нет"),
    "Если Юрий сообщает факт о себе, решение, принимает или отвергает идею, добавь в самый конец ответа отдельные строки вида `ЗАМЕТКА: <коротко, его словами, с сутью решения>`. Эти строки Юрий не увидит. Не пиши заметку, если ничего нового.",
    "Текущая дата и время на Бали: " + baliNow(),
    extra
  ].filter(Boolean).join("\n\n");
}

function cleanNotes(answer) {
  const found = [];
  const lines = answer.split(/\r?\n/);
  const visible = lines.filter(line => {
    const m = line.match(/^\s*ЗАМЕТКА:\s*(.+)$/i);
    if (m) found.push(m[1].trim());
    return !m;
  });
  return { text: visible.join("\n").trim(), notes: found };
}

const pauses = [3000, 5000, 8000, 12000, 15000, 20000, 25000];

async function callClaude(system, messages, maxTokens, useTools = true) {
  const key = Deno.env.get("XPIKI_KEY");
  let current = [...messages];
  const tools = useTools
    ? [{
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 8
      }]
    : undefined;

  for (let turn = 0; turn < 6; turn++) {
    let response;

    for (let attempt = 0; attempt <= pauses.length; attempt++) {
      response = await fetch(API, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          system,
          messages: current,
          ...(tools ? { tools } : {})
        })
      });

      if (response.ok) break;

      const err = await response.text();
      if (response.status === 400 && tools && /web_search|tool/i.test(err)) {
        return callClaude(system, messages, maxTokens, false);
      }

      if (
        ![429, 500, 502, 503, 504, 529].includes(response.status) ||
        attempt === pauses.length
      ) {
        return null;
      }

      await new Promise(resolve => setTimeout(resolve, pauses[attempt]));
    }

    if (!response?.ok) return null;

    const data = await response.json();
    const blocks = Array.isArray(data.content) ? data.content : [];
    const answer = blocks
      .filter(x => x.type === "text")
      .map(x => x.text)
      .join("\n\n")
      .trim();

    if (data.stop_reason === "pause_turn") {
      current.push({ role: "assistant", content: blocks });
      continue;
    }

    return answer;
  }

  return null;
}

function normalizeClaudeMessages(items) {
  const messages = [];

  for (const m of items) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = m.kind === "idea"
      ? `[идея] ${m.title}: ${m.text}`
      : m.text;
    const last = messages[messages.length - 1];

    if (last?.role === role) last.content += "\n\n" + content;
    else messages.push({ role, content });
  }

  if (!messages.length || messages[0].role !== "user") {
    messages.unshift({
      role: "user",
      content: "Продолжи разговор с учётом контекста."
    });
  }

  return messages;
}

async function chatMessages(threadId = "") {
  const all = [];

  for await (const item of (await KV()).list({ prefix: ["pa", "feed"] })) {
    const m = item.value;
    if (!m) continue;

    if (threadId) {
      if (m.thread === threadId && (m.kind === "chat" || m.kind === "idea")) {
        all.push(m);
      }
    } else if (
      !m.thread &&
      (m.kind === "chat" || m.kind === "idea")
    ) {
      all.push(m);
    }
  }

  all.sort((a, b) => a.t - b.t);
  return normalizeClaudeMessages(all.slice(-30));
}

async function getIdea(id) {
  for await (const item of (await KV()).list({ prefix: ["pa", "feed"] })) {
    if (item.value?.id === id && item.value.kind === "idea") {
      return item.value;
    }
  }
  return null;
}

async function runScan(force = false) {
  const lock = await (await KV()).atomic()
    .check({ key: ["pa", "lock"], versionstamp: null })
    .set(["pa", "lock"], Date.now(), { expireIn: 15 * 60 * 1000 })
    .commit();

  if (!lock.ok) {
    return {
      skipped: true,
      reason: "уже выполняется",
      ideas: 0,
      messages: []
    };
  }

  try {
    if (!force) {
      const last = (await (await KV()).get(["pa", "lastScan"])).value || 0;

      if (Date.now() - last <= 3.5 * 3600000) {
        return {
          skipped: true,
          reason: "ещё не прошло 3,5 часа",
          ideas: 0,
          messages: []
        };
      }

      const bali = new Date(Date.now() + 8 * 3600000);
      const hour = bali.getUTCHours() + bali.getUTCMinutes() / 60;

      if (hour < 8 || hour > 22.5) {
        return {
          skipped: true,
          reason: "вне времени запуска на Бали",
          ideas: 0,
          messages: []
        };
      }
    }

    const system = await systemPrompt();
    const prompt = `Сейчас плановая проверка. Ты сам ищешь, чем реально помочь Юрию прямо сейчас: изучи его проекты, клиентов, инструменты и проблемы из базы знаний и заметок, проверь в интернете актуальное, новые функции его инструментов, свежие возможности и акции, рынки и заказчики, где его навыки платят больше, изменения, которые касаются его проектов, риски и сроки.
Строгий фильтр: только то, что реально полезно именно ему сейчас. Каждая идея: опирается на конкретный его проект, клиента или проблему; даёт ощутимый результат, деньги, клиента, сэкономленные часы, снятый риск; выполнима с тем, что у него уже есть, без новых платных подписок, если выгода явно не перекрывает цену; не повторяет предложенное и отвергнутое; не противоречит его правилам; факты проверены поиском, ничего не выдумано. Никаких банальностей и общих советов. Лучше одна сильная идея, чем три средних, максимум 3. Если ничего не проходит фильтр, это нормально, верни пустой список.
Ответь ТОЛЬКО JSON без markdown: {"ideas":[{"title":"суть в 3-7 словах","text":"суть одним предложением. Почему именно ему и сейчас: к какому проекту и какой результат. Первый шаг и что ты можешь сделать за него."}]}`;

    const raw = await callClaude(
      system,
      [{ role: "user", content: prompt }],
      8000,
      true
    );

    await (await KV()).set(["pa", "lastScan"], Date.now());

    if (!raw) return { ideas: 0, messages: [] };

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    let data;

    try {
      data = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return { ideas: 0, messages: [] };
    }

    const saved = [];

    for (const idea of Array.isArray(data.ideas) ? data.ideas.slice(0, 3) : []) {
      if (!idea?.title || !idea?.text) continue;
      saved.push(await saveMessage("assistant", "idea", idea.text, idea.title));
    }

    if (saved.length) await sendPush(saved);
    return { ideas: saved.length, messages: saved };
  } finally {
    await (await KV()).delete(["pa", "lock"]);
  }
}

async function sendPush(ideas, test = false) {
  await vapid();
  const webpush = await WP();
  const subs = [];

  for await (const item of (await KV()).list({ prefix: ["pa", "push"] })) {
    if (item.key.length === 3 && item.value) subs.push(item.value);
  }

  const first = ideas[0]?.title || "Проверка уведомлений";
  const pushBody = test
    ? "Уведомления работают"
    : first + (ideas.length > 1 ? ` и ещё ${ideas.length - 1}` : "");

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, JSON.stringify({
        title: "💡 Советник",
        body: pushBody,
        data: { url: "https://pomoshnik.ai/pa/" }
      }));
    } catch (e) {
      if ([404, 410].includes(e.statusCode)) {
        await (await KV()).delete(["pa", "push", sub.endpoint]);
      }
    }
  }
}

async function vapid() {
  let value = (await (await KV()).get(["pa", "vapid"])).value;
  const webpush = await WP();

  if (!value) {
    value = webpush.generateVAPIDKeys();
    await (await KV()).set(["pa", "vapid"], value);
  }

  webpush.setVapidDetails(
    "mailto:pa@pomoshnik.ai",
    value.publicKey,
    value.privateKey
  );

  return value.publicKey;
}

// Советник отключён по просьбе Юрия 21.11.2026: никаких вызовов API и плановых поисков
const PA_ENABLED = false;

export async function paHandler(req, deps = {}) {
  if (!PA_ENABLED) return new Response(JSON.stringify({ error: "Советник отключён" }), { status: 410, headers: { "Access-Control-Allow-Origin": "*", "content-type": "application/json" } });
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    if (path === "/pa/claim" && req.method === "POST") {
      const { token } = await body(req);

      if (typeof token !== "string" || token.length < 24) {
        return json({ error: "токен слишком короткий" }, 400);
      }

      const old = await (await KV()).get(["pa", "owner"]);
      if (old.value) return json({ error: "владелец уже задан" }, 403);

      await (await KV()).set(["pa", "owner"], await hash(token));
      return json({ ok: true });
    }

    if (path === "/pa/tick" && req.method === "GET") {
      return json(await runScan(false));
    }

    if (path === "/pa/vapid" && req.method === "GET") {
      return json({ key: await vapid() });
    }

    if (!(await authorized(req))) {
      return json({ error: "нет доступа" }, 401);
    }

    if (path === "/pa/feed" && req.method === "GET") {
      return json({
        messages: await feed(Number(url.searchParams.get("after") || 0))
      });
    }

    if (path === "/pa/star" && req.method === "POST") {
      const { id, on } = await body(req);

      if (!id) return json({ error: "нет id" }, 400);

      if (on) {
        await (await KV()).set(["pa", "star", String(id)], true);
      } else {
        await (await KV()).delete(["pa", "star", String(id)]);
      }

      return json({ ok: true, starred: !!on });
    }

    if (path === "/pa/tts" && req.method === "POST") {
      const { text: value } = await body(req);
      const source = noLinks(String(value || "")).slice(0, 5000);

      if (!source) return json({ error: "пустой текст" }, 400);
      if (typeof deps.geminiTTS !== "function") {
        return json({ error: "озвучка временно недоступна" }, 503);
      }

      const result = await deps.geminiTTS(source);

      if (!result?.bytes) {
        return json(
          { error: result?.error || "не удалось создать аудио" },
          result?.status || 502
        );
      }

      return new Response(result.bytes, {
        status: 200,
        headers: {
          ...CORS,
          "Content-Type": "audio/wav",
          "Cache-Control": "no-store"
        }
      });
    }

    if (path === "/pa/chat" && req.method === "POST") {
      const data = await body(req);
      const input = String(data.text || "").trim();
      const thread = data.thread ? String(data.thread) : "";

      if (!input) return json({ error: "пустое сообщение" }, 400);

      let idea = null;
      if (thread) {
        idea = await getIdea(thread);
        if (!idea) return json({ error: "идея не найдена" }, 404);
      }

      const user = await saveMessage("user", "chat", input, "", thread);

      let messages;
      let system = await systemPrompt();

      if (idea) {
        system += "\n\nСейчас идёт обсуждение конкретной идеи: отвечай по ней, развивай, уточняй, предлагай конкретные шаги.";
        const history = await chatMessages(thread);
        const intro = {
          role: "user",
          content: `Обсуждаем твою идею «${idea.title}»: ${idea.text}`
        };
        messages = normalizeClaudeMessages([{
          role: "user",
          kind: "chat",
          text: intro.content
        }, ...history.map((x, index) => ({
          role: x.role,
          kind: "chat",
          text: x.content,
          t: index
        }))]);
      } else {
        messages = await chatMessages();
      }

      const answer = await callClaude(system, messages, 6000, true);

      if (!answer) {
        const failed = await saveMessage(
          "assistant",
          "system",
          "Сервер Claude перегружен, повтори через минуту",
          "",
          thread
        );
        return json({ messages: [user, failed] });
      }

      const parsed = cleanNotes(answer);

      for (const note of parsed.notes) {
        const n = {
          id: crypto.randomUUID(),
          t: Date.now(),
          text: note
        };
        await (await KV()).set(["pa", "notes", n.t, n.id], n);
      }

      const assistant = await saveMessage(
        "assistant",
        "chat",
        parsed.text,
        "",
        thread
      );

      return json({ messages: [user, assistant] });
    }

    if (path === "/pa/scan" && req.method === "POST") {
      return json(await runScan(true));
    }

    if (path === "/pa/context" && req.method === "GET") {
      return json({
        text: await contextText(),
        updated: (await (await KV()).get(["pa", "contextUpdated"])).value || 0
      });
    }

    if (path === "/pa/context" && req.method === "POST") {
      const { text: value } = await body(req);

      for await (const item of (await KV()).list({ prefix: ["pa", "context"] })) {
        if (item.key.length === 3) await (await KV()).delete(item.key);
      }

      const source = String(value || "");
      for (let i = 0; i < source.length; i += 50000) {
        await (await KV()).set(
          ["pa", "context", String(i / 50000).padStart(6, "0")],
          source.slice(i, i + 50000)
        );
      }

      await (await KV()).set(["pa", "contextUpdated"], Date.now());
      return json({ ok: true });
    }

    if (path === "/pa/notes" && req.method === "GET") {
      return json({ notes: await notes() });
    }

    if (path === "/pa/notes" && req.method === "POST") {
      const { text: value } = await body(req);
      const note = {
        id: crypto.randomUUID(),
        t: Date.now(),
        text: String(value || "").trim()
      };

      if (!note.text) return json({ error: "пустая заметка" }, 400);

      await (await KV()).set(["pa", "notes", note.t, note.id], note);
      return json(note);
    }

    if (path === "/pa/notes-del" && req.method === "POST") {
      const { id } = await body(req);

      for await (const item of (await KV()).list({ prefix: ["pa", "notes"] })) {
        if (item.value?.id === id) await (await KV()).delete(item.key);
      }

      return json({ ok: true });
    }

    if (path === "/pa/push-sub" && req.method === "POST") {
      const { subscription } = await body(req);

      if (!subscription?.endpoint) {
        return json({ error: "нет подписки" }, 400);
      }

      await (await KV()).set(["pa", "push", subscription.endpoint], subscription);
      return json({ ok: true });
    }

    if (path === "/pa/push-test" && req.method === "POST") {
      await sendPush([{ title: "Проверка уведомлений" }], true);
      return json({ ok: true });
    }

    return json({ error: "не найдено" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "ошибка сервера" }, 500);
  }
}

try {
  if (Deno.cron) {
    if (PA_ENABLED) Deno.cron("pa-scan", "7 1,5,9,13 * * *", () => runScan(false));
  }
} catch {}
