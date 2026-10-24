import test from "node:test";
import assert from "node:assert/strict";
import { newGame, addPlayer, startRound, apply, viewFor } from "../tools/kartenrunde/game.js";
import { botMove } from "../tools/kartenrunde/bot.js";

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// Lets bots play until the game ends. Returns the number of actions taken.
function playOut(n, rnd) {
  const g = newGame();
  for (let i = 0; i < n; i++) addPlayer(g, `b${i}`, `Bot ${i}`);
  startRound(g, rnd);
  let steps = 0;
  while (g.phase !== "gameEnd") {
    if (++steps > 20000) throw new Error("game did not finish");
    if (g.phase === "roundEnd") { apply(g, g.players[0].id, { a: "next" }, rnd); continue; }
    const mover = g.players.find((p) => botMove(viewFor(g, p.id), rnd));
    assert.ok(mover, `nobody can move in phase ${g.phase}`);
    apply(g, mover.id, botMove(viewFor(g, mover.id), rnd), rnd);
  }
  return g;
}

test("bots finish whole games with 2 to 8 players", () => {
  for (let n = 2; n <= 8; n++) {
    for (let seed = 1; seed <= 10; seed++) {
      const g = playOut(n, seeded(seed * 7 + n));
      assert.ok(g.players.some((p) => p.total >= 100));
      assert.ok(g.winner.length >= 1);
    }
  }
});

test("a bot does nothing when it is not its turn", () => {
  const g = newGame();
  addPlayer(g, "a", "A");
  addPlayer(g, "b", "B");
  startRound(g, seeded());
  for (const p of g.players) { apply(g, p.id, { a: "flip", i: 0 }); apply(g, p.id, { a: "flip", i: 1 }); }
  const waiting = g.players[(g.turn + 1) % 2];
  assert.equal(botMove(viewFor(g, waiting.id)), null);
});

test("a bot completes a column when it can", () => {
  const g = newGame();
  addPlayer(g, "a", "A");
  addPlayer(g, "b", "B");
  startRound(g, seeded());
  const me = g.players[0];
  me.grid.forEach((c, i) => { c.v = 10 + (i % 4); c.up = true; });
  me.grid[0].v = 9; me.grid[4].v = 9; me.grid[8].v = 12; // two 9s up, third slot holds a 12
  g.players[1].grid.forEach((c, i) => { c.up = i < 2; });
  g.phase = "play"; g.turn = 0; g.stage = "holding"; g.held = 9; g.heldFrom = "draw";
  assert.deepEqual(botMove(viewFor(g, "a")), { a: "swap", i: 8 });
});
