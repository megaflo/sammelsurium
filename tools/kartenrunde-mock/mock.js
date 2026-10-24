// Kartenrunde, animated mock. The rules (game.js) and the computer players (bot.js) are the real
// ones; you play one seat against bots on this device. Only the presentation is new: cards travel
// between piles and grids, flips are real flips, and opponent turns are narrated step by step.
import { newGame, addPlayer, startRound, apply, viewFor, rematch, gridSum, COLS, ROWS, END_SCORE } from "../kartenrunde/game.js";
import { botMove } from "../kartenrunde/bot.js";

const ME = "p0";
const BOT_NAMES = ["Mira", "Jonas", "Lena", "Tom", "Nora", "Ole", "Pia"];
const SPEEDS = { slow: 1.7, normal: 1, fast: 0.55, off: 0 };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- helpers ----------
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter((x) => x != null && x !== false));
  return el;
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};
const cls = (v) => (v <= -1 ? "v-neg" : v === 0 ? "v-zero" : v <= 4 ? "v-low" : v <= 8 ? "v-mid" : "v-high");
const pos = (i) => `row ${Math.floor(i / COLS) + 1}, col ${(i % COLS) + 1}`;
const rect = (el) => el.getBoundingClientRect();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- settings ----------
const settings = {
  speed: store.get("kr-mock-speed") || (reduced ? "off" : "normal"),
  bots: Number(store.get("kr-mock-bots")) || 3,
  hints: store.get("kr-mock-hints") !== "0",
};
if (!(settings.speed in SPEEDS)) settings.speed = "normal";
const turbo = new URLSearchParams(location.search).has("turbo"); // ?turbo skips every wait, for testing
const K = () => (turbo ? 0 : SPEEDS[settings.speed]);
const pause = (ms) => wait(turbo ? 0 : settings.speed === "off" ? Math.min(ms, 120) : ms * K());
const applySpeed = () => document.documentElement.style.setProperty("--k", String(K()));

// ---------- state ----------
let game = null; // the real game state; this device is the host
let scene = null; // what is on screen right now (a masked view plus the card under the discard top)
let matchGen = 0; // bumped on restart so stale async work can bail out
let inflight = 0; // > 0 while an action is animating
let driving = false;
let autopilot = false;
let thinking = null; // id of the player the table is waiting for
let sheet = null; // { k: "scores" | "log" | "inspect" | "results", pid? }
let announce = null; // { pid, head, sub }: latest narrated step
let status = {}; // pid -> short text under the board
let recent = {}; // pid -> Set of cell indices touched in that player's last turn
let turns = []; // turn records for the log
let lastTurn = null;
let chain = Promise.resolve();
const els = {};
const boards = new Map(); // pid -> board parts
const exclusive = (fn) => { const r = chain.then(fn); chain = r.catch(() => {}); return r; };
const nameOf = (pid) => game.players.find((p) => p.id === pid).name;

function makeScene() {
  const v = structuredClone(viewFor(game, ME));
  v.under = game.discard.length > 1 ? game.discard[game.discard.length - 2] : null;
  return v;
}

// ---------- card elements ----------
function cardNode(extra = "") {
  return h("div", { class: `card ${extra}`.trim() },
    h("div", { class: "flip" }, h("div", { class: "face back" }), h("div", { class: "face front" }, h("span"))));
}
function paintFace(card, v) {
  const front = card.querySelector(".front");
  front.firstChild.textContent = String(v);
  front.className = `face front ${cls(v)}`;
}
// c: null (removed), { up: false } or { up: true, v }
function setCard(card, c) {
  card.classList.toggle("gone", c === null);
  if (c === null) return;
  if (c.up) paintFace(card, c.v); else card.querySelector(".front").firstChild.textContent = "";
  card.classList.toggle("up", !!c.up);
}
// Hides a card without animating its state change; the returned function shows it again.
function ghost(el) {
  el.classList.add("noanim", "ghost");
  return () => el.classList.remove("noanim", "ghost");
}
function pop(el) {
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}

