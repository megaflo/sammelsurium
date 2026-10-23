import test from "node:test";
import assert from "node:assert/strict";
import { makeDeck, newGame, addPlayer, startRound, apply, viewFor, gridSum, rematch } from "../tools/kartenrunde/game.js";

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

function setup(n = 2) {
  const g = newGame();
  for (let i = 0; i < n; i++) addPlayer(g, `p${i}`, `P${i}`);
  startRound(g, seeded());
  return g;
}
// Rows differ, so no column of three equal cards disappears. Cell i holds base + row(i).
function fill(p, base) { p.grid.forEach((c, i) => { c.v = base + Math.floor(i / 4); }); }
function flipTwo(g) {
  g.players.forEach((p) => { apply(g, p.id, { a: "flip", i: 0 }); apply(g, p.id, { a: "flip", i: 1 }); });
}

test("deck has 150 cards with the right distribution", () => {
  const d = makeDeck();
  assert.equal(d.length, 150);
  assert.equal(d.filter((v) => v === -2).length, 5);
  assert.equal(d.filter((v) => v === -1).length, 10);
  assert.equal(d.filter((v) => v === 0).length, 15);
  assert.equal(d.filter((v) => v === 7).length, 10);
});

test("deal: 12 face-down cards each and one discard", () => {
  const g = setup(3);
  assert.equal(g.draw.length, 150 - 36 - 1);
  assert.equal(g.discard.length, 1);
  assert.ok(g.players.every((p) => p.grid.length === 12 && p.grid.every((c) => !c.up)));
});

test("setup: two flips each, highest sum starts", () => {
  const g = setup(2);
  g.players[0].grid[0].v = 1; g.players[0].grid[1].v = 2;
  g.players[1].grid[0].v = 9; g.players[1].grid[1].v = 8;
  apply(g, "p0", { a: "flip", i: 0 });
  assert.throws(() => apply(g, "p0", { a: "draw" }));
  apply(g, "p0", { a: "flip", i: 1 });
  assert.throws(() => apply(g, "p0", { a: "flip", i: 2 }));
  apply(g, "p1", { a: "flip", i: 0 });
  apply(g, "p1", { a: "flip", i: 1 });
  assert.equal(g.phase, "play");
  assert.equal(g.turn, 1);
});

test("turn: draw then swap puts the old card on the discard pile", () => {
  const g = setup();
  flipTwo(g);
  const who = g.players[g.turn];
  g.draw.push(5);
  who.grid[5].v = 11;
  apply(g, who.id, { a: "draw" });
  assert.equal(g.held, 5);
  const other = g.turn;
  apply(g, who.id, { a: "swap", i: 5 });
  assert.equal(g.discard.at(-1), 11);
  assert.deepEqual(who.grid[5], { v: 5, up: true });
  assert.notEqual(g.turn, other);
});

test("turn: drawn card can be discarded, then a face-down card is flipped", () => {
  const g = setup();
  flipTwo(g);
  const who = g.players[g.turn];
  apply(g, who.id, { a: "draw" });
  const held = g.held;
  apply(g, who.id, { a: "discard" });
  assert.equal(g.discard.at(-1), held);
  assert.throws(() => apply(g, who.id, { a: "flip", i: 0 }), /already face up/);
  apply(g, who.id, { a: "flip", i: 2 });
  assert.ok(who.grid[2].up);
});

test("a card taken from the discard pile cannot be discarded again", () => {
  const g = setup();
  flipTwo(g);
  const who = g.players[g.turn];
  apply(g, who.id, { a: "take" });
  assert.throws(() => apply(g, who.id, { a: "discard" }));
  apply(g, who.id, { a: "swap", i: 3 });
});

test("only the current player may act", () => {
  const g = setup();
  flipTwo(g);
  const other = g.players[(g.turn + 1) % 2];
  assert.throws(() => apply(g, other.id, { a: "draw" }), /not your turn/);
});

test("a column of three equal face-up cards is removed", () => {
  const g = setup();
  flipTwo(g);
  const who = g.players[g.turn];
  // column 2 = cells 2, 6, 10
  [2, 6, 10].forEach((i) => { who.grid[i].v = 4; });
  who.grid[2].up = true; who.grid[6].up = true;
  g.draw.push(4);
  apply(g, who.id, { a: "draw" });
  apply(g, who.id, { a: "swap", i: 10 });
  assert.deepEqual([2, 6, 10].map((i) => who.grid[i]), [null, null, null]);
  assert.equal(g.discard.slice(-3).every((v) => v === 4), true);
});

