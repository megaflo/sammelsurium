// Small helpers shared by the generator: hashing, a seeded random source, text filling and times.

// Bump VERSION whenever a change alters generated cases: both devices must build the same case from a number.
export const VERSION = 6;
export const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// ---------- hashing and randomness ----------
export function hash(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 & 0x1fffff) * 4294967296 + (h1 >>> 0);
}
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n) => Math.floor(next() * n);
  const pick = (arr) => arr[int(arr.length)];
  const shuffle = (arr) => {
    const a2 = arr.slice();
    for (let i = a2.length - 1; i > 0; i--) { const j = int(i + 1); [a2[i], a2[j]] = [a2[j], a2[i]]; }
    return a2;
  };
  return { next, int, pick, shuffle };
}
export const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
export const rn = (room) => room.name.toLowerCase();
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const an = (s) => `${/^[aeiou]/i.test(s) ? "an" : "a"} ${s}`;

export const fmtTime = (mins) => {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
export const PRO = { m: { he: "he", him: "him", his: "his", self: "himself" }, f: { he: "she", him: "her", his: "her", self: "herself" } };
export function codeFor(caseCode, id, salt) {
  let n = hash(`${caseCode}:${id}:${salt}`), s = "";
  for (let i = 0; i < 3; i++) { s += ALPHA[n % ALPHA.length]; n = Math.floor(n / ALPHA.length); }
  return s;
}
