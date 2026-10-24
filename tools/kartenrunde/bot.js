// Computer players. A bot only looks at the masked view a human at the same seat would get
// (see viewFor), so it plays by the same information rules. botMove returns the next action
// for a bot, or null when the bot has nothing to do right now.
import { COLS, ROWS } from "./game.js";

// Average value of a card still in the deck (deck distribution from makeDeck).
const DECK_MEAN = (-2 * 5 - 1 * 10 + 10 * 78) / 150;

const hidden = (grid) => grid.map((c, i) => (c && !c.up ? i : -1)).filter((i) => i >= 0);
const column = (i) => i % COLS;

// Cells in the same column as cell i that are face up with value v.
function matchesInColumn(grid, i, v) {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    const j = r * COLS + column(i);
    if (j !== i && grid[j] && grid[j].up && grid[j].v === v) n++;
  }
  return n;
}

// Estimated gain (points saved) from putting value v into cell i.
function swapGain(grid, i, v) {
  const c = grid[i];
  const old = c.up ? c.v : DECK_MEAN;
  let gain = old - v;
  // Two equal cards already in the column: the third one clears all three.
  if (matchesInColumn(grid, i, v) === 2) {
    const col = [0, 1, 2].map((r) => grid[r * COLS + column(i)]);
    const colSum = col.reduce((s, x, r) => s + (r * COLS + column(i) === i ? old : x.up ? x.v : DECK_MEAN), 0);
    gain = colSum;
  } else if (matchesInColumn(grid, i, v) === 1) {
    gain += 2; // building towards a column
  }
  // Breaking up a pair of equal face-up cards costs the chance of a column.
  if (c.up && matchesInColumn(grid, i, c.v) >= 1) gain -= 3;
  return gain;
}

function bestSwap(grid, v) {
  let best = null;
  grid.forEach((c, i) => {
    if (!c) return;
    const g = swapGain(grid, i, v);
    if (best === null || g > best.gain) best = { i, gain: g };
  });
  return best;
}

export function botMove(view, rnd = Math.random) {
  const me = view.players.find((p) => p.id === view.you);
  const mi = view.players.indexOf(me);
  const grid = me.grid;

  if (view.phase === "setup") {
    const down = hidden(grid);
    const flipped = grid.filter((c) => c && c.up).length;
    if (flipped >= 2 || !down.length) return null;
    return { a: "flip", i: down[Math.floor(rnd() * down.length)] };
  }
  if (view.phase !== "play" || view.turn !== mi) return null;

  if (view.stage === "choose") {
    // Take the discard when it is clearly useful, otherwise gamble on the deck.
    const top = view.discardTop;
    if (top !== null) {
      const s = bestSwap(grid, top);
      if (s && s.gain >= 3) return { a: "take" };
    }
    return { a: "draw" };
  }

  if (view.stage === "holding") {
    const s = bestSwap(grid, view.held);
    const down = hidden(grid);
    if (view.heldFrom === "draw" && down.length && (!s || s.gain < 2)) return { a: "discard" };
    return { a: "swap", i: s.i };
  }

  if (view.stage === "flip") {
    const down = hidden(grid);
    return down.length ? { a: "flip", i: down[Math.floor(rnd() * down.length)] } : null;
  }
  return null;
}
