import { makeCase, newCaseCode, parseCaseCode, lookup, checkAccusation, leaves, WEAPONS, MOTIVES } from "./case.js";
import { roomArt, ROOM_DEFS, portrait, icon, logo, REGIONS } from "./art.js";

const app = document.getElementById("app");
const sheetEl = document.getElementById("sheet");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- storage ----------
const PREFIX = "detektei:";
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(PREFIX + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(PREFIX + k); } catch { /* storage unavailable */ } },
  keys() { try { return Object.keys(localStorage).filter((k) => k.startsWith(PREFIX + "case:")).map((k) => k.slice(PREFIX.length)); } catch { return []; } },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const ROLE = { I: "Interrogator", F: "Field agent" };

// ---------- state ----------
let screen = "home"; // home | new | role | briefing | game | accuse | result
let pending = null; // case code chosen but no role yet
let K = null; // the case
let role = null; // "I" | "F"
let st = null; // saved progress of this device
let ui = {};
let insp = null; // the "Look closely" inspection in progress

function blank(r) {
  return r === "F"
    ? { examined: {}, revealed: {}, unlocked: {}, hints: [], found: [], result: null }
    : { clues: [], hints: [], asked: {}, done: {}, events: {}, seen: {}, last: {}, transcript: [], result: null };
}
const saveKey = () => `case:${K.code}:${role}`;
const save = () => store.set(saveKey(), st);

function open(code, r) {
  K = makeCase(code);
  role = r;
  st = { ...blank(r), ...(store.get(`case:${code}:${r}`) || {}) };
  ui = { room: K.rooms[0].id, focus: null, suspect: K.suspects[0].id, view: null };
  screen = st.result ? "result" : st.started ? "game" : "briefing";
  render();
}


// ---------- toast and sheets ----------
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), Math.max(2600, msg.length * 60));
}
// A sheet slides up from the bottom; with { full: true } it fills most of the screen.
function sheet(html, o = {}) {
  insp = null;
  sheetEl.className = o.full ? "full" : "";
  sheetEl.innerHTML = `<div class="sheet-card${o.full ? " full" : ""}" role="dialog" aria-modal="true">${html}<button class="close" data-act="close" aria-label="Close">×</button></div>`;
  sheetEl.hidden = false;
  const first = sheetEl.querySelector("input, .primary, button");
  if (first) first.focus({ preventScroll: true });
}
function closeSheet() { insp = null; sheetEl.hidden = true; sheetEl.className = ""; sheetEl.innerHTML = ""; }

// A clue shown large: the picture on a paper card beside (or above) the title and text.
function exhibit(c, { label = "", isNew = false, extra = "", foot }) {
  return `<div class="fbody exhibit">
      ${label ? `<p class="eyebrow">${esc(label)}</p>` : ""}
      <div class="ex-main">
        <div class="ex-art">${icon(c.icon, c.title)}${isNew ? `<span class="stamp">New clue</span>` : ""}</div>
        <div class="ex-text"><h2>${esc(c.title)}</h2>${c.tag ? `<p><span class="tag">${esc(c.tag)}</span></p>` : ""}<p class="ex-body">${esc(c.text)}</p></div>
      </div>
      ${extra}
    </div>
    <div class="ffoot">${foot}</div>`;
}
const codePass = (c) => `<div class="pass big"><span>Clue code for the interrogator</span><strong class="code">${c.code}</strong></div>`;

// ---------- rendering ----------
function render() {
  const fn = { home, new: newCase, role: roleScreen, briefing, game, accuse, result }[screen];
  app.innerHTML = fn();
  ui.fresh = false;
  if (screen === "game" && role === "F") animateZoom();
  window.scrollTo?.(0, screen === "game" ? window.scrollY : 0);
}

function home() {
  const saved = store.keys().map((k) => { const [, code, r] = k.split(":"); return { code, r, s: store.get(k) }; }).filter((x) => x.s);
  return `<section class="home">
    <div class="logo">${logo()}</div>
    <h1>Detektei</h1>
    <p class="lead">A murder in a mansion, two detectives, one night. One of you questions the suspects, the other searches the rooms. Trade hints and clues out loud until you can name the killer, the weapon and the motive.</p>
    <div class="panel">
      <h2>Start</h2>
      <button class="primary wide" data-act="new">Open a new case</button>
      <form class="join" data-form="join">
        <label for="joincode">Your partner already has a case number?</label>
        <div class="row"><input id="joincode" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="1-K7QMZX" maxlength="10"><button type="submit">Join</button></div>
      </form>
    </div>
    ${saved.length ? `<div class="panel"><h2>Your cases</h2><ul class="saved">${saved.map((x) => `
      <li><button data-act="resume" data-code="${x.code}" data-role="${x.r}">
        <span class="mini">${icon(x.r === "I" ? "interrogator" : "fieldagent")}</span>
        <span><strong>${x.code}</strong><br><span class="soft">${ROLE[x.r]} · ${x.s.result ? "closed" : "in progress"}</span></span>
      </button><button class="ghost" data-act="forget" data-code="${x.code}" data-role="${x.r}" aria-label="Delete case ${x.code}">×</button></li>`).join("")}</ul></div>` : ""}
    <details class="panel rules"><summary>How to play</summary>${rulesHtml()}</details>
  </section>`;
}