// A card in flight over the page. from/to are DOMRects; the card keeps its size ratio and scales.
function fly({ from, to, v, startUp, flip = false, delay = 0, dur = 460, who = null, lift = 26 }) {
  if (!K()) return Promise.resolve();
  const f = cardNode("flyer");
  paintFace(f, v);
  f.classList.toggle("up", startUp);
  Object.assign(f.style, {
    left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`,
    fontSize: `${from.width * 0.4}px`,
  });
  if (who) f.append(h("span", { class: "who" }, nameOf(who)[0]));
  els.fx.append(f);
  const s = to.width / from.width;
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const anim = f.animate([
    { transform: "translate(0,0) scale(1)" },
    { transform: `translate(${dx / 2}px, ${dy / 2 - lift}px) scale(${((1 + s) / 2) * 1.12})`, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
  ], { duration: dur * K(), delay: delay * K(), easing: "cubic-bezier(.3,.6,.3,1)", fill: "both" });
  if (flip) {
    const inner = f.querySelector(".flip");
    inner.style.transitionDuration = `${dur * 0.7 * K()}ms`;
    inner.style.transitionDelay = `${(delay + dur * 0.1) * K()}ms`;
    void f.offsetWidth;
    f.classList.toggle("up", !startUp);
  }
  const done = () => f.remove();
  return anim.finished.then(done, done);
}

// ---------- narration ----------
function record(pid, step, { newTurn = false, setup = false } = {}) {
  let t = [...turns].reverse().find((x) => x.pid === pid && x.round === scene.round && !!x.setup === setup);
  if (!t || (newTurn && !setup)) {
    t = { round: scene.round, pid, setup, steps: [] };
    turns.push(t);
  }
  t.steps.push(step);
  if (sheet && sheet.k === "log") paintSheet();
}
function say(pid, short, head, sub = "") {
  status[pid] = short;
  announce = { pid, head, sub };
}
function flash(text) {
  els.flash.textContent = text;
  els.flash.classList.remove("show");
  void els.flash.offsetWidth;
  els.flash.classList.add("show");
}
let toastTimer;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

// ---------- building the screen ----------
function makeGrid(interactive) {
  const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
    const card = cardNode();
    const delta = interactive ? h("span", { class: "delta" }) : null;
    const cell = h(interactive ? "button" : "div", { class: "cell", onclick: interactive ? () => onCell(i) : null, "aria-label": interactive ? `Card ${i + 1}` : null }, card, delta);
    return { cell, card, delta };
  });
  return { grid: h("div", { class: "grid" }, cells.map((c) => c.cell)), cells };
}

function makeBoard(p, mine) {
  const g = makeGrid(mine);
  const num = h("b", { class: "num" }, "0");
  const suffix = h("span", {});
  const sumwrap = h("span", { class: "sumwrap" }, num, suffix);
  const tag = h("span", { class: "tag", hidden: true }, "Your turn");
  const nm = h("span", { class: "nm" }, p.name);
  const status = h("div", { class: "status" });
  const box = mine
    ? h("div", { class: "mine-box" }, h("div", { class: "name" }, h("span", {}, nm, tag), sumwrap), g.grid)
    : h("button", { class: "other", onclick: () => openSheet({ k: "inspect", pid: p.id }), "aria-label": `${p.name}: show larger` },
      h("div", { class: "name" }, nm, sumwrap), g.grid, status);
  return { box, cells: g.cells, num, suffix, sumwrap, tag, status, shown: null, mine };
}

function build() {
  const phone = document.getElementById("phone");
  boards.clear();
  const [me, ...others] = game.players;
  const mine = makeBoard(me, true);
  boards.set(me.id, mine);
  const otherBoards = others.map((p) => { const b = makeBoard(p, false); boards.set(p.id, b); return b; });

  els.bar = h("div", { class: "bar" });
  els.others = h("div", { class: "others" }, otherBoards.map((b) => b.box));
  els.others.style.setProperty("--cols", String(others.length <= 3 ? others.length : others.length === 4 ? 2 : others.length <= 6 ? 3 : 4));

  // table
  els.drawTop = cardNode();
  els.drawPile = h("button", { class: "pile draw", onclick: () => onPile("draw"), "aria-label": "Draw pile" }, els.drawTop);
  els.drawLabel = h("div", {});
  els.discardUnder = cardNode("under");
  els.discardTop = cardNode();
  els.discardPile = h("button", { class: "pile discard", onclick: () => onPile("take"), "aria-label": "Discard pile" }, els.discardUnder, els.discardTop);
  els.discardLabel = h("div", {});
  els.handCard = cardNode();
  setCard(els.handCard, { up: true, v: 0 });
  els.handBox = h("div", { class: "handbox" }, els.handCard);
  els.handOwner = h("div", { class: "owner" }, "Hand");
  els.handSlot = h("div", { class: "slot handslot" }, els.handOwner, els.handBox, h("div", {}, " "));
  els.flash = h("div", { class: "flash", role: "status" });
  els.table = h("div", { class: "table" },
    h("div", { class: "slot" }, els.drawPile, els.drawLabel),
    els.handSlot,
    h("div", { class: "slot" }, els.discardPile, els.discardLabel),
    els.flash);

  // dock
  els.say = h("div", { class: "say", "aria-live": "polite" });
  els.actions = h("div", {});
  els.dock = h("div", { class: "dock" }, els.say, els.actions);

  els.mine = h("div", { class: "mine-wrap" }, mine.box);
  els.sheet = h("div");
  els.toast = h("div", { id: "toast", role: "status" });
  phone.replaceChildren(h("div", { class: "game" }, els.bar, els.others, els.table, els.dock, els.mine), els.sheet, els.toast);
  els.fx = document.getElementById("fx");
  els.fx.replaceChildren();
}

// ---------- painting ----------
function setNum(b, n, float, freeze) {
  if (freeze) return;
  if (b.shown === n) return;
  const from = b.shown;
  b.shown = n;
  if (from === null || !K()) { b.num.textContent = String(n); return; }
  if (float) {
    const d = n - from;
    const el = h("span", { class: `float ${d < 0 ? "good" : "bad"}` }, d < 0 ? `−${-d}` : `+${d}`);
    b.sumwrap.append(el);
    setTimeout(() => el.remove(), 1200 * K());
  }
  const t0 = performance.now();
  const dur = 450 * K();
  const token = (b.tween = {});
  const step = (t) => {
    if (b.tween !== token) return;
    const p = Math.min(1, (t - t0) / dur);
    b.num.textContent = String(Math.round(from + (n - from) * (1 - (1 - p) ** 3)));
    if (p < 1) requestAnimationFrame(step); else b.num.textContent = String(n);
  };
  requestAnimationFrame(step);
}

function deltaFor(sc, me, i) {
  const c = me.grid[i];
  const col = i % COLS;
  const rest = [0, 1, 2].map((r) => r * COLS + col).filter((j) => j !== i).map((j) => me.grid[j]);
  if (rest.every((o) => o && o.up && o.v === sc.held)) return { text: "column!", c: "good" };
  if (!c.up) return { text: "?", c: "" };
  const d = sc.held - c.v;
  return { text: d === 0 ? "±0" : d < 0 ? `−${-d}` : `+${d}`, c: d < 0 ? "good" : d > 0 ? "bad" : "" };
}

function paint(sc, { freezeSums = false } = {}) {
  scene = sc;
  const v = sc;
  const meIdx = 0;
  const myTurn = v.phase === "play" && v.turn === meIdx;
  const idle = inflight === 0;
  const ended = v.phase === "roundEnd" || v.phase === "gameEnd";

  // bar
  const closer = v.closer !== null && v.phase === "play" ? v.players[v.closer] : null;
  els.bar.replaceChildren(
    h("strong", {}, `Round ${v.round}`),
    h("span", { class: `chip${closer ? "" : " off"}` }, closer ? `${closer.id === ME ? "You are" : `${closer.name} is`} out · last turns` : "-"),
    h("button", { onclick: () => openSheet({ k: "log" }) }, "Log"),
    h("button", { onclick: () => openSheet(ended ? { k: "results" } : { k: "scores" }) }, ended ? "Results" : "Scores"),
    h("button", { class: "gear", onclick: () => document.body.classList.add("show-mock"), "aria-label": "Mock settings" }, "⚙"));

  // boards
  v.players.forEach((p, i) => {
    const b = boards.get(p.id);
    const isTurn = v.phase === "play" && v.turn === i;
    b.box.classList.toggle("turn", isTurn);
    setNum(b, gridSum(p), v.phase === "play", freezeSums);
    if (b.mine) {
      b.suffix.textContent = ` shown · total ${p.total}`;
      b.tag.hidden = !isTurn;
    } else {
      const dots = thinking === p.id ? h("span", { class: "dots" }, "thinking ", h("i"), h("i"), h("i")) : null;
      b.status.replaceChildren(...(dots ? [dots] : [status[p.id] || (v.phase === "setup" ? "" : "")]));
    }
    const flipped = p.grid.filter((c) => c && c.up).length;
    p.grid.forEach((c, k) => {
      const cell = b.cells[k];
      setCard(cell.card, c);
      cell.card.classList.toggle("recent", !b.mine && c !== null && !!recent[p.id] && recent[p.id].has(k));
      if (b.mine) {
        let pick = false;
        if (c && idle) {
          if (v.phase === "setup") pick = !c.up && flipped < 2;
          else if (myTurn) pick = v.stage === "holding" ? v.held !== null : v.stage === "flip" ? !c.up : false;
        }
        cell.card.classList.toggle("pick", pick);
        cell.cell.disabled = !pick;
        const showHint = settings.hints && pick && v.phase === "play" && v.stage === "holding";
        cell.cell.classList.toggle("hint", showHint);
        if (showHint) {
          const d = deltaFor(v, p, k);
          cell.delta.textContent = d.text;
          cell.delta.className = `delta ${d.c}`;
        }
      }
    });
  });

  // table
  const canDraw = myTurn && v.stage === "choose" && idle;
  const canTake = canDraw && v.discardTop !== null;
  els.drawLabel.replaceChildren(h("b", {}, "Draw"), ` · ${v.drawCount}`);
  els.discardLabel.replaceChildren(canTake ? h("b", {}, `Take the ${v.discardTop}`) : h("b", {}, "Discard"));
  setCard(els.drawTop, v.drawCount ? { up: false } : null);
  setCard(els.discardTop, v.discardTop === null ? null : { up: true, v: v.discardTop });
  setCard(els.discardUnder, v.under === null || v.under === undefined ? null : { up: true, v: v.under });
  const holding = v.phase === "play" && v.stage === "holding" && v.held !== null;
  if (holding) setCard(els.handCard, { up: true, v: v.held });
  els.handBox.classList.toggle("full", holding);
  const theirs = holding && v.turn !== meIdx;
  els.handBox.classList.toggle("theirs", theirs);
  els.handSlot.classList.toggle("theirs", theirs);
  els.handOwner.textContent = holding ? (v.turn === meIdx ? "Your hand" : `${v.players[v.turn].name}'s hand`) : "Hand";
  els.drawPile.disabled = !canDraw;
  els.drawTop.classList.toggle("pick", canDraw);
  els.discardPile.disabled = !canTake;
  els.discardTop.classList.toggle("pick", canTake);
  els.drawPile.classList.toggle("dim", !canDraw && v.phase !== "setup" && !ended);
  els.discardPile.classList.toggle("dim", !canTake && v.phase !== "setup" && !ended);

  // my turn begins: a gentle cue
  const turnKey = v.phase === "play" ? v.turn : null;
  if (turnKey === meIdx && lastTurn !== meIdx && idle) {
    for (const el of [els.drawPile, els.discardPile]) { el.classList.remove("nudge"); void el.offsetWidth; el.classList.add("nudge"); }
    const mb = boards.get(ME).box;
    mb.classList.remove("nudge"); void mb.offsetWidth; mb.classList.add("nudge");
  }
  if (idle || turnKey !== meIdx) lastTurn = turnKey;

  paintDock(v, myTurn, holding);
  paintSheet();
}

function paintDock(v, myTurn, holding) {
  const me = v.players[0];
  const flipped = me.grid.filter((c) => c && c.up).length;
  let head = "", sub = "";
  let ofOther = false;
  let actions = [];
  const cur = v.players[v.turn];
  if (v.phase === "setup") {
    if (flipped < 2) { head = "Flip two of your cards"; sub = `${flipped} of 2 flipped. Tap a face-down card.`; }
    else {
      const waiting = v.players.filter((p, i) => i > 0 && p.grid.filter((c) => c && c.up).length < 2).map((p) => p.name);
      head = "Waiting for the others"; sub = waiting.length ? `${waiting.join(", ")} still flipping` : "";
    }
  } else if (v.phase === "play" && myTurn) {
    if (inflight) { head = "…"; }
    else if (v.stage === "choose") { head = "Your turn"; sub = v.discardTop === null ? "Draw a card" : `Draw a card or take the ${v.discardTop}`; }
    else if (v.stage === "flip") { head = "Flip a card"; sub = "Tap one of your face-down cards"; }
    else if (holding) {
      head = `Place the ${v.held}`;
      const canDiscard = v.heldFrom === "draw";
      sub = canDiscard ? "on any of your cards, or discard it" : "on any of your cards";
      if (canDiscard) actions = [h("button", { class: "pick", onclick: () => onDiscard() }, "Discard")];
    } else head = "…";
  } else if (v.phase === "play") {
    ofOther = true;
    if (thinking === cur.id) head = `${cur.name} is thinking…`;
    else if (announce && announce.pid === cur.id) { head = announce.head; sub = announce.sub; }
    else head = `${cur.name}'s turn`;
    if (!sub && thinking === cur.id) {
      if (v.stage === "choose" && status[cur.id]) sub = `last turn: ${status[cur.id]}`;
      else if (v.stage === "holding" && v.held !== null) sub = `holding a ${v.held}, picking a spot`;
      else if (v.stage === "flip") sub = "picking a card to flip";
    }
  } else if (v.phase === "roundEnd") { head = "Round over"; sub = "Open the results"; actions = [h("button", { class: "primary", onclick: () => openSheet({ k: "results" }) }, "Results")]; }
  else if (v.phase === "gameEnd") { head = "Game over"; actions = [h("button", { class: "primary", onclick: () => openSheet({ k: "results" }) }, "Results")]; }
  els.dock.classList.toggle("of-other", ofOther);
  els.say.replaceChildren(head, sub && h("small", {}, sub));
  els.actions.replaceChildren(...actions);
}

// ---------- sheets ----------
function openSheet(s) { sheet = s; paintSheet(); }
function closeSheet() { sheet = null; paintSheet(); }

function paintSheet() {
  if (!sheet) { els.sheet.replaceChildren(); return; }
  const keep = els.sheet.querySelector(".sheet")?.scrollTop || 0;
  const parts = sheet.k === "log" ? logSheet() : sheet.k === "inspect" ? inspectSheet() : sheet.k === "results" ? resultsSheet() : scoresSheet();
  const dismiss = () => closeSheet();
  els.sheet.replaceChildren(h("div", { class: "scrim", onclick: dismiss }), h("div", { class: "sheet", role: "dialog" }, h("div", { class: "grab" }), parts));
  els.sheet.querySelector(".sheet").scrollTop = keep;
}

function scoreTable(v, { animate = false } = {}) {
  const rounds = Math.max(1, ...v.players.map((p) => p.rounds.length));
  const last = rounds - 1;
  const ended = v.phase === "roundEnd" || v.phase === "gameEnd";
  const lowest = ended ? Math.min(...v.players.map((p) => p.rounds[last])) : null;
  const head = h("tr", {}, h("th"), Array.from({ length: rounds }, (_, i) => h("th", {}, `R${i + 1}`)), h("th", {}, "Total"));
  const rows = v.players.map((p) => {
    const total = h("td", { class: "last" }, String(p.total));
    if (animate && K() && p.rounds.length) {
      const from = p.total - p.rounds[last], to = p.total, t0 = performance.now();
      total.textContent = String(from);
      const step = (t) => { const k = Math.min(1, (t - t0 - 500 * K()) / (700 * K())); total.textContent = String(Math.round(from + (to - from) * Math.max(0, k))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    const doubled = ended && v.doubled && v.closer !== null && v.players[v.closer].id === p.id;
    return h("tr", { class: `${p.id === ME ? "me" : ""}${ended && p.rounds[last] === lowest ? " best" : ""}${v.phase === "gameEnd" && v.winner && v.winner.includes(p.id) ? " win" : ""}` },
      h("td", {}, p.id === ME ? "You" : p.name),
      Array.from({ length: rounds }, (_, i) => h("td", {}, p.rounds[i] === undefined ? "" : String(p.rounds[i]), i === last && doubled ? h("span", { class: "x2" }, "×2") : null)),
      total);
  });
  return h("div", { style: "overflow-x:auto" }, h("table", {}, head, rows));
}

function scoresSheet() {
  return [h("h2", {}, "Scores"), scoreTable(scene), h("p", { class: "note" }, `The game ends when someone reaches ${END_SCORE} points.`),
    h("button", { class: "primary", onclick: closeSheet }, "Close")];
}

function resultsSheet() {
  const v = scene;
  const over = v.phase === "gameEnd";
  const rounds = Math.max(...v.players.map((p) => p.rounds.length));
  const last = rounds - 1;
  const lowest = Math.min(...v.players.map((p) => p.rounds[last]));
  const c = v.closer !== null ? v.players[v.closer] : null;
  const parts = [h("h2", {}, over ? "Game over" : `Round ${v.round} finished`)];
  if (over) parts.push(h("p", { class: "note" }, `Winner: ${v.winner.map((id) => v.players.find((p) => p.id === id).name).join(", ")} with ${Math.min(...v.players.map((p) => p.total))} points.`));
  parts.push(h("p", { class: "note" },
    c ? `${c.id === ME ? "You" : c.name} ended the round${v.doubled ? " without the lowest score, so those points are doubled." : "."} ` : "",
    `Lowest this round: ${v.players.filter((p) => p.rounds[last] === lowest).map((p) => (p.id === ME ? "You" : p.name)).join(", ")} (${lowest}).`));
  parts.push(scoreTable(v, { animate: !sheet.shown }));
  sheet.shown = true;
  parts.push(h("div", { class: "row" },
    h("button", { class: "primary grow", onclick: () => { closeSheet(); perform(ME, { a: over ? "rematch" : "next" }).then(kick); } }, over ? "Play again" : "Next round"),
    h("button", { onclick: closeSheet }, "Show cards")));
  return parts;
}

function logSheet() {
  const items = [];
  let round = null;
  for (const t of [...turns].reverse()) {
    if (t.round !== round) { round = t.round; items.push(h("h3", {}, `Round ${round}`)); }
    const me = t.pid === ME;
    items.push(h("li", { class: "t" }, h("span", { class: `av${me ? " me" : ""}` }, nameOf(t.pid)[0]), h("span", {}, h("b", {}, me ? "You" : nameOf(t.pid)), " ", t.steps.join(" → "))));
  }
  return [h("h2", {}, "What happened"), items.length ? h("ul", { class: "loglist" }, items) : h("p", { class: "note" }, "Nothing yet."), h("button", { class: "primary", onclick: closeSheet }, "Close")];
}

function inspectSheet() {
  const pi = scene.players.findIndex((p) => p.id === sheet.pid);
  const p = scene.players[pi];
  const g = makeGrid(false);
  p.grid.forEach((c, k) => { g.cells[k].card.classList.add("noanim"); setCard(g.cells[k].card, c); });
  g.grid.className = "big-grid";
  const last = [...turns].reverse().find((t) => t.pid === p.id && !t.setup);
  return [h("h2", {}, p.name), h("p", { class: "note" }, `${gridSum(p)} shown · total ${p.total}${scene.phase === "play" && scene.turn === pi ? " · playing now" : ""}`),
    g.grid, h("p", { class: "note" }, last ? `Last turn: ${last.steps.join(" → ")}` : "No turn yet."),
    h("button", { class: "primary", onclick: closeSheet }, "Close")];
}

// ---------- animated actions ----------
// Hands out the action to the game and plays what happened. Everything that moves a card goes through here.
function perform(pid, act) {
  return exclusive(async () => {
    const gen = matchGen;
    inflight++;
    if (scene) paint(scene);
    try { return await doPerform(pid, act, gen); }
    finally { if (gen === matchGen) { inflight--; paint(scene); } }
  });
}

async function doPerform(pid, act, gen) {
  const pi = game.players.findIndex((p) => p.id === pid);
  const prev = scene;
  const cell = Number.isInteger(act.i) && game.players[pi] ? game.players[pi].grid[act.i] : null;
  const pre = { oldV: cell ? cell.v : null, wasUp: cell ? cell.up : null, phase: game.phase };
  try {
    if (act.a === "rematch") rematch(game); else apply(game, pid, act);
  } catch (e) { toast(e.message); return false; }
  const next = makeScene();
  const who = pid === ME ? "You" : nameOf(pid);

  if (act.a === "next" || act.a === "rematch") {
    turns = act.a === "rematch" ? [] : turns;
    await dealRound(next);
    return true;
  }

  if (pre.phase === "setup") {
    recent[pid] = new Set();
    record(pid, `flipped ${pre.oldV}`, { setup: true });
    const t = turns.find((x) => x.pid === pid && x.setup && x.round === prev.round);
    if (t.steps.length === 2) t.steps = [`flipped ${t.steps[0].slice(8)} and ${t.steps[1].slice(8)}`];
    status[pid] = t.steps.length === 1 && t.steps[0].includes(" and ") ? "ready" : "flipping…";
    paint(next);
    if (next.phase === "play") {
      announce = null;
      flash(`${game.players[next.turn].id === ME ? "You start" : `${game.players[next.turn].name} starts`}`);
      game.players.forEach((p) => { status[p.id] = ""; });
    }
    await pause(next.phase === "play" ? 500 : 260);
    return true;
  }

  if (act.a === "draw" || act.a === "take") {
    recent[pid] = new Set();
    const drew = act.a === "draw";
    const from = rect(drew ? els.drawTop : els.discardTop);
    const rel = ghost(els.handCard);
    record(pid, drew ? `drew a ${next.held}` : `took the ${next.held} from the discard`, { newTurn: true });
    say(pid, drew ? `drew ${next.held}` : `took ${next.held}`, `${who} ${drew ? "drew" : "took"} ${drew ? "a" : "the"} ${next.held}`, drew ? "from the draw pile" : "from the discard pile");
    paint(next);
    await fly({ from, to: rect(els.handCard), v: next.held, startUp: !drew, flip: drew, who: pid });
    if (gen !== matchGen) return false;
    rel();
    pop(els.handCard);
    return true;
  }

  if (act.a === "discard") {
    const v = prev.held;
    const from = rect(els.handCard);
    const rel = ghost(els.discardTop);
    record(pid, `discarded the ${v}`);
    say(pid, `discarded ${v}`, `${who} discarded the ${v}`, "and flips a card");
    paint(next);
    await fly({ from, to: rect(els.discardTop), v, startUp: true, who: pid });
    if (gen !== matchGen) return false;
    rel();
    pop(els.discardTop);
    return true;
  }

  if (act.a === "swap") {
    const i = act.i;
    const card = boards.get(pid).cells[i].card;
    const held = prev.held;
    const mid = structuredClone(prev);
    mid.players[pi].grid[i] = { up: true, v: held };
    mid.held = null;
    mid.discardTop = pre.oldV;
    mid.under = prev.discardTop;
    const relCard = ghost(card);
    const relTop = ghost(els.discardTop);
    const fromHand = rect(els.handCard), fromCell = rect(card), toDiscard = rect(els.discardTop);
    recent[pid] = new Set([i]);
    const gain = pre.wasUp ? pre.oldV - held : null;
    record(pid, `placed the ${held} at ${pos(i)}${pre.wasUp ? `, replacing a ${pre.oldV}` : `, replacing a hidden ${pre.oldV}`}`);
    say(pid, `${held} → r${Math.floor(i / COLS) + 1}c${(i % COLS) + 1}`, `${who} placed the ${held}`,
      `${pos(i)}, replacing ${pre.wasUp ? `a ${pre.oldV}` : `a hidden card (a ${pre.oldV})`}${gain === null ? "" : ` · ${gain > 0 ? "−" : "+"}${Math.abs(gain)}`}`);
    paint(mid, { freezeSums: true });
    await Promise.all([
      fly({ from: fromHand, to: fromCell, v: held, startUp: true, who: pid }),
      fly({ from: fromCell, to: toDiscard, v: pre.oldV, startUp: pre.wasUp, flip: !pre.wasUp, delay: 40, who: pid }),
    ]);
    if (gen !== matchGen) return false;
    relCard(); relTop();
    pop(card);
    await settle(next, pre, null, pid, who);
    return true;
  }

  if (act.a === "flip") {
    const i = act.i;
    recent[pid] = new Set([i]);
    record(pid, `flipped a ${pre.oldV} at ${pos(i)}`);
    say(pid, `flipped ${pre.oldV}`, `${who} flipped a ${pre.oldV}`, pos(i));
    await settle(next, pre, i, pid, who);
    return true;
  }
  return true;
}

// Brings the screen to the state after the action: shows columns being cleared and the round reveal.
async function settle(next, pre, flippedCell, pid, who) {
  const gen = matchGen;
  const pi = next.players.findIndex((p) => p.id === pid);
  const cleared = [];
  next.players.forEach((np, p) => np.grid.forEach((c, i) => {
    const cur = scene.players[p].grid[i];
    if (c === null && cur !== null) cleared.push({ p, i, v: cur.up ? cur.v : pre.oldV });
  }));
  const justClosed = next.closer !== null && scene.closer === null;
  const ending = next.phase === "roundEnd" || next.phase === "gameEnd";
  const reveal = revealDelays(next);

  if (cleared.length) {
    if (flippedCell !== null) {
      const s1 = structuredClone(scene);
      s1.players[pi].grid[flippedCell] = { up: true, v: pre.oldV };
      paint(s1, { freezeSums: true });
      await pause(560);
    } else await pause(320);
    if (gen !== matchGen) return;
    const v = cleared[0].v;
    const cards = cleared.map(({ p, i }) => boards.get(next.players[p].id).cells[i].card);
    const rects = cards.map(rect);
    const rel = ghost(els.discardTop);
    record(pid, `cleared a column of ${v} (${v * 3} points)`);
    say(pid, `cleared ${v}s!`, `${who} cleared a column of ${v}`, `${v * 3} points gone`);
    paint(next);
    flash(`${who} cleared a column of ${v}!`);
    await Promise.all(rects.map((r, n) => fly({ from: r, to: rect(els.discardTop), v, startUp: true, delay: n * 110, dur: 420, who: pid })));
    if (gen !== matchGen) return;
    rel();
    pop(els.discardTop);
  } else paint(next);

  if (justClosed) {
    record(pid, "has revealed everything");
    flash(`${who === "You" ? "You are" : `${who} is`} out – everyone else gets one more turn`);
  }
  if (ending) {
    await pause(reveal + 700);
    for (const b of boards.values()) b.cells.forEach((c) => c.card.style.removeProperty("--delay"));
    if (gen !== matchGen) return;
    autopilot = false;
    syncControls();
    sheet = { k: "results" };
    paintSheet();
  }
}

// Staggers the flip of every card that turns face up at the end of the round; returns the total time.
function revealDelays(next) {
  if (next.phase !== "roundEnd" && next.phase !== "gameEnd") return 0;
  let n = 0;
  for (let i = 0; i < COLS * ROWS; i++) {
    next.players.forEach((np) => {
      const was = scene.players.find((p) => p.id === np.id).grid[i];
      if (was && !was.up && np.grid[i] && np.grid[i].up) {
        boards.get(np.id).cells[i].card.style.setProperty("--delay", `${n * 0.04 * K()}s`);
        n++;
      }
    });
  }
  return Math.max(500, n * 40) * K() + 500 * K();
}

// New round: every card is dealt from the draw pile, then the first discard is turned over.
async function dealRound(sc) {
  const gen = matchGen;
  sheet = null;
  announce = null;
  status = {};
  recent = {};
  thinking = null;
  lastTurn = null;
  const rels = [];
  const targets = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    sc.players.forEach((p) => { const card = boards.get(p.id).cells[i].card; targets.push(card); });
  }
  for (const b of boards.values()) b.shown = null;
  targets.forEach((card) => { card.classList.add("noanim"); card.classList.remove("recent"); });
  const relTop = ghost(els.discardTop);
  targets.forEach((card) => rels.push(ghost(card)));
  paint(sc);
  if (K()) {
    const from = rect(els.drawTop);
    const flights = targets.map((card, n) => fly({ from, to: rect(card), v: 0, startUp: false, delay: n * 26, dur: 380 }).then(() => { if (gen === matchGen) rels[n](); }));
    flights.push(fly({ from, to: rect(els.discardTop), v: sc.discardTop, startUp: false, flip: true, delay: targets.length * 26 + 80, dur: 460 }).then(() => relTop()));
    await Promise.all(flights);
  } else { rels.forEach((r) => r()); relTop(); }
  if (gen !== matchGen) return;
  for (const card of targets) card.classList.remove("noanim");
  paint(sc);
}

// ---------- input ----------
function onCell(i) {
  if (inflight) return;
  const sc = scene;
  if (sc.phase === "setup") { perform(ME, { a: "flip", i }).then(kick); return; }
  if (sc.phase !== "play" || sc.turn !== 0) return;
  perform(ME, { a: sc.stage === "holding" ? "swap" : "flip", i }).then(kick);
}
function onPile(a) {
  if (inflight) return;
  perform(ME, { a }).then(kick);
}
function onDiscard() {
  if (inflight) return;
  perform(ME, { a: "discard" }).then(kick);
}

// ---------- computer players ----------
function nextActor() {
  for (const p of game.players) {
    if (p.id === ME && !autopilot) continue;
    if (p.id !== ME && !p.bot) continue;
    const mv = botMove(viewFor(game, p.id));
    if (mv) return { p, mv };
  }
  return null;
}
const thinkTime = { setup: 330, choose: 800, holding: 650, flip: 450 };

async function kick() {
  if (driving) return;
  driving = true;
  const gen = matchGen;
  try {
    for (;;) {
      if (gen !== matchGen) return;
      const actor = nextActor();
      if (!actor) break;
      const v = viewFor(game, actor.p.id);
      thinking = actor.p.id === ME ? null : actor.p.id;
      paint(scene);
      await pause(thinkTime[v.phase === "setup" ? "setup" : v.stage]);
      if (gen !== matchGen) return;
      thinking = null;
      const mv = botMove(viewFor(game, actor.p.id));
      if (!mv) continue;
      await perform(actor.p.id, mv);
      await pause(settings.speed === "off" ? 60 : 180);
    }
  } finally {
    if (gen === matchGen) { driving = false; thinking = null; paint(scene); }
  }
}

// ---------- match lifecycle ----------
function newMatch() {
  matchGen++;
  driving = false;
  inflight = 0;
  thinking = null;
  sheet = null;
  announce = null;
  status = {};
  recent = {};
  turns = [];
  lastTurn = null;
  chain = Promise.resolve();
  game = newGame();
  addPlayer(game, ME, "You");
  for (let i = 0; i < settings.bots; i++) {
    addPlayer(game, `b${i + 1}`, BOT_NAMES[i]);
    game.players[game.players.length - 1].bot = true;
  }
  startRound(game);
  scene = makeScene();
  build();
  const gen = matchGen;
  for (const b of boards.values()) b.shown = null;
  exclusive(async () => { inflight++; try { await dealRound(makeScene()); } finally { if (gen === matchGen) inflight--; } })
    .then(() => { if (gen === matchGen) { paint(scene); kick(); } });
}

// ---------- notes and controls ----------
const notes = document.getElementById("notes");
function seg(label, options, current, onPick) {
  const wrap = h("span", { class: "seg" });
  for (const [val, text] of options) {
    wrap.append(h("button", { "aria-pressed": String(String(current) === String(val)), onclick: () => { onPick(val); syncControls(); } }, text));
  }
  return h("div", { class: "ctl" }, h("span", {}, label), wrap);
}
function syncControls() {
  notes.replaceChildren(
    h("button", { class: "close", onclick: () => document.body.classList.remove("show-mock") }, "Close"),
    h("h1", {}, "Kartenrunde, livelier"),
    h("p", { class: "soft" }, "Interactive mock. It plays the real rules (game.js) and bots (bot.js) against you; only the presentation is new."),
    h("h2", {}, "Try it"),
    seg("Animation speed", [["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"], ["off", "Off"]], settings.speed, (v) => { settings.speed = v; store.set("kr-mock-speed", v); applySpeed(); }),
    seg("Opponents", [[1, "1"], [2, "2"], [3, "3"], [5, "5"], [7, "7"]], settings.bots, (v) => { settings.bots = Number(v); store.set("kr-mock-bots", v); newMatch(); }),
    seg("Placement hints", [["1", "On"], ["0", "Off"]], settings.hints ? "1" : "0", (v) => { settings.hints = v === "1"; store.set("kr-mock-hints", v); paint(scene); }),
    h("div", { class: "ctl" }, h("span", {}, "Game"),
      h("button", { onclick: () => { document.body.classList.remove("show-mock"); newMatch(); } }, "Restart"),
      h("button", { "aria-pressed": String(autopilot), class: autopilot ? "primary" : "", onclick: () => { autopilot = !autopilot; syncControls(); kick(); } }, autopilot ? "Autopilot on" : "Autopilot: play my turns")),
    h("h2", {}, "What changed"),
    h("ul", {},
      h("li", {}, h("b", {}, "Cards travel. "), "A drawn card flips as it flies from the pile to the hand spot, a placed card flies to its slot, the replaced one flies to the discard pile. Dealing and column clears are animated too."),
      h("li", {}, h("b", {}, "A shared hand spot. "), "The card someone holds sits between the piles with their name above it, so you see what they are deciding about."),
      h("li", {}, h("b", {}, "Opponent turns are narrated. "), "Each board has a status line (“thinking…”, “drew 7”, “7 → r2c3”), the dock above your grid spells the step out, and flights carry the player’s initial."),
      h("li", {}, h("b", {}, "What changed since you looked. "), "A blue ring and dot mark the cards an opponent touched in their last turn."),
      h("li", {}, h("b", {}, "Tap an opponent "), "to see their board enlarged with their last turn. The Log button lists every turn of the game."),
      h("li", {}, h("b", {}, "Placement hints. "), "While you hold a card, each of your cards shows what the swap does to your score (−4, +3, “column!”)."),
      h("li", {}, h("b", {}, "Scores count. "), "Shown sums tick up and down with a floating delta; the round ends with a staggered reveal and a counting results table."),
      h("li", {}, h("b", {}, "Calm by default. "), "Speed Off (or reduced-motion in your system settings) removes all movement and keeps the narration.")),
    h("p", { class: "soft" }, "Not in the mock: networking, QR pairing, and the lobby. They stay as they are."));
}

applySpeed();
syncControls();
newMatch();
