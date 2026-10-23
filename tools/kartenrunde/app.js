import { newGame, addPlayer, startRound, apply, viewFor, rematch, gridSum, COLS, END_SCORE } from "./game.js";
import { createInvite, acceptReply, joinWith, addressesOf, diagnose } from "./net.js";
import { startScanner } from "./scanner.js";
import qrcode from "./vendor/qrcode.mjs";

const root = document.getElementById("app");
const HOST_ID = "p0";
const TIMEOUT = "Timed out. Are both devices on the same network? If an address shown on either screen ended in .local, allow the camera on both devices and start again.";

// ---------- small helpers ----------
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

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), Math.max(2800, msg.length * 70));
}

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

function qrSvg(text) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = 4;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  const wrap = h("div", { class: "qr" });
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" width="100%" height="100%" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  return wrap;
}

// Camera plus a paste field; calls onCode once with the first code from either.
function codeInput(onCode, label) {
  let handled = false;
  let stop = null;
  const give = (code) => {
    if (handled) return;
    handled = true;
    if (stop) stop();
    onCode(code.trim());
  };
  const video = h("video", { class: "cam" });
  video.muted = true;
  const note = h("p", { class: "soft" }, "Starting camera…");
  const retry = h("button", { hidden: true, onclick: () => start() }, "Try the camera again");
  const paste = h("textarea", { placeholder: "…or paste the code here", "aria-label": "Code" });
  const go = h("button", { onclick: () => paste.value.trim() && give(paste.value) }, label);
  const box = h("div", {}, video, note, retry, h("p", {}, paste), go);
  const start = () => {
    retry.hidden = true;
    video.hidden = false;
    note.className = "soft";
    note.textContent = "Starting camera…";
    startScanner(video, give).then((s) => {
      if (handled) s(); else { stop = s; note.textContent = "Point the camera at the other screen."; }
    }, (e) => {
      video.hidden = true;
      retry.hidden = false;
      note.className = "err";
      note.textContent = cameraProblem(e);
    });
  };
  start();
  box.stop = () => { handled = true; if (stop) stop(); };
  box.reset = () => { handled = false; stop = null; };
  return box;
}

function cameraProblem(e) {
  const why = !navigator.mediaDevices ? "this browser offers no camera access on this page" : `${e.name || "Error"}${e.message ? `: ${e.message}` : ""}`;
  const hint = e.name === "NotAllowedError"
    ? " Allow the camera for this site in the browser or phone settings (iPhone: Settings, then your browser, then Camera), or try another browser such as Safari."
    : "";
  return `Camera unavailable (${why}).${hint} You can paste the code below instead.`;
}

// Shows which addresses the code advertises. A ".local" name usually cannot be resolved on a hotspot.
function addressNote(code) {
  const addrs = addressesOf(code);
  const hidden = addrs.length > 0 && addrs.every((a) => a.endsWith(".local"));
  return h("p", { class: hidden ? "err" : "soft" },
    `This device offers: ${addrs.join(", ")}.`,
    hidden ? " Only a hidden .local name is shared, so the other device may not find this one. Allow the camera for this site and try again." : "");
}

function codeOutput(code) {
  const ta = h("textarea", { readonly: true, "aria-label": "Code as text" }, code);
  const copy = h("button", {
    onclick: async () => {
      try { await navigator.clipboard.writeText(code); toast("Copied"); } catch { ta.select(); toast("Select and copy the text"); }
    },
  }, "Copy as text");
  return h("div", {}, qrSvg(code), addressNote(code), copy, h("details", {}, h("summary", { class: "soft" }, "Show text code"), ta));
}

// ---------- app state ----------
let role = null; // "host" | "guest"
let game = null; // host only: authoritative state
let nextId = 1;
const peers = new Map(); // host only: player id -> data channel
let hostChannel = null; // guest only
let view = null; // what the UI shows
let myName = "";
let screen = null; // "lobby" | "game"
let showScores = false;
let peek = false; // round-end sheet hidden to look at the cards
const ui = {};