function rulesHtml() {
  return `<p>Two players, two devices, no connection needed. Both enter the same case number and pick different roles.</p>
  <p><strong>The interrogator</strong> questions the three suspects, looks at them closely, and confronts them with clues. Some answers contain a <em>hint</em> with a three-character code.</p>
  <p><strong>The field agent</strong> searches three rooms, opening furniture and looking into drawers, pockets and the like. Interesting finds are <em>clues</em> with a code.</p>
  <p>Read codes to each other. The interrogator types a clue code into <em>Confront with a clue</em> and shows the clue to a suspect. The field agent types a hint code into <em>Use a hint</em> and tries it in the room where it fits, to uncover hidden places. Witnesses rarely name a room; they describe what they saw or smelled through the door.</p>
  <p>Some drawers, boxes and cases are locked with numbered dials. Someone in the house knows which number the victim used, a date or part of a telephone number, and the number itself is written on something in the rooms.</p>
  <p>Everyone in the house had two grudges against the victim. One of them was settled before tonight; a paper, or somebody who knows, will tell you which.</p>
  <p>Most of what turns up leads nowhere: notes, tickets, stains and secrets that have nothing to do with the murder. Nothing is labelled. No single clue names the killer: a trace at the scene may fit two of the suspects, and only an alibi that holds, or a witness, clears the other. Suspects lie about where they were, but only the killer lies about anyone else. Read the times, the traces and the wounds against what the suspects say, and look closely at the suspects. Not every case is what it first looks like.</p>
  <p>Take as long as you like. When you're sure, accuse: name the murderer, the weapon and the motive. You get one try.</p>`;
}

function newCase() {
  return `<section>
    <button class="back" data-act="home">← Back</button>
    <h1>A new case</h1>
    <p>Tell your partner this case number. They choose <em>Join</em> and enter it on their device.</p>
    <div class="bigcode" aria-label="Case number">${pending}</div>
    <button class="primary wide" data-act="toRole">Continue</button>
  </section>`;
}

function roleScreen() {
  return `<section>
    <button class="back" data-act="home">← Back</button>
    <h1>Case ${pending}</h1>
    <p>Which detective are you? Your partner takes the other role.</p>
    <div class="roles">
      <button class="rolecard" data-act="pickRole" data-role="I">${icon("interrogator")}<strong>Interrogator</strong><span>Question the suspects, watch them closely and catch their lies.</span></button>
      <button class="rolecard" data-act="pickRole" data-role="F">${icon("fieldagent")}<strong>Field agent</strong><span>Search the rooms, open every drawer, and find what was hidden.</span></button>
    </div>
  </section>`;
}

function briefing() {
  const sus = K.suspects.map((s) => `<li>${role === "I" ? `<span class="face">${portrait(s.lib.look, { label: s.name })}</span>` : `<span class="face">${icon("person")}</span>`}<span><strong>${esc(s.name)}</strong><br><span class="soft">${esc(s.title)}</span></span></li>`).join("");
  const rooms = K.rooms.map((r) => `<li>${icon("door")}<span>${esc(r.name)}${r.id === K.scene ? ` <span class="tag">scene of the crime</span>` : ""}</span></li>`).join("");
  const job = role === "I"
    ? `<p>You question the suspects. Ask about the evening, about each other, and, once you know when the murder happened, where they were. Pass every <span class="kw">hint</span> code you get to the field agent. Enter the <span class="kw">clue</span> codes the field agent gives you when you confront a suspect. Look closely at the suspects from time to time: details show up as the case develops.</p>`
    : `<p>You search the three rooms. Tap furniture to look closer, then examine its parts. Pass every <span class="kw">clue</span> code you find to the interrogator. Enter the <span class="kw">hint</span> codes the interrogator gives you when you use a hint, in the room where it fits, to uncover a hidden place.</p>`;
  return `<section>
    <p class="eyebrow">Case ${K.code} · ${ROLE[role]}</p>
    <h1>${esc(K.manor)}</h1>
    <p class="lead">${esc(K.briefing)}</p>
    <div class="panel"><h2>Suspects</h2><ul class="cast">${sus}</ul></div>
    <div class="panel"><h2>Rooms</h2><ul class="cast rooms">${rooms}</ul></div>
    <div class="panel"><h2>Your job</h2>${job}<p>Expect dead ends: many clues lead nowhere, any of the suspects may be lying to you, and the obvious story may be the one somebody wants you to believe. There's no time limit, but you only get one accusation.</p></div>
    <button class="primary wide" data-act="start">Start investigating</button>
  </section>`;
}

function topbar() {
  const count = role === "F" ? `${st.found.length} clue${st.found.length === 1 ? "" : "s"} found` : `${st.clues.length} clue${st.clues.length === 1 ? "" : "s"} received`;
  return `<header class="top">
    <button class="ghost" data-act="menu" aria-label="Menu">☰</button>
    <div class="clock"><strong>${esc(K.manor)}</strong><span>${ROLE[role]} · ${count}</span></div>
    <button data-act="notebook" class="tool" aria-label="Notebook">${icon("notebook")}<span>Notes</span></button>
    <button data-act="toAccuse" class="tool" aria-label="Accuse">${icon("gavel")}<span>Accuse</span></button>
  </header>`;
}

function game() { return topbar() + (role === "F" ? fieldView() : interrogatorView()); }

