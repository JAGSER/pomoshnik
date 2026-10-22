// Кэш оболочки приложения: открывается даже при плохом интернете.
// Всегда сначала берём свежую версию из сети (минуя кэш браузера), при её отсутствии — из кэша.
const CACHE = "pomoshnik-v5";
const SHELL = ["./", "index.html", "style.css", "app.js", "config.json", "icon.svg", "manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const key = req.url.split("?")[0];
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(key, copy));
      return res;
    }).catch(() => caches.match(key).then((r) => r || caches.match("index.html")))
  );
});