// ---------- home ----------
function home() {
  root.className = "";
  role = null; game = null; view = null; screen = null;
  peers.clear();
  const name = h("input", { type: "text", maxlength: "16", placeholder: "Your name", value: store.get("kartenrunde-name") || "", "aria-label": "Your name" });
  const need = () => {
    const n = name.value.trim();
    if (!n) { toast("Enter your name first"); name.focus(); return null; }
    store.set("kartenrunde-name", n);
    return n;
  };
  const saved = loadSaved();
  root.replaceChildren(
    h("h1", {}, "Kartenrunde"),
    h("p", { class: "soft" }, "2–8 players, one device each, all on the same hotspot. Connections are set up by scanning QR codes, no internet needed."),
    h("div", { class: "panel" },
      h("p", {}, name),
      h("div", { class: "row" },
        h("button", { class: "primary grow", onclick: () => { const n = need(); if (n) startHost(n); } }, "Host a game"),
        h("button", { class: "grow", onclick: () => { const n = need(); if (n) startJoin(n); } }, "Join a game")),
      saved && h("p", {}, h("button", { onclick: () => resumeHost(saved) }, `Resume hosted game (round ${saved.game.round || 0})`))),
    h("p", { class: "soft" }, "The host's device keeps the game. If it drops out, the host can resume and everyone scans again."));
}

// ---------- host ----------
function loadSaved() {
  try {
    const s = JSON.parse(store.get("kartenrunde-host"));
    return s && s.game && s.game.players.length ? s : null;
  } catch { return null; }
}

function startHost(name) {
  role = "host"; myName = name;
  game = newGame();
  addPlayer(game, HOST_ID, name);
  nextId = 1;
  persist();
  showLobby();
}

function resumeHost(saved) {
  role = "host";
  game = saved.game;
  nextId = saved.nextId;
  game.players.forEach((p) => { p.connected = p.id === HOST_ID; });
  myName = game.players.find((p) => p.id === HOST_ID).name;
  if (game.phase === "lobby") showLobby(); else broadcast();
}

function persist() {
  if (role === "host") store.set("kartenrunde-host", JSON.stringify({ game, nextId }));
}

function send(ch, msg) {
  if (ch && ch.readyState === "open") ch.send(JSON.stringify(msg));
}

function broadcast() {
  persist();
  for (const [pid, ch] of peers) send(ch, { t: "view", v: viewFor(game, pid) });
  view = viewFor(game, HOST_ID);
  render();
}

function hostAct(pid, a) {
  try {
    if (a.a === "rematch") {
      if (pid !== HOST_ID || game.phase !== "gameEnd") throw new Error("Only the host can start a new game");
      rematch(game);
    } else {
      if (a.a === "next" && pid !== HOST_ID) throw new Error("Only the host can start the next round");
      apply(game, pid, a);
    }
  } catch (e) {
    if (pid === HOST_ID) toast(e.message); else send(peers.get(pid), { t: "err", msg: e.message });
    return;
  }
  broadcast();
}

function showLobby() {
  screen = "lobby";
  root.className = "";
  ui.plist = h("div");
  ui.invite = h("div");
  ui.start = h("button", { class: "primary", onclick: () => { try { startRound(game); broadcast(); } catch (e) { toast(e.message); } } }, "Start game");
  ui.addBtn = h("button", { onclick: () => openInvite(ui.invite, null) }, "Add a player");
  root.replaceChildren(
    h("h1", {}, "Kartenrunde"),
    h("div", { class: "panel" }, h("h2", {}, "Players"), ui.plist, h("div", { class: "row" }, ui.addBtn, ui.start)),
    ui.invite,
    h("p", {}, h("button", { onclick: () => { if (confirm("Leave the lobby?")) { closeAll(); home(); } } }, "Leave")));
  broadcast();
}

function closeAll() {
  for (const ch of peers.values()) { ch.onclose = null; ch.close(); }
  peers.clear();
  if (hostChannel) { hostChannel.onclose = null; hostChannel.close(); hostChannel = null; }
}

function lobbyList(v) {
  const rows = v.players.map((p) => h("li", {}, h("span", {}, h("span", { class: p.connected ? "dot" : "dot off" }), p.name, p.id === v.you ? " (you)" : "")));
  return h("ul", { class: "players" }, rows);
}

