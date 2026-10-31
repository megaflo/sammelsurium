import test from "node:test";
import assert from "node:assert/strict";
import { makeCase, newCaseCode, parseCaseCode, lookup, checkAccusation, solve, validate, nodesOf, leaves, KINDS, ROOMS, SUSPECTS, WEAPONS, CAUSES, VERSION } from "../tools/detektei/case.js";
import { roomArt, portrait, icon } from "../tools/detektei/art.js";

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const codes = (n, seed = 7) => { const r = seeded(seed); return Array.from({ length: n }, () => newCaseCode(r)); };

test("case numbers: version, checksum and forgiving input", () => {
  const c = newCaseCode(seeded(3));
  assert.match(c, new RegExp(`^${VERSION}-[A-Z2-9]{6}$`));
  assert.equal(parseCaseCode(c).code, c);
  assert.equal(parseCaseCode(` ${c.toLowerCase().replace("-", " ")} `).code, c);
  const typo = c.slice(0, 3) + (c[3] === "A" ? "B" : "A") + c.slice(4);
  assert.ok(parseCaseCode(typo).error);
  assert.match(parseCaseCode(`9${c.slice(1)}`).error, /version/);
  assert.ok(parseCaseCode("1-ABC").error);
});

test("the same case number builds the same case", () => {
  const [c] = codes(1);
  const a = makeCase(c);
  const b = JSON.parse(JSON.stringify(a));
  const fresh = JSON.parse(JSON.stringify(makeCase(c)));
  assert.deepEqual(fresh, b);
});

test("every case is solvable together but not alone", () => {
  for (const c of codes(400)) {
    const k = makeCase(c);
    assert.deepEqual(validate(k), [], c);
    assert.ok(solve(k, true).solved, c);
    assert.ok(!solve(k, false).solved, c);
  }
});

test("the field agent alone never finds the weapon, but finds the body and what lies under it", () => {
  for (const c of codes(50, 11)) {
    const k = makeCase(c);
    const F = nodesOf(k).filter((n) => n.who === "F" && n.requires.length === 0).flatMap((n) => n.gives);
    assert.ok(!F.includes("clue:weapon"), c);
    assert.ok(F.includes("clue:body"), c);
    const under = k.content[`${k.scene}.body.under`];
    assert.ok(under && under.clue && F.includes(`clue:${under.clue}`), c);
  }
});

test("cases are well formed", () => {
  for (const c of codes(200, 5)) {
    const k = makeCase(c);
    assert.equal(k.suspects.length, 3);
    assert.equal(new Set(k.suspects.map((s) => s.lib.tone)).size, 3, "hair colours must tell suspects apart");
    assert.equal(k.suspects.filter((s) => s.role === "M").length, 1);
    assert.ok(k.suspects.every((s) => ["M", "L", "H"].includes(s.role)));
    assert.equal(k.rooms.length, 3);
    assert.equal(k.rooms.filter((r) => r.furniture.some((f) => f.kind === "body")).length, 1);
    const all = [...Object.values(k.clues), ...Object.values(k.hints)];
    assert.ok(all.every((x) => /^[A-Z2-9]{3}$/.test(x.code)));
    assert.equal(new Set(all.map((x) => x.code)).size, all.length);
    // Every leaf has something to show, and no text has a placeholder left in it.
    for (const r of k.rooms) for (const l of r.furniture.flatMap(leaves)) assert.ok(k.content[l.id], l.id);
    const texts = JSON.stringify([k.clues, k.hints, k.dialog, k.story, k.briefing]);
    assert.doesNotMatch(texts, /\{[A-Za-z]+\}|undefined|NaN/);
    // Nothing is labelled.
    assert.ok(Object.values(k.clues).every((x) => !x.tag), "clues carry no tags");
    // A hint's hidden spot sits in the room the hint belongs to.
    for (const h of Object.values(k.hints).filter((x) => x.spot)) {
      const spot = k.hiddenSpots[h.spot];
      assert.equal(spot.room, h.room);
      assert.ok(k.rooms.find((r) => r.id === h.room).furniture.some((f) => f.id === spot.furniture));
    }
    const w = WEAPONS.find((x) => x.id === k.solution.weapon);
    assert.equal(w.cause, k.cause);
    assert.match(k.clues.weapon.text, new RegExp(k.suspects.find((s) => s.role === "M").lib.tone));
  }
});

