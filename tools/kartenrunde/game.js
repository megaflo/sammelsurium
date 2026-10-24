// Card game rules as pure functions. The host owns the state and applies every action;
// guests only receive a masked view (see viewFor).

export const COLS = 4;
export const ROWS = 3;
export const END_SCORE = 100;
export const MAX_PLAYERS = 8;

export function makeDeck() {
  const deck = [];
  const add = (v, n) => { for (let i = 0; i < n; i++) deck.push(v); };
  add(-2, 5);
  add(-1, 10);
  add(0, 15);
  for (let v = 1; v <= 12; v++) add(v, 10);
  return deck;
}

export function shuffle(arr, rnd = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function newGame() {
  return { phase: "lobby", players: [], round: 0, draw: [], discard: [], turn: 0,
    stage: "choose", held: null, heldFrom: null, closer: null, opener: null, log: [], winner: null };
}

export function addPlayer(g, id, name) {
  if (g.phase !== "lobby") throw new Error("game already started");
  if (g.players.length >= MAX_PLAYERS) throw new Error("table is full");
  g.players.push({ id, name, connected: true, total: 0, grid: [], roundScore: null, rounds: [] });
}

export function startRound(g, rnd = Math.random) {
  if (g.players.length < 2) throw new Error("need at least two players");
  g.round++;
  g.draw = shuffle(makeDeck(), rnd);
  g.discard = [g.draw.pop()];
  g.players.forEach((p) => {
    p.grid = Array.from({ length: COLS * ROWS }, () => ({ v: g.draw.pop(), up: false }));
    p.roundScore = null;
  });
  g.phase = "setup";
  g.stage = "choose";
  g.held = null;
  g.heldFrom = null;
  // Whoever closed the previous round opens this one; the first round of a game has no opener.
  g.opener = g.round > 1 ? g.closer : null;
  g.closer = null;
  g.turn = 0;
  g.winner = null;
}

const faceUp = (p) => p.grid.filter((c) => c && c.up);

// Sum of the cards in a grid, counting only face-up cards unless all is true.
export function gridSum(p, all = false) {
  return p.grid.reduce((s, c) => s + (c && (all || c.up) ? c.v : 0), 0);
}

function refill(g, rnd, ev) {
  if (g.draw.length) return;
  const top = g.discard.pop();
  g.draw = shuffle(g.discard, rnd);
  g.discard = top === undefined ? [] : [top];
  ev.push({ t: "reshuffle" });
}

// Removes every column of three equal face-up cards onto the discard pile.
function clearColumns(g, p, ev) {
  for (let c = 0; c < COLS; c++) {
    const idx = Array.from({ length: ROWS }, (_, r) => r * COLS + c);
    const cells = idx.map((i) => p.grid[i]);
    if (cells.every((x) => x && x.up && x.v === cells[0].v)) {
      cells.forEach((x) => g.discard.push(x.v));
      idx.forEach((i) => { p.grid[i] = null; });
      g.log.push(`${p.name} clears a column of ${cells[0].v}`);
      ev.push({ t: "clear", pid: p.id, col: c, v: cells[0].v, cells: idx });
    }
  }
}

function endTurn(g, rnd, ev) {
  const p = g.players[g.turn];
  clearColumns(g, p, ev);
  g.stage = "choose";
  g.held = null;
  g.heldFrom = null;
  if (g.closer === null && p.grid.every((c) => !c || c.up)) {
    g.closer = g.turn;
    g.log.push(`${p.name} has revealed everything`);
    ev.push({ t: "close", pid: p.id });
  }
  g.turn = (g.turn + 1) % g.players.length;
  if (g.closer !== null && g.turn === g.closer) finishRound(g, ev);
}

function finishRound(g, ev) {
  g.players.forEach((p) => { p.grid.forEach((c) => { if (c) c.up = true; }); });
  const raw = g.players.map((p) => gridSum(p, true));
  const ci = g.closer;
  const others = raw.filter((_, i) => i !== ci);
  const doubled = raw[ci] > 0 && !(raw[ci] < Math.min(...others));
  g.players.forEach((p, i) => {
    p.roundScore = i === ci && doubled ? raw[i] * 2 : raw[i];
    p.rounds.push(p.roundScore);
    p.total += p.roundScore;
  });
  g.doubled = doubled;
  g.phase = "roundEnd";
  ev.push({ t: "roundEnd", doubled });
  if (g.players.some((p) => p.total >= END_SCORE)) {
    g.phase = "gameEnd";
    const best = Math.min(...g.players.map((p) => p.total));
    g.winner = g.players.filter((p) => p.total === best).map((p) => p.id);
    ev.push({ t: "gameEnd", winner: g.winner });
  }
}

function beginPlay(g, ev) {
  // The previous round's closer starts. In the first round the highest sum of the two
  // revealed cards starts; ties go to the earlier seat.
  if (g.opener !== null) g.turn = g.opener;
  else {
    let best = -Infinity;
    g.players.forEach((p, i) => {
      const s = gridSum(p);
      if (s > best) { best = s; g.turn = i; }
    });
  }
  g.phase = "play";
  g.stage = "choose";
  g.log.push(`${g.players[g.turn].name} starts`);
  ev.push({ t: "play", pid: g.players[g.turn].id });
}

// Applies one action from a player and throws Error on illegal moves. Returns the events the action
// caused, in order, so clients can show what happened. They only carry what every player may see
// (a swapped-out face-down card is shown on the discard pile), so they can be sent to everyone.
// actions: {a:"flip", i} | {a:"draw"} | {a:"take"} | {a:"swap", i} | {a:"discard"} | {a:"next"}
// events:  {t:"flip", pid, i, v} | {t:"draw", pid, v} | {t:"take", pid, v} | {t:"discard", pid, v}
//        | {t:"swap", pid, i, placed, replaced, wasUp} | {t:"clear", pid, col, v, cells}
//        | {t:"close", pid} | {t:"play", pid} | {t:"reshuffle"} | {t:"roundEnd", doubled}
//        | {t:"gameEnd", winner} | {t:"deal"}
export function apply(g, pid, act, rnd = Math.random) {
  const ev = [];
  applyTo(g, pid, act, rnd, ev);
  return ev;
}

function applyTo(g, pid, act, rnd, ev) {
  const pi = g.players.findIndex((p) => p.id === pid);
  if (pi < 0) throw new Error("unknown player");
  const p = g.players[pi];
  const cell = (i) => {
    if (!Number.isInteger(i) || i < 0 || i >= COLS * ROWS || !p.grid[i]) throw new Error("bad card");
    return p.grid[i];
  };

  if (act.a === "next") {
    if (g.phase !== "roundEnd") throw new Error("round is not over");
    startRound(g, rnd);
    ev.push({ t: "deal" });
    return;
  }

  if (g.phase === "setup") {
    if (act.a !== "flip") throw new Error("flip two cards first");
    const c = cell(act.i);
    if (c.up) throw new Error("already face up");
    if (faceUp(p).length >= 2) throw new Error("you already flipped two cards");
    c.up = true;
    ev.push({ t: "flip", pid, i: act.i, v: c.v });
    if (g.players.every((q) => faceUp(q).length >= 2)) beginPlay(g, ev);
    return;
  }

  if (g.phase !== "play") throw new Error("not playing");
  if (pi !== g.turn) throw new Error("not your turn");

  if (g.stage === "choose") {
    if (act.a === "draw") {
      refill(g, rnd, ev);
      if (!g.draw.length) throw new Error("no cards left to draw");
      g.held = g.draw.pop();
      ev.push({ t: "draw", pid, v: g.held });
      g.heldFrom = "draw";
      g.stage = "holding";
    } else if (act.a === "take") {
      if (!g.discard.length) throw new Error("discard pile is empty");
      g.held = g.discard.pop();
      ev.push({ t: "take", pid, v: g.held });
      g.heldFrom = "discard";
      g.stage = "holding";
    } else throw new Error("draw or take the discard first");
    return;
  }

  if (g.stage === "holding") {
    if (act.a === "swap") {
      const c = cell(act.i);
      ev.push({ t: "swap", pid, i: act.i, placed: g.held, replaced: c.v, wasUp: c.up });
      g.discard.push(c.v);
      c.v = g.held;
      c.up = true;
      endTurn(g, rnd, ev);
    } else if (act.a === "discard") {
      if (g.heldFrom !== "draw") throw new Error("a card from the discard pile has to be placed");
      if (!p.grid.some((c) => c && !c.up)) throw new Error("no face-down card to flip");
      ev.push({ t: "discard", pid, v: g.held });
      g.discard.push(g.held);
      g.held = null;
      g.stage = "flip";
    } else throw new Error("place the card or discard it");
    return;
  }

  if (g.stage === "flip") {
    if (act.a !== "flip") throw new Error("flip a face-down card");
    const c = cell(act.i);
    if (c.up) throw new Error("already face up");
    c.up = true;
    ev.push({ t: "flip", pid, i: act.i, v: c.v });
    endTurn(g, rnd, ev);
  }
}

// What a given player may see: other players' face-down values and the draw pile are hidden.
export function viewFor(g, pid) {
  const hide = (c) => (c === null ? null : c.up ? { v: c.v, up: true } : { up: false });
  return {
    phase: g.phase, round: g.round, turn: g.turn, stage: g.stage, held: g.held, heldFrom: g.heldFrom,
    closer: g.closer, doubled: g.doubled ?? false, winner: g.winner, log: g.log.slice(-6),
    drawCount: g.draw.length, discardTop: g.discard.length ? g.discard[g.discard.length - 1] : null,
    you: pid,
    players: g.players.map((p) => ({
      id: p.id, name: p.name, connected: p.connected, total: p.total, roundScore: p.roundScore,
      rounds: p.rounds, grid: p.grid.map(hide),
    })),
  };
}

// Starts over with the same players: totals reset, new first round.
export function rematch(g, rnd = Math.random) {
  g.players.forEach((p) => { p.total = 0; p.rounds = []; });
  g.round = 0;
  g.log = [];
  startRound(g, rnd);
  return [{ t: "deal" }];
}
