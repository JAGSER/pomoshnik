// Кэш оболочки приложения: открывается даже при плохом интернете.
// Сначала берём свежую версию из сети, при её отсутствии — из кэша.
const CACHE = "pomoshnik-v4";
const SHELL = ["./", "index.html", "style.css", "app.js", "config.json", "icon.svg", "manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req.url.split("?")[0], copy));
      return res;
    }).catch(() => caches.match(req.url.split("?")[0]).then((r) => r || caches.match("index.html")))
  );
});
