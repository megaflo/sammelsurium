// Case library, generator and solver. Pure functions: the same case number gives the same case on every
// device running the same VERSION. Both devices build the whole case; each role only shows its own side.
// The generator lives in build/ (one file per stage), the data in library.js and furniture.js.

import { ALPHA, VERSION, hash } from "./util.js";
import { leaves } from "./furniture.js";
import { MOTIVES, WEAPONS } from "./library.js";
import { build } from "./build/index.js";

export { VERSION, hash } from "./util.js";
export { VICTIMS, MANORS, SUSPECTS, MOTIVES, CAUSES, WEAPONS } from "./library.js";
export { KINDS, ROOMS, leaves, walk } from "./furniture.js";

// ---------- case numbers and item codes ----------
const check = (body) => ALPHA[hash(`check:${body}`) % ALPHA.length];

export function newCaseCode(random = Math.random) {
  let body = "";
  for (let i = 0; i < 5; i++) body += ALPHA[Math.floor(random() * ALPHA.length)];
  return `${VERSION}-${body}${check(body)}`;
}

// Accepts any spacing and case. Returns { code } or { error }.
export function parseCaseCode(input) {
  const s = String(input).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.length !== 7) return { error: "A case number has a digit and six letters, like 1-K7QMZX." };
  if (s[0] !== String(VERSION)) return { error: `This case number was made by version ${s[0]} of the game; this is version ${VERSION}. Both detectives need the same version.` };
  const body = s.slice(1, 6);
  if ([...s.slice(1)].some((c) => !ALPHA.includes(c)) || check(body) !== s[6]) return { error: "That case number has a typo. Check it with your partner." };
  return { code: `${VERSION}-${body}${s[6]}` };
}

export const normCode = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

// ---------- building the case ----------
// The generator works backwards from the answer: it picks the murderer, weapon and motive, then a proof that rules
// out each innocent suspect in a different way, then builds the house, the clues and the dialogue around that
// proof, and finally adds red herrings. Every piece of evidence that proves something is recorded as a deduction:
// the tokens a player must hold (clues entered, questions asked, observations made) and the fact they establish.
// The solver (below) checks that the facts single out one answer only when both detectives work together.

// ---------- solver ----------
// Two layers. Availability: nodes { who: "F" | "I", requires, gives } say what each detective can reach; tokens
// cross between them only by exchange (clue:* to the interrogator, hint:* to the field agent), and each exchange is
// a round. Deduction: at every round the detectives pool what they know (they talk), the case's deductions turn
// that into facts, and the facts filter every possible accusation. A case is fair when exactly one accusation
// survives at the end, and more than one suspect survives before the first exchange.
export function nodesOf(k) {
  const nodes = [];
  for (const r of k.rooms) for (const l of r.furniture.flatMap(leaves)) {
    const c = k.content[l.id];
    if (c && c.lock) {
      const lk = k.locks[c.lock];
      nodes.push({ who: "F", requires: [], gives: [`clue:${lk.lockClue}`], at: l.id });
      nodes.push({ who: "F", requires: [`hint:${lk.hint}`], gives: [`clue:${lk.clue}`], at: l.id });
    } else if (c && c.clue) nodes.push({ who: "F", requires: [], gives: [`clue:${c.clue}`], at: l.id });
  }
  for (const h of Object.values(k.hiddenSpots)) nodes.push({ who: "F", requires: [`hint:${h.hint}`], gives: [`clue:${h.clue}`], at: h.id });
  for (const s of k.suspects) {
    const d = k.dialog[s.id];
    for (const q of d.questions) nodes.push({ who: "I", requires: q.requires, gives: [...q.gives.map((g) => `hint:${g}`), ...q.events] });
    for (const [cid, c] of Object.entries(d.confront)) nodes.push({ who: "I", requires: [`clue:${cid}`, ...c.requires], gives: [...c.gives.map((g) => `hint:${g}`), ...c.events] });
    for (const o of d.observations) nodes.push({ who: "I", requires: o.requires, gives: [...o.gives.map((g) => `hint:${g}`), ...o.events] });
  }
  return nodes;
}

// Every accusation the players could make: suspect × weapon × motive.
export function hypotheses(k) {
  return k.suspects.flatMap((s) => WEAPONS.flatMap((w) => MOTIVES.map((m) => ({ s: s.id, w: w.id, m: m.id }))));
}

// The facts that follow from a set of tokens. Deductions may give tokens that other deductions need.
export function factsFrom(k, tokens) {
  const known = new Set(tokens);
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of k.deductions) if (d.gives && !known.has(d.gives) && d.needs.every((t) => known.has(t))) { known.add(d.gives); grew = true; }
  }
  return k.deductions.filter((d) => d.fact && d.needs.every((t) => known.has(t)));
}

// Facts: who (the murderer is one of allow), weapon (one of allow), mot+ (s had grudge m), mot- (s's grudge m was
// settled). A fact told by a suspect (by) holds unless that suspect is the murderer. Everybody had exactly two
// grudges (the rules say so), so once both of a suspect's papers are known, their motive is one of the two.
export const GRUDGES = 2;
export function survivors(k, tokens, all = hypotheses(k)) {
  const facts = factsFrom(k, tokens);
  const docs = {};
  for (const d of facts) if (d.fact.t === "mot+") (docs[d.fact.s] ||= new Set()).add(d.fact.m);
  return all.filter((h) => (!docs[h.s] || docs[h.s].size < GRUDGES || docs[h.s].has(h.m)) && facts.every(({ fact }) => {
    if (fact.by && fact.by === h.s) return true;
    if (fact.t === "who") return fact.allow.includes(h.s);
    if (fact.t === "weapon") return fact.allow.includes(h.w);
    if (fact.t === "mot-") return !(fact.s === h.s && fact.m === h.m);
    return true;
  }));
}