// Shows the invite code, then the scanner for the guest's reply. pid = null for a new seat,
// or the id of a player to bring back.
async function openInvite(box, pid) {
  if (box.cancel) box.cancel();
  const seat = pid ?? `p${nextId++}`;
  let scanner = null;
  const close = () => { if (scanner) scanner.stop(); box.replaceChildren(); box.cancel = null; };
  box.replaceChildren(h("div", { class: "panel" }, h("p", { class: "soft" }, "Preparing…")));
  let inv;
  try {
    inv = await createInvite();
  } catch (e) {
    box.replaceChildren(h("div", { class: "panel" }, h("p", { class: "err" }, e.message), h("button", { onclick: close }, "Close")));
    return;
  }
  const cancel = () => { inv.pc.close(); close(); };
  box.cancel = cancel;
  const failed = async (msg) => {
    if (scanner) scanner.stop();
    const report = await diagnose(inv.pc);
    inv.pc.close();
    box.cancel = null;
    box.replaceChildren(failurePanel(msg, report, close));
  };
  const stepScan = () => {
    scanner = codeInput(async (code) => {
      box.querySelector("[data-step]").replaceChildren(h("p", {}, "Connecting…"));
      try {
        await acceptReply(inv, code);
        const ch = await Promise.race([inv.ready, new Promise((_, rej) => setTimeout(() => rej(new Error(TIMEOUT)), 20000))]);
        adopt(ch, seat);
        close();
      } catch (e) { failed(e.message); }
    }, "Connect");
    box.querySelector("[data-step]").replaceChildren(h("h2", {}, "2. Scan their reply"), scanner);
  };
  box.replaceChildren(h("div", { class: "panel" },
    h("div", { "data-step": true },
      h("h2", {}, "1. Let them scan this"),
      h("p", { class: "soft" }, "On the other device choose “Join a game” and scan this code."),
      codeOutput(inv.code),
      h("div", { class: "row" }, h("button", { class: "primary grow", onclick: stepScan }, "Next: scan their reply"), h("button", { onclick: cancel }, "Cancel")))));
}

// Wires up a freshly opened channel; the guest identifies itself with a hello message.
function adopt(ch, seat) {
  ch.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.t === "hello") onHello(ch, seat, String(msg.name || "").trim().slice(0, 16) || "Player");
    else if (msg.t === "act" && peers.get(seat) === ch && msg.act && typeof msg.act === "object") {
      hostAct(seat, { a: String(msg.act.a), i: msg.act.i });
    }
  };
  ch.onclose = () => {
    if (peers.get(seat) !== ch) return;
    peers.delete(seat);
    const i = game.players.findIndex((p) => p.id === seat);
    if (i >= 0) {
      if (game.phase === "lobby") game.players.splice(i, 1); else game.players[i].connected = false;
    }
    broadcast();
  };
}

function onHello(ch, seat, name) {
  const existing = game.players.find((p) => p.id === seat);
  if (existing) {
    existing.connected = true;
  } else {
    try { addPlayer(game, seat, name); } catch (e) { send(ch, { t: "err", msg: e.message }); ch.close(); return; }
  }
  peers.set(seat, ch);
  send(ch, { t: "welcome", you: seat });
  broadcast();
}

// ---------- guest ----------
function startJoin(name) {
  role = "guest"; myName = name;
  root.className = "";
  const box = h("div");
  root.replaceChildren(h("h1", {}, "Kartenrunde"), box, h("p", {}, h("button", { onclick: () => { closeAll(); home(); } }, "Back")));
  runJoin(box);
}

function failurePanel(msg, report, onClose, label = "Close") {
  return h("div", { class: "panel" },
    h("p", { class: "err" }, msg),
    h("p", { class: "soft" }, "How far the connection got (please send this if it keeps failing):"),
    h("pre", {}, report),
    h("button", { class: "primary", onclick: onClose }, label));
}

function runJoin(box, done) {
  let scanner = null;
  const stop = () => { if (scanner) scanner.stop(); };
  scanner = codeInput(async (code) => {
    box.replaceChildren(h("div", { class: "panel" }, h("p", {}, "Connecting…")));
    let join = null;
    try {
      join = await joinWith(code);
      box.replaceChildren(h("div", { class: "panel" },
        h("h2", {}, "Show this to the host"),
        h("p", { class: "soft" }, "The host scans this code with “Next: scan their reply”."),
        codeOutput(join.code)));
      const ch = await Promise.race([join.ready, new Promise((_, rej) => setTimeout(() => rej(new Error(TIMEOUT)), 60000))]);
      hostChannel = ch;
      ch.onmessage = onHostMessage;
      ch.onclose = () => { if (hostChannel === ch) { hostChannel = null; lost(); } };
      send(ch, { t: "hello", name: myName });
      box.replaceChildren();
      if (done) done();
    } catch (e) {
      if (!join) { toast(e.message); runJoin(box, done); return; }
      const report = await diagnose(join.pc);
      join.pc.close();
      box.replaceChildren(failurePanel(e.message, report, () => runJoin(box, done), "Try again"));
    }
  }, "Connect");
  box.replaceChildren(h("div", { class: "panel" },
    h("h2", {}, "Scan the host's code"),
    h("p", { class: "soft" }, "The host taps “Add a player” (or “Reconnect”) and shows a QR code."),
    scanner));
  box.stopScan = stop;
}

