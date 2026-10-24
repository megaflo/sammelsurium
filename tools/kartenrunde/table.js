// The game table: persistent screen, animations and narration. It never reads the game state. It gets
// a masked view plus the events of the last action from the host (see apply in game.js), shows what
// happened as moving cards, and falls back to just showing the view when it missed a message.
import { gridSum, COLS, ROWS, END_SCORE } from "./game.js";

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

// ---------- motion ----------
// Animations default to on unless the system asks for reduced motion. Without them the narration stays.
const motion = { on: (store.get("kartenrunde-motion") || (reduced ? "off" : "on")) === "on" };
const K = () => (motion.on ? 1 : 0);
const applyMotion = () => document.documentElement.style.setProperty("--k", String(K()));
const pause = (ms) => wait(motion.on ? ms : Math.min(ms, 120));

// ---------- state ----------
let cfg = null; // { act(a), toast(msg), isHost, onPaint(view) }
let me = null; // id of the local player
let mountGen = 0; // bumped on every mount so stale async work can bail out
let scene = null; // the view on screen, plus the card under the discard top
let inflight = 0; // > 0 while a message is being played
let waiting = 0; // messages queued behind the one being played
let awaiting = false; // an action was sent and its answer has not arrived
let dealing = false; // the round is being dealt
let thinkOn = false; // nothing moved for a moment: the player whose turn it is is thinking
let thinkTimer = null;
let sheet = null; // { k: "scores" | "log" | "results" }
let announce = null; // { pid, head, sub }: latest narrated step
let status = {}; // pid -> short text under the board
let recent = {}; // pid -> Set of cell indices touched in that player's last turn
let turns = []; // turn records for the log
let lastTurn = null;
let chain = Promise.resolve();
let sid = null; // host session of the last message
let seen = 0; // sequence number of the last message
let els = {};
const boards = new Map(); // pid -> board parts
const nameOf = (pid) => scene.players.find((p) => p.id === pid).name;

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
// ---------- building the screen ----------
function makeGrid(interactive) {
  const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
    const card = cardNode();
    const cell = h(interactive ? "button" : "div", { class: "cell", onclick: interactive ? () => onCell(i) : null, "aria-label": interactive ? `Card ${i + 1}` : null }, card);
    return { cell, card };
  });
  return { grid: h("div", { class: "grid" }, cells.map((c) => c.cell)), cells };
}

function makeBoard(p, mine) {
  const g = makeGrid(mine);
  const num = h("b", { class: "num" }, "0");
  const suffix = h("span", {});
  const sumwrap = h("span", { class: "sumwrap" }, num, suffix);
  const tag = h("span", { class: "tag", hidden: true }, "Your turn");
  const away = h("span", { class: "dot off", hidden: true, title: "disconnected" });
  const nm = h("span", { class: "nm" }, away, p.name);
  const status = h("div", { class: "status" });
  const box = mine
    ? h("div", { class: "mine-box" }, h("div", { class: "name" }, h("span", {}, nm, tag), sumwrap), g.grid)
    : h("div", { class: "other" },
      h("div", { class: "name" }, nm, sumwrap), g.grid, status);
  return { box, cells: g.cells, num, suffix, sumwrap, tag, status, away, shown: null, mine };
}