// Who owns a find or a dropped token: the one suspect with a confrontation for it.
const ownerOf = (k, id) => k.suspects.find((s) => k.dialog[s.id].confront[id] && !k.dialog[s.id].confront[id].witness);
const roomOfClue = (k, id) => {
  const leaf = Object.entries(k.content).find(([, c]) => c.clue === id);
  if (leaf) return leaf[0].split(".")[0];
  return Object.values(k.hiddenSpots).find((h) => h.clue === id).room;
};
const many = codes(400, 23).map(makeCase);

test("any number of the other two suspects may lie", () => {
  const liars = new Set(many.map((k) => k.suspects.filter((s) => s.role === "L").length));
  assert.deepEqual([...liars].sort(), [0, 1, 2]);
});

test("every kind of find is harmless in some cases and leads somewhere in others", () => {
  const seen = {};
  for (const k of many) for (const [id, c] of Object.entries(k.clues)) {
    if (!id.startsWith("find")) continue;
    const reply = k.dialog[ownerOf(k, id).id].confront[id];
    const matters = reply.gives.length > 0 || /no dust/.test(c.text) || Object.values(k.hiddenSpots).some((h) => h.clue === id);
    (seen[c.title] ||= new Set()).add(matters);
  }
  for (const [title, s] of Object.entries(seen)) assert.equal(s.size, 2, title);
});

test("dialogue and looks don't give away who plays which part", () => {
  const lines = {};
  const add = (key, role, text) => ((lines[key] ||= {})[role] ||= new Set()).add(text);
  for (const k of many) for (const s of k.suspects) {
    const d = k.dialog[s.id];
    let plain = (t) => t.slice(s.lib.voice.length).replaceAll(k.victim.short, "{V}").replaceAll(k.time, "{T}");
    const p0 = plain;
    plain = (t) => ROOMS.reduce((x, r) => x.replaceAll(r.name.toLowerCase(), "{R}"), p0(t));
    for (const q of d.questions) {
      assert.equal(q.mood, "calm");
      if (q.id === "evening") add("evening", s.role, plain(q.text));
      if (q.id === "noticed" && !q.gives.length) add("noticed", s.role, plain(q.text));
    }
    add("lost", s.role, s.lost);
    add("observations", s.role, d.observations.length);
  }
  for (const [key, byRole] of Object.entries(lines)) {
    const all = new Set(Object.values(byRole).flatMap((x) => [...x]));
    for (const role of ["M", "L", "H"]) assert.deepEqual([...byRole[role]].sort(), [...all].sort(), `${key} for ${role}`);
  }
});

test("only the murderer (or whoever the murderer frames) left something fresh at the scene, and the weapon hair fits only the murderer", () => {
  for (const k of many) {
    const M = k.suspects.find((s) => s.role === "M");
    for (const [id, c] of Object.entries(k.clues)) {
      if (!/no dust/.test(c.text) || roomOfClue(k, id) !== k.scene) continue;
      const framed = k.twists.includes("frame") && k.content[`${k.scene}.body.under`].clue === id;
      if (framed) assert.notEqual(ownerOf(k, id), M, `${k.code} ${id}`);
      else assert.equal(ownerOf(k, id), M, `${k.code} ${id}`);
    }
    for (const s of k.suspects) if (s !== M) assert.doesNotMatch(k.clues.weapon.text, new RegExp(`\\b${s.lib.tone}\\b`));
  }
});

test("suspects explain the finds they own, and only those", () => {
  for (const k of many) for (const id of Object.keys(k.clues).filter((x) => x.startsWith("find") || x.startsWith("token_"))) {
    const owners = k.suspects.filter((s) => k.dialog[s.id].confront[id] && !k.dialog[s.id].confront[id].witness);
    assert.equal(owners.length, 1, `${k.code} ${id}`);
    const o = owners[0];
    if (id.startsWith("find")) assert.match(k.clues[id].text, new RegExp(o.short.replace(/\./g, "\\.") + "|\\b" + o.lib.surname[0] + "\\b"), id);
  }
});

test("papers only hang on walls", () => {
  for (const k of many) for (const r of k.rooms) for (const l of r.furniture.flatMap(leaves)) {
    const c = k.content[l.id];
    if (l.tag === "w" && c.clue) assert.match(c.clue, /^(find\d+|motive_)/, l.id);
  }
});