function onHostMessage(e) {
  let msg;
  try { msg = JSON.parse(e.data); } catch { return; }
  if (msg.t === "view") { view = msg.v; render(); }
  else if (msg.t === "err") toast(msg.msg);
}

function lost() {
  toast("Connection to the host lost");
  if (!ui.invite) { home(); return; }
  ui.invite.replaceChildren();
  const box = h("div");
  ui.invite.append(h("div", { class: "panel" }, h("p", { class: "err" }, "Connection lost."), h("button", { class: "primary", onclick: () => runJoin(box, () => ui.invite.replaceChildren()) }, "Rejoin the game")), box);
}

// ---------- rendering ----------
function act(a) {
  if (role === "host") hostAct(HOST_ID, a);
  else send(hostChannel, { t: "act", act: a });
}

function render() {
  if (!view) return;
  const wantLobby = view.phase === "lobby";
  if (role === "guest" && screen === null) {
    // First view after joining: the join screen is replaced by the lobby or game shell.
    (wantLobby ? guestLobbyShell : gameShell)();
  } else if (wantLobby && screen !== "lobby") {
    guestLobbyShell();
  } else if (!wantLobby && screen !== "game") {
    gameShell();
  }
  if (view.phase === "lobby") {
    ui.plist.replaceChildren(lobbyList(view));
    if (ui.start) ui.start.disabled = view.players.length < 2;
    if (ui.addBtn) ui.addBtn.disabled = view.players.length >= 8;
  } else updateGame();
}

function guestLobbyShell() {
  screen = "lobby";
  root.className = "";
  ui.plist = h("div");
  ui.invite = h("div");
  root.replaceChildren(h("h1", {}, "Kartenrunde"), h("div", { class: "panel" }, h("h2", {}, "Players"), ui.plist, h("p", { class: "soft" }, "Waiting for the host to start the game…")), ui.invite);
}

function gameShell() {
  screen = "game";
  showScores = false;
  peek = false;
  root.className = "game";
  ui.bar = h("div", { class: "bar" });
  ui.overlay = h("div");
  ui.others = h("div", { class: "others" });
  ui.table = h("div", { class: "table" });
  ui.dock = h("div", { class: "dock" });
  ui.mine = h("div", { class: "mine-wrap" });
  ui.invite = h("div");
  ui.sheet = h("div");
  root.replaceChildren(ui.bar, ui.overlay, ui.others, ui.table, ui.dock, ui.mine, ui.invite, ui.sheet);
}

const cls = (v) => (v <= -1 ? "v-neg" : v === 0 ? "v-zero" : v <= 4 ? "v-low" : v <= 8 ? "v-mid" : "v-high");
function cardEl(c, opts = {}) {
  const { pick, onclick, label } = opts;
  if (c === null) return h("div", { class: "card gone" });
  const el = h(onclick ? "button" : "div", {
    class: `card ${c.up ? cls(c.v) : "down"}${pick ? " pick" : ""}`, onclick: pick ? onclick : null,
    "aria-label": label || (c.up ? `Card ${c.v}` : "Face-down card"),
  }, c.up ? String(c.v) : "");
  if (onclick && !pick) el.disabled = true;
  return el;
}

