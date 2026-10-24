"use strict";
/* ===== Языки: русский (основной) и английский =====
   Интерфейс пишется по-русски, а в английской версии каждая надпись переводится по словарю.
   Ответы Claude, названия разговоров и текст пользователя не трогаем. */
let LANG = (() => {
  try { const l = JSON.parse(localStorage.getItem("lang:last")); if (l === "ru" || l === "en") return l; } catch (_) {}
  return /^(ru|uk|be|kk)/i.test(navigator.language || "") ? "ru" : "en";
})();
const EN_APP = "Pomoshnik AI";

const EN = {
  // общее и вход
  "Помощник AI": EN_APP,
  "Введите пароль": "Enter your password",
  "Войти": "Sign in",
  "Показать": "Show",
  "Скрыть": "Hide",
  "Проверяю…": "Checking…",
  "Не получилось войти": "Couldn't sign in",
  "Неверный пароль": "Wrong password",
  "Пользователь не найден в настройках приложения": "User not found in the app settings",
  "Нет связи с помощником. Проверьте интернет.": "Can't reach the assistant. Check your internet connection.",
  "Слишком много неверных попыток. Подождите 10 минут.": "Too many wrong attempts. Please wait 10 minutes.",
  "Не удалось загрузить настройки. Проверьте интернет и обновите страницу.": "Couldn't load settings. Check your internet and reload the page.",
  "Установить на рабочий стол": "Install on home screen",
  "Настройки": "Settings",
  "Назад": "Back",
  "Добро пожаловать на новый адрес — pomoshnik.ai. Разговоры перенесены.": "Welcome to the new address — pomoshnik.ai. Your chats have been moved.",
  "Чтобы установить на iPhone: нажмите кнопку «Поделиться» (квадрат со стрелкой) внизу экрана Safari и выберите «На экран Домой».": "To install on iPhone: tap the Share button (square with an arrow) at the bottom of Safari and choose “Add to Home Screen”.",

  // главная
  "Здравствуйте!": "Hello!",
  "Здравствуйте, {0}!": "Hello, {0}!",
  "Прошлые разговоры": "Past chats",
  "Просто спросить": "Just ask",
  "Любой вопрос — голосом или текстом": "Any question — by voice or text",
  "Образец функции": "Sample function",
  "Скопируйте этот блок, чтобы сделать свою": "Copy this block to make your own",
  "Здравствуйте! Спрашивайте что угодно — можно нажать на микрофон и сказать голосом.": "Hello! Ask me anything — you can tap the microphone and just say it.",
  "Это первое сообщение, которое человек увидит, когда нажмёт на функцию.": "This is the first message a person sees when they open the function.",
  "Разговор": "Chat",
  "сегодня, {0}": "today, {0}",
  "📌 закреплён · {0}": "📌 pinned · {0}",
  "Послушать начало последнего ответа": "Listen to the start of the last answer",
  "Открепить разговор": "Unpin chat",
  "Закрепить разговор": "Pin chat",
  "Открепить": "Unpin",
  "Закрепить наверху": "Pin to top",
  "Переименовать разговор": "Rename chat",
  "Удалить разговор": "Delete chat",
  "Удалить этот разговор?": "Delete this chat?",
  "Выйти? Потом нужно будет снова ввести пароль.": "Sign out? You'll need to enter your password again.",
  "Название разговора (в начале можно поставить свой эмодзи):": "Chat name (you can put your own emoji at the start):",
  "В этом разговоре пока нет ответа": "There's no answer in this chat yet",

  // разговор
  "Нажмите, чтобы переименовать": "Tap to rename",
  "Подумать": "Think",
  "Claude сначала обдумает ответ — дольше, но глубже": "Claude thinks first — slower, but deeper",
  "Читать вслух": "Read aloud",
  "Читать ответы вслух автоматически": "Read answers aloud automatically",
  "Скорость чтения": "Reading speed",
  "Приложить фото или файл": "Attach a photo or file",
  "Ваш вопрос…": "Your question…",
  "Сказать голосом": "Speak",
  "Отправить": "Send",
  "Остановить": "Stop",
  "Живой режим": "Live mode",
  "Живой": "Live",
  "Фото": "Photo",
  "Документ": "Document",
  "Видео": "Video",
  "Думаю…": "Thinking…",
  "Ищу в интернете…": "Searching the web…",
  "Обдумываю…": "Thinking it over…",
  "Пароль больше не подходит. Войдите заново.": "This password no longer works. Please sign in again.",
  "Не получилось получить ответ": "Couldn't get an answer",
  "Claude перегружен, попробуйте через минуту": "Claude is overloaded, try again in a minute",
  "Ошибка при ответе": "Error while answering",
  "Пришёл пустой ответ, попробуйте ещё раз": "The answer came back empty, please try again",
  "…(ответ остановлен)": "…(answer stopped)",
  "Остановлено.": "Stopped.",
  "Повторить": "Retry",
  "Вслух": "Read aloud",
  "🔊 Вслух": "🔊 Read aloud",
  "⏸ Пауза": "⏸ Pause",
  "▶ Дальше": "▶ Resume",
  "📋 Копия": "📋 Copy",
  "✓ Готово": "✓ Done",
  "Не вышло": "Failed",
  "🎬 Видео": "🎬 Video",
  "💾 Видео": "💾 Video",
  "Сохранить ответ как видео с озвучкой (9:16)": "Save the answer as a narrated video (9:16)",
  "+{0} кадров": "+{0} frames",
  "Убрать": "Remove",
  "Файл слишком большой (больше 25 МБ)": "File is too large (over 25 MB)",
  "Не удалось открыть файл {0}": "Couldn't open file {0}",
  "Готовлю видео: беру кадры и звук…": "Preparing the video: taking frames and sound…",
  "Отправка отменена": "Sending cancelled",
  "Автоотправка остановлена — можно поправить текст": "Auto-send stopped — you can edit the text",
  "Разрешите доступ к микрофону в настройках браузера.": "Allow microphone access in your browser settings.",
  "{0} — читаю голосом телефона": "{0} — reading with the phone's voice",
  "Голос Gemini недоступен": "Gemini voice is unavailable",
  "Слишком много запросов или закончился лимит — подождите немного": "Too many requests or the limit is used up — please wait a bit",
  "Claude сейчас недоступен, попробуйте позже": "Claude is unavailable right now, try later",
  "Закончился лимит на этот месяц": "This month's limit is used up",
  "Пустой разговор": "Empty chat",

  // видео
  "Подождите, видео ещё собирается": "Please wait, the video is still being made",
  "Для видео нужен голос Gemini — сейчас он недоступен": "Video needs the Gemini voice — it's unavailable right now",
  "Видео готово — нажмите «💾 Видео», чтобы сохранить": "The video is ready — tap “💾 Video” to save it",
  "Не получилось сделать видео: {0}": "Couldn't make the video: {0}",
  "Спросите о своём": "Ask about yours",
  "в «{0}»": "in “{0}”",
  "Ответ": "Answer",

  // живой режим
  "Включаю камеру…": "Turning on the camera…",
  "🎤 Слушаю… говорите": "🎤 Listening… go ahead",
  "💭 Думаю…": "💭 Thinking…",
  "🔊 Отвечаю… нажмите, чтобы перебить": "🔊 Answering… tap to interrupt",
  "Другая камера": "Switch camera",
  "Завершить": "Close",
  "⏱ {0} с": "⏱ {0} s",
  "В этом браузере нет распознавания речи. Откройте приложение в Chrome.": "This browser has no speech recognition. Please open the app in Chrome.",
  "Этот браузер не даёт доступ к камере.": "This browser doesn't allow camera access.",
  "Нет доступа к камере. Разрешите камеру для сайта в настройках браузера.": "No camera access. Allow the camera for this site in your browser settings.",
  "Нет доступа к микрофону — разрешите его в браузере": "No microphone access — allow it in your browser",
  "Не удалось переключить камеру": "Couldn't switch the camera",

  // настройки
  "Язык": "Language",
  "Голос": "Voice",
  "Выбрать ›": "Choose ›",
  "Свернуть ˄": "Collapse ˄",
  "Нажмите ▶, чтобы послушать, и выберите понравившийся.": "Tap ▶ to listen and pick the one you like.",
  "Подготовить все образцы голосов": "Prepare all voice samples",
  "Голос выбран: {0}": "Voice selected: {0}",
  "Послушать голос {0}": "Listen to voice {0}",
  "Не удалось загрузить голос": "Couldn't load the voice",
  "Живой режим с камерой": "Live mode with camera",
  "⚡ Быстрый": "⚡ Fast",
  "🎯 Точный": "🎯 Accurate",
  "Быстрый отвечает раньше, точный лучше видит предметы и точнее их обводит.": "Fast answers sooner; Accurate sees objects better and outlines them more precisely.",
  "Персонализация": "Personalization",
  "Учитывать данные обо мне": "Use my personal details",
  "Claude обращается по имени и учитывает то, что указано в «Обо мне». Если выключить — отвечает без обращения и без личных данных": "Claude calls you by name and takes into account what's in “About me”. If off, it answers without your name or personal details",
  "👤 Обо мне — настроить": "👤 About me — set up",
  "Заставка в конце видео": "Ending card in videos",
  "Талисман и «Спросите о своём в «Помощник AI»», 3 секунды": "Mascot and “Ask about yours in Pomoshnik AI”, 3 seconds",
  "Творческие видео": "Creative videos",
  "Claude сам придумывает и рисует анимацию под каждый ответ. Дольше — 1–3 минуты": "Claude designs and draws a unique animation for every answer. Takes longer — 1–3 minutes",
  "Выйти": "Sign out",
  "Обо мне": "About me",
  "Это видит только Claude, чтобы отвечать вам лично. Хранится на этом устройстве.": "Only Claude sees this, to answer you personally. It's stored on this device.",
  "Как ко мне обращаться": "What to call me",
  "Например: Светлана Петровна": "For example: Vie",
  "Обращение": "Tone",
  "На «вы»": "Polite",
  "На «ты»": "Casual",
  "Без разницы": "Doesn't matter",
  "Город, возраст, чем занимаетесь, увлечения, здоровье — всё, что поможет отвечать точнее": "City, age, what you do, hobbies, health — anything that helps answer better",
  "Как мне отвечать": "How to answer me",
  "Например: коротко и по делу; объясняй простыми словами; давай пошаговые инструкции": "For example: short and to the point; explain simply; give step-by-step instructions",
  "Сохранить": "Save",
  "Сохранено — Claude будет это учитывать": "Saved — Claude will take this into account",
  "Готово {0} из {1}": "Done {0} of {1}",
  "Все образцы готовы ✓": "All samples ready ✓",
  "Готово {0} из {1} — нажмите ещё раз": "Done {0} of {1} — tap again",
  "🔊 Звук в файле: AAC ✓": "🔊 Sound in file: AAC ✓",
  "🔊 Звук в файле: AAC ✓ ({0})": "🔊 Sound in file: AAC ✓ ({0})",
  "⚠️ Звук в файле: Opus — iPhone его не проигрывает": "⚠️ Sound in file: Opus — iPhone can't play it",
  "⚠️ В файле нет звука": "⚠️ The file has no sound",
  "⚠️ Голос не записался: озвучка пришла пустой (тишина)": "⚠️ The voice wasn't recorded: the narration came back empty (silence)",
  "⚠️ Звук AAC без настройки — iPhone может его не проиграть": "⚠️ AAC sound without its config — iPhone may not play it",
  "⚠️ В файле нет звука ({0})": "⚠️ The file has no sound ({0})",
  "картинка — быстро, звук — записью iPhone": "picture fast, sound recorded by iPhone",
  "проверка: быстрый кодировщик дал тишину → звук записью iPhone": "check: the fast encoder produced silence → sound recorded by iPhone",
  // помощники
  "📤 Отправить ролик": "📤 Send video", "Подпись к ролику": "Message to send with it", "🔗 Отправить ссылку": "🔗 Send a link", "📎 Файлом": "📎 As a file", "💾 Сохранить": "💾 Save",
  "Придумываю подпись…": "Writing a message…", "Напишите пару слов к ролику": "Write a few words", "⏳ Готовлю ссылку…": "⏳ Preparing the link…", "🔁 Повторить": "🔁 Try again",
  "По ссылке видно, сколько раз посмотрели, и вам могут ответить": "With a link you'll see how many people watched, and they can reply to you", "Ссылка не получилась: ": "Couldn't make a link: ",
  "Ссылка скопирована: вставьте её в WhatsApp или Telegram": "Link copied: paste it into WhatsApp or Telegram", "Скопируйте ссылку:": "Copy the link:",
  "🎬 Ролики": "🎬 Videos", "Ролики": "Videos", "Ваши и семейные: кто посмотрел и что ответил": "Yours and your family's: who watched and what they replied", "Мои": "Mine", "Семья за неделю": "Family this week", "Все ролики": "All videos",
  "Загружаю…": "Loading…", "Нет связи. Попробуйте позже.": "No connection. Try again later.", "Вы": "You", "Ролик": "Video", "новое": "new", "Смотреть": "Watch", "Отправить ещё": "Send again", "Переслать": "Forward", "Кто-то": "Someone",
  "Пока нет отправленных роликов. Под любым ответом нажмите «🎬 Видео», потом «📤 Отправить» → «Отправить ссылку».": "No videos sent yet. Under any answer tap «🎬 Video», then «📤 Send» → «Send a link».",
  "За неделю в семье ещё не отправляли роликов.": "No family videos this week yet.", "ответил(а) на ваш ролик:": "replied to your video:", "Новые ролики семьи за неделю:": "New family videos this week:",
  "🎬 Сделать ролик и отправить семье": "🎬 Make a video and send it to family", "📤 Отправить": "📤 Send", "Видео готово — нажмите «📤 Отправить»": "Video is ready: tap «📤 Send»",
  "⏳ Ролик собирается. Можно переключиться на другое приложение, но не закрывайте это: когда ролик будет готов, придёт уведомление.": "⏳ Your video is being made. You can switch to another app, just don't close this one: you'll get a notification when it's ready.", "🎬 Ролик готов!": "🎬 Your video is ready!", "⚠️ Ролик не получился": "⚠️ The video didn't work out", "нажмите, чтобы посмотреть и отправить": "tap to watch and send", "Откройте приложение и попробуйте ещё раз": "Open the app and try again",
  "Тариф и аккаунт": "Plan and account", "💎 Тарифы": "💎 Plans", "Для себя и семьи": "For me and family", "Для бизнеса": "For business", "Имя для входа": "Login", "(если сохраняли аккаунт)": "(if you saved an account)", "Продолжить без входа": "Continue without signing in", "Телефон, Telegram или почта": "Phone, Telegram or email", "Компания или сайт": "Company or website", "Комментарий, если нужно": "Comment, if needed", "Отправить заявку": "Send request",
  "Звуки в видео": "Sound effects in videos", "Мягкие попы, ноты маримбы и калимбы, тики, «та-дам» в концовке": "Soft pops, marimba and kalimba notes, ticks and a ta-da at the end", "🎵 Музыка в видео": "🎵 Music in videos", "Подбирать само": "Pick automatically", "Без музыки": "No music", "Послушать музыку": "Listen to the music",
  "✏️ Настроить": "✏️ Customize", "✓ Готово": "✓ Done", "Нажмите на помощника, чтобы спрятать его или вернуть. Спрятанные бледные.": "Tap a helper to hide it or bring it back. Hidden ones are faded.",
  "Снимите галочку, чтобы спрятать помощника из списка.": "Untick a helper to hide it from the list.",
  "🍎 Для школы": "🍎 For school", "🏠 На каждый день": "🏠 Everyday",
  "Помощники": "Helpers", "⭐ Помощники": "⭐ Helpers", "Готовые помощники на разные случаи": "Ready-made helpers for different needs",
  "Выберите, с чем помочь. Откроется разговор, где Claude уже знает, чем помочь.": "Choose what you need help with. A chat opens where Claude already knows how to help.",
  "Выключить помощника": "Turn off the helper", "Помощник выключен": "Helper turned off", "Закрыть": "Close",
  "Что приготовить": "What to cook",
  "Поздравление": "Greeting",
  "Просто поговорить": "Just talk",
  "Про лекарство": "About a medicine",
  "Что со мной?": "What's wrong with me?",
  "Плохо сплю": "Can't sleep",
  "Стоит ли покупать": "Worth buying?",
  "Посмотри на экран": "Look at my screen",
  "Что подарить": "Gift ideas",
  "Поддержка": "Support",
  "Что посмотреть": "What to watch",
  "Путешествие": "Travel",
  "Новости простыми словами": "News made simple",
  "Объясни мне": "Explain to me",
  "Видео-открытка": "Video card",
  "Переводчик": "Translator",
  "Скажите, что есть дома, или сфотографируйте холодильник.": "Tell me what you have at home or take a photo of the fridge.",
  "Кого и с чем поздравляем?": "Who are we congratulating, and on what?",
  "О чём хотите поговорить?": "What would you like to talk about?",
  "Сфотографируйте упаковку или инструкцию лекарства.": "Take a photo of the medicine box or leaflet.",
  "Расскажите, что беспокоит и как давно.": "Tell me what bothers you and since when.",
  "Расскажите, как вы спите и что мешает.": "Tell me how you sleep and what keeps you awake.",
  "Сфотографируйте товар или объявление.": "Take a photo of the item or the listing.",
  "Наведите камеру на экран и скажите, что хотите сделать.": "Point the camera at the screen and say what you want to do.",
  "Кому подарок, по какому поводу и какой бюджет?": "Who is the gift for, what's the occasion and the budget?",
  "Расскажите, что на душе. Я выслушаю.": "Tell me what's on your mind. I'm listening.",
  "Какое настроение и что вам обычно нравится?": "What mood are you in and what do you usually like?",
  "Куда и когда хотите поехать?": "Where and when would you like to go?",
  "О чём рассказать: что случилось в мире, в стране или что-то конкретное?": "What should I tell you about: world news, your country, or something specific?",
  "Что объяснить? Любую тему простыми словами.": "What should I explain? Any topic in simple words.",
  "Приложите фото и скажите, для кого открытка. Потом нажмите «🎬 Видео» под ответом.": "Attach photos and say who the card is for. Then tap “🎬 Video” under the answer.",
  "Напишите, скажите или сфотографируйте текст и укажите, на какой язык перевести.": "Type, say or photograph the text and tell me which language to translate into.",
  // творческие видео
  "⚠️ Творческое видео не получилось: {0}. Сделано обычное. Подробности — в ⚙️ → Видео.": "⚠️ The creative video didn't work out: {0}. A regular one was made instead. Details — in ⚙️ → Video.",
  "ℹ️ Обычное видео: {0}.": "ℹ️ Regular video: {0}.",
  "творческий режим выключен в настройках": "creative mode is turned off in settings",
  "этот браузер не умеет творческие видео (нет WebCodecs/OffscreenCanvas)": "this browser can't make creative videos (no WebCodecs/OffscreenCanvas)",
  "Идея": "Idea", "Проверка": "Checking", "Кадры": "Frames", "Код": "Code", "Правка": "Fixing", "Улучшаю": "Improving",
  "Claude не прислал код": "Claude didn't send any code",
  "код ролика не заработал": "the video code didn't work",
  "Claude не ответил": "Claude didn't respond",
  // характеры голосов
  "тёплый": "warm", "нежный": "gentle", "дружелюбный": "friendly", "зрелый": "mature", "ровный": "even",
  "спокойный": "calm", "плавный": "smooth", "мягкий": "soft", "дикторский": "announcer", "чёткий": "clear",
  "знающий": "knowledgeable", "твёрдый": "firm", "непринуждённый": "casual", "лёгкий": "light", "молодой": "youthful",
  "бодрый": "upbeat", "живой": "lively", "яркий": "bright", "эмоциональный": "expressive", "напористый": "forward",
  "с придыханием": "breathy", "с хрипотцой": "gravelly",
};

