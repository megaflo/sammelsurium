import { PRO, cap, fill, hash, rng } from "../util.js";
import { CAUSES, CORE_TWISTS, MANORS, MOTIVES, SUSPECTS, VICTIMS, WEAPONS } from "../library.js";

// The answer and the twists: victim, cause, suspects and their parts, weapon, decoy and grudges.
export function pickAnswer(c) {
  const { attempt, code } = c;
  const R = rng(hash(`${code}#${attempt}`));
  const victim = R.pick(VICTIMS);
  const manor = R.pick(MANORS);
  const V = victim.short;
  const P = PRO[victim.pro];
  const VV = { V, Vhe: P.he, VHe: cap(P.he), Vhim: P.him, Vhis: P.his, Vself: P.self };
  const f = (t, vars = {}) => fill(t, { ...VV, ...vars });
  const nm = (s) => s.short;
  const cause = R.pick(Object.keys(CAUSES));

  // ---------- the answer and the twists ----------
  const coreFits = (t) => (t === "poison" ? cause === "poison" : t === "moved" ? cause !== "poison" : true);
  const core = R.int(10) < 6 ? R.pick(CORE_TWISTS.filter(coreFits)) : null;
  const sideRoll = R.int(10);
  const side = sideRoll < 2 ? "lovers" : sideRoll < 4 ? "frame" : null;
  const trueAlibi = core !== null; // the murderer really was where they claim, for one reason or another

  // Three or four suspects with different initials. One is the murderer (M). Each of the others independently lies
  // about where they were to hide a secret (L) or tells the truth (H). Lovers are two of the innocents; both lie.
  const count = R.int(10) < 3 ? 4 : 3;
  const chosen = [];
  for (const s of R.shuffle(SUSPECTS)) if (chosen.length < count && !chosen.some((c) => c.surname[0] === s.surname[0])) chosen.push(s);
  const mi = R.int(count);
  const pair = side === "lovers" ? R.shuffle([...Array(count).keys()].filter((i) => i !== mi)).slice(0, 2) : [];
  const suspects = chosen.map((lib, i) => ({ id: lib.id, lib, role: i === mi ? "M" : pair.includes(i) || R.int(2) ? "L" : "H", name: lib.name, short: lib.short, title: lib.title }));
  const M = suspects[mi];
  const others = (s) => suspects.filter((o) => o !== s);
  const innocents = others(M);
  const lovers = pair.map((i) => suspects[i]);
  const there = (s) => s.role === "H" || (s === M && trueAlibi); // really was where they say

  // Weapons: the real one, and a decoy of the same kind that somebody moved for an innocent reason.
  const ofCause = R.shuffle(WEAPONS.filter((w) => w.cause === cause));
  const weapon = ofCause[0], decoy = ofCause[1];

  // Motives: two grudges each, all different. The first is live tonight; the second was settled before.
  const mot = R.shuffle(MOTIVES);
  suspects.forEach((s, i) => { s.motive = mot[2 * i]; s.settled = mot[2 * i + 1]; s.temper = s.lib.temper; });

  Object.assign(c, { M, R, V, cause, core, decoy, f, innocents, lovers, manor, nm, others, side, suspects, there, trueAlibi, victim, weapon });
}