// ---------- field agent ----------
const roomById = (id) => K.rooms.find((r) => r.id === id);
function findNode(room, id) {
  let hit = null;
  const go = (n) => { if (n.id === id) hit = n; (n.children || []).forEach(go); };
  room.furniture.forEach(go);
  return hit;
}
function hiddenFor(f) { return Object.values(K.hiddenSpots).find((h) => h.furniture === f.id && st.revealed[h.id]); }
function childrenOf(room, focus) {
  if (!focus) return room.furniture.filter((f) => f.kind !== "rug" || true);
  const kids = (focus.children || []).slice();
  const h = focus.furniture === undefined && hiddenFor(focus);
  if (h) kids.push({ ...h, label: h.label, hidden: true });
  return kids;
}
const isLeaf = (n) => n.hidden || !n.children || !n.children.length;
function leafDone(n) { return !!st.examined[n.id]; }
function nodeDone(n) { return isLeaf(n) ? leafDone(n) : leaves(n).every(leafDone) && (!hiddenFor(n) || leafDone(hiddenFor(n))); }

function viewBoxFor(n) {
  if (!n) return [0, 0, 400, 260];
  const ar = 400 / 260;
  let w = Math.max(n.w * 1.5, n.h * 1.5 * ar, 110);
  w = Math.min(w, 400);
  const h = w / ar;
  let x = n.x + n.w / 2 - w / 2, y = n.y + n.h / 2 - h / 2;
  x = Math.max(0, Math.min(400 - w, x));
  y = Math.max(0, Math.min(260 - h, y));
  return [x, y, w, h];
}

function fieldView() {
  const room = roomById(ui.room);
  const focus = ui.focus ? findNode(room, ui.focus) : null;
  const path = [];
  if (focus) {
    const f = room.furniture.find((x) => focus.id === x.id || focus.id.startsWith(x.id + "."));
    path.push(f);
    if (f !== focus) path.push(focus);
  }
  const kids = childrenOf(room, focus);
  const revealed = Object.values(K.hiddenSpots).filter((h) => st.revealed[h.id]);
  const hot = kids.map((k) => `<rect class="hot ${nodeDone(k) ? "done" : ""}" data-act="node" data-id="${k.id}" x="${k.x}" y="${k.y}" width="${k.w}" height="${k.h}" rx="3"><title>${esc(k.label)}</title></rect>`).join("");
  const badges = kids.filter(nodeDone).map((k) => `<g class="badge" pointer-events="none"><circle cx="${k.x + k.w - 4}" cy="${k.y + 4}" r="${focus ? 2.6 : 5}"/><path d="M${k.x + k.w - 6.5} ${k.y + 4}l${focus ? 1.6 : 2} ${focus ? 1.6 : 2} ${focus ? 3 : 4}-${focus ? 3.2 : 4}" /></g>`).join("");
  const tabs = K.rooms.map((r) => `<button class="tab ${r.id === ui.room ? "on" : ""}" data-act="room" data-id="${r.id}">${esc(r.name)}${r.id === K.scene ? " ✝" : ""}</button>`).join("");
  const crumbs = [`<button class="crumb" data-act="up" data-to="">${esc(room.name)}</button>`, ...path.map((n, i) => i === path.length - 1 ? `<span class="crumb now">${esc(n.label)}</span>` : `<button class="crumb" data-act="up" data-to="${n.id}">${esc(n.label)}</button>`)].join(" › ");
  const list = kids.map((k) => `<li><button data-act="node" data-id="${k.id}" class="spot ${nodeDone(k) ? "done" : ""} ${k.hidden ? "secret" : ""}">
      <span>${esc(k.label)}</span><span class="meta">${isLeaf(k) ? (leafDone(k) ? "examined ✓" : isLocked(k) ? "locked" : "examine") : nodeDone(k) ? "searched ✓" : "look closer ›"}</span></button></li>`).join("");
  const vb = viewBoxFor(focus);
  return `<nav class="tabs" aria-label="Rooms">${tabs}</nav>
    <div class="scene">
      <svg id="scene" viewBox="${(ui.view || vb).join(" ")}" data-target="${vb.join(" ")}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(room.name)}">
        ${ROOM_DEFS}${roomArt(room, { revealed: revealed.filter((h) => h.room === room.id), locks: Object.values(K.locks).filter((lk) => lk.room === room.id && !st.unlocked[lk.leaf]) })}
        ${focus ? `<rect x="-10" y="-10" width="420" height="280" fill="#000" opacity=".35" data-act="up" data-to="${path.length > 1 ? path[0].id : ""}" mask="url(#cut)"/><mask id="cut"><rect x="-10" y="-10" width="420" height="280" fill="#fff"/><rect x="${focus.x - 2}" y="${focus.y - 2}" width="${focus.w + 4}" height="${focus.h + 4}" fill="#000" rx="3"/></mask>` : ""}
        ${hot}${badges}
      </svg>
    </div>
    <div class="crumbs">${crumbs}</div>
    <ul class="spots">${list}</ul>
    <div class="row actions">
      ${focus ? `<button data-act="up" data-to="${path.length > 1 ? path[0].id : ""}">← Step back</button>` : ""}
      <button class="grow hintbtn" data-act="applyHint">${icon("hint")} Use a hint in the ${esc(room.name.toLowerCase())}</button>
    </div>
    ${st.hints.length ? "" : `<p class="soft small">Hints come from the interrogator. Enter their code when you use a hint.</p>`}`;
}

