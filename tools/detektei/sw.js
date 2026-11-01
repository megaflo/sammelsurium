// Caches the game on first visit so it works offline. Bump the version whenever a file changes.
const CACHE = "detektei-v13";
const FILES = ["./", "index.html", "style.css", "app.js", "case.js", "art.js", "util.js", "library.js", "furniture.js",
  ...["index", "answer", "house", "proof", "people", "clues", "placement", "hints", "dialogue", "finish"].map((n) => `build/${n}.js`)];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Serve from the cache at once and refresh it in the background.
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