function updateGame() {
  const v = view;
  const meIdx = v.players.findIndex((p) => p.id === v.you);
  const me = v.players[meIdx];
  const cur = v.players[v.turn];
  const myTurn = v.phase === "play" && v.turn === meIdx;
  const ended = v.phase === "roundEnd" || v.phase === "gameEnd";
  const flipped = me.grid.filter((c) => c && c.up).length;
  if (!ended) peek = false;
  const sheetOpen = ended ? !peek : showScores;

  // top bar
  const closer = v.closer !== null && v.phase === "play" ? v.players[v.closer] : null;
  ui.bar.replaceChildren(
    h("strong", {}, `Round ${v.round}`),
    h("span", { class: "chip", hidden: !closer }, closer ? `${closer.id === v.you ? "You are" : `${closer.name} is`} out · last turns` : ""),
    h("button", { onclick: () => { if (ended) peek = !peek; else showScores = !showScores; updateGame(); } }, ended ? "Results" : "Scores"));

  // opponents
  ui.others.replaceChildren(...v.players.filter((_, i) => i !== meIdx).map((p) => {
    const i = v.players.indexOf(p);
    return h("div", { class: `other${v.phase === "play" && v.turn === i ? " turn" : ""}` },
      h("div", { class: "name" }, h("span", {}, h("span", { class: p.connected ? "dot" : "dot off" }), p.name), h("span", {}, String(gridSum(p)))),
      h("div", { class: "grid" }, p.grid.map((c) => cardEl(c))));
  }));

  // draw and discard piles; they shrink once a card is in hand
  const canDraw = myTurn && v.stage === "choose";
  const canTake = canDraw && v.discardTop !== null;
  const canDiscard = myTurn && v.stage === "holding" && v.heldFrom === "draw";
  const small = myTurn && v.stage === "holding";
  const dim = ended || v.phase === "setup" || (myTurn && v.stage !== "choose");
  const back = h("button", { class: `card down${canDraw ? " pick" : ""}`, disabled: !canDraw, onclick: () => act({ a: "draw" }), "aria-label": "Draw pile" });
  const top = v.discardTop === null ? h("div", { class: "card empty" }, "empty")
    : h("button", {
      class: `card ${cls(v.discardTop)}${canTake ? " pick" : ""}`, disabled: !canTake,
      onclick: () => act({ a: "take" }), "aria-label": `Discard pile, top card ${v.discardTop}`,
    }, String(v.discardTop));
  const drawLabel = h("div", { class: "label" }, h("b", {}, "Draw"), small ? h("br") : " · ", String(v.drawCount));
  const discardLabel = canTake ? h("div", { class: "label" }, h("b", {}, "Take"), ` the ${v.discardTop}`)
    : h("div", { class: "label" }, h("b", {}, "Discard"), v.discardTop !== null && small ? [h("br"), `top: ${v.discardTop}`] : "");
  ui.table.className = `table ${small ? "small" : "big"}${dim ? " dim" : ""}`;
  ui.table.replaceChildren(
    h("div", { class: "slot" }, back, drawLabel),
    h("div", { class: "slot" }, small ? [discardLabel, top] : [top, discardLabel]));

  // dock: where you are in the turn, and the card in hand
  let title = "", sub = "";
  if (v.phase === "setup") {
    title = flipped < 2 ? "Flip two of your cards" : "Waiting for the others";
    sub = flipped < 2 ? `${flipped} of 2 flipped. Tap a face-down card.` : "They are still flipping their cards.";
  } else if (v.phase === "play") {
    if (!myTurn) {
      title = `${cur.name} is playing${cur.connected ? "" : " (disconnected)"}`;
      sub = v.held !== null ? `${cur.name} holds a ${v.held}.` : "";
    } else if (v.stage === "choose") {
      title = "Your turn";
      sub = v.discardTop === null ? "Draw a new card." : `Draw a new card, or take the ${v.discardTop} from the discard pile.`;
    } else if (v.stage === "holding") {
      title = `You ${v.heldFrom === "draw" ? "drew" : "took"} a ${v.held}`;
      sub = "Tap a card below to swap it.";
    } else {
      title = "Flip a card";
      sub = "Tap one of your face-down cards.";
    }
  } else title = "Round over";
  const track = myTurn ? h("div", { class: "steps" }, ["1 Draw or take", "2 Place", "3 Flip"].map((s, i) => {
    const at = v.stage === "choose" ? 1 : v.stage === "holding" ? 2 : 3;
    return h("span", { class: i + 1 === at ? "on" : i + 1 < at ? "done" : "" }, s);
  })) : null;
  const text = h("div", { class: "say" }, title, sub && h("small", {}, sub));
  let body = text;
  if (v.phase === "play" && v.held !== null && v.stage !== "choose") {
    body = h("div", { class: "hand" },
      h("div", { class: `card ${cls(v.held)}`, "aria-label": `Card in hand: ${v.held}` }, String(v.held)),
      h("div", { class: "side" }, text,
        canDiscard ? [h("span", { class: "or" }, "or"), h("button", { onclick: () => act({ a: "discard" }) }, "Discard it, then flip a card")] : null));
  }
  ui.dock.className = `dock${myTurn || (v.phase === "setup" && flipped < 2) ? " mine" : ""}`;
  ui.dock.replaceChildren(...[track, body, myTurn && v.stage === "holding" ? h("div", { class: "arrow", "aria-hidden": "true" }, "▾ ▾ ▾") : null].filter(Boolean));

  // my grid
  const clickable = (c) => {
    if (!c) return false;
    if (v.phase === "setup") return !c.up && flipped < 2;
    if (!myTurn) return false;
    if (v.stage === "holding") return true;
    if (v.stage === "flip") return !c.up;
    return false;
  };
  const kind = v.phase === "play" && v.stage === "holding" ? "swap" : "flip";
  ui.mine.replaceChildren(h("div", { class: `mine-box${myTurn ? " turn" : ""}` },
    h("div", { class: "name" }, h("span", {}, "You"), h("span", {}, `${gridSum(me)} shown · total ${me.total}`)),
    h("div", { class: "grid" }, me.grid.map((c, i) => cardEl(c, { pick: clickable(c), onclick: () => act({ a: kind, i }) })))));

  // reconnect buttons (host) and the scores / round result sheet
  const away = role === "host" ? v.players.filter((p) => !p.connected) : [];
  ui.overlay.replaceChildren(
    ...away.map((p) => h("p", {}, h("button", { onclick: () => { openInvite(ui.invite, p.id); ui.invite.scrollIntoView(); } }, `${p.name} is disconnected. Reconnect`))));
  ui.sheet.replaceChildren(...(sheetOpen ? scoreSheet(v) : []));
}

