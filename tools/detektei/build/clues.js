import { an, cap, fill, fmtTime, rn } from "../util.js";
import { CAUSES, HAIR_WORD, HAND_TELL, SHOES, SMOKES, STAGED_TELL, WEAPONS, WOUNDS } from "../library.js";

// The fixed clues of the case and the deductions they support.
export function makeClues(c) {
  const { M, R, S, V, cause, chimer, core, corroborator, decoy, dimOf, f, innocents, keyAt, lovers, nm, others, route, served, server, spareSpots, spotWeapon, suspects, there, time, traceVal, tryst, victim, watch, weapon } = c;
  // ---------- clues ----------
  const clues = {};
  const addClue = (id, c) => { clues[id] = { id, ...c }; };
  const deductions = [];
  const deduce = (needs, fact, why, proof = false) => deductions.push({ needs, ...fact, why, proof });
  const short = (txt) => txt.split(/[.:;]/)[0].toLowerCase();

  let bodyText = `${victim.name} lies dead on the floor of the ${rn(S)}, ${CAUSES[cause]}.`;
  if (core === "moved") bodyText += " Yet nothing in the room is disturbed, and two long scuff marks run across the floor from the door to the body.";
  else if (cause !== "poison") bodyText += " There was a struggle: a chair is knocked over and the rug is rucked up.";
  bodyText += ` ${WOUNDS[weapon.cls]}`;
  if (traceVal.hand) bodyText += ` ${fill(HAND_TELL[cause], { hand: traceVal.hand })}`;
  if (core === "poison") bodyText += " The glass smells of lemon and cloves: a hot toddy, long gone cold.";
  bodyText += ` The victim's wristwatch smashed in the fall and stopped at ${watch}.`;
  if (core === "staged") bodyText += ` ${R.pick(STAGED_TELL)}`;
  addClue("body", { title: "The victim", icon: "watch", text: bodyText });

  for (const s of suspects) {
    addClue(`alibi_${s.id}`, { title: s.claim.act.title, icon: s.claim.act.icon, text: there(s) ? s.claim.act.yes : s.claim.act.no });
    for (const m of [s.motive, s.settled]) addClue(`motive_${s.id}_${m.id}`, { title: "Private papers", icon: m.icon, text: f(m.doc, { who: nm(s), surname: s.lib.surname }) });
  }
  const slow = core === "poison" ? " The label warns that it works slowly: death follows within the hour." : "";
  addClue("weapon", { title: cap(weapon.name), icon: weapon.id, text: `${cap(an(weapon.name))} with ${weapon.mark}, hidden ${spotWeapon.hiddenDef.found}: ${weapon.trace}.${slow}${traceVal.hair ? ` Caught on it is ${HAIR_WORD[traceVal.hair]}.` : ""}` });
  const decoySpot = R.int(5) < 2 && spareSpots.length ? spareSpots.pop() : null;
  addClue("decoy", { title: cap(decoy.name), icon: decoy.id, text: `${cap(an(decoy.name))} with ${decoy.mark}${decoySpot ? `, tucked away ${decoySpot.hiddenDef.found}` : ""}. It has been moved today: a clean ring in the dust shows where it usually stands.` });
  if (core === "moved") addClue("stain", { title: "Scrubbed stain", icon: "brush", text: "A patch scrubbed almost white, still damp and smelling of carbolic soap. A rusty rim remains in the cracks. Somebody cleaned up here tonight." });
  const shoe = traceVal.shoes && SHOES.find((x) => x.id === traceVal.shoes);
  const smoke = traceVal.smoke && SMOKES.find((x) => x.id === traceVal.smoke);
  if (shoe) addClue("print", { title: "Footprint", icon: "shoe", text: `In a smear of spilt ${R.pick(["port", "ash", "soil from an upset plant"])} right beside the body: ${shoe.print}. It is fresh.` });
  if (smoke) addClue("ash", { title: "Ash", icon: "ash", text: `On the floor of the ${rn(S)}, where nobody has swept since the murder: ${smoke.ash}.` });

  // ---------- deductions ----------
  // When the murder happened: the watch, unless a twist makes it lie.
  if (core === "staged") deduce(["clue:body", `q:${chimer.id}:noticed`], { gives: "time" }, `The watch had been set forward: ${nm(chimer)} heard the cry as the clock struck ${time}.`, true);
  else if (core === "poison") deduce(["clue:body", "clue:weapon", `q:${server.id}:noticed`], { gives: "time" }, `The poison was slow, so what mattered was who could have put it in the hot toddy at ${served}.`, true);
  else deduce(["clue:body"], { gives: "time" }, `${cap(V)} died at ${time}.`);
  const allBut = (x) => suspects.filter((s) => s !== x).map((s) => s.id);
  const traceClue = { hair: "weapon", shoes: "print", smoke: "ash", hand: "body" };
  const traitSays = (s, d) => d === "hair" ? `${nm(s)}'s hair is ${s.lib.tone}`
    : d === "hand" ? `${nm(s)} is ${s.traits.hand}-handed`
    : d === "shoes" ? `${nm(s)} is wearing ${SHOES.find((x) => x.id === s.traits.shoes).worn}`
    : s.traits.smoke === "none" ? `${nm(s)} doesn't smoke` : `${nm(s)} smokes ${{ pipe: "a pipe", turkish: "Turkish cigarettes", cheroot: "cheroots" }[s.traits.smoke]}`;
  for (const s of innocents) {
    const r = route.get(s);
    if (r === "A") {
      const d = dimOf.get(s);
      deduce([`clue:${traceClue[d]}`, `o:${s.id}:${d}`], { fact: { t: "who", allow: allBut(s) } },
        `The ${d === "hair" ? "hair on the weapon" : d === "hand" ? "angle of the wound" : clues[traceClue[d]].title.toLowerCase()} ruled out ${nm(s)}: ${traitSays(s, d)}.`, true);
    } else if (r === "B") {
      deduce(["time", `q:${s.id}:where`, `clue:alibi_${s.id}`], { fact: { t: "who", allow: allBut(s) } },
        `${nm(s)}'s alibi held: the ${clues[`alibi_${s.id}`].title.toLowerCase()} in the ${rn(s.claim.room)} showed it, and ${nm(s)} was there from ${fmtTime(s.from)}, before ${fmtTime(keyAt)}.`, true);
    } else if (lovers.includes(s)) {
      const o = lovers.find((x) => x !== s);
      deduce([`ev:broken_${s.id}`], { fact: { t: "who", allow: allBut(o), by: s.id } }, `${nm(s)} and ${nm(o)} were together ${tryst}, and each said so once the lies fell apart.`, s === lovers[0]);
    } else {
      const z = corroborator.get(s);
      deduce([`ev:seen_${s.id}`], { fact: { t: "who", allow: allBut(s), by: z.id } }, `${nm(z)} saw ${nm(s)} ${f(s.secret.told)} at the time of the murder.`, true);
    }
  }
  // Truthful people who sat together vouch for each other, whether the proof needs it or not.
  for (const s of innocents) for (const o of innocents) if (s !== o && s.role === "H" && o.role === "H" && s.claim.room === o.claim.room)
    deduce([`q:${s.id}:where`], { fact: { t: "who", allow: allBut(o), by: s.id } }, `${nm(s)} and ${nm(o)} spent the evening together in the ${rn(s.claim.room)}.`);
  const sameCls = WEAPONS.filter((w) => w.cause === cause && w.cls === weapon.cls).map((w) => w.id);
  deduce(["clue:body"], { fact: { t: "weapon", allow: sameCls } }, `The wound fits the ${weapon.name}${sameCls.length > 1 ? ", or something much like it" : ""}.`);
  deduce(["clue:weapon"], { fact: { t: "weapon", allow: [weapon.id] } }, `The ${weapon.name} turned up hidden: ${weapon.trace}.`, true);

  // Motives: each paper shows a grudge; a settlement (a paper, or what a third person knows) rules one out.
  const refuter = new Map(); // suspect -> who knows the settled grudge was settled, or null for a paper
  for (const s of suspects) {
    for (const m of [s.motive, s.settled]) deduce([`clue:motive_${s.id}_${m.id}`], { fact: { t: "mot+", s: s.id, m: m.id } }, `${nm(s)} had a grudge: ${m.label.toLowerCase()}.`, s === M && m === s.motive);
    if (R.int(2)) {
      addClue(`settle_${s.id}`, { title: s.settled.settled.title, icon: s.settled.settled.icon, text: f(s.settled.settled.text, { who: nm(s), surname: s.lib.surname }) });
      refuter.set(s, null);
      deduce([`clue:settle_${s.id}`], { fact: { t: "mot-", s: s.id, m: s.settled.id } }, `${nm(s)}'s ${s.settled.label.toLowerCase()} grudge had been settled before tonight.`, s === M);
    } else {
      const z = R.pick(others(s));
      refuter.set(s, z);
      deduce([`ev:settled_${s.id}`], { fact: { t: "mot-", s: s.id, m: s.settled.id, by: z.id } }, `${nm(z)} knew that ${nm(s)}'s ${s.settled.label.toLowerCase()} grudge had been settled before tonight.`, s === M);
    }
  }

  Object.assign(c, { addClue, clues, decoySpot, deductions, refuter, shoe, smoke, traceClue });
}