function build(view) {
  boards.clear();
  const mineP = view.players.find((p) => p.id === me);
  const others = view.players.filter((p) => p.id !== me);
  const mine = makeBoard(mineP, true);
  boards.set(me, mine);
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
  els.overlay = h("div", { class: "away" });
  els.invite = h("div", { class: "invite" });
  els.sheet = h("div");
  els.fx = document.getElementById("fx");
  els.fx.replaceChildren();
  root.replaceChildren(els.bar, els.overlay, els.others, els.table, els.dock, els.mine, els.invite, els.sheet);
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

function paint(sc, { freezeSums = false } = {}) {
  scene = sc;
  const v = sc;
  const meIdx = v.players.findIndex((p) => p.id === me);
  const myTurn = v.phase === "play" && v.turn === meIdx;
  const idle = inflight === 0 && !awaiting;
  const thinkingId = thinkOn && v.phase === "play" && !myTurn ? v.players[v.turn].id : null;
  const ended = v.phase === "roundEnd" || v.phase === "gameEnd";

  // bar
  const closer = v.closer !== null && v.phase === "play" ? v.players[v.closer] : null;
  els.bar.replaceChildren(
    h("strong", {}, `Round ${v.round}`),
    h("span", { class: `chip${closer ? "" : " off"}` }, closer ? `${closer.id === me ? "You are" : `${closer.name} is`} out · last turns` : "-"),
    h("button", { onclick: () => openSheet({ k: "log" }) }, "Log"),
    h("button", { onclick: () => openSheet(ended ? { k: "results" } : { k: "scores" }) }, ended ? "Results" : "Scores"));

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
      const dots = thinkingId === p.id ? h("span", { class: "dots" }, "thinking ", h("i"), h("i"), h("i")) : null;
      b.status.replaceChildren(...(dots ? [dots] : [status[p.id] || (v.phase === "setup" ? "" : "")]));
    }
    b.away.hidden = p.connected !== false;
    const flipped = p.grid.filter((c) => c && c.up).length;
    p.grid.forEach((c, k) => {
      const cell = b.cells[k];
      setCard(cell.card, c);
      cell.card.classList.toggle("recent", !b.mine && c !== null && !!recent[p.id] && recent[p.id].has(k));
      if (b.mine) {
        let pick = false;
        if (c && (idle || (v.phase === "setup" && !dealing && !awaiting))) {
          if (v.phase === "setup") pick = !c.up && flipped < 2;
          else if (myTurn) pick = v.stage === "holding" ? v.held !== null : v.stage === "flip" ? !c.up : false;
        }
        cell.card.classList.toggle("pick", pick);
        cell.cell.disabled = !pick;
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
    const mb = boards.get(me).box;
    mb.classList.remove("nudge"); void mb.offsetWidth; mb.classList.add("nudge");
  }
  if (idle || turnKey !== meIdx) lastTurn = turnKey;

  paintDock(v, myTurn, holding, thinkingId);
  paintSheet();
  if (cfg.onPaint) cfg.onPaint(v);
}

function paintDock(v, myTurn, holding, thinkingId) {
  const mine = v.players.find((p) => p.id === me);
  const flipped = mine.grid.filter((c) => c && c.up).length;
  let head = "", sub = "";
  let ofOther = false;
  let actions = [];
  const cur = v.players[v.turn];
  if (v.phase === "setup") {
    if (flipped < 2) { head = "Flip two of your cards"; sub = `${flipped} of 2 flipped. Tap a face-down card.`; }
    else {
      const waiting = v.players.filter((p) => p.id !== me && p.grid.filter((c) => c && c.up).length < 2).map((p) => p.name);
      head = "Waiting for the others"; sub = waiting.length ? `${waiting.join(", ")} still flipping` : "";
    }
  } else if (v.phase === "play" && myTurn) {
    if (inflight || awaiting) { head = "…"; }
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
    if (thinkingId === cur.id) head = `${cur.name} is thinking…${cur.connected === false ? " (disconnected)" : ""}`;
    else if (announce && announce.pid === cur.id) { head = announce.head; sub = announce.sub; }
    else head = `${cur.name}'s turn`;
    if (!sub && thinkingId === cur.id) {
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
  const parts = sheet.k === "log" ? logSheet() : sheet.k === "results" ? resultsSheet() : scoresSheet();
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
    return h("tr", { class: `${p.id === me ? "me" : ""}${ended && p.rounds[last] === lowest ? " best" : ""}${v.phase === "gameEnd" && v.winner && v.winner.includes(p.id) ? " win" : ""}` },
      h("td", {}, p.id === me ? "You" : p.name),
      Array.from({ length: rounds }, (_, i) => h("td", {}, p.rounds[i] === undefined ? "" : String(p.rounds[i]), i === last && doubled ? h("span", { class: "x2" }, "×2") : null)),
      total);
  });
  return h("div", { style: "overflow-x:auto" }, h("table", {}, head, rows));
}

function scoresSheet() {
  const motionBtn = h("button", { onclick: () => { motion.on = !motion.on; store.set("kartenrunde-motion", motion.on ? "on" : "off"); applyMotion(); paintSheet(); } }, `Animations: ${motion.on ? "on" : "off"}`);
  return [h("h2", {}, "Scores"), scoreTable(scene), h("p", { class: "note" }, `The game ends when someone reaches ${END_SCORE} points.`),
    h("div", { class: "row" }, h("button", { class: "primary grow", onclick: closeSheet }, "Close"), motionBtn)];
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
    c ? `${c.id === me ? "You" : c.name} ended the round${v.doubled ? " without the lowest score, so those points are doubled." : "."} ` : "",
    `Lowest this round: ${v.players.filter((p) => p.rounds[last] === lowest).map((p) => (p.id === me ? "You" : p.name)).join(", ")} (${lowest}).`));
  parts.push(scoreTable(v, { animate: !sheet.shown }));
  sheet.shown = true;
  parts.push(h("div", { class: "row" },
    cfg.isHost
      ? h("button", { class: "primary grow", onclick: () => { closeSheet(); cfg.act({ a: over ? "rematch" : "next" }); } }, over ? "Play again" : "Next round")
      : h("p", { class: "soft grow" }, "Waiting for the host…"),
    h("button", { onclick: closeSheet }, "Show cards")));
  return parts;
}

