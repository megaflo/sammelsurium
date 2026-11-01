import { ALONE, BODY_REACT, EVENING, NOTICED, NOT_SEEN, OTHERS_PAPER, PROOF_NUDGE, PROOF_OWN, PROOF_SEEN, RELATIONS, SEEN, SHOES, SHRUG, SMOKES, STAIN_REACT, TRACE_REACT, WEAPON_REACT } from "../library.js";
import { an, cap, fill, fmtTime, rn } from "../util.js";

// Dialogue: questions, confrontations and observations for each suspect.
export function writeDialogue(c) {
  const { M, MR, R, S, V, W, chimer, clues, core, corroborator, proofSpot, route, decoy, dims, f, finds, framed, hints, keyAt, locks, lovers, nm, noticedHint, noticer, opinionHint, others, presence, refuter, served, server, sighting, suspects, there, time, token, tryst, watch } = c;
  // ---------- dialogue ----------
  // requires: tokens the interrogator must hold. clue:x = clue code entered, q:sid:qid = question asked, ev:x = event,
  // o:sid:dim = something seen when looking closely. Lines depend on facts, never on the part a suspect plays.
  const say = (s, text) => (R.int(3) === 0 ? `${s.lib.voice}${text}` : text);
  const evening = R.shuffle(EVENING), noticed = R.shuffle(NOTICED);
  const chime = `I heard a cry from the direction of the ${rn(MR)}, just as the hall clock chimed. ${time}, it must have been.`;
  const relation = {};
  for (let i = 0; i < suspects.length; i++) for (let j = i + 1; j < suspects.length; j++) relation[`${suspects[i].id}|${suspects[j].id}`] = R.pick(RELATIONS);
  const relText = (s, o) => {
    if (lovers.includes(s) && lovers.includes(o)) return `${nm(o)}? I hardly know ${nm(o)}, to be honest.`;
    const i = suspects.indexOf(s), j = suspects.indexOf(o);
    const rel = relation[i < j ? `${s.id}|${o.id}` : `${o.id}|${s.id}`];
    return fill(i < j ? rel.a : rel.b, { o: nm(o) });
  };
  const company = (s) => {
    const with_ = there(s) ? suspects.filter((o) => o !== s && there(o) && o.claim.room === s.claim.room) : [];
    if (!with_.length) return R.pick(ALONE);
    const o = with_[0];
    const late = o === M && (core === "staged" || core === "poison") ? ` ${nm(o)} came in at about ${fmtTime(o.from)}.` : "";
    return `${nm(o)} was there too, ${o.claim.act.act}.${late}`;
  };
  const lockKnower = {};
  for (const lk of Object.values(locks)) lockKnower[lk.id] = R.pick(suspects);
  const dialog = {};
  suspects.forEach((s, idx) => {
    const opinion = (o) => {
      const hid = opinionHint[`${s.id}>${o.id}`];
      return hid ? { text: say(s, `${relText(s, o)} And since you ask: ${hid.map((h) => hints[h].say).join(" And another thing: ")}`), gives: hid } : { text: say(s, relText(s, o)) };
    };
    const { room, act } = s.claim;
    const dinnerOf = R.pick(others(s)), dinnerM = R.pick([dinnerOf.motive, dinnerOf.settled]);
    const notice = noticer(s) ? { text: say(s, `Yes. ${sighting}`), gives: ["hWeapon"] }
      : s === server ? { text: say(s, `Only that somebody carried a hot toddy in to ${V} in the ${rn(S)} at about ${served}. I heard the tray rattle on the stairs. I didn't see who.`) }
      : s === chimer ? { text: say(s, chime) }
      : noticedHint[s.id] ? { text: say(s, hints[noticedHint[s.id]].say), gives: [noticedHint[s.id]] }
      : { text: say(s, fill(noticed[idx], { T: time })) };
    const qs = [
      { id: "about", label: `Who are you to ${V}?`, text: say(s, f(s.lib.about)) },
      { id: "evening", label: "What did you do this evening?", text: say(s, `${f(evening[idx])} ${f(dinnerM.dinner, { who: nm(dinnerOf) })}`) },
      ...others(s).map((o) => ({ id: `on:${o.id}`, label: `What do you make of ${nm(o)}?`, ...opinion(o) })),
      { id: "where", label: `Where were you at ${watch}?`, requires: ["clue:body"], text: say(s, `At ${watch}? I was in the ${rn(room)}, ${act.act}, from ${fmtTime(s.from)} until ${fmtTime(s.until)}. ${company(s)}`) },
      { id: "noticed", label: "Did you notice anything unusual?", requires: ["clue:body"], ...notice },
    ];
    for (const q of qs) { q.mood = "calm"; q.requires = q.requires || []; q.gives = q.gives || []; q.events = [`q:${s.id}:${q.id}`]; }

    // witness: true marks a reaction to something the suspect doesn't own.
    const confront = {};
    const asked = `q:${s.id}:where`;
    const broken = `ev:broken_${s.id}`;
    const seenToo = s === W && s.role === "L" ? ` And there's something else. ${sighting}` : "";
    const press = s.temper; // how this suspect reacts when cornered, murderer or not
    if (there(s)) confront[`alibi_${s.id}`] = { requires: [asked], text: `Exactly as I told you. I was in the ${rn(room)}, ${act.act}.`, mood: "calm" };
    else if (s === M) confront[`alibi_${s.id}`] = { requires: [asked], text: `Fine. I wasn't in the ${rn(room)}. I was ${f(M.cover.act)}. Make of that what you like.`, mood: press, events: [broken] };
    else if (proofSpot.has(s)) confront[`alibi_${s.id}`] = { requires: [asked], text: `Fine. I wasn't in the ${rn(room)}. I was ${f(s.secret.act)}.${seenToo}`, mood: press, gives: s === W ? ["hWeapon"] : [], events: [broken] };
    else if (s.secret.lover) confront[`alibi_${s.id}`] = { requires: [asked], text: `Fine. I wasn't in the ${rn(room)}. I was ${tryst}, with ${nm(s.secret.lover)}, from before ${fmtTime(keyAt)} until long after. We have kept it from everyone for a year, and I would rather it stayed that way.${seenToo}`, mood: press, gives: s === W ? ["hWeapon"] : [], events: [broken] };
    else confront[`alibi_${s.id}`] = { requires: [asked], text: `Fine. I wasn't in the ${rn(room)}. I was ${f(s.secret.act)}. Make of that what you like.${seenToo}`, mood: press, gives: s === W ? ["hWeapon"] : [], events: [broken] };
    if (proofSpot.has(s)) {
      const a = confront[`alibi_${s.id}`];
      a.text += ` ${hints[`hProof_${s.id}`].say}`;
      a.gives = [...(a.gives || []), `hProof_${s.id}`];
      confront[`proof_${s.id}`] = { text: R.pick(PROOF_OWN), mood: "uneasy" };
    }
    for (const o of others(s)) {
      const z = corroborator.get(o);
      const vars = { o: nm(o), r: rn(o.claim.room), told: o.secret && f(o.secret.told), T: fmtTime(keyAt) };
      if (proofSpot.has(o)) confront[`proof_${o.id}`] = z === s && route.get(o) === "D"
        ? { text: say(s, fill(R.pick(PROOF_SEEN), vars)), mood: "uneasy", witness: true, events: [`ev:seen_${o.id}`] }
        : { text: say(s, fill(R.pick(NOT_SEEN), vars)), mood: "calm", witness: true };
      confront[`alibi_${o.id}`] = z === s && route.get(o) === "D"
        ? { text: say(s, fill(R.pick(PROOF_NUDGE), vars)), mood: "uneasy", witness: true }
        : z === s
        ? { text: say(s, fill(R.pick(SEEN), { o: nm(o), r: rn(o.claim.room), told: f(o.secret.told), T: fmtTime(keyAt) })), mood: "uneasy", witness: true, events: [`ev:seen_${o.id}`] }
        : { text: say(s, fill(R.pick(NOT_SEEN), { o: nm(o) })), mood: "calm", witness: true };
    }
    for (const m of [s.motive, s.settled]) confront[`motive_${s.id}_${m.id}`] = { text: f(m.admit), mood: press };
    for (const o of others(s)) for (const m of [o.motive, o.settled]) {
      const knows = m === o.settled && refuter.get(o) === s;
      confront[`motive_${o.id}_${m.id}`] = knows ? { text: say(s, f(m.told, { who: nm(o), surname: o.lib.surname })), mood: "calm", witness: true, events: [`ev:settled_${o.id}`] }
        : { text: say(s, fill(R.pick(OTHERS_PAPER), { o: nm(o) })), mood: "calm", witness: true };
    }
    if (clues[`settle_${s.id}`]) confront[`settle_${s.id}`] = { text: "Yes. That was settled, and I was glad of it. Nobody kills over a closed account, Inspector.", mood: "calm" };
    for (const o of others(s)) if (clues[`settle_${o.id}`]) confront[`settle_${o.id}`] = { text: say(s, fill(R.pick(OTHERS_PAPER), { o: nm(o) })), mood: "calm", witness: true };
    const owned = (id, react) => {
      const p = presence[id];
      if (!p.fresh) return { text: react ? f(react) : "That's mine. I lost it days ago. Look at the dust on it.", mood: "calm" };
      if (p.planted) return { text: "That's mine, yes. I lost it yesterday and turned my room upside down looking for it. How on earth did it get there?", mood: "afraid" };
      if (p.visit) return { text: `That's mine. I looked in on ${V} in the ${rn(S)} earlier this evening; it must have come off then.`, mood: "uneasy" };
      return { text: `Yes, that's mine. I was in the ${rn(p.room)} this evening, as I told you.`, mood: "calm" };
    };
    if (s.lost) confront[`token_${s.id}`] = owned(`token_${s.id}`);
    for (const x of finds) {
      if (x.owner !== s) continue;
      if (x.item.presence) { confront[x.id] = owned(x.id, x.item.react); continue; }
      const lead = x.lead ? ` But if you want something worth your time: ${hints[x.lead].say}` : "";
      confront[x.id] = { text: f(x.item.react) + lead, mood: "uneasy", gives: x.lead ? [x.lead] : [] };
    }
    if (framed && s !== framed) confront[`token_${framed.id}`] = { text: `That's ${nm(framed)}'s. ${nm(framed)} dropped it at dinner yesterday; somebody picked it up, but I couldn't say who.`, mood: "uneasy", witness: true };
    confront.body = { text: f(R.pick(BODY_REACT)), mood: "uneasy" };
    confront.decoy = { text: `${cap(an(decoy.name))}? I suppose somebody moved it. Why?`, mood: "calm" };
    confront.weapon = { text: R.pick(WEAPON_REACT), mood: R.pick(["uneasy", "afraid"]) };
    for (const id of ["print", "ash"]) if (clues[id]) confront[id] = { text: R.pick(TRACE_REACT), mood: "uneasy", witness: true };
    if (core === "moved") confront.stain = { text: R.pick(STAIN_REACT), mood: "uneasy", witness: true };
    for (const lk of Object.values(locks)) confront[lk.lockClue] = s === lockKnower[lk.id]
      ? { text: hints[lk.hint].text, mood: "calm", gives: [lk.hint], witness: true }
      : { text: `${V} never told me the combination. Ask ${nm(lockKnower[lk.id])}; ${V} trusted ${nm(lockKnower[lk.id])} with that sort of thing.`, mood: "calm", witness: true };
    for (const c of Object.values(confront)) { c.requires = c.requires || []; c.gives = c.gives || []; c.events = c.events || []; }

    const fillN = (t) => f(t, { n: nm(s) });
    const obs = [];
    if (s.lost) obs.push({ id: "lost", text: fillN(token(s).missing), region: s.lib.look.token, missing: true });
    obs.push({ id: "trace", text: fillN(s.trace), region: "body" });
    for (const d of dims) {
      const text = d === "hair" ? `${nm(s)}'s hair is ${s.lib.tone}.`
        : d === "hand" ? `${nm(s)} picks up the glass of water with the ${s.traits.hand} hand, and signs your notebook with it too.`
        : d === "shoes" ? `${nm(s)} is wearing ${SHOES.find((x) => x.id === s.traits.shoes).worn}.`
        : fill(SMOKES.find((x) => x.id === s.traits.smoke).has, { n: nm(s) });
      obs.push({ id: d, text, events: [`o:${s.id}:${d}`] });
    }
    obs.forEach((o) => { o.requires = []; o.gives = []; o.events = o.events || []; });
    dialog[s.id] = { questions: qs, confront, observations: obs,
      fallback: say(s, R.pick(SHRUG)) };
  });

  Object.assign(c, { dialog });
}
