import { HIDE_ANON, HIDE_SAY, LOCK_RULES } from "../library.js";

// Hints: what the interrogator learns and carries to the field agent.
export function makeHints(c) {
  const { M, R, W, chimer, f, finds, glimpse, hidden, locks, nm, noticer, others, roomOf, server, sighting, spotWeapon, suspects, time } = c;
  // ---------- hints (the interrogator learns them) ----------
  const hints = {};
  hints.hWeapon = { id: "hWeapon", room: roomOf(spotWeapon).id, spot: spotWeapon.id, clue: "weapon", text: `${nm(W)}: "${sighting}"` };
  for (const lk of Object.values(locks)) hints[lk.hint] = { id: lk.hint, lock: lk.id, text: f(R.pick(LOCK_RULES[lk.type]), { phrase: lk.phrase }) };
  const opinionHint = {}; // `${speaker}>${about}` -> hint ids
  // A suspect with nothing to report sometimes reports a sighting all the same, which leads to a red herring. The
  // murderer does so more often than anyone: it sends the detectives the wrong way.
  const noticedHint = {};
  const plain = suspects.filter((s) => !noticer(s) && s !== server && s !== chimer);
  for (const h of hidden) {
    if (h.owner && !h.clue.startsWith("find")) continue;
    const s = plain.includes(M) && !noticedHint[M.id] && R.int(5) < 3 ? M : R.pick(plain.filter((x) => x !== M && !noticedHint[x.id] && R.int(3) === 0).concat([null]));
    if (!s) continue;
    const say = `Now you mention it, yes. Just after ${time} I saw somebody go into ${glimpse(h.spot)} and hide something ${h.spot.hiddenDef.phrase}. I couldn't see who.`;
    noticedHint[s.id] = h.hint;
    hints[h.hint] = { id: h.hint, room: roomOf(h.spot).id, spot: h.spot.id, clue: h.clue, say, text: `${nm(s)}: "${say}"` };
  }
  for (const h of hidden) {
    if (hints[h.hint]) continue;
    const say = f(R.pick(h.owner ? HIDE_SAY : HIDE_ANON), { room: glimpse(h.spot), phrase: h.spot.hiddenDef.phrase, owner: h.owner ? nm(h.owner) : "" });
    const about = h.owner || R.pick(suspects);
    const carriers = finds.filter((x) => x.open && !x.item.presence && !x.lead && x.owner !== about);
    const speakers = others(about);
    let speaker;
    if (carriers.length && (R.int(2) || !speakers.length)) { const c = R.pick(carriers); c.lead = h.hint; speaker = c.owner; }
    else { speaker = R.pick(speakers); (opinionHint[`${speaker.id}>${about.id}`] ||= []).push(h.hint); }
    hints[h.hint] = { id: h.hint, room: roomOf(h.spot).id, spot: h.spot.id, clue: h.clue, say, text: `${nm(speaker)}: "${say}"` };
  }

  Object.assign(c, { hints, noticedHint, opinionHint });
}
