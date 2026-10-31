import test from "node:test";
import assert from "node:assert/strict";
import { makeCase, newCaseCode, parseCaseCode, lookup, checkAccusation, solve, validate, nodesOf, leaves, KINDS, ROOMS, SUSPECTS, WEAPONS, VERSION } from "../tools/detektei/case.js";
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

test("each detective alone gets stuck before the weapon, the motive and the murderer's lie", () => {
  const k = makeCase(codes(1, 11)[0]);
  const nodes = nodesOf(k);
  const F = nodes.filter((n) => n.who === "F" && n.requires.length === 0).flatMap((n) => n.gives);
  assert.ok(!F.includes("clue:weapon") && !F.includes("clue:motiveM") && !F.includes("clue:token"));
  assert.ok(F.includes("clue:body"));
});

test("cases are well formed", () => {
  for (const c of codes(200, 5)) {
    const k = makeCase(c);
    assert.equal(k.suspects.length, 3);
    assert.equal(new Set(k.suspects.map((s) => s.lib.tone)).size, 3, "hair colours must tell suspects apart");
    assert.deepEqual(k.suspects.map((s) => s.role).sort(), ["H", "M", "R"]);
    assert.equal(k.rooms.length, 3);
    assert.equal(k.rooms.filter((r) => r.furniture.some((f) => f.kind === "body")).length, 1);
    const all = [...Object.values(k.clues), ...Object.values(k.hints)];
    assert.ok(all.every((x) => /^[A-Z2-9]{3}$/.test(x.code)));
    assert.equal(new Set(all.map((x) => x.code)).size, all.length);
    // Every leaf has something to show, and no text has a placeholder left in it.
    for (const r of k.rooms) for (const l of r.furniture.flatMap(leaves)) assert.ok(k.content[l.id], l.id);
    const texts = JSON.stringify([k.clues, k.hints, k.dialog, k.story, k.briefing]);
    assert.doesNotMatch(texts, /\{[A-Za-z]+\}|undefined|NaN/);
    // A hint's hidden spot sits in the room the hint belongs to.
    for (const h of Object.values(k.hints)) {
      const spot = k.hiddenSpots[h.spot];
      assert.equal(spot.room, h.room);
      assert.ok(k.rooms.find((r) => r.id === h.room).furniture.some((f) => f.id === spot.furniture));
    }
    const w = WEAPONS.find((x) => x.id === k.solution.weapon);
    assert.equal(w.cause, k.cause);
    assert.match(k.clues.weapon.text, new RegExp(k.suspects.find((s) => s.role === "M").lib.tone));
  }
});

test("most clues are red herrings, and named suspects can explain theirs", () => {
  for (const c of codes(200, 23)) {
    const k = makeCase(c);
    const ids = Object.keys(k.clues);
    const herrings = ids.filter((id) => id.startsWith("noise") || id === "decoy" || id === "motiveH");
    assert.ok(herrings.length > ids.length - herrings.length, `${c}: ${herrings.length} of ${ids.length}`);
    for (const s of k.suspects) for (const [cid, r] of Object.entries(k.dialog[s.id].confront)) {
      if (cid.startsWith("noise")) assert.match(k.clues[cid].text, new RegExp(s.short.replace(/\./g, "\\.") + "|\\b" + s.lib.surname[0] + "\\b"), cid);
      assert.ok(r.text.length > 0);
    }
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