test("round ends after everyone else had one more turn; closer is doubled when not lowest", () => {
  const g = setup();
  flipTwo(g);
  const a = g.turn, b = (a + 1) % 2;
  const pa = g.players[a], pb = g.players[b];
  fill(pa, 5); fill(pb, 1);
  pa.grid.forEach((c, i) => { c.up = i !== 7; });
  g.draw.push(6);
  apply(g, pa.id, { a: "draw" });
  apply(g, pa.id, { a: "swap", i: 7 });
  assert.equal(g.closer, a);
  assert.equal(g.phase, "play");
  g.draw.push(2);
  apply(g, pb.id, { a: "draw" });
  apply(g, pb.id, { a: "swap", i: 4 });
  assert.notEqual(g.phase, "play");
  assert.equal(pa.roundScore, 144);
  assert.equal(pb.roundScore, 24);
  assert.equal(g.doubled, true);
});

test("closer with strictly lowest score is not doubled; negative never doubled", () => {
  const g = setup();
  flipTwo(g);
  const a = g.turn, b = (a + 1) % 2;
  const pa = g.players[a], pb = g.players[b];
  fill(pa, 1); fill(pb, 9);
  pa.grid.forEach((c, i) => { c.up = i !== 7; });
  g.draw.push(2);
  apply(g, pa.id, { a: "draw" });
  apply(g, pa.id, { a: "swap", i: 7 });
  g.draw.push(10);
  apply(g, pb.id, { a: "draw" });
  apply(g, pb.id, { a: "swap", i: 4 });
  assert.equal(pa.roundScore, 24);
  assert.equal(g.doubled, false);
});

test("next round is started by the previous closer, not the highest sum", () => {
  const g = setup();
  flipTwo(g);
  const a = g.turn, b = (a + 1) % 2;
  const pa = g.players[a], pb = g.players[b];
  fill(pa, 5); fill(pb, 1);
  pb.grid.forEach((c, i) => { c.up = i !== 7; });
  g.draw.push(9);
  apply(g, pa.id, { a: "draw" });
  apply(g, pa.id, { a: "discard" });
  apply(g, pa.id, { a: "flip", i: 2 });
  g.draw.push(2);
  apply(g, pb.id, { a: "draw" });
  apply(g, pb.id, { a: "swap", i: 7 });
  assert.equal(g.closer, b);
  g.draw.push(3);
  apply(g, pa.id, { a: "draw" });
  apply(g, pa.id, { a: "discard" });
  apply(g, pa.id, { a: "flip", i: 3 });
  assert.equal(g.phase, "roundEnd");
  apply(g, "p0", { a: "next" }, seeded(5));
  g.players[a].grid[0].v = 12; g.players[a].grid[1].v = 12;
  g.players[b].grid[0].v = -2; g.players[b].grid[1].v = -2;
  flipTwo(g);
  assert.equal(g.turn, b);
});

test("game ends at 100 and the lowest total wins; rematch resets", () => {
  const g = setup();
  flipTwo(g);
  const a = g.turn, b = (a + 1) % 2;
  const pa = g.players[a], pb = g.players[b];
  pa.total = 95; pb.total = 40;
  fill(pa, 3); fill(pb, 2);
  pa.grid.forEach((c, i) => { c.up = i !== 7; });
  g.draw.push(4);
  apply(g, pa.id, { a: "draw" });
  apply(g, pa.id, { a: "swap", i: 7 });
  g.draw.push(3);
  apply(g, pb.id, { a: "draw" });
  apply(g, pb.id, { a: "swap", i: 4 });
  assert.equal(g.phase, "gameEnd");
  assert.equal(pa.total, 191); // 48 doubled, as the closer was not lowest
  assert.equal(pb.total, 76);
  const best = Math.min(...g.players.map((p) => p.total));
  assert.deepEqual(g.winner, g.players.filter((p) => p.total === best).map((p) => p.id));
  rematch(g, seeded(7));
  assert.equal(g.phase, "setup");
  assert.ok(g.players.every((p) => p.total === 0 && p.rounds.length === 0));
});

test("empty draw pile is refilled from the discard pile", () => {
  const g = setup();
  flipTwo(g);
  g.discard.push(...g.draw.splice(0));
  const who = g.players[g.turn];
  apply(g, who.id, { a: "draw" }, seeded(3));
  assert.ok(g.draw.length > 0);
  assert.equal(g.discard.length, 1);
});

test("viewFor hides face-down values and the draw pile", () => {
  const g = setup();
  flipTwo(g);
  const v = viewFor(g, "p0");
  assert.ok(v.players[1].grid.every((c) => c.up ? "v" in c : !("v" in c)));
  assert.ok(!("draw" in v));
  assert.equal(gridSum(g.players[0]) , v.players[0].grid.reduce((s, c) => s + (c.up ? c.v : 0), 0));
});
