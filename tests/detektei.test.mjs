import test from "node:test";
import assert from "node:assert/strict";
import { makeCase, newCaseCode, parseCaseCode, lookup, checkAccusation, solve, validate, nodesOf, survivors, leaves, clueSpots, KINDS, ROOMS, SUSPECTS, WEAPONS, MOTIVES, CAUSES, VERSION } from "../tools/detektei/case.js";
import { roomArt, portrait, icon, ICON_NAMES } from "../tools/detektei/art.js";
import { seeded, sampleCases, lookupDetector } from "../scripts/detektei-metrics.mjs";

const codes = (n, seed = 7) => { const r = seeded(seed); return Array.from({ length: n }, () => newCaseCode(r)); };
const many = sampleCases(400, 23);
const murderer = (k) => k.suspects.find((s) => s.role === "M");
const answer = (k, s, qid) => k.dialog[s.id].questions.find((q) => q.id === qid).text;
const toMin = (t) => { const [, h, m, ap] = t.match(/(\d+):(\d+) (am|pm)/); return ((+h % 12) + (ap === "pm" ? 12 : 0)) * 60 + +m; };
const byTwist = (t) => many.filter((k) => k.twists.includes(t));
const roomOfClue = (k, id) => {
  const leaf = Object.entries(k.content).find(([, c]) => c.clue === id);
  if (leaf) return leaf[0].split(".")[0];
  const lock = Object.values(k.locks).find((l) => l.clue === id);
  if (lock) return lock.room;
  return Object.values(k.hiddenSpots).find((h) => h.clue === id).room;
};
const whoFacts = (k) => k.deductions.filter((d) => d.fact && d.fact.t === "who");

// ---------- case numbers ----------
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
  const a = JSON.parse(JSON.stringify(makeCase(c)));
  assert.deepEqual(JSON.parse(JSON.stringify(makeCase(c))), a);
});

// ---------- the solver ----------
test("every case solves to its answer together, in two to four exchanges, and never alone", () => {
  for (const k of many) {
    assert.deepEqual(validate(k), [], k.code);
    const r = solve(k, true);
    assert.ok(r.solved, k.code);
    assert.deepEqual([r.answer.s, r.answer.w, r.answer.m], [k.solution.suspect, k.solution.weapon, k.solution.motive], k.code);
    assert.ok(r.rounds >= 2 && r.rounds <= 4, k.code);
    assert.ok(!solve(k, false).solved, k.code);
  }
});

test("no single clue names the murderer, and talking without codes never does either", () => {
  for (const k of many) {
    const M = murderer(k);
    for (const d of whoFacts(k)) {
      assert.ok(d.fact.allow.includes(M.id), `${k.code}: ${d.why}`);
      assert.ok(d.fact.allow.length >= 2, `${k.code}: ${d.why}`);
    }
    assert.ok(solve(k).history[0].who >= 2, k.code);
  }
});

test("every innocent is ruled out by the proof, and the proof is told after the case", () => {
  for (const k of many) {
    const pooled = solve(k).pooled;
    const left = new Set(survivors(k, pooled).map((h) => h.s));
    assert.deepEqual([...left], [murderer(k).id], k.code);
    for (const s of k.suspects.filter((x) => x.role !== "M")) assert.ok(k.proof.some((p) => p.includes(s.short)), `${k.code} ${s.id}`);
  }
});

test("the field agent alone never finds the weapon, but finds the body", () => {
  for (const k of many.slice(0, 80)) {
    const F = nodesOf(k).filter((n) => n.who === "F" && n.requires.length === 0).flatMap((n) => n.gives);
    assert.ok(!F.includes("clue:weapon"), k.code);
    assert.ok(F.includes("clue:body"), k.code);
  }
});

// ---------- fairness: nothing on the surface gives the murderer away ----------
test("no line, mood, look or belonging gives away the murderer", () => {
  assert.deepEqual(lookupDetector(many, { threshold: 0.75, support: 25 }), []);
});

test("innocent suspects get angry too, and the murderer is sometimes calm under pressure", () => {
  const moods = { M: new Set(), other: new Set() };
  for (const k of many) for (const s of k.suspects) for (const c of Object.values(k.dialog[s.id].confront)) moods[s.role === "M" ? "M" : "other"].add(c.mood);
  assert.ok(moods.other.has("angry"));
  assert.ok(moods.M.has("afraid"));
  assert.deepEqual([...moods.M].sort(), [...moods.other].sort());
});

