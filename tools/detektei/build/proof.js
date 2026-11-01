import { HAIR_GROUP, SHOES, SMOKES } from "../library.js";

// The proof: how each innocent is ruled out, and the traits a trace uses.
export function chooseProof(c) {
  const { M, R, cause, innocents, side, suspects } = c;
  // ---------- the proof: how each innocent is ruled out ----------
  //   A: a trace fits the murderer and one innocent, and the interrogator sees it doesn't fit the other.
  //   B: a truthful suspect's alibi checks out in the room, and covers the moment that matters.
  //   C: a third person saw the liar wherever the liar really was. Lovers vouch for each other.
  const route = new Map();
  for (const s of innocents) route.set(s, side === "lovers" ? "C" : R.pick(s.role === "H" ? ["B", "A"] : ["C", "A"]));
  const freeDims = R.shuffle(["shoes", "smoke", ...(cause === "poison" ? [] : ["hand"])]);
  const hairOk = (y) => {
    const x = innocents.find((o) => o !== y), g = (s) => HAIR_GROUP[s.lib.tone];
    return g(M) === g(x) && g(y) !== g(M);
  };
  const dimOf = new Map();
  const aInn = innocents.filter((s) => route.get(s) === "A");
  if (aInn.length === 2) {
    const hy = aInn.find(hairOk);
    if (hy) { dimOf.set(hy, "hair"); dimOf.set(aInn.find((s) => s !== hy), freeDims[0]); }
    else { const s = aInn[1]; route.set(s, s.role === "H" ? "B" : "C"); dimOf.set(aInn[0], freeDims[0]); }
  } else if (aInn.length === 1) dimOf.set(aInn[0], hairOk(aInn[0]) && R.int(2) ? "hair" : freeDims[0]);

  // Traits. The ones a trace uses are set so that the trace fits exactly the murderer and one innocent.
  const VALUES = { hand: ["right", "left"], shoes: SHOES.map((x) => x.id), smoke: SMOKES.filter((x) => x.id !== "none").map((x) => x.id) };
  for (const s of suspects) s.traits = { hair: HAIR_GROUP[s.lib.tone], hand: R.int(4) ? "right" : "left", shoes: R.pick(SHOES).id, smoke: R.pick(SMOKES).id };
  const traceVal = {};
  for (const [y, d] of dimOf) {
    if (d === "hair") { traceVal.hair = M.traits.hair; continue; }
    const x = innocents.find((o) => o !== y);
    const v = R.pick(VALUES[d]);
    traceVal[d] = v;
    M.traits[d] = v; x.traits[d] = v;
    y.traits[d] = R.pick((d === "smoke" ? SMOKES.map((z) => z.id) : VALUES[d]).filter((z) => z !== v));
  }
  const dims = ["hair", ...Object.keys(traceVal).filter((d) => d !== "hair")];

  Object.assign(c, { dimOf, dims, route, traceVal });
}