// Scores, and at the end of a round or game the result. Slides up over the grids.
function scoreSheet(v) {
  const over = v.phase === "gameEnd";
  const ended = over || v.phase === "roundEnd";
  const rounds = Math.max(...v.players.map((p) => p.rounds.length));
  const last = rounds - 1;
  const lowest = ended ? Math.min(...v.players.map((p) => p.rounds[last])) : null;
  const head = h("tr", {}, h("th", {}, ""), Array.from({ length: rounds }, (_, i) => h("th", {}, `R${i + 1}`)), h("th", {}, "Total"));
  const rows = v.players.map((p) => h("tr", { class: `${p.id === v.you ? "me" : ""}${ended && p.rounds[last] === lowest ? " best" : ""}${over && v.winner && v.winner.includes(p.id) ? " win" : ""}` },
    h("td", {}, p.name), Array.from({ length: rounds }, (_, i) => h("td", {}, p.rounds[i] === undefined ? "" : String(p.rounds[i]))), h("td", {}, String(p.total))));
  const parts = [h("div", { class: "grab" }), h("h2", {}, over ? "Game over" : v.phase === "roundEnd" ? `Round ${v.round} finished` : "Scores")];
  if (over) parts.push(h("p", { class: "note" }, `Winner: ${v.winner.map((id) => v.players.find((p) => p.id === id).name).join(", ")} with ${Math.min(...v.players.map((p) => p.total))} points.`));
  if (ended) {
    const names = v.players.filter((p) => p.rounds[last] === lowest).map((p) => p.name).join(", ");
    const c = v.closer !== null ? v.players[v.closer] : null;
    parts.push(h("p", { class: "note" },
      c ? `${c.name} ended the round${v.doubled ? " without the lowest score, so their points are doubled." : "."} ` : "",
      `Lowest this round: ${names} (${lowest}).`));
  }
  parts.push(h("div", { class: "tablewrap" }, h("table", {}, head, rows)));
  parts.push(h("p", { class: "note" }, `The game ends when someone reaches ${END_SCORE} points.`));
  if (ended) {
    parts.push(role === "host"
      ? h("div", { class: "row" },
        h("button", { class: "primary grow", onclick: () => act({ a: over ? "rematch" : "next" }) }, over ? "Play again" : "Next round"),
        h("button", { onclick: () => { peek = true; updateGame(); } }, "Show cards"))
      : h("div", { class: "row" },
        h("p", { class: "soft grow" }, "Waiting for the host…"),
        h("button", { onclick: () => { peek = true; updateGame(); } }, "Show cards")));
  } else parts.push(h("button", { class: "primary", onclick: () => { showScores = false; updateGame(); } }, "Close"));
  return [h("div", { class: "scrim", onclick: () => { if (ended) peek = true; else showScores = false; updateGame(); } }), h("div", { class: "sheet", role: "dialog", "aria-label": "Scores" }, parts)];
}

home();
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