test("the proof varies: traces of every kind, alibis and witnesses all rule people out", () => {
  const routes = new Set(many.flatMap((k) => Object.values(k.routes)));
  for (const r of ["A:hair", "A:shoes", "A:smoke", "A:hand", "B", "C"]) assert.ok(routes.has(r), r);
});

test("a trace always fits the murderer and exactly one other suspect", () => {
  for (const k of many) {
    const M = murderer(k);
    for (const [id, r] of Object.entries(k.routes)) {
      const [route, dim] = r.split(":");
      if (route !== "A") continue;
      const s = k.suspects.find((x) => x.id === id);
      assert.notEqual(s.traits[dim], M.traits[dim], `${k.code} ${dim}`);
      const fits = k.suspects.filter((x) => x !== M && x.traits[dim] === M.traits[dim]).length;
      if (dim === "hair") assert.ok(fits >= 1, `${k.code} ${dim}`);
      else assert.equal(fits, 1, `${k.code} ${dim}`);
    }
    // Hair on the weapon, if any, never fits only one suspect.
    const hair = k.clues.weapon.text.match(/a single (dark|pale|red) hair/);
    if (hair) assert.ok(k.suspects.filter((s) => s.traits.hair === hair[1]).length >= 2, k.code);
  }
});

test("two grudges each; the settled one can be found out, the murderer's live one never is", () => {
  for (const k of many) {
    const M = murderer(k);
    for (const s of k.suspects) {
      assert.ok(k.clues[`motive_${s.id}_${s.motive.id}`] && k.clues[`motive_${s.id}_${s.settled.id}`]);
      assert.ok(k.deductions.some((d) => d.fact && d.fact.t === "mot-" && d.fact.s === s.id && d.fact.m === s.settled.id), `${k.code} ${s.id}`);
    }
    assert.ok(!k.deductions.some((d) => d.fact && d.fact.t === "mot-" && d.fact.s === M.id && d.fact.m === M.motive.id), k.code);
  }
});

// ---------- well formed ----------
test("cases are well formed", () => {
  for (const k of many) {
    assert.ok([3, 4].includes(k.suspects.length));
    assert.equal(new Set(k.suspects.map((s) => s.lib.surname[0])).size, k.suspects.length, "initials tell suspects apart");
    assert.equal(k.suspects.filter((s) => s.role === "M").length, 1);
    assert.equal(k.rooms.length, 3);
    assert.equal(k.rooms.filter((r) => r.furniture.some((f) => f.kind === "body")).length, 1);
    const all = [...Object.values(k.clues), ...Object.values(k.hints)];
    assert.ok(all.every((x) => /^[A-Z2-9]{3}$/.test(x.code)));
    assert.equal(new Set(all.map((x) => x.code)).size, all.length);
    for (const r of k.rooms) for (const l of r.furniture.flatMap(leaves)) assert.ok(k.content[l.id], l.id);
    const texts = JSON.stringify([k.clues, k.hints, k.dialog, k.story, k.proof, k.briefing]);
    assert.doesNotMatch(texts, /\{[A-Za-z]+\}|undefined|NaN|The combination\? The combination/);
    assert.ok(Object.values(k.clues).every((x) => !x.tag), "clues carry no tags");
    for (const h of Object.values(k.hints).filter((x) => x.spot)) {
      const spot = k.hiddenSpots[h.spot];
      assert.equal(spot.room, h.room);
      assert.ok(k.rooms.find((r) => r.id === h.room).furniture.some((f) => f.id === spot.furniture));
    }
    assert.equal(WEAPONS.find((x) => x.id === k.solution.weapon).cause, k.cause);
  }
});

test("suspects explain the finds they own, and only those", () => {
  for (const k of many) for (const id of Object.keys(k.clues).filter((x) => x.startsWith("find") || x.startsWith("token_"))) {
    const owners = k.suspects.filter((s) => k.dialog[s.id].confront[id] && !k.dialog[s.id].confront[id].witness);
    assert.equal(owners.length, 1, `${k.code} ${id}`);
    if (id.startsWith("find")) assert.match(k.clues[id].text, new RegExp(owners[0].short.replace(/\./g, "\\.") + "|\\b" + owners[0].lib.surname[0] + "\\b"), id);
  }
});