export function solve(k, exchange = true) {
  const nodes = nodesOf(k);
  const all = hypotheses(k);
  const know = { F: new Set(), I: new Set() };
  const history = [];
  for (let round = 0; ; round++) {
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of nodes) {
        if (!n.requires.every((t) => know[n.who].has(t))) continue;
        for (const g of n.gives) if (!know[n.who].has(g)) { know[n.who].add(g); grew = true; }
      }
    }
    const pooled = new Set([...know.F, ...know.I]);
    const left = survivors(k, pooled, all);
    history.push({ round, left: left.length, who: new Set(left.map((h) => h.s)).size });
    if (left.length === 1 && k.goal.every((g) => pooled.has(g))) return { solved: true, rounds: round, history, answer: left[0], pooled };
    if (!exchange) return { solved: false, rounds: round, history, pooled };
    let moved = false;
    for (const t of know.F) if (t.startsWith("clue:") && !know.I.has(t)) { know.I.add(t); moved = true; }
    for (const t of know.I) if (t.startsWith("hint:") && !know.F.has(t)) { know.F.add(t); moved = true; }
    if (!moved) return { solved: false, rounds: round, history, pooled };
  }
}

export const MAX_ROUNDS = 4;
export function validate(k) {
  const problems = [];
  const together = solve(k, true);
  if (!together.solved) problems.push("not solvable");
  else {
    const a = together.answer, sol = k.solution;
    if (a.s !== sol.suspect || a.w !== sol.weapon || a.m !== sol.motive) problems.push("solves to the wrong answer");
    if (together.rounds < 2) problems.push(`only ${together.rounds} exchange rounds`);
    if (together.rounds > MAX_ROUNDS) problems.push(`${together.rounds} exchange rounds`);
  }
  if (solve(k, false).solved) problems.push("solvable without exchange");
  if (together.history[0].who < 2) problems.push("the murderer is known before any exchange");
  for (const d of k.deductions) if (d.fact && d.fact.t === "who" && (d.fact.allow.length < 2 || !d.fact.allow.includes(k.solution.suspect))) problems.push(`bad fact: ${d.why}`);
  const codes = [...Object.values(k.clues), ...Object.values(k.hints)].map((x) => x.code);
  if (new Set(codes).size !== codes.length) problems.push("duplicate codes");
  const given = new Set(nodesOf(k).flatMap((n) => n.gives));
  for (const id of Object.keys(k.hints)) if (!given.has(`hint:${id}`)) problems.push(`hint ${id} never given`);
  for (const id of Object.keys(k.clues)) if (!given.has(`clue:${id}`)) problems.push(`clue ${id} not placed`);
  return problems;
}

const cache = new Map();
export function makeCase(code) {
  if (cache.has(code)) return cache.get(code);
  for (let attempt = 0; attempt < 50; attempt++) {
    let k;
    try { k = build(code, attempt); } catch { continue; }
    if (!validate(k).length) { cache.set(code, k); return k; }
  }
  throw new Error(`No solvable case for ${code}`);
}

// Where each clue lies: clue id -> { room, at, path }. at is the spot the field agent examines (a leaf, a locked
// leaf or a hidden place); path holds the labels from the furniture down to that spot. A locked leaf holds two
// clues: the lock itself and the paper inside.
export function clueSpots(k) {
  const out = {};
  for (const room of k.rooms) {
    const go = (n, path) => {
      const here = path.length && path[path.length - 1] === n.label ? path : [...path, n.label];
      if (n.children && n.children.length) return n.children.forEach((ch) => go(ch, here));
      const c = k.content[n.id];
      const ids = !c ? [] : c.lock ? [k.locks[c.lock].lockClue, k.locks[c.lock].clue] : c.clue ? [c.clue] : [];
      for (const id of ids) out[id] = { room: room.id, at: n.id, path: here };
    };
    room.furniture.forEach((f) => go(f, []));
  }
  for (const h of Object.values(k.hiddenSpots)) {
    const f = k.rooms.find((r) => r.id === h.room).furniture.find((x) => x.id === h.furniture);
    out[h.clue] = { room: h.room, at: h.id, path: [f.label, h.label] };
  }
  return out;
}

// Looks up a code the player typed. Returns { kind: "clue" | "hint", item } or null.
export function lookup(k, input) {
  const c = normCode(input);
  for (const item of Object.values(k.clues)) if (item.code === c) return { kind: "clue", item };
  for (const item of Object.values(k.hints)) if (item.code === c) return { kind: "hint", item };
  return null;
}

export function checkAccusation(k, a) {
  const parts = { suspect: a.suspect === k.solution.suspect, weapon: a.weapon === k.solution.weapon, motive: a.motive === k.solution.motive };
  return { parts, correct: Object.values(parts).filter(Boolean).length };
}

// One generation attempt, without validation. For tests and the metrics script.
export const buildAttempt = build;
