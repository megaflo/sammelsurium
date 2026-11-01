import { HAIR_GROUP, SHOES, SMOKES } from "../library.js";

// The proof: how each innocent is ruled out, and the traits a trace uses.
export function chooseProof(c) {
  const { M, R, cause, innocents, lovers, suspects } = c;
  // ---------- the proof: how each innocent is ruled out ----------
  //   A: a trace fits the murderer and one innocent, and the interrogator sees it doesn't fit the other.
  //   B: a truthful suspect's alibi checks out in the room, and covers the moment that matters.
  //   C: a third person saw the liar wherever the liar really was. Lovers vouch for each other.
  //   D: two steps. Caught in the lie, the liar says where proof of the secret is hidden; a third person only
  //      speaks up about the liar once shown that proof.
  const route = new Map();
  for (const s of innocents) route.set(s, lovers.includes(s) ? "C" : R.pick(s.role === "H" ? ["B", "A"] : ["C", "A", "D"]));
  const freeDims = R.shuffle(["shoes", "smoke", ...(cause === "poison" ? [] : ["hand"])]);
  // Hair is fixed by the portrait, so a hair trace only works when somebody besides the murderer shares the colour.
  const g = (s) => HAIR_GROUP[s.lib.tone];
  const hairOk = (y) => g(y) !== g(M) && suspects.some((o) => o !== y && o !== M && g(o) === g(M));
  // Each innocent ruled out by a trace gets a trace of a different kind; when none is left, another route.
  const dimOf = new Map();
  let hairUsed = false;
  for (const y of innocents.filter((s) => route.get(s) === "A")) {
    if (!hairUsed && hairOk(y) && (R.int(2) || !freeDims.length)) { dimOf.set(y, "hair"); hairUsed = true; }
    else if (freeDims.length) dimOf.set(y, freeDims.shift());
    else route.set(y, y.role === "H" ? "B" : "C");
  }

  // Traits. The ones a trace uses are set so that the trace fits exactly the murderer and one other suspect.
  const VALUES = { hand: ["right", "left"], shoes: SHOES.map((x) => x.id), smoke: SMOKES.filter((x) => x.id !== "none").map((x) => x.id) };
  for (const s of suspects) s.traits = { hair: HAIR_GROUP[s.lib.tone], hand: R.int(4) ? "right" : "left", shoes: R.pick(SHOES).id, smoke: R.pick(SMOKES).id };
  const traceVal = {};
  for (const [y, d] of dimOf) {
    if (d === "hair") { traceVal.hair = M.traits.hair; continue; }
    const x = R.pick(innocents.filter((o) => o !== y));
    const v = R.pick(VALUES[d]);
    traceVal[d] = v;
    M.traits[d] = v; x.traits[d] = v;
    for (const o of suspects) if (o !== M && o !== x) o.traits[d] = R.pick((d === "smoke" ? SMOKES.map((z) => z.id) : VALUES[d]).filter((z) => z !== v));
  }
  const dims = ["hair", ...Object.keys(traceVal).filter((d) => d !== "hair")];

  Object.assign(c, { dimOf, dims, route, traceVal });
}
