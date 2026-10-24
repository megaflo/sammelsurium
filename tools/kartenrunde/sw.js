// Caches the app on first visit so it can be opened later without any internet connection.
// Bump the version whenever a file changes: a changed sw.js is what makes browsers install the new cache.
const CACHE = "kartenrunde-v8";
const FILES = ["./", "index.html", "style.css", "app.js", "game.js", "net.js", "bot.js", "scanner.js", "vendor/qrcode.mjs", "vendor/jsQR.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Serve from the cache at once and refresh it in the background, so a hotspot without
// internet never waits on the network and a new version shows up on the next visit.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    });
    if (hit) { fresh.catch(() => {}); return hit; }
    return fresh;
  }));
});