function logSheet() {
  const items = [];
  let round = null;
  for (const t of [...turns].reverse()) {
    if (t.round !== round) { round = t.round; items.push(h("h3", {}, `Round ${round}`)); }
    const mine = t.pid === me;
    items.push(h("li", { class: "t" }, h("span", { class: `av${mine ? " me" : ""}` }, nameOf(t.pid)[0]), h("span", {}, h("b", {}, mine ? "You" : nameOf(t.pid)), " ", t.steps.join(" → "))));
  }
  return [h("h2", {}, "What happened"), items.length ? h("ul", { class: "loglist" }, items) : h("p", { class: "note" }, "Nothing yet."), h("button", { class: "primary", onclick: closeSheet }, "Close")];
}

async function playEvents(prev, next, ev, gen) {
  const main = ev.find((e) => ["flip", "draw", "take", "swap", "discard"].includes(e.t));
  if (!main) { paint(next); return; }
  if (ev.some((e) => e.t === "reshuffle")) flash("Discard pile reshuffled");
  const pid = main.pid;
  const pi = prev.players.findIndex((p) => p.id === pid);
  const who = pid === me ? "You" : prev.players[pi].name;

  if (prev.phase === "setup") {
    recent[pid] = new Set();
    record(pid, `flipped ${main.v}`, { setup: true });
    const t = turns.find((x) => x.pid === pid && x.setup && x.round === prev.round);
    if (t.steps.length === 2) t.steps = [`flipped ${t.steps[0].slice(8)} and ${t.steps[1].slice(8)}`];
    status[pid] = t.steps[0].includes(" and ") ? "ready" : "flipping…";
    paint(next);
    const start = ev.find((e) => e.t === "play");
    if (start) {
      announce = null;
      flash(start.pid === me ? "You start" : `${nameOf(start.pid)} starts`);
      prev.players.forEach((p) => { status[p.id] = ""; });
    }
    await pause(start ? 500 : 260);
    return;
  }

  if (main.t === "draw" || main.t === "take") {
    recent[pid] = new Set();
    const drew = main.t === "draw";
    const from = rect(drew ? els.drawTop : els.discardTop);
    const rel = ghost(els.handCard);
    record(pid, drew ? `drew a ${main.v}` : `took the ${main.v} from the discard`, { newTurn: true });
    say(pid, drew ? `drew ${main.v}` : `took ${main.v}`, `${who} ${drew ? "drew" : "took"} ${drew ? "a" : "the"} ${main.v}`, drew ? "from the draw pile" : "from the discard pile");
    paint(next);
    await fly({ from, to: rect(els.handCard), v: main.v, startUp: !drew, flip: drew, who: pid });
    if (gen !== mountGen) return;
    rel();
    pop(els.handCard);
    return;
  }

  if (main.t === "discard") {
    const from = rect(els.handCard);
    const rel = ghost(els.discardTop);
    record(pid, `discarded the ${main.v}`);
    say(pid, `discarded ${main.v}`, `${who} discarded the ${main.v}`, "and flips a card");
    paint(next);
    await fly({ from, to: rect(els.discardTop), v: main.v, startUp: true, who: pid });
    if (gen !== mountGen) return;
    rel();
    pop(els.discardTop);
    return;
  }

  if (main.t === "swap") {
    const { i, placed, replaced, wasUp } = main;
    const card = boards.get(pid).cells[i].card;
    const mid = structuredClone(prev);
    mid.players[pi].grid[i] = { up: true, v: placed };
    mid.held = null;
    mid.discardTop = replaced;
    mid.under = prev.discardTop;
    const relCard = ghost(card);
    const relTop = ghost(els.discardTop);
    const fromHand = rect(els.handCard), fromCell = rect(card), toDiscard = rect(els.discardTop);
    recent[pid] = new Set([i]);
    const gain = wasUp ? replaced - placed : null;
    record(pid, `placed the ${placed} at ${pos(i)}${wasUp ? `, replacing a ${replaced}` : `, replacing a hidden ${replaced}`}`);
    say(pid, `${placed} → r${Math.floor(i / COLS) + 1}c${(i % COLS) + 1}`, `${who} placed the ${placed}`,
      `${pos(i)}, replacing ${wasUp ? `a ${replaced}` : `a hidden card (a ${replaced})`}${gain === null ? "" : ` · ${gain > 0 ? "−" : "+"}${Math.abs(gain)}`}`);
    paint(mid, { freezeSums: true });
    await Promise.all([
      fly({ from: fromHand, to: fromCell, v: placed, startUp: true, who: pid }),
      fly({ from: fromCell, to: toDiscard, v: replaced, startUp: wasUp, flip: !wasUp, delay: 40, who: pid }),
    ]);
    if (gen !== mountGen) return;
    relCard(); relTop();
    pop(card);
    await settle(next, ev, null, pid, who);
    return;
  }

  // flip of a face-down card after discarding
  recent[pid] = new Set([main.i]);
  record(pid, `flipped a ${main.v} at ${pos(main.i)}`);
  say(pid, `flipped ${main.v}`, `${who} flipped a ${main.v}`, pos(main.i));
  await settle(next, ev, { i: main.i, v: main.v }, pid, who);
}