test("papers only hang on walls", () => {
  for (const k of many) for (const r of k.rooms) for (const l of r.furniture.flatMap(leaves)) {
    const c = k.content[l.id];
    if (l.tag === "w" && c.clue) assert.match(c.clue, /^(find\d+|motive_)/, l.id);
  }
});

// ---------- where people were, and what they saw ----------
test("nobody truthful sat where the weapon was hidden, and the witness saw it from the hall", () => {
  for (const k of many) {
    const M = murderer(k);
    const W = k.suspects.find((s) => answer(k, s, "noticed").includes("wrapped in a cloth") || answer(k, s, "noticed").includes("something small") || answer(k, s, "noticed").includes("drag something heavy")
      || k.dialog[s.id].confront[`alibi_${s.id}`].gives.includes("hWeapon"));
    assert.ok(W && W !== M, k.code);
    for (const s of k.suspects) if (s.role === "H") assert.notEqual(s.claim.room.id, k.hints.hWeapon.room, k.code);
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

test("witnesses describe hiding places so that only one room fits", () => {
  for (const k of many) for (const h of Object.values(k.hints).filter((x) => x.spot)) {
    const kind = k.rooms.flatMap((r) => r.furniture).find((f) => f.id === h.spot).kind;
    const m = h.text.match(/a room where (.+?)(?: and hid| and hide| and put| and tuck| this afternoon| this morning| to hide|\.|,)/);
    const fits = k.rooms.filter((r) => r.furniture.some((f) => f.kind === kind) && (!m || r.senses.some((x) => x.t === m[1] && x.k.some((kk) => r.furniture.some((f) => f.kind === kk)))));
    if (m) assert.deepEqual(fits.map((r) => r.id), [h.room], `${k.code} ${h.text}`);
    else assert.match(h.text, new RegExp(`the ${k.rooms.find((r) => r.id === h.room).name.toLowerCase()}`));
  }
});

// ---------- twists ----------
test("every twist turns up, alone and combined, and some cases have none", () => {
  const seen = new Set(many.flatMap((k) => k.twists));
  for (const t of ["staged", "moved", "poison", "frame", "lovers"]) assert.ok(seen.has(t), t);
  assert.ok(many.some((k) => k.twists.length === 0));
  assert.ok(many.some((k) => k.twists.length === 2));
});

test("staged watch: the clock tells the real time, and the murderer only arrived after it", () => {
  for (const k of byTwist("staged")) {
    const M = murderer(k);
    assert.ok(toMin(k.watch) > toMin(k.time) + 30, k.code);
    assert.match(k.clues.body.text, /crown/);
    assert.ok(k.suspects.some((s) => s !== M && answer(k, s, "noticed").includes(`${k.time}, it must have been`)), k.code);
    assert.ok(toMin(answer(k, M, "where").match(/from (\d+:\d+ [ap]m)/)[1]) > toMin(k.time), k.code);
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

test("poison in advance: somebody heard the drink go in, but nobody names who carried it", () => {
  for (const k of byTwist("poison")) {
    const M = murderer(k);
    const line = k.suspects.map((s) => answer(k, s, "noticed")).find((t) => t.includes("hot toddy"));
    assert.ok(line, k.code);
    assert.ok(!line.includes(M.short), k.code);
    assert.ok(toMin(answer(k, M, "where").match(/from (\d+:\d+ [ap]m)/)[1]) <= toMin(k.time), k.code);
  }
});

test("lovers lie together and vouch for each other once caught; a frame puts an innocent's belonging by the body", () => {
  for (const k of byTwist("lovers")) {
    const pair = k.suspects.filter((s) => s.secret && s.secret.lover);
    assert.equal(pair.length, 2, k.code);
    const [a, b] = pair;
    assert.equal(a.role, "L");
    assert.equal(b.role, "L");
    assert.equal(a.trace, b.trace);
    assert.match(k.dialog[a.id].confront[`alibi_${a.id}`].text, new RegExp(b.short.replace(/\./g, "\\.")));
  }
  for (const k of byTwist("frame")) {
    const id = Object.keys(k.clues).find((x) => x.startsWith("token_") && /by the victim's body/.test(k.clues[x].text));
    assert.ok(id, k.code);
    assert.notEqual(id.slice(6), murderer(k).id, k.code);
  }
});

// ---------- locks ----------
test("locks: real lock objects, a number found three times over, one suspect who knows which", () => {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const LOCKABLE = ["desk.drawer", "chest.lid", "vanity.box", "wardrobe.drawer", "sideboard.cupboard", "clock.case", "piano.bench"];
  const BOXABLE = ["desk.top", "table.top", "table.under", "sidetable.top", "bed.under", "sideboard.top", "vanity.top", "fireplace.mantel", "wardrobe.shelf", "chest.lid", "potting.tools"];
  let n = 0, two = 0;
  for (const k of many) {
    const locks = Object.values(k.locks);
    if (locks.length === 2) { two++; assert.notEqual(locks[0].type, locks[1].type); }
    for (const lk of locks) {
      n++;
      assert.equal(k.content[lk.leaf].lock, lk.id);
      const [rid, i, ...part] = lk.leaf.split(".");
      const kind = k.rooms.find((r) => r.id === rid).furniture.find((f) => f.id === `${rid}.${i}`).kind;
      const where = `${kind}.${part.join(".")}`;
      assert.ok(lk.box ? BOXABLE.includes(where) : LOCKABLE.includes(where), `${k.code} ${where}`);
      assert.match(lk.clue, /^(motive|settle)_/);
      const texts = Object.values(k.content).filter((c) => c.text).map((c) => c.text);
      const nums = lk.type === "date"
        ? texts.filter((t) => MONTHS.some((m) => new RegExp(`\\d+ ${m}`).test(t))).map((t) => { const [, d, m] = t.match(/(\d+) (January|February|March|April|May|June|July|August|September|October|November|December)/); return d.padStart(2, "0") + String(MONTHS.indexOf(m) + 1).padStart(2, "0"); })
        : texts.filter((t) => /Telephone: \w+ \d{4}/.test(t)).map((t) => t.match(/Telephone: \w+ (\d{4})/)[1].slice(1));
      assert.equal(nums.length, 3, k.code);
      assert.equal(nums.filter((x) => x === lk.combo).length, 1, k.code);
      assert.equal(k.suspects.filter((s) => k.dialog[s.id].confront[lk.lockClue].gives.includes(lk.hint)).length, 1);
    }
  }
  assert.ok(n > many.length / 2);
  assert.ok(two > 0);
});

// ---------- small things ----------
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
  for (const w of WEAPONS) assert.ok(CAUSES[w.cause] && w.cls && w.mark, w.id);
});

test("art renders for every room, suspect, weapon and lock", () => {
  const k = many.find((x) => Object.values(x.locks).some((l) => l.box)) || many[0];
  for (const r of k.rooms) {
    const svg = roomArt(r, { revealed: Object.values(k.hiddenSpots), locks: Object.values(k.locks).filter((l) => l.room === r.id) });
    assert.match(svg, /<rect/);
    assert.doesNotMatch(svg, /undefined|NaN/);
  }
  for (const s of SUSPECTS) for (const mood of ["calm", "uneasy", "afraid", "angry"]) {
    const svg = portrait(s.look, { mood, lost: true, highlight: s.look.token });
    assert.match(svg, /^<svg[^>]*viewBox="0 0 120 140"/);
    assert.doesNotMatch(svg, /undefined|NaN/);
  }
  for (const name of [...WEAPONS.map((w) => w.id), "strongbox", "tin", "attache"]) assert.doesNotMatch(icon(name), /undefined|NaN/);
});

test("every clue, motive and belonging names a picture that exists", () => {
  // icon() quietly falls back to the magnifier, so a misspelt or missing picture would not show up otherwise.
  const known = new Set(ICON_NAMES);
  for (const m of MOTIVES) { assert.ok(known.has(m.icon), m.id); assert.ok(known.has(m.settled.icon), m.id); }
  for (const s of SUSPECTS) assert.ok(known.has(s.token.icon), s.id);
  for (const [id, kind] of Object.entries(KINDS)) if (kind.activity) assert.ok(known.has(kind.activity.icon), id);
  for (const k of many) for (const c of Object.values(k.clues)) {
    assert.ok(known.has(c.icon), `${k.code} ${c.id}: ${c.icon}`);
    assert.notEqual(c.icon, "magnifier", `${k.code} ${c.id} has no picture of its own`);
    assert.doesNotMatch(icon(c.icon), /undefined|NaN/);
  }
});

test("every clue lies somewhere the field agent can find it again", () => {
  for (const k of many.slice(0, 120)) {
    const where = clueSpots(k);
    for (const id of Object.keys(k.clues)) {
      const w = where[id];
      assert.ok(w, `${k.code} ${id} has no spot`);
      assert.ok(k.rooms.some((r) => r.id === w.room));
      assert.ok(w.at.startsWith(`${w.room}.`), `${k.code} ${id} at ${w.at}`);
      assert.ok(w.path.length >= 1 && w.path.every((x) => typeof x === "string" && x));
      const node = nodesOf(k).find((x) => x.gives.includes(`clue:${id}`));
      if (node) assert.equal(node.at, w.at, `${k.code} ${id}`);
    }
  }
});

test("the body is found after the time on the watch and after everybody left where they were", () => {
  for (const k of many) {
    const found = k.briefing.match(/At (\d+:\d+ [ap]m), /)[1];
    const late = (t) => (toMin(t) < 12 * 60 ? toMin(t) + 24 * 60 : toMin(t)); // past midnight counts as late
    assert.ok(late(found) > late(k.watch), `${k.code}: found ${found}, watch ${k.watch}`);
    for (const s of k.suspects) {
      const until = answer(k, s, "where").match(/until (\d+:\d+ [ap]m)/)[1];
      assert.ok(late(found) > late(until), `${k.code}: found ${found}, ${s.id} until ${until}`);
    }
  }
});

test("three or four suspects; with four, every innocent is still ruled out", () => {
  const four = many.filter((k) => k.suspects.length === 4);
  assert.ok(four.length > many.length / 6 && four.length < many.length / 2, `${four.length}`);
  for (const k of four) assert.match(k.briefing, /Four people are still in the house/);
  assert.ok(four.some((k) => k.twists.includes("lovers")));
});

test("two-step proof: the liar points to hidden proof, and the witness only speaks up when shown it", () => {
  const withD = many.filter((k) => Object.values(k.routes).includes("D"));
  assert.ok(withD.length > many.length / 5, `${withD.length}`);
  for (const k of withD) for (const [id, r] of Object.entries(k.routes)) {
    if (r !== "D") continue;
    const s = k.suspects.find((x) => x.id === id);
    const hint = k.hints[`hProof_${id}`];
    assert.ok(hint && hint.spot && hint.clue === `proof_${id}`, k.code);
    assert.ok(k.dialog[id].confront[`alibi_${id}`].gives.includes(hint.id), k.code);
    const seers = k.suspects.filter((z) => (k.dialog[z.id].confront[`proof_${id}`] || { events: [] }).events.includes(`ev:seen_${id}`));
    assert.equal(seers.length, 1, k.code);
    // Shown only the broken alibi, nobody vouches for the liar yet.
    assert.ok(!k.suspects.some((z) => k.dialog[z.id].confront[`alibi_${id}`].events.includes(`ev:seen_${id}`)), k.code);
    assert.ok(s.role === "L", k.code);
  }
  // Without the proof, the case cannot be finished: withholding the proof's hint leaves more than one answer.
  for (const k of withD.slice(0, 60)) {
    const id = Object.entries(k.routes).find(([, r]) => r === "D")[0];
    const pooled = [...solve(k).pooled].filter((t) => t !== `ev:seen_${id}`);
    assert.ok(survivors(k, pooled).length > 1, k.code);
  }
  assert.ok(many.some((k) => Object.values(k.routes).includes("D") && solve(k).rounds === 3));
});

test("the murderer's cover story sometimes comes with proof too, and nobody confirms it", () => {
  const faked = many.filter((k) => k.clues[`proof_${murderer(k).id}`]);
  assert.ok(faked.length > 0);
  for (const k of faked) {
    const M = murderer(k);
    assert.ok(k.dialog[M.id].confront[`alibi_${M.id}`].gives.includes(`hProof_${M.id}`), k.code);
    assert.ok(!k.suspects.some((z) => (k.dialog[z.id].confront[`proof_${M.id}`] || { events: [] }).events.length), k.code);
  }
});