test("codes are looked up by kind, ignoring case and spaces", () => {
  const k = makeCase(codes(1, 9)[0]);
  const clue = k.clues.body, hint = k.hints.hWeapon;
  assert.deepEqual(lookup(k, clue.code.toLowerCase()), { kind: "clue", item: clue });
  assert.deepEqual(lookup(k, ` ${hint.code.split("").join(" ")} `), { kind: "hint", item: hint });
  const unused = ["ZZZ", "222", "QQQ"].find((x) => !Object.values({ ...k.clues, ...k.hints }).some((i) => i.code === x));
  assert.equal(lookup(k, unused), null);
});

test("accusation counts correct parts", () => {
  const k = makeCase(codes(1, 13)[0]);
  assert.equal(checkAccusation(k, k.solution).correct, 3);
  const wrong = k.suspects.find((s) => s.id !== k.solution.suspect).id;
  const r = checkAccusation(k, { ...k.solution, suspect: wrong });
  assert.equal(r.correct, 2);
  assert.equal(r.parts.suspect, false);
});

test("library: furniture parts fit their boxes and every room has a claimable activity", () => {
  for (const [name, kind] of Object.entries(KINDS)) {
    const check = (p) => {
      const [x, y, w, h] = p.r;
      assert.ok(x >= 0 && y >= 0 && x + w <= 1.001 && y + h <= 1.001, `${name}.${p.id}`);
      (p.children || []).forEach(check);
    };
    kind.parts.forEach(check);
    if (kind.activity) assert.ok(kind.parts.some((p) => p.id === kind.activity.part), name);
  }
  for (const r of ROOMS) {
    assert.ok(r.furniture.some(([k]) => KINDS[k].activity), r.id);
    assert.ok(r.furniture.filter(([k]) => KINDS[k].hidden).length >= 2, r.id);
    for (const [k, x, y, w, h] of r.furniture) assert.ok(x >= 0 && y >= 0 && x + w <= 400 && y + h <= 260, `${r.id}.${k}`);
  }
});

test("art renders for every room, suspect and weapon", () => {
  const k = makeCase(codes(1, 17)[0]);
  for (const r of k.rooms) assert.match(roomArt(r, { revealed: Object.values(k.hiddenSpots) }), /<rect/);
  for (const s of SUSPECTS) for (const mood of ["calm", "uneasy", "afraid", "angry"]) {
    const svg = portrait(s.look, { mood, lost: true, highlight: s.look.token });
    assert.match(svg, /^<svg[^>]*viewBox="0 0 120 140"/);
    assert.doesNotMatch(svg, /undefined|NaN/);
  }
  for (const w of WEAPONS) assert.doesNotMatch(icon(w.id), /undefined|NaN/);
});

// ---------- twists, locks and witnesses ----------
const byTwist = (t) => many.filter((k) => k.twists.includes(t));
const murderer = (k) => k.suspects.find((s) => s.role === "M");
const answer = (k, s, qid) => k.dialog[s.id].questions.find((q) => q.id === qid).text;
const toMin = (t) => { const [, h, m, ap] = t.match(/(\d+):(\d+) (am|pm)/); return ((+h % 12) + (ap === "pm" ? 12 : 0)) * 60 + +m; };

test("every twist turns up, alone and combined, and some cases have none", () => {
  const seen = new Set(many.flatMap((k) => k.twists));
  for (const t of ["staged", "planted", "moved", "poison", "frame", "lovers", "confession"]) assert.ok(seen.has(t), t);
  assert.ok(many.some((k) => k.twists.length === 0));
  assert.ok(many.some((k) => k.twists.length === 2));
  assert.ok(many.every((k) => k.twists.length <= 2));
});

test("staged watch: the clock tells the real time, and the murderer only arrived after it", () => {
  for (const k of byTwist("staged")) {
    const M = murderer(k);
    assert.ok(toMin(k.watch) > toMin(k.time) + 30, k.code);
    assert.match(k.clues.body.text, /crown/);
    assert.ok(k.suspects.some((s) => s !== M && answer(k, s, "noticed").includes(`${k.time}, it must have been`)), k.code);
    const from = answer(k, M, "where").match(/from (\d+:\d+ [ap]m)/)[1];
    assert.ok(toMin(from) > toMin(k.time), k.code);
    assert.doesNotMatch(k.clues[`alibi_${M.id}`].text, /Nobody|nobody|No game|not one/i, k.code);
  }
});

