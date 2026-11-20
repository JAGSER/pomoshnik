const CACHE = "pa-shell-v3";
const APP = "./index.html";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(APP)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.hostname === "pomoshnik.jagser.deno.net") return;
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(x => x || caches.match(APP)))
  );
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data.json(); } catch {}
  event.waitUntil(self.registration.showNotification(data.title || "💡 Советник", {
    body: data.body || "",
    icon: "/pa/icon.svg",
    data: { url: data.data?.url || "https://pomoshnik.ai/pa/" }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = "https://pomoshnik.ai/pa/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      const current = list.find(client => client.url.startsWith(target));
      return current ? current.focus() : clients.openWindow(target);
    })
  );
});
