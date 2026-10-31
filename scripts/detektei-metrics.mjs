// Measures generated Detektei cases: how they solve, how they vary, and whether anything on the surface gives the
// murderer away. Run: node scripts/detektei-metrics.mjs [cases] [seed]
// The lookup detector is also used by tests/detektei.test.mjs.
import { makeCase, newCaseCode, solve, ROOMS } from "../tools/detektei/case.js";

export const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const sampleCases = (n, seed = 7) => { const r = seeded(seed); return Array.from({ length: n }, () => makeCase(newCaseCode(r))); };

// Turns a line into a template: names, rooms, times and the victim become placeholders, so the same line said by
// different suspects in different cases counts as one.
function template(k, text) {
  let t = String(text);
  for (const s of k.suspects) for (const n of [s.name, s.short, s.lib.surname]) t = t.replaceAll(n, "{S}");
  t = t.replaceAll(k.victim.name, "{V}").replaceAll(k.victim.short, "{V}");
  for (const r of ROOMS) t = t.replaceAll(r.name.toLowerCase(), "{R}");
  for (const s of k.suspects) if (s.lib.voice) t = t.replaceAll(s.lib.voice.trim(), "");
  return t.replace(/\d+:\d\d [ap]m/g, "{T}").replace(/\b(he|she|him|her|his|himself|herself)\b/g, "{p}").trim();
}

// Everything the players can see about a suspect without solving the case, as feature strings.
export function surface(k, s) {
  const d = k.dialog[s.id];
  const f = [];
  for (const q of d.questions) if (!q.id.startsWith("on:")) f.push(`q:${q.id}:${template(k, q.text)}`);
  for (const q of d.questions) if (q.id.startsWith("on:")) f.push(`gives-hint-in-opinion:${q.gives.length > 0}`);
  for (const [id, c] of Object.entries(d.confront)) {
    const kind = id.replace(/_.*/, "") + (id.startsWith("alibi_") || id.startsWith("motive_") || id.startsWith("settle_") ? (id.includes(`_${s.id}`) ? ":own" : ":other") : "");
    f.push(`mood:${kind}:${c.mood}`);
    f.push(`line:${kind}:${template(k, c.text).slice(0, 60)}`);
    if (c.gives.length) f.push(`gives:${kind}`);
  }
  for (const o of d.observations) f.push(`obs:${o.id}`);
  f.push(`lost:${!!s.lost}`);
  const under = k.content[`${k.scene}.body.under`];
  const owner = under && k.suspects.find((x) => k.dialog[x.id].confront[under.clue] && !k.dialog[x.id].confront[under.clue].witness);
  f.push(`under-body-owner:${owner === s}`);
  const hinted = Object.values(k.hints).filter((h) => h.say && h.say.includes(s.short)).length;
  f.push(`named-in-hints:${hinted}`);
  return f;
}

// For each feature with enough support, the share of suspects showing it who are the murderer. A fair case keeps
// that near one in three. Returns the features at or above the threshold.
export function lookupDetector(cases, { threshold = 0.75, support = 30 } = {}) {
  const tally = {};
  for (const k of cases) for (const s of k.suspects) for (const x of new Set(surface(k, s))) {
    const t = (tally[x] ||= { n: 0, m: 0 });
    t.n++;
    if (s.role === "M") t.m++;
  }
  return Object.entries(tally).filter(([, t]) => t.n >= support && t.m / t.n >= threshold).map(([feature, t]) => ({ feature, share: +(t.m / t.n).toFixed(2), n: t.n }));
}

export function metrics(cases) {
  const count = (arr) => arr.reduce((o, x) => ((o[x] = (o[x] || 0) + 1), o), {});
  const solved = cases.map((k) => solve(k));
  return {
    cases: cases.length,
    attempts: count(cases.map((k) => k.attempt)),
    rounds: count(solved.map((r) => r.rounds)),
    suspectsLeftBeforeExchange: count(solved.map((r) => r.history[0].who)),
    accusationsLeftPerRound: [0, 1, 2, 3].map((i) => +(solved.reduce((a, r) => a + (r.history[Math.min(i, r.history.length - 1)].left), 0) / cases.length).toFixed(1)),
    twists: count(cases.map((k) => k.twists.join("+") || "none")),
    routes: count(cases.flatMap((k) => Object.values(k.routes))),
    locks: count(cases.map((k) => Object.keys(k.locks).length)),
    lockTypes: count(cases.flatMap((k) => Object.values(k.locks).map((l) => `${l.type}/${l.box || "furniture"}`))),
    clues: +(cases.reduce((a, k) => a + Object.keys(k.clues).length, 0) / cases.length).toFixed(1),
    hints: +(cases.reduce((a, k) => a + Object.keys(k.hints).length, 0) / cases.length).toFixed(1),
    lookups: lookupDetector(cases),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = +process.argv[2] || 1000, seed = +process.argv[3] || 7;
  const t0 = performance.now();
  const cases = sampleCases(n, seed);
  const ms = (performance.now() - t0) / n;
  console.log(JSON.stringify({ msPerCase: +ms.toFixed(2), ...metrics(cases) }, null, 1));
}