// Animate the scene's viewBox from where it was to the target.
function animateZoom() {
  const svg = document.getElementById("scene");
  if (!svg) return;
  const to = svg.dataset.target.split(" ").map(Number);
  const from = (ui.view || to).slice();
  ui.view = to;
  if (reduced || from.every((v, i) => Math.abs(v - to[i]) < 0.5)) { svg.setAttribute("viewBox", to.join(" ")); return; }
  const t0 = performance.now(), dur = 380;
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
    svg.setAttribute("viewBox", from.map((v, i) => v + (to[i] - v) * ease).join(" "));
    if (k < 1 && svg.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const isLocked = (n) => !n.hidden && K.content[n.id] && K.content[n.id].lock && !st.unlocked[n.id];

function examine(room, n) {
  if (isLocked(n)) return lockSheet(n);
  const raw = n.hidden ? { clue: n.clue } : K.content[n.id];
  const content = raw.lock ? { clue: K.locks[raw.lock].clue } : raw;
  const isNew = !st.examined[n.id];
  if (isNew) {
    st.examined[n.id] = true;
    if (content.clue && !st.found.includes(content.clue)) st.found.push(content.clue);
    save();
    render();
  }
  showFind(n.label, content, isNew);
}

function showFind(label, content, isNew = false) {
  if (content.clue) {
    const c = K.clues[content.clue];
    sheet(exhibit(c, { label, isNew, extra: codePass(c), foot: `<button class="primary wide" data-act="close">Noted</button>` }), { full: true });
  } else {
    sheet(`<div class="find plain">${icon("magnifier")}<div><p class="eyebrow">${esc(label)}</p><p class="ex-body">${esc(content.text)}</p></div></div>
      <button class="primary wide" data-act="close">OK</button>`);
  }
}

// A locked leaf: its clue code goes to the interrogator; the dials take a date (day and month) or three digits,
// as many tries as you like.
function lockSheet(n, msg = "") {
  const lk = K.locks[K.content[n.id].lock];
  if (!st.found.includes(lk.lockClue)) { st.found.push(lk.lockClue); save(); render(); }
  const c = K.clues[lk.lockClue];
  const date = lk.type === "date";
  const form = `<form data-form="lock" data-id="${n.id}" class="codeform"><input name="code" inputmode="numeric" maxlength="${lk.digits}" autocomplete="off" placeholder="${date ? "DDMM" : "000"}" aria-label="${date ? "Combination: day and month" : "Combination: three digits"}"><button class="primary" type="submit">Turn the dials</button></form>
    ${msg ? `<p class="err">${esc(msg)}</p>` : `<p class="soft small">${date ? "Two digits for the day, two for the month: 14 June is 1406." : "Three digits, one for each dial."}</p>`}`;
  sheet(exhibit(c, { label: n.label, extra: codePass(c), foot: form }), { full: true });
}

function tryLock(id, input) {
  const n = findNode(roomById(ui.room), id);
  const lk = K.locks[K.content[id].lock];
  const combo = String(input).replace(/\D/g, "");
  if (combo !== lk.combo) return lockSheet(n, `${combo.padStart(lk.digits, "-")}: the dials won't budge.`);
  st.unlocked[id] = true;
  st.examined[id] = true;
  if (!st.found.includes(lk.clue)) st.found.push(lk.clue);
  save();
  closeSheet();
  render();
  showFind(n.label, { clue: lk.clue });
}

// Typing a code and using what it unlocks happen in one place.
const codeField = (name, msg) => `<form data-form="${name}" class="codeform"><input name="code" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="A7K" aria-label="Code"><button class="primary" type="submit">Add</button></form>
  ${msg ? `<p class="err">${esc(msg)}</p>` : ""}`;
const WRONG = (kind) => `That's a ${kind} code, meant for your partner: ${kind === "clue" ? "the interrogator" : "the field agent"} enters it.`;
const NO_CODE = "No such code in this case. Check it with your partner, and check that you both have the same case number.";

function applyHintSheet(msg = "") {
  const room = roomById(ui.room);
  const usable = st.hints.filter((id) => K.hints[id].spot);
  sheet(`<h2>Use a hint in the ${esc(room.name.toLowerCase())}</h2>
    <p class="soft">Enter the hint code the interrogator reads to you. If the hint doesn't fit this room, you'll find nothing.</p>
    ${codeField("hintcode", msg)}
    ${usable.length ? `<h3>Hints you already have</h3><ul class="choices">${usable.map((id) => { const h = K.hints[id]; const used = st.revealed[K.hiddenSpots[h.spot].id];
      return `<li><button data-act="useHint" data-id="${id}" ${used ? "disabled" : ""}><span class="code">${h.code}</span> ${esc(h.text)}${used ? ` <em>(found)</em>` : ""}</button></li>`; }).join("")}</ul>` : ""}`);
}

function enterHint(input) {
  const hit = lookup(K, input);
  if (!hit) return applyHintSheet(NO_CODE);
  if (hit.kind !== "hint") return applyHintSheet(WRONG(hit.kind));
  const h = hit.item;
  if (!st.hints.includes(h.id)) { st.hints.push(h.id); save(); render(); }
  if (h.spot && !st.revealed[K.hiddenSpots[h.spot].id]) {
    sheet(`<div class="find plain">${icon("hint")}<div><p class="eyebrow">Hint ${h.code}</p><p class="ex-body">${esc(h.text)}</p></div></div>
      <button class="primary wide" data-act="useHint" data-id="${h.id}">Try it in the ${esc(roomById(ui.room).name.toLowerCase())}</button>
      <button class="wide" data-act="close">Save it for later</button>`);
  } else {
    sheet(`<div class="find plain">${icon("hint")}<div><p class="eyebrow">Hint ${h.code}</p><p class="ex-body">${esc(h.text)}</p></div></div>
      <p class="soft">${h.spot ? "You have already found what this points to." : "Find the number it means, then try it on the lock."}</p><button class="primary wide" data-act="close">OK</button>`);
  }
}

function useHint(id) {
  const h = K.hints[id];
  const spot = K.hiddenSpots[h.spot];
  if (h.room !== ui.room) {
    closeSheet();
    sheet(`<div class="find plain">${icon("magnifier")}<div><h2>Nothing here</h2><p class="ex-body">You search the ${esc(roomById(ui.room).name.toLowerCase())} for it, but nothing here fits the hint.</p></div></div><button class="primary wide" data-act="close">OK</button>`);
    return;
  }
  st.revealed[spot.id] = true;
  st.examined[spot.id] = true;
  if (!st.found.includes(spot.clue)) st.found.push(spot.clue);
  save();
  ui.focus = spot.furniture;
  closeSheet();
  render();
  showFind(spot.label, { clue: spot.clue });
}

// ---------- interrogator ----------
function has(t) {
  // clue:x = clue code entered; anything else (q:..., ev:...) is an event recorded by reply() or ask().
  if (t.startsWith("clue:")) return st.clues.includes(t.slice(5));
  return !!st.events[t];
}
const hasAll = (ts) => ts.every(has);
const sus = (id) => K.suspects.find((s) => s.id === id);

function interrogatorView() {
  const s = sus(ui.suspect);
  const d = K.dialog[s.id];
  const last = st.last[s.id];
  const mood = last ? last.mood : "calm";
  const obsSeen = d.observations.filter((o) => st.seen[`${s.id}:${o.id}`]);
  const highlight = last && last.highlight;
  const lost = !!s.lost;
  const tabs = K.suspects.map((x) => `<button class="stab ${x.id === s.id ? "on" : ""}" data-act="suspect" data-id="${x.id}">
      <span class="face">${portrait(x.lib.look, { mood: st.last[x.id] ? st.last[x.id].mood : "calm", lost: !!x.lost, label: x.name })}</span><span>${esc(x.short)}</span></button>`).join("");
  const qs = d.questions.filter((q) => hasAll(q.requires)).map((q) => {
    const done = st.asked[`${s.id}:${q.id}`];
    return `<li><button class="q ${done ? "done" : ""}" data-act="ask" data-id="${q.id}"><span>${esc(q.label)}</span><span class="meta">${done ? "asked ✓" : ""}</span></button></li>`;
  }).join("");
  const lockedQs = d.questions.filter((q) => !hasAll(q.requires)).length;
  const hintChips = last && last.gives && last.gives.length ? last.gives.map((h) => `<div class="pass small"><span>Hint code for the field agent</span><strong class="code">${K.hints[h].code}</strong></div>`).join("") : "";
  return `<nav class="stabs" aria-label="Suspects">${tabs}</nav>
    <section class="interview">
      <div class="portrait">${portrait(s.lib.look, { mood, lost, highlight, label: s.name })}</div>
      <div class="who"><h2>${esc(s.name)}</h2><p class="soft">${esc(s.title)}</p></div>
      <div class="bubble ${last ? "" : "quiet"} ${ui.fresh ? "fresh" : ""}" aria-live="polite">${last ? `${last.q ? `<p class="asked">${esc(last.q)}</p>` : ""}<p class="said-now">${ui.fresh ? words(last.text) : esc(last.text)}</p>` : `<p class="said-now">${esc(s.short)} waits for your first question.</p>`}</div>
      ${hintChips}
    </section>
    <ul class="questions">${qs}</ul>
    ${lockedQs ? `<p class="soft small">More questions open up once you know more about the murder.</p>` : ""}
    <div class="row actions">
      <button class="grow" data-act="look">${icon("eye")} Look closely</button>
      <button class="grow" data-act="confrontSheet">${icon("confront")} Confront with a clue</button>
    </div>
    ${obsSeen.length ? `<div class="panel obs"><h3>What you noticed</h3><ul>${obsSeen.map((o) => `<li>${esc(o.text)}</li>`).join("")}</ul></div>` : ""}
    ${st.clues.length ? "" : `<p class="soft small">Clues come from the field agent. Enter their code when you confront a suspect.</p>`}`;
}

// The reply appears word by word, over about a second and a half at most.
function words(text) {
  const w = text.split(/\s+/).filter(Boolean);
  const step = Math.min(55, 1500 / w.length);
  return w.map((x, i) => `<span class="w" style="--d:${Math.round(i * step)}ms">${esc(x)}</span>`).join(" ");
}

function reply(s, data) {
  ui.fresh = true;
  st.last[s.id] = data;
  st.transcript.push({ s: s.id, q: data.q || "", a: data.text });
  for (const h of data.gives || []) if (!st.hints.includes(h)) st.hints.push(h);
  for (const ev of data.events || []) st.events[ev] = true;
  save();
  render();
}

function ask(qid) {
  const s = sus(ui.suspect);
  const q = K.dialog[s.id].questions.find((x) => x.id === qid);
  const key = `${s.id}:${qid}`;
  if (!st.asked[key]) { st.asked[key] = true; for (const ev of q.events) st.events[ev] = true; }
  reply(s, { q: q.label, text: q.text, mood: q.mood, gives: q.gives });
}

// Where the lens goes for each observation: a point on the portrait and a zoom factor.
const VIEWS = { body: { at: [60, 118], z: 2.1 }, hair: { at: [60, 36], z: 2.3 }, hand: { at: [60, 128], z: 1.7, icon: "glass" }, shoes: { at: [60, 136], z: 1.8, icon: "shoe" }, smoke: { at: [60, 80], z: 2.6, icon: "cigarette" } };
function viewFor(o) {
  if (REGIONS[o.region]) { const [x, y, r] = REGIONS[o.region]; return { at: [x, y], z: Math.min(4.2, 36 / r), ring: o.region }; }
  return { ...(VIEWS[o.region] || VIEWS[o.id] || { at: [60, 70], z: 1.6 }), ring: o.region && REGIONS[o.region] ? o.region : null };
}

function look() {
  const s = sus(ui.suspect);
  const d = K.dialog[s.id];
  const fresh = d.observations.filter((o) => hasAll(o.requires) && !st.seen[`${s.id}:${o.id}`]);
  if (!fresh.length) { toast(`Nothing new catches your eye about ${s.short}. Not yet, anyway.`); return; }
  for (const o of fresh) st.seen[`${s.id}:${o.id}`] = true;
  const region = fresh.find((o) => o.region && o.region !== "body") || fresh.find((o) => o.region);
  reply(s, { q: "You study " + s.short + " closely.", text: fresh.map((o) => o.text).join(" "), mood: st.last[s.id] ? st.last[s.id].mood : "calm",
    gives: fresh.flatMap((o) => o.gives), events: fresh.flatMap((o) => o.events || []), highlight: region && region.region });
  inspect(s, fresh.map((o) => ({ text: o.text, view: viewFor(o), gives: o.gives })));
}

// The inspection: a magnifying glass sweeps over the portrait, zooms in on one detail at a time and says what it sees.
const FULL_VIEW = [-10, 0, 140, 140];
const lensView = ({ at: [x, y], z }) => {
  const w = 140 / z;
  return [Math.max(-10, Math.min(130 - w, x - w / 2)), Math.max(0, Math.min(140 - w, y - w / 2)), w, w];
};
let tweenId = 0;
function tween(svg, to, dur) {
  const id = ++tweenId;
  const from = svg.getAttribute("viewBox").split(" ").map(Number);
  if (reduced || !dur) { svg.setAttribute("viewBox", to.join(" ")); return; }
  const t0 = performance.now();
  const step = (now) => {
    if (id !== tweenId || !svg.isConnected) return;
    const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    svg.setAttribute("viewBox", from.map((v, i) => v + (to[i] - v) * e).join(" "));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function inspect(s, items) {
  const last = st.last[s.id];
  const svg = portrait(s.lib.look, { mood: last ? last.mood : "calm", lost: !!s.lost, label: s.name }).replace(/viewBox="[^"]*"/, `viewBox="${FULL_VIEW.join(" ")}"`);
  sheet(`<div class="fbody insp">
      <p class="eyebrow">Looking closely at ${esc(s.short)}</p>
      <div class="lens"><div class="lens-glass" id="lens">${svg}<div class="scan"></div></div></div>
      <div class="cap" id="cap" aria-live="polite"></div>
    </div>
    <div class="ffoot" id="inspfoot"></div>`, { full: true });
  insp = { s, items, i: 0 };
  inspectStep(true);
}

function inspectStep(first) {
  const { items, i } = insp;
  const it = items[i];
  const glass = document.getElementById("lens");
  const svg = glass.querySelector("svg");
  svg.querySelectorAll(".ring").forEach((x) => x.remove());
  glass.classList.remove("scanning");
  void glass.offsetWidth;
  glass.classList.add("scanning");
  const cap = document.getElementById("cap");
  cap.innerHTML = "";
  cap.classList.remove("in");
  const target = lensView(it.view);
  tween(svg, target, first ? 1100 : 800);
  const my = insp;
  setTimeout(() => {
    if (insp !== my || my.i !== i) return;
    if (it.view.ring) {
      const [x, y, r] = REGIONS[it.view.ring];
      const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ring.setAttribute("class", "ring"); ring.setAttribute("cx", x); ring.setAttribute("cy", y); ring.setAttribute("r", r);
      svg.appendChild(ring);
    }
    cap.innerHTML = `${items.length > 1 ? `<p class="eyebrow">Detail ${i + 1} of ${items.length}</p>` : ""}${it.view.icon ? `<span class="cap-icon">${icon(it.view.icon)}</span>` : ""}<p class="cap-text">${esc(it.text)}</p>
      ${(it.gives || []).map((h) => `<div class="pass small"><span>Hint code for the field agent</span><strong class="code">${K.hints[h].code}</strong></div>`).join("")}`;
    cap.classList.add("in");
  }, reduced ? 0 : first ? 900 : 650);
  document.getElementById("inspfoot").innerHTML = i < items.length - 1
    ? `<button class="primary wide" data-act="inspNext">Next detail ›</button>`
    : `<button class="primary wide" data-act="close">Done</button>`;
}

function confrontSheet(msg = "") {
  const s = sus(ui.suspect);
  sheet(`<h2>Confront ${esc(s.short)}</h2>
    <p class="soft">Enter the clue code the field agent reads to you${st.clues.length ? ", or pick a clue you already have" : ""}.</p>
    ${codeField("cluecode", msg)}
    ${st.clues.length ? `<h3>Clues you already have</h3><ul class="choices">${st.clues.map((id) => { const c = K.clues[id]; const done = st.done[`${s.id}:${id}`];
      return `<li><button data-act="confront" data-id="${id}" class="clue">${icon(c.icon)}<span><strong>${esc(c.title)}</strong> ${done ? `<em>(done)</em>` : ""}<br><span class="soft small">${esc(c.text)}</span></span></button></li>`; }).join("")}</ul>` : ""}`);
}

function enterClue(input) {
  const hit = lookup(K, input);
  if (!hit) return confrontSheet(NO_CODE);
  if (hit.kind !== "clue") return confrontSheet(WRONG(hit.kind));
  const c = hit.item;
  const isNew = !st.clues.includes(c.id);
  if (isNew) { st.clues.push(c.id); save(); render(); }
  const s = sus(ui.suspect);
  sheet(`<div class="find plain"><span class="nart big">${icon(c.icon, c.title)}</span><div><p class="eyebrow">${isNew ? "New clue" : "You already have this clue"}</p><h2>${esc(c.title)}</h2>${c.tag ? `<p><span class="tag">${esc(c.tag)}</span></p>` : ""}<p class="ex-body">${esc(c.text)}</p></div></div>
    <button class="primary wide" data-act="confront" data-id="${c.id}">Confront ${esc(s.short)} with it</button>
    <button class="wide" data-act="close">Save it for later</button>`);
}

function confront(cid) {
  const s = sus(ui.suspect);
  const d = K.dialog[s.id];
  const c = d.confront[cid];
  const clue = K.clues[cid];
  const key = `${s.id}:${cid}`;
  closeSheet();
  const full = c && hasAll(c.requires);
  if (full) st.done[key] = true;
  const q = `You show ${s.short}: ${clue.title.toLowerCase()}.`;
  if (full) reply(s, { q, text: c.text, mood: c.mood, gives: c.gives, events: c.events });
  else if (c && c.alt) reply(s, { q, text: c.alt, mood: "uneasy" });
  else if (c) reply(s, { q, text: "What are you getting at? I've told you where I was. Or have I?", mood: "uneasy" });
  else reply(s, { q, text: d.fallback, mood: "calm" });
  if (!full) save();
}

// ---------- shared: notebook, codes, menu ----------
function notebook(tab) {
  tab = tab || ui.nb || "clues";
  ui.nb = tab;
  const F = role === "F";
  const clueIds = F ? st.found : st.clues;
  const tabs = [["clues", "Clues", clueIds.length], ["hints", "Hints", st.hints.length], ...(F ? [] : [["said", "Statements", st.transcript.length]])];
  const empty = (t) => `<p class="soft empty">${t}</p>`;
  let body;
  if (tab === "clues") {
    body = clueIds.length
      ? `<ul class="ncards">${clueIds.map((id) => { const c = K.clues[id];
          return `<li><button class="ncard" data-act="viewClue" data-id="${id}"><span class="nart">${icon(c.icon)}</span>
            <span class="ntext"><strong>${esc(c.title)}</strong>${c.tag ? ` <span class="tag">${esc(c.tag)}</span>` : ""}<span class="nbody">${esc(c.text)}</span></span>
            ${F ? `<span class="code chip">${c.code}</span>` : ""}</button></li>`; }).join("")}</ul>`
      : empty(F ? "Nothing found yet. Search the rooms." : "No clues yet. The field agent reads you their codes.");
  } else if (tab === "hints") {
    body = st.hints.length
      ? `<ul class="ncards">${st.hints.map((id) => { const h = K.hints[id]; const found = F && h.spot && st.revealed[K.hiddenSpots[h.spot].id];
          return `<li><div class="ncard hint ${found ? "done" : ""}"><span class="nart">${icon("hint")}</span>
            <span class="ntext"><span class="nbody">${esc(h.text)}</span>${F ? `<span class="nstate">${found ? "Found ✓" : h.spot ? "Try it in the room where it fits" : "Find the number, then try the lock"}</span>` : ""}</span>
            <span class="code chip">${h.code}</span></div></li>`; }).join("")}</ul>`
      : empty(F ? "No hints yet. The interrogator reads you their codes." : "No hints yet. Some answers and details contain one.");
  } else {
    body = K.suspects.map((x) => { const lines = st.transcript.filter((t) => t.s === x.id);
      return `<section class="stmt"><header><span class="face">${portrait(x.lib.look, { mood: st.last[x.id] ? st.last[x.id].mood : "calm", lost: !!x.lost, label: x.name })}</span><div><h3>${esc(x.name)}</h3><span class="soft small">${esc(x.title)}</span></div></header>
        ${lines.length ? `<ul class="said">${lines.map((t) => `<li>${t.q ? `<span class="said-q">${esc(t.q)}</span>` : ""}<span class="said-a">${esc(t.a)}</span></li>`).join("")}</ul>` : `<p class="soft small">Not questioned yet.</p>`}</section>`; }).join("");
  }
  sheet(`<div class="fbody nbook"><h2>Notebook</h2>
      <div class="ntabs" role="tablist">${tabs.map(([id, name, n]) => `<button role="tab" aria-selected="${id === tab}" class="ntab ${id === tab ? "on" : ""}" data-act="nbtab" data-tab="${id}">${name} <span class="count">${n}</span></button>`).join("")}</div>
      ${body}</div>`, { full: true });
}

// One clue from the notebook, shown large.
function viewClue(id) {
  const c = K.clues[id];
  sheet(exhibit(c, { extra: role === "F" ? codePass(c) : "", foot: `<button class="primary wide" data-act="nbtab" data-tab="clues">Back to the notebook</button>` }), { full: true });
}

function menu() {
  sheet(`<h2>Case ${K.code}</h2><p class="soft">${ROLE[role]} · ${esc(K.manor)}</p>
    <p>${esc(K.briefing)}</p>
    <details><summary>How to play</summary>${rulesHtml()}</details>
    <div class="row"><button class="grow" data-act="home">Leave (progress is saved)</button></div>`);
}

// ---------- accusation ----------
function accuse() {
  const a = ui.accuse || (ui.accuse = {});
  const ready = a.suspect && a.weapon && a.motive;
  return `<section>
    <button class="back" data-act="game">← Back to the case</button>
    <h1>The accusation</h1>
    <p>You get one try. Agree with your partner before you confirm.</p>
    <h2>Who did it?</h2>
    <div class="pick three">${K.suspects.map((s) => `<button class="${a.suspect === s.id ? "on" : ""}" data-act="pick" data-k="suspect" data-v="${s.id}"><span class="face">${role === "I" ? portrait(s.lib.look, { lost: !!s.lost, label: s.name }) : icon("person")}</span><span>${esc(s.short)}</span></button>`).join("")}</div>
    <h2>With what?</h2>
    <div class="pick weapons">${WEAPONS.map((w) => `<button class="${a.weapon === w.id ? "on" : ""}" data-act="pick" data-k="weapon" data-v="${w.id}">${icon(w.id)}<span>${esc(w.name)}</span></button>`).join("")}</div>
    <h2>Why?</h2>
    <div class="pick motives">${MOTIVES.map((m) => `<button class="${a.motive === m.id ? "on" : ""}" data-act="pick" data-k="motive" data-v="${m.id}">${icon(m.icon)}<span>${esc(m.label)}</span></button>`).join("")}</div>
    <button class="primary wide" data-act="confirmAccuse" ${ready ? "" : "disabled"}>Make the accusation</button>
  </section>`;
}

function result() {
  const r = st.result;
  const sol = K.solution;
  const name = (k, v) => k === "suspect" ? sus(v).name : k === "weapon" ? WEAPONS.find((w) => w.id === v).name : MOTIVES.find((m) => m.id === v).label;
  const verdict = r.correct === 3 ? "Case closed" : r.correct === 0 ? "The killer walks free" : "The case falls apart in court";
  return `<section class="result">
    <p class="eyebrow">Case ${K.code} · ${esc(K.manor)}</p>
    <h1>${verdict}</h1>
    <ul class="verdict">${["suspect", "weapon", "motive"].map((k) => `<li class="${r.parts[k] ? "ok" : "no"}"><span>${r.parts[k] ? "✓" : "✗"}</span><span>${{ suspect: "Murderer", weapon: "Weapon", motive: "Motive" }[k]}: <strong>${esc(name(k, r.accused[k]))}</strong>${r.parts[k] ? "" : `<br><span class="soft">It was: ${esc(name(k, sol[k]))}</span>`}</span></li>`).join("")}</ul>
    <div class="panel"><h2>What really happened</h2>${K.story.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    <button class="primary wide" data-act="home">Back to the start</button>
  </section>`;
}

// ---------- events ----------
app.addEventListener("click", onClick);
sheetEl.addEventListener("click", (ev) => { if (ev.target === sheetEl) closeSheet(); else onClick(ev); });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !sheetEl.hidden) closeSheet(); });
document.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const form = ev.target;
  const value = new FormData(form).get("code") || "";
  if (form.dataset.form === "join") {
    const p = parseCaseCode(value);
    if (p.error) return toast(p.error);
    pending = p.code;
    screen = "role";
    render();
  } else if (form.dataset.form === "hintcode") {
    enterHint(value);
  } else if (form.dataset.form === "cluecode") {
    enterClue(value);
  } else if (form.dataset.form === "lock") {
    tryLock(form.dataset.id, value);
  }
});

