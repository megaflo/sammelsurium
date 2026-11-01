import { SECRETS, TRACES, TRYST, TRYST_TRACE } from "../library.js";
import { rn } from "../util.js";

// Secrets and traces on people; who saw and heard what.
export function castPeople(c) {
  const { M, MR, R, S, core, hideRoom, innocents, lovers, nm, roomOf, rooms, route, served, suspects, time, trueAlibi } = c;
  // ---------- secrets and traces on people ----------
  const tryst = R.pick(TRYST), trystTrace = R.pick(TRYST_TRACE);
  for (const s of suspects) if (s.role === "L") s.secret = lovers.includes(s) ? { lover: lovers.find((o) => o !== s), told: `${tryst}, with ${nm(lovers.find((o) => o !== s))}` } : SECRETS[s.motive.id];
  M.cover = trueAlibi ? null : SECRETS[M.motive.id];
  const spare = R.shuffle(TRACES.filter((t) => !suspects.some((s) => SECRETS[s.motive.id].trace === t)));
  // Half the time a liar's clothes give the secret away, and half the time the murderer prepared the cover story
  // well enough to show the matching trace; so a trace that fits a story proves nothing either way.
  for (const s of suspects) s.trace = lovers.includes(s) ? trystTrace
    : s.role === "L" && R.int(2) ? s.secret.trace : s === M && M.cover && R.int(2) ? M.cover.trace : spare.pop();

  // ---------- who saw and heard what ----------
  const W = R.pick(innocents); // saw the weapon go into hiding
  const kindsOf = (r) => new Set(r.furniture.map((x) => x.kind));
  const glimpse = (x) => {
    const room = roomOf(x);
    const fits = (sense, r) => sense.k.some((k) => kindsOf(r).has(k)) && kindsOf(r).has(x.kind);
    const ok = R.shuffle(room.senses).filter((sense) => rooms.filter((r) => fits(sense, r)).length === 1);
    return ok.length ? `a room where ${ok[0].t}` : `the ${rn(room)}`;
  };
  const hiddenIn = (room) => room.furniture.filter((x) => x.hiddenDef);
  const bodyF = S.furniture.find((x) => x.kind === "body");
  const spotWeapon = R.pick(hiddenIn(hideRoom));
  if (!spotWeapon) throw new Error("no hiding place");
  const spareSpots = R.shuffle(rooms.flatMap(hiddenIn).filter((x) => x !== spotWeapon));
  const where = W.role === "H" ? `I stepped out of the ${rn(W.claim.room)} into the hall` : "I was on my way back through the hall";
  const sighting = core === "poison"
    ? `${where} at about ${served} and saw someone come out of the ${rn(S)} with something small in their hand, a bottle or a tin. Too dark to see who. They went into ${glimpse(spotWeapon)} and hid it ${spotWeapon.hiddenDef.phrase}.`
    : core === "moved"
      ? `${where} just after ${time} and saw someone drag something heavy out of the ${rn(MR)} and into ${glimpse(spotWeapon)}. Too dark to see who. A moment later they hid something there, ${spotWeapon.hiddenDef.phrase}.`
      : `${where} just after ${time} and saw someone hurry out of the ${rn(MR)} with something wrapped in a cloth. Too dark to see who. They went into ${glimpse(spotWeapon)} and hid it ${spotWeapon.hiddenDef.phrase}.`;
  // The chime gives the true time. Never told by the murderer when the murderer's alibi depends on the time.
  const noticer = (s) => s === W && s.role === "H";
  const server = core === "poison" ? R.pick(innocents.filter((s) => !noticer(s))) : null;
  const chimer = R.pick(suspects.filter((s) => !noticer(s) && s !== server && !(s === M && trueAlibi)));
  // Who saw a liar where the liar really was (routes C and D). Lovers were off together, so they saw nobody.
  const seer = (s) => { const o = innocents.filter((x) => x !== s && !lovers.includes(x)); return o.length && R.int(3) ? R.pick(o) : M; };
  const corroborator = new Map(); // liar -> who saw them
  // Route D: the proof of the secret lies in a hidden place, and the liar says where once caught. The murderer's
  // cover story sometimes comes with "proof" too, so pointing to proof doesn't mark anybody innocent; nobody
  // confirms the murderer's.
  const proofSpot = new Map(); // suspect -> hidden place
  for (const s of innocents) {
    if (route.get(s) === "D") {
      if (spareSpots.length) proofSpot.set(s, spareSpots.pop());
      else route.set(s, "C");
    }
    if (route.get(s) === "C" && !lovers.includes(s) || route.get(s) === "D") corroborator.set(s, seer(s));
  }
  if (M.cover && spareSpots.length && R.int(3) === 0) proofSpot.set(M, spareSpots.pop());

  Object.assign(c, { W, bodyF, chimer, corroborator, glimpse, noticer, proofSpot, server, sighting, spareSpots, spotWeapon, tryst });
}
