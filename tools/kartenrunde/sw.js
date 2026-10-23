// Caches the app on first visit so it can be opened later without any internet connection.
// Bump the version whenever a file changes, together with VERSION in net.js: a changed sw.js
// is what makes browsers install the new cache, and the page reloads itself once it has.
const CACHE = "kartenrunde-v5";
const FILES = ["./", "index.html", "style.css", "app.js", "game.js", "net.js", "scanner.js", "vendor/qrcode.mjs", "vendor/jsQR.js"];

self.addEventListener("install", (e) => {
  // cache: "reload" skips the browser's HTTP cache, which may still hold the previous version.
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Serve from the cache at once, so a hotspot without internet never waits on the network.
// Files are only replaced as a whole set by a new sw.js, so the cache never mixes versions.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request, { ignoreSearch: true })).then((hit) => hit || fetch(e.request)));
});
