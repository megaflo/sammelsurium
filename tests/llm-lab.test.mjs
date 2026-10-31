import test from "node:test";
import assert from "node:assert/strict";
import { makeCase, newCaseCode, parseCaseCode } from "../tools/detektei/case.js";
import { buildCases, buildMessages, grade, cleanOutput, vocabOf } from "../tools/llm-lab/check.js";

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test("the lab's default case number is valid", () => {
  assert.equal(parseCaseCode("4-ASZJNY").code, "4-ASZJNY");
});

test("test cases come from real dialog and carry their facts", () => {
  const r = seeded(9);
  for (let i = 0; i < 30; i++) {
    const k = makeCase(newCaseCode(r));
    const { cases, vocab } = buildCases(k);
    assert.ok(cases.filter((c) => c.kind === "rewrite").length >= 6);
    assert.equal(cases.filter((c) => c.kind === "atmosphere").length, 3);
    assert.equal(cases.filter((c) => c.kind === "flourish").length, 6);
    assert.equal(cases.filter((c) => c.kind === "gesture").length, 6);
    for (const c of cases.filter((c) => c.kind === "rewrite")) {
      for (const t of c.facts.times) assert.ok(c.text.includes(t));
      for (const room of c.facts.rooms) assert.ok(c.text.toLowerCase().includes(room));
      assert.ok(buildMessages(c)[1].content.includes(c.text));
    }
    assert.ok(cases.some((c) => c.kind === "rewrite" && c.facts.times.length), "some line carries a time");
  }
});

const vocab = { rooms: ["study"], surnames: ["Thorne", "Lark"] };
const rw = { kind: "rewrite", text: "At 10:32 pm? I was in the study, alone.", facts: { times: ["10:32"], rooms: ["study"], names: [] } };

test("rewrites must keep times and rooms, and may not invent times", () => {
  assert.ok(grade(rw, "Ten thirty-two? 10:32, in the study, by myself.", vocab).pass);
  assert.deepEqual(grade(rw, "I was in the study.", vocab).problems, ["lost time 10:32"]);
  assert.ok(grade(rw, "At 10:32 I was in the library.", vocab).problems.includes('lost room "study"'));
  assert.match(grade(rw, "At 10:32 in the study, and again at 11:15.", vocab).problems[0], /invented time 11:15/);
  assert.match(grade(rw, "Here is the rewritten line: 10:32 in the study", vocab).problems[0], /meta/);
  assert.equal(grade(rw, "", vocab).pass, false);
});

test("lost names are warnings, not failures", () => {
  const c = { ...rw, facts: { ...rw.facts, names: ["Thorne"] } };
  const g = grade(c, "10:32, in the study.", vocab);
  assert.ok(g.pass);
  assert.deepEqual(g.warnings.filter((w) => w.startsWith("lost name")), ["lost name Thorne"]);
});

test("atmosphere lines may not name objects, people or digits", () => {
  const c = { kind: "atmosphere", room: "study" };
  assert.ok(grade(c, "Rain drums on the window and the lamp gutters in the draught.", vocab).pass);
  assert.match(grade(c, "A bloody knife gleams under the lamp.", vocab).problems.join(), /object/);
  assert.match(grade(c, "Thorne would have hated this storm.", vocab).problems.join(), /person/);
  assert.match(grade(c, "At 3 the thunder rolls over the roof.", vocab).problems.join(), /digits/);
});

test("output cleaning strips think blocks and quotes", () => {
  assert.equal(cleanOutput('<think>hm</think> "Well, then."'), "Well, then.");
  assert.match(buildMessages({ kind: "filler", who: "x", mood: "calm" }, "onnx-community/Qwen3-0.6B-ONNX")[1].content, /no_think/);
});

test("vocabOf lists room names lowercase", () => {
  const k = makeCase("4-ASZJNY");
  assert.ok(vocabOf(k).rooms.every((r) => r === r.toLowerCase()));
});

test("multi-line output, prompt echoes and drifted rewrites fail", () => {
  assert.match(grade(rw, "10:32, in the study.\nMood: calm", vocab).problems.join(), /more than one line/);
  assert.match(grade({ kind: "filler" }, "Mood: afraid again, and it was no use.", vocab).problems.join(), /label/);
  assert.match(grade({ kind: "filler" }, "Felix Morrow: I was just out walking.", vocab).problems.join(), /label/);
  const noFacts = { kind: "rewrite", text: "Lord Thorne and I served together in India. Forty years of friendship.", facts: { times: [], rooms: [], names: [] } };
  assert.match(grade(noFacts, "Huh. I was wrong then, all the time.", vocab).problems.join(), /drifted/);
});

test("flourishes may not carry facts", () => {
  const c = { kind: "flourish" };
  assert.ok(grade(c, "Good heavens, must we?", vocab).pass);
  assert.match(grade(c, "Ah, the study again.", vocab).problems.join(), /room/);
  assert.match(grade(c, "Ask Thorne, not me.", vocab).problems.join(), /person/);
  assert.match(grade(c, "At 9 o'clock, ha.", vocab).problems.join(), /digits/);
});

test("a rewrite that copies the input fails; a near copy only warns", () => {
  const g = grade(rw, "At 10:32 pm? I was in the study, alone.", vocab);
  assert.ok(!g.pass && g.unchanged);
  assert.match(g.problems.join(), /unchanged/);
  const n = grade(rw, "Hmm. At 10:32 pm? I was in the study, alone.", vocab);
  assert.ok(n.pass && n.unchanged);
  assert.ok(n.warnings.includes("nearly unchanged"));
  assert.ok(!grade(rw, "Alone in the study, at 10:32, as I said!", vocab).unchanged);
});

test("flourishes may not claim where the character was", () => {
  const c = { kind: "flourish" };
  assert.match(grade(c, "I was in my room, trying to work.", vocab).problems.join(), /claims/);
  assert.match(grade(c, "I was out there, and I was alone.", vocab).problems.join(), /claims/);
  assert.ok(grade(c, "I was afraid.", vocab).pass);
});

test("gestures are one stage direction without speech", () => {
  const c = { kind: "gesture" };
  assert.ok(grade(c, "*folds her arms and glares*", vocab).pass);
  assert.match(grade(c, "She folds her arms.", vocab).problems.join(), /stage direction/);
  assert.match(grade(c, '*mutters "no"*', vocab).problems.join(), /speech/);
  assert.match(grade(c, "*glances at the study door*", vocab).problems.join(), /room/);
});

test("atmosphere may name its own room but not another", () => {
  const c = { kind: "atmosphere", room: "study" };
  const v = { rooms: ["study", "kitchen"], surnames: [] };
  assert.ok(grade(c, "The study hums with wind and distant thunder.", v).pass);
  assert.match(grade(c, "From the kitchen comes a distant clatter of wind.", v).problems.join(), /room/);
});

test("few-shot examples add turns before the real prompt and use no case rooms", () => {
  const c = { kind: "gesture", who: "x", mood: "calm" };
  const plain = buildMessages(c, "m");
  const shot = buildMessages(c, "m", true);
  assert.equal(plain.length, 2);
  assert.equal(shot.length, 6);
  assert.deepEqual(shot.at(-1), plain.at(-1));
  assert.deepEqual(shot.slice(1, -1).map((m) => m.role), ["user", "assistant", "user", "assistant"]);
});