// ключи с {0}, {1} превращаем в шаблоны
const EN_PAT = Object.keys(EN).filter((k) => k.includes("{0}")).map((k) => {
  const re = new RegExp("^" + k.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\d)\}/g, "(.+?)") + "$");
  return { re, out: EN[k] };
});
const RU_CHARS = /[А-Яа-яЁё]/;
function T(s) {
  if (LANG !== "en" || s == null) return s;
  s = String(s);
  if (!RU_CHARS.test(s)) return s;
  if (EN[s] && !s.includes("{0}")) return EN[s];
  for (const p of EN_PAT) {
    const m = s.match(p.re);
    if (m) return p.out.replace(/\{(\d)\}/g, (_, i) => T(m[+i + 1]));
  }
  // значки и знаки по краям («⏳ …», «✨ …?») переводим отдельно от слов
  const m = s.match(/^([^A-Za-zА-Яа-яЁё]*)(.*?)([^A-Za-zА-Яа-яЁё]*)$/s);
  if (m && (m[1] || m[3]) && m[2]) { const core = T(m[2]); if (core !== m[2]) return m[1] + core + m[3]; }
  return s;
}

// Перевод страницы: текст и подсказки; содержимое разговоров не трогаем
const I18N_SKIP = ".md, .msg.user, .htitle, #live-heard, #live-answer, #creative-log, textarea, script, style";
function translateNode(root) {
  if (LANG !== "en" || !root) return;
  if (root.nodeType === 3) {
    const p = root.parentElement;
    if (!p || p.closest(I18N_SKIP)) return;
    const raw = root.nodeValue, t = raw.trim();
    if (!t || !RU_CHARS.test(t)) return;
    const tr = T(t);
    if (tr !== t) root.nodeValue = raw.replace(t, tr);
    return;
  }
  if (root.nodeType !== 1) return;
  if (root.closest && root.closest(I18N_SKIP) && root.tagName !== "TEXTAREA") return;
  const els = [root, ...root.querySelectorAll("[placeholder],[aria-label],[title]")];
  els.forEach((e) => {
    if (e.closest(".md, .msg.user, .htitle")) return;
    for (const a of ["placeholder", "aria-label", "title"]) {
      const v = e.getAttribute && e.getAttribute(a);
      if (v && RU_CHARS.test(v)) { const tr = T(v); if (tr !== v) e.setAttribute(a, tr); }
    }
  });
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; const list = [];
  while ((n = w.nextNode())) list.push(n);
  list.forEach(translateNode);
}
let I18N_OBS = null;
function startI18n() {
  document.documentElement.lang = LANG;
  if (LANG !== "en") return;
  translateNode(document.body);
  I18N_OBS = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") translateNode(m.target);
      else if (m.type === "attributes") translateNode(m.target);
      else m.addedNodes.forEach(translateNode);
    }
  });
  I18N_OBS.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "aria-label", "title"] });
}
function setLang(l) {
  try { localStorage.setItem("lang:last", JSON.stringify(l)); } catch (_) {}
  if (l !== LANG) location.reload();
}
const SR_LANG = () => (LANG === "en" ? "en-US" : "ru-RU");
const LOCALE = () => (LANG === "en" ? "en-GB" : "ru-RU");
// окна браузера тоже переводим
const _alert = window.alert.bind(window), _confirm = window.confirm.bind(window), _prompt = window.prompt.bind(window);
window.alert = (m) => _alert(T(m));
window.confirm = (m) => _confirm(T(m));
window.prompt = (m, d) => _prompt(T(m), d);
// скрипт стоит в конце страницы — тело уже есть, запускаем сразу (не ждём сторонние скрипты)
if (document.body) startI18n(); else document.addEventListener("DOMContentLoaded", startI18n);