// Brings the screen to the state after the action: columns being cleared, the closer, the round reveal.
async function settle(next, ev, flipped, pid, who) {
  const gen = mountGen;
  const pi = next.players.findIndex((p) => p.id === pid);
  const clears = ev.filter((e) => e.t === "clear");
  const justClosed = ev.some((e) => e.t === "close");
  const ending = ev.some((e) => e.t === "roundEnd");
  const reveal = revealDelays(next, ending);

  if (clears.length) {
    if (flipped) {
      const s1 = structuredClone(scene);
      s1.players[pi].grid[flipped.i] = { up: true, v: flipped.v };
      paint(s1, { freezeSums: true });
      await pause(560);
    } else await pause(320);
    if (gen !== mountGen) return;
    const flights = [];
    const rel = ghost(els.discardTop);
    for (const c of clears) {
      c.cells.forEach((i) => flights.push({ rect: rect(boards.get(c.pid).cells[i].card), v: c.v }));
      record(pid, `cleared a column of ${c.v} (${c.v * 3} points)`);
      say(pid, `cleared ${c.v}s!`, `${who} cleared a column of ${c.v}`, `${c.v * 3} points gone`);
    }
    paint(next);
    flash(`${who} cleared a column of ${clears[0].v}!`);
    await Promise.all(flights.map((f, n) => fly({ from: f.rect, to: rect(els.discardTop), v: f.v, startUp: true, delay: n * 110, dur: 420, who: pid })));
    if (gen !== mountGen) return;
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
    if (gen !== mountGen) return;
    sheet = { k: "results" };
    paintSheet();
  }
}

