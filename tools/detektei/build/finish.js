import { VERSION, codeFor, rn } from "../util.js";

// Hidden spots, goal, the story of what happened, and item codes.
export function finish(c) {
  const { M, MR, S, V, W, attempt, cause, chimer, clues, code, content, core, decoy, deductions, dialog, dimOf, f, framed, hints, innocents, locks, lovers, manor, nm, rooms, route, served, server, side, spotWeapon, suspects, time, token, trueAlibi, tryst, victim, watch, weapon } = c;
  // ---------- hidden spots ----------
  const hiddenSpots = {};
  for (const h of Object.values(hints)) {
    if (!h.spot) continue;
    const fu = rooms.flatMap((r) => r.furniture).find((x) => x.id === h.spot);
    hiddenSpots[h.spot] = { id: `${fu.id}.hidden`, furniture: fu.id, room: h.room, label: fu.hiddenDef.label, hint: h.id, clue: h.clue,
      x: fu.hiddenDef.x, y: fu.hiddenDef.y, w: fu.hiddenDef.w, h: fu.hiddenDef.h };
  }

  // What must be within reach besides the answer itself: the clues that expose a twist.
  const goal = [];
  if (core === "staged") goal.push(`q:${chimer.id}:noticed`);
  if (core === "moved") goal.push("clue:stain");
  if (core === "poison") goal.push(`q:${server.id}:noticed`);
  const solution = { suspect: M.id, weapon: weapon.id, motive: M.motive.id };

  // ---------- what really happened ----------
  const mAct = M.claim.act;
  const story = [
    `${M.name} killed ${victim.name} ${core === "moved" ? `in the ${rn(MR)}, then dragged the body into the ${rn(S)}` : `in the ${rn(S)}`}. The motive: ${M.motive.label.toLowerCase()}. ${f(M.motive.doc, { who: nm(M), surname: M.lib.surname })}`,
    core === "poison"
      ? `${nm(M)} put the ${weapon.name} into the hot toddy ${nm(M)} carried in to ${V} at ${served}, then hid it ${spotWeapon.hiddenDef.found}. The poison worked slowly; ${V} died at ${time}.`
      : `It happened at ${time}. ${nm(M)} used the ${weapon.name} and hid it ${spotWeapon.hiddenDef.found}.`,
  ];
  if (core === "staged") story.push(`${nm(M)} then set ${V}'s watch forward to ${watch} and went to the ${rn(M.claim.room)} to be seen ${mAct.act}. The alibi was real, but for the wrong time.`);
  if (core === "moved") story.push(`${nm(M)} scrubbed the floor of the ${rn(MR)} and then claimed to have spent the evening there, ${mAct.act}. That much was true: it was where ${V} died.`);
  if (core === "poison") story.push(`At ${time}, ${nm(M)} really was in the ${rn(M.claim.room)}, ${mAct.act}. The alibi was true, and meant nothing.`);
  if (!trueAlibi) story.push(`${nm(M)} claimed to have been in the ${rn(M.claim.room)}, ${mAct.act}. That was a lie, and so was the story about ${f(M.cover.told)}.`);
  story.push(`${nm(M)}'s other grudge, ${M.settled.label.toLowerCase()}, had been settled before tonight.`);
  if (framed) story.push(`By the body ${nm(M)} left ${token(framed).name} that ${nm(framed)} had lost the day before, to throw suspicion on ${nm(framed)}.`);
  if (lovers.length) story.push(`${nm(lovers[0])} and ${nm(lovers[1])} both lied about where they were: they were together ${tryst}, and nobody was to know.`);
  else for (const s of innocents) story.push(s.role === "L"
    ? `${nm(s)} lied too, to hide a secret: ${nm(s)} was ${f(s.secret.told)}.`
    : `${nm(s)} told the truth: ${nm(s)} really was in the ${rn(s.claim.room)}, ${s.claim.act.act}.`);
  story.push(`${nm(W)} saw the murderer ${core === "poison" ? "hide the poison" : "hide the weapon"}${W.role === "L" ? `, but only said so once the lie about the ${rn(W.claim.room)} fell apart` : ""}.`);

  const kase = { code, version: VERSION, attempt, victim, manor, cause, time, watch, rooms, scene: S.id, murderRoom: MR.id, suspects, weapon: weapon.id, decoy: decoy.id,
    twists: [core, side].filter(Boolean), routes: Object.fromEntries(innocents.map((s) => [s.id, route.get(s) + (dimOf.get(s) ? `:${dimOf.get(s)}` : "")])),
    clues, hints, content, hiddenSpots, locks, dialog, deductions, solution, goal, story, proof: deductions.filter((d) => d.proof).map((d) => d.why), briefing: briefing(victim, manor, S, suspects, rooms) };
  const used = new Set();
  for (const item of [...Object.values(clues), ...Object.values(hints)]) {
    let salt = 0, c;
    do c = codeFor(code, item.id, salt++); while (used.has(c));
    used.add(c);
    item.code = c;
  }
  return kase;
}
function briefing(victim, manor, S, suspects, rooms) {
  return `A storm rages over ${manor}. At eleven, ${victim.name} was found dead in the ${rn(S)}. The doors were locked and the telephone lines are down; nobody has left. ` +
    `Three people are still in the house: ${suspects.map((s) => `${s.name} (${s.title.toLowerCase()})`).join(", ")}. ` +
    `The police can't get through before morning. Until then, the case is yours.`;
}