function onClick(ev) {
  const t = ev.target.closest("[data-act]");
  if (!t || t.disabled) return;
  const a = t.dataset.act;
  const d = t.dataset;
  switch (a) {
    case "close": closeSheet(); break;
    case "home": closeSheet(); screen = "home"; K = null; render(); break;
    case "new": pending = newCaseCode(); screen = "new"; render(); break;
    case "toRole": screen = "role"; render(); break;
    case "pickRole": open(pending, d.role); break;
    case "resume": open(d.code, d.role); break;
    case "forget":
      if (confirm(`Delete your progress in case ${d.code}?`)) { store.del(`case:${d.code}:${d.role}`); render(); }
      break;
    case "start": st.started = true; save(); screen = "game"; render(); break;
    case "game": screen = "game"; render(); break;
    case "menu": menu(); break;
    case "notebook": notebook(); break;
    case "nbtab": notebook(d.tab); break;
    case "viewClue": viewClue(d.id); break;
    case "inspNext": if (insp) { insp.i++; inspectStep(false); } break;
    case "toAccuse": screen = "accuse"; render(); break;
    case "pick": ui.accuse[d.k] = d.v; render(); break;
    case "confirmAccuse": {
      const res = checkAccusation(K, ui.accuse);
      st.result = { ...res, accused: { ...ui.accuse } };
      save();
      screen = "result";
      render();
      break;
    }
    // field agent
    case "room": ui.room = d.id; ui.focus = null; ui.view = null; render(); break;
    case "up": ui.focus = d.to || null; render(); break;
    case "node": {
      const room = roomById(ui.room);
      const hidden = Object.values(K.hiddenSpots).find((h) => h.id === d.id);
      const n = hidden ? { ...hidden, hidden: true } : findNode(room, d.id);
      if (isLeaf(n)) examine(room, n); else { ui.focus = n.id; render(); }
      break;
    }
    case "applyHint": applyHintSheet(); break;
    case "useHint": useHint(d.id); break;
    // interrogator
    case "suspect": ui.suspect = d.id; render(); break;
    case "ask": ask(d.id); break;
    case "look": look(); break;
    case "confrontSheet": confrontSheet(); break;
    case "confront": confront(d.id); break;
  }
}

render();

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