// Staggers the flip of every card that turns face up at the end of the round; returns the total time.
function revealDelays(next, ending) {
  if (!ending) return 0;
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
  const gen = mountGen;
  dealing = true;
  sheet = null;
  announce = null;
  status = {};
  recent = {};
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
    const flights = targets.map((card, n) => fly({ from, to: rect(card), v: 0, startUp: false, delay: n * 26, dur: 380 }).then(() => { if (gen === mountGen) rels[n](); }));
    flights.push(fly({ from, to: rect(els.discardTop), v: sc.discardTop, startUp: false, flip: true, delay: targets.length * 26 + 80, dur: 460 }).then(() => relTop()));
    await Promise.all(flights);
  } else { rels.forEach((r) => r()); relTop(); }
  if (gen !== mountGen) return;
  for (const card of targets) card.classList.remove("noanim");
  dealing = false;
  paint(sc);
}


// ---------- messages ----------
// The card under the discard top is not part of the view; the table remembers it from the events.
function deriveUnder(prev, ev) {
  let under = prev.under ?? null;
  for (const e of ev) {
    if (e.t === "take" || e.t === "reshuffle") under = null;
    else if (e.t === "swap" || e.t === "discard") under = prev.discardTop;
    else if (e.t === "clear") under = e.v;
  }
  return under;
}

function showState(next) {
  next.under = next.under ?? null;
  paint(next);
  if (next.phase === "roundEnd" || next.phase === "gameEnd") { sheet = { k: "results" }; paintSheet(); }
}

async function play(msg, behind) {
  const gen = mountGen;
  const next = structuredClone(msg.v);
  const ev = msg.events || [];
  const inSync = msg.sid === sid && msg.seq === seen + 1;
  sid = msg.sid;
  seen = msg.seq;
  if (ev.some((e) => e.t === "deal")) {
    next.under = null;
    if (behind) showState(next); else await dealRound(next);
    return;
  }
  if (!inSync || !scene || behind) { next.under = null; showState(next); return; }
  next.under = deriveUnder(scene, ev);
  await playEvents(scene, next, ev, gen);
}

async function run(msg) {
  const gen = mountGen;
  const behind = --waiting > 0; // more messages are queued: skip the show and catch up
  inflight++;
  awaiting = false;
  thinkOn = false;
  clearTimeout(thinkTimer);
  try { await play(msg, behind); }
  catch (e) {
    console.error(e);
    for (const el of root.querySelectorAll(".ghost, .noanim")) el.classList.remove("ghost", "noanim");
    els.fx.replaceChildren();
    const next = structuredClone(msg.v);
    next.under = null;
    showState(next);
  } finally {
    if (gen === mountGen) {
      inflight--;
      paint(scene);
      thinkTimer = setTimeout(() => { thinkOn = true; if (!inflight && !waiting) paint(scene); }, motion.on ? 650 : 200);
    }
  }
}

function receive(msg) {
  waiting++;
  const r = chain.then(() => run(msg));
  chain = r.catch(() => {});
  return r;
}

// Resolves once every queued message has been shown.
function idle() {
  const c = chain;
  return c.then(() => (c === chain ? undefined : idle()));
}

// ---------- input ----------
function onCell(i) {
  const sc = scene;
  if (awaiting) return;
  if (sc.phase === "setup") { if (!dealing) cfg.act({ a: "flip", i }); return; }
  if (inflight) return;
  if (sc.phase !== "play" || sc.players[sc.turn].id !== me) return;
  send({ a: sc.stage === "holding" ? "swap" : "flip", i });
}
function onPile(a) { if (!inflight && !awaiting) send({ a }); }
function onDiscard() { if (!inflight && !awaiting) send({ a: "discard" }); }
function send(a) {
  awaiting = true;
  paint(scene);
  cfg.act(a);
}

let root = null;
// Builds the table for the players in view into rootEl. Returns the handle the app uses.
export function mountTable(rootEl, view, config) {
  root = rootEl;
  cfg = config;
  me = view.you;
  mountGen++;
  applyMotion();
  clearTimeout(thinkTimer);
  scene = null; inflight = 0; waiting = 0; awaiting = false; dealing = false; thinkOn = false;
  sheet = null; announce = null; status = {}; recent = {}; turns = []; lastTurn = null;
  chain = Promise.resolve(); sid = null; seen = 0;
  els = {};
  build(view);
  for (const b of boards.values()) b.shown = null;
  return {
    receive,
    idle,
    unlock() { awaiting = false; if (scene) paint(scene); },
    get els() { return els; },
    get busy() { return inflight > 0 || waiting > 0; },
  };
}
