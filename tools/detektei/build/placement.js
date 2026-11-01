import { leaves } from "../furniture.js";
import { BOXES, BOX_PLACES, CARDS, DUSTY, FINDS, FRESH, LOCKABLE, LOCK_EVENTS, MONTHS } from "../library.js";
import { an, cap, rn } from "../util.js";

// Placing things in the rooms: locks, papers, belongings and red herrings.
export function placeThings(c) {
  const { MR, R, S, V, addClue, bodyF, clues, core, decoySpot, deductions, f, innocents, nm, refuter, roomOfLeaf, rooms, shoe, side, smoke, spareSpots, suspects, there, traceClue } = c;
  // ---------- placing things in the rooms ----------
  const content = {}; // leaf id -> { clue }, { text } or { lock: id }
  const taken = new Set();
  const put = (leaf, c) => { content[leaf.id] = c; taken.add(leaf.id); };
  const partOf = (x, pid) => x.children.find((c) => c.id === `${x.id}.${pid}`);
  const kindPart = (l) => { const [rid, i, ...rest] = l.id.split("."); const fu = rooms.find((r) => r.id === rid).furniture.find((x) => x.id === `${rid}.${i}`); return `${fu.kind}.${rest.join(".")}`; };
  for (const s of suspects) put(partOf(s.claim.f, s.claim.act.part), { clue: `alibi_${s.id}` });
  put(partOf(bodyF, "victim"), { clue: "body" });
  const freeLeaves = (whereTags, room) => R.shuffle((room ? [room] : rooms).flatMap((r) => r.furniture.filter((x) => x.kind !== "body").flatMap(leaves)))
    .filter((l) => !taken.has(l.id) && whereTags.includes(l.tag));
  const place = (whereTags, c, room) => { const l = freeLeaves(whereTags, room)[0]; if (l) put(l, c); return l; };
  const must = (l, what) => { if (!l) throw new Error(`no room for ${what}`); return l; };

  if (core === "moved") must(place("f", { clue: "stain" }, MR) || place("s", { clue: "stain" }, MR) || place("c", { clue: "stain" }, MR), "the stain");
  if (smoke && !place("f", { clue: "ash" }, S) && !place("s", { clue: "ash" }, S)) {
    // No free floor or surface at the scene: the ash goes into the description of the body.
    delete clues.ash;
    clues.body.text += ` Beside the body: ${smoke.ash}.`;
    traceClue.smoke = "body";
    for (const d of deductions) d.needs = d.needs.map((t) => (t === "clue:ash" ? "clue:body" : t));
  }
  if (!decoySpot) must(place("sf", { clue: "decoy" }), "the decoy");

  // Locks: up to two, of different kinds. Each guards a paper the deduction may need.
  const papers = R.shuffle([...suspects.flatMap((s) => [s.motive, s.settled].map((m) => `motive_${s.id}_${m.id}`)), ...suspects.filter((s) => refuter.get(s) === null).map((s) => `settle_${s.id}`)]);
  const locks = {};
  const nLocks = R.pick([0, 1, 1, 1, 2, 2]);
  R.shuffle(["date", "phone"]).slice(0, nLocks).forEach((type, i) => {
    const inner = papers.pop();
    const cand = R.shuffle(rooms.flatMap((r) => r.furniture.filter((x) => x.kind !== "body").flatMap(leaves))).filter((l) => !taken.has(l.id) && (LOCKABLE.includes(kindPart(l)) || kindPart(l) in BOX_PLACES));
    const l = cand.find((x) => LOCKABLE.includes(kindPart(x))) && R.int(2) ? cand.find((x) => LOCKABLE.includes(kindPart(x))) : cand[0];
    if (!l) { papers.push(inner); return; }
    const box = kindPart(l) in BOX_PLACES && (!LOCKABLE.includes(kindPart(l)) || R.int(2)) ? R.pick(BOXES) : null;
    const id = `lock${i}`;
    put(l, { lock: id });
    const digits = type === "date" ? 4 : 3;
    const lib = R.shuffle(type === "date" ? LOCK_EVENTS : CARDS).slice(0, 3);
    const nums = [];
    while (nums.length < 3) {
      const n = type === "date" ? [1 + R.int(28), 1 + R.int(12)] : 1000 + R.int(9000);
      const key = type === "date" ? String(n[0]).padStart(2, "0") + String(n[1]).padStart(2, "0") : String(n).slice(1);
      if (!nums.some((x) => x.key === key)) nums.push({ n, key });
    }
    const label = box ? box.label : l.label.toLowerCase();
    const dials = type === "date" ? "four little brass dials: two for the day, two for the month" : "three numbered brass dials";
    locks[id] = { id, leaf: l.id, type, digits, combo: nums[0].key, box: box && box.id, clue: inner, lockClue: `lock_${id}`, hint: `hLock_${id}`,
      phrase: f(lib[0].phrase), label: box ? cap(box.label) : `Locked ${label}`, x: l.x, y: l.y, w: l.w, h: l.h, room: roomOfLeaf(l).id };
    addClue(`lock_${id}`, { title: box ? cap(box.label) : `Locked ${label}`, icon: box ? box.icon : "key",
      text: box ? `${cap(an(box.label))} ${BOX_PLACES[kindPart(l)]} in the ${rn(roomOfLeaf(l))}, locked with ${dials}. Whatever is inside, ${V} wanted it kept safe.`
        : `The ${label} in the ${rn(roomOfLeaf(l))} is locked with ${dials}. Whatever is inside, ${V} wanted it kept safe.` });
    lib.forEach((e, j) => {
      const n = nums[j].n;
      const text = type === "date" ? f(e.item, { date: `${n[0]} ${MONTHS[n[1] - 1]}` }) : f(e.item, { num: String(n) });
      must(place("sw", { text }) || place("c", { text }) || place("s", { text }), "a keepsake");
    });
  });
  const lockOf = (clue) => Object.values(locks).find((x) => x.clue === clue);

  // Papers that are not locked away: some hidden behind a hint, the rest in drawers and cupboards.
  const hidden = []; // { hint, spot, clue, owner }
  for (const id of papers) {
    if (R.int(10) < 3 && spareSpots.length) {
      const spot = spareSpots.pop();
      hidden.push({ hint: `hDoc_${id}`, spot, clue: id, owner: suspects.find((s) => id.split("_")[1] === s.id) });
      clues[id].text += ` It was hidden ${spot.hiddenDef.found}.`;
    } else must(place("c", { clue: id }) || place("s", { clue: id }), id);
  }

  // Belongings. Each suspect may have lost one; it lies about the house, fresh or dusty. When the murderer frames
  // someone, the framed suspect's belonging lies by the body.
  const presence = {}; // clue id -> { owner, fresh, room, planted }
  const token = (s) => s.lib.token;
  const framed = side === "frame" ? R.pick(innocents) : null;
  for (const s of suspects) s.lost = s === framed || R.int(2) === 0;
  if (shoe) put(partOf(bodyF, "under"), { clue: "print" });
  if (framed) {
    const id = `token_${framed.id}`;
    addClue(id, { title: "Something dropped", icon: token(framed).icon, text: `${cap(token(framed).name)}, lying by the victim's body.${FRESH}` });
    if (shoe) must(place("f", { clue: id }, S) || place("s", { clue: id }, S), "the framed token"); else put(partOf(bodyF, "under"), { clue: id });
    presence[id] = { owner: framed, fresh: true, room: S, planted: true };
  }
  const finds = []; // { id, item, owner, fresh, open, lead }
  const library = R.shuffle(FINDS);
  const fillFind = (item, s) => f(item.text, { X: nm(s), I: s.lib.surname[0] });
  if (!content[partOf(bodyF, "under").id]) {
    // Something of somebody's under the body: anybody's, since everybody went in to see the victim at some point.
    const s = R.pick(suspects);
    if (s.lost && s !== framed) {
      const id = `token_${s.id}`;
      addClue(id, { title: "Something dropped", icon: token(s).icon, text: `${cap(token(s).name)}, lying under the victim's body.${FRESH}` });
      presence[id] = { owner: s, fresh: true, room: S, visit: true };
      put(partOf(bodyF, "under"), { clue: id });
    } else {
      const item = library.splice(library.findIndex((x) => x.presence), 1)[0];
      const id = `find${finds.length}`;
      addClue(id, { title: item.title, icon: item.icon, text: `${fillFind(item, s)} It was lying under the victim's body.${FRESH}` });
      finds.push({ id, item, owner: s, fresh: true, open: false });
      presence[id] = { owner: s, fresh: true, room: S, visit: true };
      put(partOf(bodyF, "under"), { clue: id });
    }
  }
  for (const s of suspects) {
    const id = `token_${s.id}`;
    if (!s.lost || clues[id]) continue;
    const fresh = there(s) && R.int(2) === 0;
    const l = place("sf", { clue: id }, fresh ? s.claim.room : null);
    if (!l) { s.lost = false; continue; }
    addClue(id, { title: "Something dropped", icon: token(s).icon, text: `${cap(token(s).name)}.${fresh ? FRESH : DUSTY}` });
    presence[id] = { owner: s, fresh, room: roomOfLeaf(l) };
  }

  // Red herrings: about two in five of the remaining places hold a find, each owned by somebody.
  let want = Math.round(freeLeaves("scfw").length * 0.4);
  const owners = R.shuffle(suspects);
  while (want > 0 && library.length) {
    const item = library.pop(), owner = owners[finds.length % owners.length], id = `find${finds.length}`;
    let fresh = false, room = null;
    if (item.presence) {
      fresh = there(owner) && R.int(2) === 0;
      room = fresh ? owner.claim.room : null;
    }
    const l = place(item.where, { clue: id }, room);
    if (!l) continue;
    want--;
    addClue(id, { title: item.title, icon: item.icon, text: fillFind(item, owner) + (item.presence ? (fresh ? FRESH : DUSTY) : "") });
    finds.push({ id, item, owner, fresh, open: true });
    if (item.presence) presence[id] = { owner, fresh, room: roomOfLeaf(l) };
  }
  // A couple of hidden places hold red herrings too, so a hidden place doesn't promise a real clue.
  const leadPapers = library.filter((x) => !x.presence && x.where.includes("c"));
  for (let i = R.int(3); i > 0 && spareSpots.length && leadPapers.length; i--) {
    const spot = spareSpots.pop(), item = leadPapers.pop(), owner = R.pick(suspects), id = `find${finds.length}`;
    addClue(id, { title: item.title, icon: item.icon, text: `${fillFind(item, owner)} It was hidden ${spot.hiddenDef.found}.` });
    finds.push({ id, item, owner, fresh: false, open: false });
    hidden.push({ hint: `hLead_${id}`, spot, clue: id, owner });
  }
  if (decoySpot) hidden.push({ hint: "hDecoy", spot: decoySpot, clue: "decoy", owner: null });
  for (const r of rooms) for (const l of r.furniture.flatMap(leaves)) {
    if (!content[l.id]) content[l.id] = { text: R.pick(l.def.flavor || ["Nothing of interest."]) };
  }

  Object.assign(c, { content, finds, framed, hidden, locks, presence, token });
}