test("planted weapon: a weapon of another kind lies at the scene", () => {
  for (const k of byTwist("planted")) {
    const p = WEAPONS.find((w) => k.clues.planted.title.toLowerCase() === w.name);
    assert.notEqual(p.cause, k.cause, k.code);
    assert.equal(roomOfClue(k, "planted"), k.scene);
    assert.ok(k.clues.body.text.includes(CAUSES[k.cause]));
  }
});

test("moved body: the murder room has a scrubbed stain and is the murderer's own alibi room", () => {
  for (const k of byTwist("moved")) {
    const M = murderer(k);
    assert.notEqual(k.murderRoom, k.scene);
    assert.equal(roomOfClue(k, "stain"), k.murderRoom, k.code);
    assert.equal(M.claim.room.id, k.murderRoom);
    for (const s of k.suspects) if (s.role === "H") assert.notEqual(s.claim.room.id, k.murderRoom, k.code);
  }
});

test("poison in advance: somebody saw the murderer bring the drink", () => {
  for (const k of byTwist("poison")) {
    const M = murderer(k);
    assert.equal(k.cause, "poison");
    assert.ok(k.suspects.some((s) => s !== M && answer(k, s, `on:${M.id}`).includes("hot toddy")), k.code);
  }
});

test("side twists: frame, lovers and a false confession", () => {
  for (const k of byTwist("frame")) {
    const M = murderer(k);
    const id = k.content[`${k.scene}.body.under`].clue;
    assert.ok(k.suspects.some((s) => s !== M && k.dialog[s.id].confront[id]?.events.includes("ev:frame") && k.dialog[s.id].confront[id].text.includes(M.short)), k.code);
  }
  for (const k of byTwist("lovers")) {
    const [a, b] = k.suspects.filter((s) => s.role !== "M");
    assert.equal(a.role, "L");
    assert.equal(b.role, "L");
    assert.equal(a.trace, b.trace);
  }
  for (const k of byTwist("confession")) {
    const P = k.suspects.find((s) => k.dialog[s.id].confront.body.events.includes("ev:confess"));
    assert.ok(P && P.role !== "M", k.code);
    assert.ok(!k.dialog[P.id].confront.body.text.includes(CAUSES[k.cause]));
  }
});

test("locks: the combination is the date on exactly one keepsake, and one suspect knows which", () => {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let n = 0;
  for (const k of many) {
    if (!k.lock) { assert.ok(!k.clues.lock && !k.hints.hLock); continue; }
    n++;
    assert.ok(k.content[k.lock.leaf].lock);
    const dated = Object.values(k.content).filter((c) => c.text && MONTHS.some((m) => c.text.includes(m)));
    assert.equal(dated.length, 3, k.code);
    const combos = dated.map((c) => { const [, d, m] = c.text.match(/(\d+) (\w+)/); return d.padStart(2, "0") + String(MONTHS.indexOf(m) + 1).padStart(2, "0"); });
    assert.equal(combos.filter((x) => x === k.lock.combo).length, 1, k.code);
    assert.equal(k.suspects.filter((s) => k.dialog[s.id].confront.lock.gives.includes("hLock")).length, 1);
  }
  assert.ok(n > many.length / 2);
});

test("witnesses describe hiding places so that only one room fits", () => {
  for (const k of many) for (const h of Object.values(k.hints).filter((x) => x.spot)) {
    const kind = k.rooms.flatMap((r) => r.furniture).find((f) => f.id === h.spot).kind;
    const m = h.text.match(/a room where (.+?) (?:and hid|to hide)/);
    const fits = k.rooms.filter((r) => r.furniture.some((f) => f.kind === kind) && (!m || r.senses.some((x) => x.t === m[1] && x.k.some((kk) => r.furniture.some((f) => f.kind === kk)))));
    if (m) assert.deepEqual(fits.map((r) => r.id), [h.room], `${k.code} ${h.text}`);
    else assert.match(h.text, new RegExp(`the ${k.rooms.find((r) => r.id === h.room).name.toLowerCase()}`));
  }
});

test("suspects who really were somewhere see each other there", () => {
  for (const k of many) {
    const M = murderer(k);
    const real = k.suspects.filter((s) => s.role === "H" || (s === M && ["staged", "moved", "poison"].some((t) => k.twists.includes(t))));
    for (const s of real) for (const o of real) {
      if (s === o || s.claim.room !== o.claim.room) continue;
      assert.match(answer(k, s, "where"), /was there too/, k.code);
    }
  }
});
