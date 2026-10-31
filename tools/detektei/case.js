// Case library, generator and solver. Pure functions: the same case number gives the same case on every
// device running the same VERSION. Both devices build the whole case; each role only shows its own side.

export const VERSION = 6;
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// ---------- hashing and randomness ----------
export function hash(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 & 0x1fffff) * 4294967296 + (h1 >>> 0);
}
function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n) => Math.floor(next() * n);
  const pick = (arr) => arr[int(arr.length)];
  const shuffle = (arr) => {
    const a2 = arr.slice();
    for (let i = a2.length - 1; i > 0; i--) { const j = int(i + 1); [a2[i], a2[j]] = [a2[j], a2[i]]; }
    return a2;
  };
  return { next, int, pick, shuffle };
}
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const rn = (room) => room.name.toLowerCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const an = (s) => `${/^[aeiou]/i.test(s) ? "an" : "a"} ${s}`;

// ---------- case numbers and item codes ----------
const check = (body) => ALPHA[hash(`check:${body}`) % ALPHA.length];

export function newCaseCode(random = Math.random) {
  let body = "";
  for (let i = 0; i < 5; i++) body += ALPHA[Math.floor(random() * ALPHA.length)];
  return `${VERSION}-${body}${check(body)}`;
}

// Accepts any spacing and case. Returns { code } or { error }.
export function parseCaseCode(input) {
  const s = String(input).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.length !== 7) return { error: "A case number has a digit and six letters, like 1-K7QMZX." };
  if (s[0] !== String(VERSION)) return { error: `This case number was made by version ${s[0]} of the game; this is version ${VERSION}. Both detectives need the same version.` };
  const body = s.slice(1, 6);
  if ([...s.slice(1)].some((c) => !ALPHA.includes(c)) || check(body) !== s[6]) return { error: "That case number has a typo. Check it with your partner." };
  return { code: `${VERSION}-${body}${s[6]}` };
}

export const normCode = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

// ---------- library: people ----------
// look: how the body is drawn on the floor. hair is "bald", "short" or "long".
export const VICTIMS = [
  { name: "Lord Ambrose Thorne", pro: "m", short: "Lord Thorne", look: { hair: "bald", hairColor: "#9a9a96", suit: "#2b2a33", shirt: "#f4efe2" } },
  { name: "Lady Cordelia Blackwood", pro: "f", short: "Lady Blackwood", look: { hair: "long", hairColor: "#2a1f1d", suit: "#5a2a4a", shirt: "#e9dcc8", dress: true } },
  { name: "Sir Jasper Wren", pro: "m", short: "Sir Jasper", look: { hair: "short", hairColor: "#6b4a2b", suit: "#3a3f4a", shirt: "#f4efe2" } },
  { name: "Lady Honoria Vale", pro: "f", short: "Lady Vale", look: { hair: "long", hairColor: "#b9b6b0", suit: "#2f5a4a", shirt: "#e9dcc8", dress: true } },
  { name: "Mr. Silas Grimshaw", pro: "m", short: "Mr. Grimshaw", look: { hair: "short", hairColor: "#1f1b1b", suit: "#4a3a2a", shirt: "#f4efe2" } },
  { name: "Mrs. Edith Marlowe", pro: "f", short: "Mrs. Marlowe", look: { hair: "long", hairColor: "#7a4a2a", suit: "#2f3f6a", shirt: "#e9dcc8", dress: true } },
];
export const MANORS = ["Thornbury Hall", "Ravenscourt", "Hollowmere Manor", "Blackwood House", "Wrenfield Park", "Ashgrove Manor"];

// tone: hair colour word used by traces. Three suspects in a case always have three different tones.
// token: the small personal item the murderer loses at the scene; look.token says where it is drawn.
export const SUSPECTS = [
  { id: "hale", temper: "angry", name: "Colonel Archibald Hale", short: "Colonel Hale", surname: "Hale", title: "Retired colonel", tone: "grey",
    about: "{V} and I served together in India. Forty years of friendship. Mostly.", voice: "Hmph. ",
    token: { name: "a brass button from a military jacket", icon: "button", missing: "{n}'s jacket has a gap where a brass button should be. Loose threads hang from it." },
    look: { skin: "#e8b796", hair: "short", hairColor: "#a7a7a2", outfit: "uniform", color: "#4b5d3a", accent: "#c9a227", extras: ["moustache", "monocle"], token: "buttons" } },
  { id: "pryce", temper: "afraid", name: "Dr. Imogen Pryce", short: "Dr. Pryce", surname: "Pryce", title: "Family doctor", tone: "black",
    about: "I have been {V}'s doctor for twelve years. Not an easy patient.", voice: "",
    token: { name: "a tortoiseshell hairpin", icon: "hairpin", missing: "One of {n}'s tortoiseshell hairpins is missing; a strand of hair has come loose from the bun." },
    look: { skin: "#f0cfb4", hair: "bun", hairColor: "#231c1c", outfit: "dress", color: "#2f4a7a", accent: "#d9e2ef", extras: ["glasses"], token: "hairpin" } },
  { id: "crane", temper: "afraid", name: "Edmund Crane", short: "Crane", surname: "Crane", title: "Butler", tone: "white",
    about: "I have served this house for thirty years, and {V} for twenty of them.", voice: "Ahem. ",
    token: { name: "a pearl shirt stud", icon: "stud", missing: "{n}'s starched shirt front is missing one of its three pearl studs." },
    look: { skin: "#efc9ab", hair: "bald", hairColor: "#ecebe6", outfit: "tailcoat", color: "#1d1d24", accent: "#ffffff", extras: ["bowtie"], token: "studs" } },
  { id: "ash", temper: "angry", name: "Lady Vivienne Ash", short: "Lady Ash", surname: "Ash", title: "Old family friend", tone: "fair",
    about: "{V} and I grew up together in this house. We have quarrelled since the nursery.", voice: "Oh, really. ",
    token: { name: "a pearl earring", icon: "earring", missing: "{n} wears a pearl earring in one ear only. The other earlobe is bare and a little red." },
    look: { skin: "#f6d6c0", hair: "wavy", hairColor: "#e0c16a", outfit: "dress", color: "#8c1c2c", accent: "#f3ede2", extras: ["pearls"], token: "earring" } },
  { id: "morrow", temper: "angry", name: "Felix Morrow", short: "Felix", surname: "Morrow", title: "Nephew of the house", tone: "brown",
    about: "I'm family. The black sheep, {V} would say, and often did.", voice: "Look. ",
    token: { name: "a gold lapel pin shaped like a horseshoe", icon: "lapelpin", missing: "{n}'s lapel shows two small holes where a pin used to sit." },
    look: { skin: "#e3b48f", hair: "slick", hairColor: "#5b3a22", outfit: "suit", color: "#7a6440", accent: "#c8b27a", extras: ["tie"], token: "lapel" } },
  { id: "bell", temper: "angry", name: "Mrs. Agatha Bell", short: "Mrs. Bell", surname: "Bell", title: "Cook", tone: "red",
    about: "I've cooked for {V} for fifteen years. Never a word of thanks.", voice: "Well! ",
    token: { name: "a horn button from an apron strap", icon: "button", missing: "One strap of {n}'s apron hangs loose; its horn button is gone." },
    look: { skin: "#e9b08e", hair: "capped", hairColor: "#b8452a", outfit: "apron", color: "#6f8296", accent: "#f4f1ea", extras: [], token: "strap" } },
  { id: "lark", temper: "afraid", name: "Theo Lark", short: "Theo Lark", surname: "Lark", title: "Portrait painter", tone: "black",
    about: "{V} commissioned a portrait. I've been here a month and painted nothing worth keeping.", voice: "Ah. ",
    token: { name: "a paint-flecked wooden button", icon: "button", missing: "{n}'s painting smock is missing a wooden button near the top." },
    look: { skin: "#c98f6a", hair: "curly", hairColor: "#1e1a19", outfit: "smock", color: "#c46b2b", accent: "#e8d6a8", extras: ["beret", "scarf"], token: "buttons" } },
  { id: "finch", temper: "afraid", name: "Miss Clara Finch", short: "Miss Finch", surname: "Finch", title: "Private secretary", tone: "red",
    about: "I kept {V}'s diary and letters for six years.", voice: "",
    token: { name: "a small silver earring", icon: "earring", missing: "{n} has a silver earring in one ear only." },
    look: { skin: "#f3d2bb", hair: "bob", hairColor: "#8e3b1f", outfit: "cardigan", color: "#5f8668", accent: "#efe7d3", extras: ["glasses"], token: "earring", earring: "#c8ccd4" } },
  { id: "vance", temper: "angry", name: "Rupert Vance", short: "Vance", surname: "Vance", title: "Business partner", tone: "brown",
    about: "{V} and I built the company together, thirty years ago.", voice: "Frankly? ",
    token: { name: "a gold tie pin", icon: "tiepin", missing: "{n}'s tie is held by nothing; a tiny hole shows where a tie pin sat." },
    look: { skin: "#d9a582", hair: "short", hairColor: "#4a3020", outfit: "suit", color: "#555c66", accent: "#9b2d2d", extras: ["beard", "tie"], token: "tiepin" } },
  { id: "hartley", temper: "angry", name: "Nell Hartley", short: "Nell", surname: "Hartley", title: "Gardener", tone: "fair",
    about: "I keep the grounds. {V} cared more for the roses than for the people.", voice: "Aye. ",
    token: { name: "a brass button from a dungaree strap", icon: "button", missing: "One of {n}'s dungaree straps is tied in a knot; its brass button is gone." },
    look: { skin: "#e2a988", hair: "braid", hairColor: "#d6b35e", outfit: "overalls", color: "#4f6b3a", accent: "#e9dfc4", extras: ["cap"], token: "strap" } },
];

// What a suspect's motive is, as found in a document, and how the suspect talks about it. Every suspect has two
// grudges in every case; one of them was settled before tonight. settled: the paper that shows it, found in the
// rooms. told: how a third person who knows about the settlement puts it. dinner: how it came up at dinner.
export const MOTIVES = [
  { id: "inheritance", label: "Inheritance", icon: "will",
    doc: "A new will in {V}'s hand, signed last week. {who} is cut out entirely; the old will left {who} half the estate.",
    admit: "Yes, {V} meant to cut me out of the will. I was furious. But furious isn't murderous.",
    settled: { title: "Solicitor's letter", icon: "letter", text: "A letter from {V}'s solicitor, dated yesterday: at {Vhis} request the new will has been destroyed, and the old one, which provides for {who}, stands." },
    told: "That new will? {V} had it torn up. {who} was in the old will again by yesterday; {V} told me so {Vself}.",
    dinner: "{V} talked about wills over the soup. {who} went quite white." },
  { id: "blackmail", label: "Blackmail", icon: "photo",
    doc: "Photographs and a note in {V}'s hand: \"{who}: two hundred pounds a month, or everyone sees these.\"",
    admit: "{V} was bleeding me dry with those photographs. I won't pretend I'm sorry it's over.",
    settled: { title: "Envelope of negatives", icon: "photo", text: "An envelope of photographic negatives, with a note in {V}'s hand: \"Returned to {who}. We are quits.\"" },
    told: "{V} gave those photographs back to {who} last week. I saw the envelope change hands. That business was over.",
    dinner: "{V} made a joke about photographs at dinner. Nobody laughed, {who} least of all." },
  { id: "debts", label: "Debts", icon: "ledger",
    doc: "An IOU for four thousand pounds, signed by {who}. {V} has written across it: \"Pay by Monday or I call it in.\"",
    admit: "I owed {V} money. A great deal. {VHe} wasn't the forgiving kind.",
    settled: { title: "Receipt", icon: "ledger", text: "A receipt in {V}'s hand: \"Received from {who} the sum of four thousand pounds. Paid in full.\" It is dated yesterday." },
    told: "That IOU was paid off. Every penny, yesterday; {V} crowed about it at tea.",
    dinner: "{V} said at dinner that some people in this house owed {Vhim} money. {who} studied the tablecloth." },
  { id: "jealousy", label: "Jealousy", icon: "letter",
    doc: "A love letter from {V} to the person {who} hoped to marry. It is dated this week.",
    admit: "{V} took the one person I cared about. Just to prove {Vhe} could.",
    settled: { title: "Note", icon: "letter", text: "A note to {V} from the person {who} hoped to marry: \"Please stop writing to me. I have given my word to {who}, and I mean to keep it.\"" },
    told: "Whatever {V} wrote in those letters, it came to nothing. The engagement to {who} is on again; I had it from {V}.",
    dinner: "{V} read out a letter at dinner, a love letter. {who} left the table for a minute." },
  { id: "revenge", label: "Revenge", icon: "clipping",
    doc: "A yellowed newspaper clipping: \"{surname} family ruined in share swindle\". {V}'s name is circled in ink.",
    admit: "{V} ruined my family twenty years ago. I never forgot it.",
    settled: { title: "Deed of settlement", icon: "will", text: "A deed signed by {V} and {who} last month: {V} repays the {surname} family's losses from the old share swindle, with interest. Both have signed." },
    told: "{V} paid back the {surname} family last month, every pound lost in that old swindle. {who} shook {Vhis} hand on it; I was there.",
    dinner: "Somebody mentioned the stock market at dinner. {who} put down the fork and stared at {V}." },
  { id: "exposure", label: "Fear of exposure", icon: "ledger",
    doc: "Ledger pages in {who}'s handwriting, with {V}'s red notes in the margin: \"Money missing. Police on Monday.\"",
    admit: "I borrowed from the accounts. {V} found out. I meant to pay it all back.",
    settled: { title: "Note", icon: "paper", text: "A note in {V}'s hand: \"{who} has put back every penny. No police. The matter is closed.\"" },
    told: "The missing money? {who} put it all back. {V} said the matter was closed, and {V} didn't say that lightly.",
    dinner: "{V} said something at dinner about auditors. {who} laughed too loudly." },
];

// Where the suspect who lies to hide a secret really was. Keyed by that suspect's motive.
const SECRETS = {
  inheritance: { act: "in {V}'s dressing room upstairs, reading the new will I was never meant to see", told: "reading {V}'s new will in secret", trace: "A faint smell of {V}'s cologne clings to {n}'s clothes." },
  blackmail: { act: "up in the attic, searching {V}'s old trunks", told: "searching the attic for the photographs {V} held", trace: "There are cobwebs on {n}'s shoulder and dust on both knees." },
  debts: { act: "in the hall, on the telephone, begging creditors for one more week", told: "on the telephone, begging creditors for time", trace: "A telephone number is scribbled in pencil on {n}'s wrist." },
  jealousy: { act: "out in the garden, waiting for someone who never came", told: "waiting in the garden for a secret meeting", trace: "Wet grass clings to {n}'s shoes, and the hems are damp." },
  revenge: { act: "on the terrace with a bottle of {V}'s whisky, thinking about old wrongs", told: "drinking alone on the terrace", trace: "{n}'s breath smells of whisky, and the eyes are red." },
  exposure: { act: "in the gatehouse, burning the account books before anyone could read them", told: "burning the account books in the gatehouse", trace: "There is soot on {n}'s fingertips and a smell of smoke." },
};

// Traces an interrogator can notice on a suspect. A lying suspect shows the trace of the secret above; everybody
// else shows one of the remaining traces, so a trace alone never tells who lied.
const TRACES = [
  ...Object.values(SECRETS).map((x) => x.trace),
  "Ink stains on {n}'s fingers: a lot of writing tonight, it seems.",
  "A small jigsaw piece, all blue sky, is stuck to {n}'s sleeve.",
  "Straw on {n}'s shoes, and a smell of horse and liniment.",
  "A grey smudge of silver polish on {n}'s cuff.",
];

// ---------- library: weapons ----------
export const CAUSES = {
  blunt: "struck on the head with something heavy",
  sharp: "stabbed with a narrow blade",
  poison: "poisoned: lips blue, a bitter smell, an overturned glass",
  cord: "strangled with a cord; the marks are plain on the neck",
};
// cls: weapons of the same cause and cls leave the same kind of wound, so the body alone narrows the weapon down
// to a class; wound: how the body shows it. mark: what the weapon looks like, so players can compare.
export const WEAPONS = [
  { id: "candlestick", name: "brass candlestick", cause: "blunt", cls: "round", mark: "a heavy, round base", trace: "a dent in its base and a dark smear" },
  { id: "cane", name: "silver-topped walking cane", cause: "blunt", cls: "round", mark: "a round silver knob", trace: "the silver knob is dented and stained" },
  { id: "poker", name: "fire poker", cause: "blunt", cls: "edge", mark: "a hooked iron end", trace: "blood dried on its hooked end" },
  { id: "bookend", name: "marble bookend", cause: "blunt", cls: "edge", mark: "a sharp marble corner", trace: "a chip off one corner and a dark stain" },
  { id: "letteropener", name: "letter opener", cause: "sharp", cls: "narrow", mark: "a thin blade", trace: "the blade wiped, but blood remains in the engraving" },
  { id: "dagger", name: "ornamental dagger", cause: "sharp", cls: "narrow", mark: "a slim, double-edged blade", trace: "the blade is stained to the hilt" },
  { id: "knife", name: "carving knife", cause: "sharp", cls: "broad", mark: "a broad blade", trace: "blood dried along the handle" },
  { id: "arsenic", name: "tin of rat poison", cause: "poison", cls: "bitter", mark: "a label with a skull: arsenic", trace: "almost empty, the lid pried open" },
  { id: "drops", name: "bottle of heart drops", cause: "poison", cls: "bitter", mark: "a label: digitalis, three drops only", trace: "empty, though the label says it was full yesterday" },
  { id: "cord", name: "curtain cord", cause: "cord", cls: "soft", mark: "a thick twisted cord", trace: "kinked and frayed in the middle" },
  { id: "belt", name: "dressing gown belt", cause: "cord", cls: "soft", mark: "a broad, soft silk belt", trace: "twisted tight and stretched" },
  { id: "wire", name: "coil of piano wire", cause: "cord", cls: "thin", mark: "thin steel wire", trace: "two loops wound around pencil stubs as handles" },
];
const WOUNDS = {
  round: "The wound is round, as if from something heavy with a rounded end.",
  edge: "The wound has a sharp edge to it, as if from a corner or a hook.",
  narrow: "The wound is very narrow, no wider than a finger.",
  broad: "The wound is broad, two fingers wide.",
  bitter: "There is no smell of almonds; it was not cyanide.",
  soft: "The marks on the neck are broad and soft-edged.",
  thin: "The mark on the neck is a thin, deep line.",
};

// Traits: what a trace at the scene can tell about the killer. A trace never fits only one suspect: it always fits
// the murderer and exactly one other, or everybody. Hair is fixed by the portrait; the rest are drawn per case.
const HAIR_GROUP = { black: "dark", brown: "dark", grey: "pale", white: "pale", fair: "pale", red: "red" };
const SHOES = [
  { id: "hobnails", worn: "heavy hobnailed boots", print: "the print of a heavy boot, every hobnail clear" },
  { id: "pumps", worn: "narrow evening pumps", print: "the print of a narrow evening shoe with a pointed toe" },
  { id: "galoshes", worn: "rubber galoshes over the shoes", print: "the ribbed print of a rubber galosh" },
  { id: "brogues", worn: "brogues", print: "the print of a brogue, its punched pattern clear" },
];
const SMOKES = [
  { id: "pipe", has: "{n} smells of pipe tobacco; there's a pipe in the breast pocket.", ash: "a fresh plug of pipe ash, still faintly warm" },
  { id: "turkish", has: "{n}'s fingers are stained yellow, and a case of Turkish cigarettes shows in a pocket.", ash: "the stub of a Turkish cigarette, smoked down to the gold band" },
  { id: "cheroot", has: "{n} smells of cheroots, strong and sweet.", ash: "the chewed end of a cheroot" },
  { id: "none", has: "{n} doesn't smoke: clean fingers, and no smell of tobacco at all." },
];
const HAND_TELL = {
  blunt: "From the angle of the blow, the killer is {hand}-handed.",
  sharp: "From the angle of the wound, the killer held the blade in the {hand} hand.",
  cord: "The cord was pulled hardest from the {hand}: a {hand}-handed killer.",
};

// Finds: everything the field agent can turn up besides the fixed pieces of the case. Each find belongs to a
// suspect ({X}, or the initial {I}). The generator decides per case what a find means: most get an innocent
// explanation, some lead somewhere when their owner is confronted, and "presence" finds put their owner in a
// room, fresh (tonight) or dusty (days ago). where: the spot tags it may lie in.
const FINDS = [
  { title: "Crossword", icon: "paper", where: "sc", text: "A half-finished crossword with {X}'s name pencilled in the margin. Someone has written MOTIVE into 7 across, then rubbed it out.", react: "I do the crossword every evening. Seven across was MOTIVE. A coincidence, Inspector." },
  { title: "Matchbook", icon: "matches", where: "scf", text: "A matchbook from the Blue Parrot Club, London, with {X}'s initials pencilled inside the cover. Three matches used.", react: "The Blue Parrot? I go dancing there now and then. It's no secret." },
  { title: "Train ticket", icon: "ticket", where: "scw", text: "An unused ticket for the 6:15 train to London, dated tomorrow, in the name of {X}.", react: "I meant to leave in the morning. After tonight, I'd say that's understandable." },
  { title: "Pawn ticket", icon: "ticket", where: "scw", text: "A pawn ticket in the name of {X}, for a silver pocket watch, from a shop in Brighton.", react: "Times have been hard. I'll redeem the watch when I can." },
  { title: "Unfinished poem", icon: "paper", where: "scw", text: "An unfinished love poem in {X}'s handwriting. It breaks off mid-rhyme.", react: "Poetry isn't a crime. Bad poetry, perhaps." },
  { title: "Torn photograph", icon: "photo", where: "scw", text: "Half of a photograph: a seaside pier, and {X} holding an ice cream.", react: "Brighton, years ago. I tore it in a temper. I don't even remember why." },
  { title: "Folded note", icon: "letter", where: "scw", text: "A folded note in {X}'s handwriting: \"After dinner. The usual place. Don't be late.\"", react: "That note is about a game of cards. We play every Saturday. Ask anyone." },
  { title: "Diary page", icon: "paper", where: "scw", text: "A page torn from {V}'s diary: \"Must speak to {X} about the money. This cannot go on.\"", react: "{V} lent me money years ago, and I paid every penny back. Whatever {V} wrote, that matter was closed." },
  { title: "Telegram", icon: "letter", where: "scw", text: "A telegram to {X}: \"ARRIVING TUESDAY STOP SAY NOTHING TO ANYONE STOP\"", react: "My brother is coming to visit, and the family can't stand him. That's all it is." },
  { title: "Pill box", icon: "pills", where: "sc", text: "An empty pill box from a London chemist, made out to {X}. \"Two at bedtime.\"", react: "Sleeping pills. I haven't slept properly in years. Is that a crime now?" },
  { title: "Jeweller's bill", icon: "ledger", where: "scw", text: "An unpaid bill from a Bond Street jeweller, made out to {X}: one diamond brooch.", react: "A gift for someone dear to me. I'll pay it when I can." },
  { title: "Slashed sketch", icon: "paper", where: "scw", text: "A charcoal sketch of {V}, slashed through twice. It is signed with the initial {I}.", react: "I spoiled the drawing and lost my temper with it. With the drawing, mind you." },
  { title: "Brass key", icon: "key", where: "scf", text: "A small brass key on a ribbon, labelled \"Gatehouse\" in {X}'s handwriting.", react: "I borrowed it weeks ago to fetch the deck chairs, and forgot to give it back." },
  { title: "Revolver cartridge", icon: "cartridge", where: "scf", text: "A single unfired revolver cartridge, wrapped in a sheet of {X}'s letter paper.", react: "My father's. I keep it for luck. The revolver went to a museum years ago." },
  { title: "Railway timetable", icon: "paper", where: "scw", text: "A railway timetable with the 11:15 night train circled in red. {X}'s name is written on the cover.", react: "I like to know my way out of a place. An old habit." },
  { title: "Racing slip", icon: "ticket", where: "scw", text: "A betting slip in {X}'s name: ten pounds on Lucky Lad, the 3:30 at Epsom. Lucky Lad came last.", react: "A harmless flutter. A losing one, as you can see." },
  { title: "Burnt scrap", icon: "clipping", where: "scf", text: "A scrap of burnt paper in {X}'s handwriting. Only a few words are left: \"...will never forgive...\"", react: "A letter to my sister that I thought better of sending. We don't get on." },
  { title: "Love letter", icon: "letter", where: "scw", text: "A love letter to {X}, unsigned. The handwriting is shaky.", react: "That letter is private, and it has nothing to do with {V}. Put it away." },
  { title: "Letter of complaint", icon: "letter", where: "scw", text: "A letter from {X} to {V}, complaining about the draughts in the guest rooms. Three pages long.", react: "The draughts in this house are criminal. That's the only crime I've ever accused anyone of." },
  { title: "Stained handkerchief", icon: "handkerchief", where: "scf", presence: true, text: "A handkerchief embroidered with the letter {I}, with a few spots of dried blood.", react: "A nosebleed, days ago. The damp in this house gives me nosebleeds." },
  { title: "Spectacle case", icon: "paper", where: "scf", presence: true, text: "An empty spectacle case. The initial {I} is stamped on the lid.", react: "Oh, there it is. I've been looking for that case all week." },
  { title: "Single glove", icon: "glove", where: "scf", presence: true, text: "A single leather driving glove with the initial {I} stamped inside the cuff.", react: "I lost that glove days ago. I've been driving one-handed ever since." },
  { title: "Cigarette end", icon: "cigarette", where: "sf", presence: true, text: "A cigarette end with a gold band: {X}'s brand. Nobody else in the house smokes them.", react: "I smoke where I please. That one's old, as you can see." },
];
const FRESH = " It hasn't been there long: there's no dust on it.";
const DUSTY = " It is grey with dust; it has been lying here for days.";

// Dialogue that any suspect may say, whatever their part in the case. {o} is another suspect.
const EVENING = [
  "Dinner at eight, coffee at nine. After that I kept to myself.",
  "Dinner, then I excused myself early. A headache.",
  "Dinner at eight. {V} was in a foul mood and left the table early, before nine.",
  "Dinner, a hand of bridge, then everyone went their own way.",
  "We dined at eight. {V} barely said a word all through the meal.",
  "Dinner, and a glass of port after. Then the storm got worse and everyone scattered.",
];
const NOTICED = [
  "Nothing at all. I was quite absorbed in what I was doing.",
  "No. Nothing. Why would I have noticed anything?",
  "Only the storm. It rattled every window in the house.",
  "The lights flickered once, around {T}. That's all.",
  "I heard a door slam somewhere downstairs, a little after {T}. The wind, I thought.",
  "A dog barking out at the stables, just after {T}. Nothing more.",
];
const ALONE = ["Alone, I'm afraid.", "Nobody else was there.", "On my own, the whole time.", "Nobody can vouch for me, if that's what you mean."];

// ---------- library: twists ----------
// A case has at most one twist in how the murder was done and at most one in what the others did, and often none.
// No twist is announced; each changes which facts hold, and the solver checks that the case can still be worked out.
//   staged: the murderer set the victim's watch forward; the murderer's alibi holds for the false time only.
//   moved:  the victim died in the murderer's own alibi room and was dragged to where they lie.
//   poison: the poison went into a drink an hour earlier; the murderer's alibi for the death is true.
//   lovers: the two innocent suspects lie to hide an affair, and give each other away when the lie breaks.
//   frame:  the murderer left an innocent suspect's lost belonging under the body.
const CORE_TWISTS = ["staged", "moved", "poison"];
const TRYST = ["in the summer house", "in the boathouse down by the lake", "in the old nursery at the top of the house", "in the chauffeur's flat over the garage"];
const TRYST_TRACE = ["A crushed rose petal is caught in {n}'s collar.", "{n} smells faintly of somebody else's scent: lily of the valley.", "There is a smear of lipstick, not quite wiped away, near {n}'s ear."];
const STAGED_TELL = [
  "Odd, though: the winding crown is pulled out, the way you pull it to set the hands.",
  "Odd, though: the hands still turn when you touch the crown. Someone has pulled it out to set them.",
];

// Relationships between two suspects, as each tells it. {o}: the other one.
const RELATIONS = [
  { id: "friends", a: "{o} and I go back thirty years. Whatever {o} is, {o} is no killer.", b: "{o} is an old friend. I'd trust {o} with my life." },
  { id: "rivals", a: "{o} and I have never got on. I wouldn't put much past {o}.", b: "{o}? We can't stand each other, and everyone knows it." },
  { id: "kin", a: "{o} is my cousin, for my sins. Family, you know.", b: "{o} and I are cousins. We were close once." },
  { id: "strangers", a: "I barely know {o}. We met on Friday.", b: "{o}? Arrived on Friday. Hardly said a word to me." },
  { id: "debt", a: "{o} owes me twenty pounds and pretends not to remember.", b: "I owe {o} a little money. A trifle. {o} keeps mentioning it." },
];
const NOT_SEEN = ["I couldn't tell you where {o} was. I didn't see {o} all evening.", "Where {o} really was? No idea, I'm afraid.", "I didn't see {o} after dinner."];
const SEEN = [
  "{o} wasn't in the {r}? No. I can tell you where {o} was: I saw {o} {told}, at about {T}.",
  "So {o} lied to you. I'm not surprised. But I saw {o} {told} just before {T}, and {o} was still there when I went past again.",
];
const BODY_REACT = ["Dreadful. Simply dreadful. Must you show me that?", "Put it away, please. I saw enough when they found {Vhim}.", "Poor {V}. Whatever {Vhe} was, {Vhe} didn't deserve that."];
const WEAPON_REACT = ["Good heavens. Is that what did it? I've never touched it.", "I've seen it about the house, of course. Everyone has.", "Must I look at that? It could have been anyone's hand on it."];
const TRACE_REACT = ["Half the house could have left that.", "And you think that points to me? Look again.", "I wouldn't know anything about that."];
const STAIN_REACT = ["Something spilled, I expect. The maids are forever scrubbing.", "A stain? I never noticed one.", "I haven't been on my knees in that room, Inspector."];
const OTHERS_PAPER = ["That's {o}'s business, not mine.", "I knew nothing about that.", "Well, well. {o} kept that quiet."];

// Combination locks. Each lock is set to a number the field agent finds three candidates for; only the interrogator
// learns which one counts. date: day and month of an event (4 digits). phone: the last three digits of a number.
const LOCK_EVENTS = [
  { id: "wedding", phrase: "{Vhis} wedding", item: "A silver-framed wedding photograph. On the back, in faded ink: \"Our wedding day, {date}.\"" },
  { id: "firm", phrase: "the founding of {Vhis} firm", item: "A brass plaque from an old office door: \"Est. {date}. Honest dealing.\" Someone has scratched out \"Honest\"." },
  { id: "derby", phrase: "{Vhis} Derby win", item: "A racing print of a bay colt crossing the line, inscribed \"Lucky Star, the Derby, {date}\"." },
  { id: "medal", phrase: "{Vhis} medal for bravery", item: "A velvet medal case. Inside the lid: \"For conspicuous gallantry, {date}.\"" },
  { id: "house", phrase: "the day {Vhe} bought this house", item: "A framed deed of sale for the house, signed and sealed on {date}." },
  { id: "child", phrase: "the birth of {Vhis} only child", item: "A silver christening cup, engraved \"Born {date}\"." },
  { id: "mother", phrase: "{Vhis} mother's death", item: "A black-edged memorial card: \"In loving memory. Fell asleep {date}.\"" },
  { id: "voyage", phrase: "{Vhis} homecoming from India", item: "A steamer ticket stub, kept in a little frame: \"Bombay to Southampton, landed {date}\"." },
];
const CARDS = [
  { id: "solicitor", phrase: "{Vhis} solicitor", item: "A calling card: \"Mr. H. Pettigrew, Solicitor, Lincoln's Inn. Telephone: Holborn {num}.\"" },
  { id: "doctor", phrase: "{Vhis} physician in London", item: "A calling card: \"Sir R. Ashby, Physician, Harley Street. Telephone: Langham {num}.\"" },
  { id: "bookmaker", phrase: "{Vhis} bookmaker", item: "A grubby calling card: \"Joe Dunne, Turf Accountant. Telephone: Epsom {num}. Discretion assured.\"" },
  { id: "tailor", phrase: "{Vhis} tailor", item: "A calling card: \"Wm. Gieves, Tailor, Savile Row. Telephone: Regent {num}.\"" },
  { id: "bank", phrase: "{Vhis} bank manager", item: "A calling card: \"Mr. A. Crabbe, Manager, County Bank. Telephone: Guildford {num}.\"" },
];
const LOCK_RULES = {
  date: ["The combination? {V} set every lock in the house to the date of {phrase}. Sentimental, for someone so hard.", "The combination? It's the date of {phrase}, day and month. {V} used it for everything."],
  phone: ["{V} could never remember numbers. It opens with the last three digits of the telephone number of {phrase}.", "That box? The last three figures of the telephone number of {phrase}. {V} told me once, in drink."],
};
// Lock objects that stand on a surface or the floor; and furniture parts that can carry a lock of their own.
const BOXES = [
  { id: "strongbox", label: "steel strongbox", icon: "strongbox" },
  { id: "tin", label: "padlocked tin", icon: "tin" },
  { id: "attache", label: "leather attaché case", icon: "attache" },
];
const BOX_PLACES = { "desk.top": "on the desk", "table.top": "on the table", "table.under": "under the table", "sidetable.top": "on the side table",
  "bed.under": "under the bed", "sideboard.top": "on the sideboard", "vanity.top": "on the dressing table", "fireplace.mantel": "on the mantelpiece",
  "wardrobe.shelf": "on the hat shelf of the wardrobe", "chest.lid": "in the blanket chest", "potting.tools": "among the tools on the potting bench" };
const LOCKABLE = ["desk.drawer", "chest.lid", "vanity.box", "wardrobe.drawer", "sideboard.cupboard", "clock.case", "piano.bench"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ---------- library: furniture ----------
// Rects are fractions of the furniture's box: [x, y, w, h]. Tags: s = surface, c = container, f = floor, w = wall (papers only).
// activity: what a suspect can claim to have done here; "yes" is the room's state when the claim is true, "no" when it is a lie.
// hidden: a spot that only appears once a hint about it is applied in the right room.
export const KINDS = {
  bookshelf: {
    label: "Bookshelf",
    parts: [
      { id: "top", label: "Upper shelves", r: [0.06, 0.04, 0.88, 0.44], tag: "c", flavor: ["Rows of leather-bound sermons and atlases. Nothing tucked between them.", "Travel diaries, pressed flowers in a few. Nothing else."] },
      { id: "low", label: "Lower shelves", r: [0.06, 0.52, 0.88, 0.44], tag: "c", flavor: ["Old magazines and a chess set with a missing knight.", "Bound volumes of Punch, in order."] },
    ],
    activity: { part: "top", act: "looking for a book to read", title: "Bookshelf", yes: "One book has been pulled out and pushed back crooked, leaving a clean gap in the dust. Someone was browsing here tonight.", no: "The books stand in tight rows under an even film of dust. Not one has been taken out in weeks." },
    hidden: { label: "Loose back panel", r: [0.56, 0.08, 0.32, 0.18], phrase: "behind a loose panel at the back of a bookshelf", found: "behind a loose panel at the back of the bookshelf" },
  },
  desk: {
    label: "Writing desk",
    parts: [
      { id: "top", label: "Desktop", r: [0.02, 0, 0.96, 0.22], tag: "s", flavor: ["A blotter, a pen tray and a brass lamp.", "A pile of unopened bills, squared neatly."] },
      { id: "drawer", label: "Drawer", r: [0.08, 0.26, 0.4, 0.22], tag: "c", flavor: ["Envelopes, stamps and a stick of sealing wax.", "Paper clips and a broken fountain pen."] },
    ],
    activity: { part: "top", act: "writing letters at the desk", title: "Inkwell", yes: "The ink in the well is fresh, and the blotter shows a few lines in mirror writing. Someone wrote letters here tonight.", no: "The inkwell has dried to a crust and the blotter is spotless. Nobody wrote anything here tonight." },
    hidden: { label: "False drawer bottom", r: [0.52, 0.26, 0.4, 0.22], phrase: "under the false bottom of a desk drawer", found: "under the false bottom of the desk drawer" },
  },
  fireplace: {
    label: "Fireplace",
    parts: [
      { id: "mantel", label: "Mantelpiece", r: [0, 0, 1, 0.16], tag: "s", flavor: ["A carriage clock and two china dogs.", "Invitations propped behind a pair of candles."] },
      { id: "grate", label: "Grate", r: [0.24, 0.4, 0.52, 0.56], tag: "f", flavor: ["Ash and the charred stub of a log.", "Grey ash. Nothing in it but ash."] },
    ],
    activity: { part: "grate", act: "sitting by the fire", title: "Fire grate", yes: "Embers still glow under the ash. A fire burned here this evening.", no: "The grate is cold and swept clean. No fire was lit here tonight." },
    hidden: { label: "Smoke shelf", r: [0.3, 0.2, 0.4, 0.16], phrase: "up a chimney, on the smoke shelf", found: "up the chimney, on the smoke shelf" },
  },
  armchair: {
    label: "Armchair",
    parts: [
      { id: "seat", label: "Between the cushions", r: [0.12, 0.38, 0.76, 0.28], tag: "c", flavor: ["A lost sixpence and some biscuit crumbs.", "A hairpin. No, a bent paper clip."] },
    ],
    activity: { part: "seat", act: "dozing in the armchair", title: "Armchair cushions", yes: "The cushions are flattened and still hold the shape of someone who sat here a long while tonight.", no: "The cushions are plump and perfectly smooth. Nobody has sat here for hours." },
    hidden: { label: "Slit in the lining", r: [0.1, 0.72, 0.8, 0.22], phrase: "in a slit in the lining underneath an armchair", found: "in a slit in the lining under the armchair" },
  },
  rug: {
    label: "Rug",
    parts: [{ id: "rug", label: "Rug", r: [0, 0, 1, 1], tag: "f", flavor: ["A worn Persian rug. Nothing under the corners.", "Under the rug: dust, and more dust."] }],
    hidden: { label: "Loose floorboard", r: [0.62, 0.1, 0.3, 0.8], phrase: "under a loose floorboard beneath a rug", found: "under a loose floorboard beneath the rug" },
  },
  window: {
    label: "Window",
    parts: [
      { id: "curtain", label: "Curtains", r: [0, 0.1, 0.22, 0.9], tag: "c", flavor: ["Heavy velvet. A moth flutters out.", "Dusty velvet with a faded pattern of pheasants."] },
      { id: "sill", label: "Windowsill", r: [0.22, 0.86, 0.56, 0.14], tag: "s", flavor: ["A dead fly and a view of the rain.", "A potted geranium, slightly dry."] },
    ],
    activity: { part: "sill", act: "watching the storm from the window", title: "Window pane", yes: "A clear patch has been wiped in the fogged glass at head height. Someone stood here looking out.", no: "The window is fogged over from inside, and nobody has wiped a spot clear. Nobody stood here looking out." },
    hidden: { label: "Hollow pelmet", r: [0, 0, 1, 0.1], phrase: "in the hollow pelmet box above some curtains", found: "in the hollow pelmet above the curtains" },
  },
  painting: {
    label: "Painting",
    parts: [{ id: "frame", label: "Painting", r: [0, 0, 1, 1], tag: "w", flavor: ["A gloomy ancestor in oils, looking down a long nose.", "A ship in a storm. The varnish has yellowed."] }],
    hidden: { label: "Wall safe behind the painting", r: [0.25, 0.25, 0.5, 0.5], phrase: "in a wall safe behind a painting", found: "in the wall safe behind the painting" },
  },
  piano: {
    label: "Piano",
    parts: [
      { id: "keys", label: "Keyboard", r: [0.06, 0.38, 0.88, 0.14], tag: "s", flavor: ["The middle C sticks a little.", "Ivory keys, yellowed with age."] },
      { id: "stand", label: "Music stand", r: [0.3, 0.06, 0.4, 0.28], tag: "s", flavor: ["Sheet music for a Strauss waltz.", "A book of hymns, open at the funeral march. Cheerful."] },
      { id: "bench", label: "Piano bench", r: [0.32, 0.72, 0.36, 0.28], tag: "c", flavor: ["Old song books and a tuning fork.", "Under the lid: a tin of rosin and a pencil."] },
    ],
    activity: { part: "keys", act: "playing the piano", title: "Piano keyboard", yes: "The keyboard lid is open and a waltz stands on the music stand, its pages turned. Someone played tonight.", no: "The keyboard lid is locked, and its key hangs on a hook under a film of dust. Nobody played tonight." },
    hidden: { label: "Inside the piano", r: [0.06, 0.06, 0.22, 0.28], phrase: "inside a piano, under the lid", found: "inside the piano, under the lid" },
  },
  clock: {
    label: "Grandfather clock",
    parts: [
      { id: "face", label: "Clock face", r: [0.1, 0.04, 0.8, 0.24], tag: "w", flavor: ["The clock is three minutes fast.", "The hands stand at the right time. It ticks loudly."] },
      { id: "case", label: "Pendulum case", r: [0.2, 0.34, 0.6, 0.4], tag: "c", flavor: ["The pendulum swings steadily. A spare key lies at the bottom.", "Only the brass pendulum, swinging."] },
    ],
    hidden: { label: "Behind the weights", r: [0.2, 0.78, 0.6, 0.18], phrase: "at the bottom of a grandfather clock, behind the weights", found: "at the bottom of the grandfather clock, behind the weights" },
  },
  wardrobe: {
    label: "Wardrobe",
    parts: [
      { id: "shelf", label: "Hat shelf", r: [0.06, 0.04, 0.88, 0.16], tag: "c", flavor: ["Two hatboxes and a top hat.", "A folded travelling rug."] },
      { id: "coat", label: "Overcoat", r: [0.08, 0.24, 0.4, 0.56], tag: "c", children: [
        { id: "left", label: "Left pocket", r: [0.1, 0.55, 0.35, 0.2], tag: "c", flavor: ["A bus ticket and a peppermint.", "A pair of gloves, rolled up."] },
        { id: "right", label: "Right pocket", r: [0.55, 0.55, 0.35, 0.2], tag: "c", flavor: ["Empty, apart from fluff.", "A cinema stub from last month."] },
      ] },
      { id: "drawer", label: "Bottom drawer", r: [0.06, 0.84, 0.88, 0.14], tag: "c", flavor: ["Folded linen, smelling of lavender.", "Spare shirt collars, starched."] },
    ],
    hidden: { label: "Hatbox with a false bottom", r: [0.55, 0.24, 0.38, 0.2], phrase: "in a hatbox with a false bottom", found: "in the hatbox with the false bottom" },
  },
  bed: {
    label: "Bed",
    parts: [
      { id: "pillow", label: "Under the pillow", r: [0.04, 0.12, 0.26, 0.3], tag: "c", flavor: ["A lavender sachet and a nightcap.", "A paperback detective novel. The last page is torn out."] },
      { id: "spread", label: "Bedspread", r: [0.32, 0.18, 0.64, 0.4], tag: "s", flavor: ["A heavy embroidered bedspread.", "Quilted silk, slightly faded."] },
      { id: "under", label: "Under the bed", r: [0.04, 0.7, 0.92, 0.3], tag: "f", flavor: ["A pair of slippers and a lot of dust.", "A chamber pot. Empty, thankfully."] },
    ],
    activity: { part: "spread", act: "lying down with a headache", title: "Bedspread", yes: "The bedspread is creased and the pillow dented. Someone lay here this evening.", no: "The bedspread is crisp and tightly tucked in. Nobody has lain here tonight." },
    hidden: { label: "Slit in the mattress", r: [0.32, 0.46, 0.4, 0.14], phrase: "sewn into a slit in a mattress", found: "sewn into a slit in the mattress" },
  },
  vanity: {
    label: "Dressing table",
    parts: [
      { id: "top", label: "Table top", r: [0, 0.5, 1, 0.12], tag: "s", flavor: ["Powder, brushes and a bottle of scent.", "A silver hand mirror and a comb."] },
      { id: "box", label: "Jewellery box", r: [0.3, 0.42, 0.4, 0.1], tag: "c", flavor: ["Costume jewellery. Paste, all of it.", "Empty. The velvet still holds the shape of a necklace."] },
      { id: "drawer", label: "Drawer", r: [0.1, 0.66, 0.8, 0.14], tag: "c", flavor: ["Handkerchiefs and hairnets.", "Letters tied with ribbon. Old ones, from a seaside holiday."] },
    ],
    hidden: { label: "Behind the mirror backing", r: [0.2, 0.04, 0.6, 0.34], phrase: "tucked behind the backing of a mirror", found: "behind the backing of the mirror" },
  },
  sideboard: {
    label: "Sideboard",
    parts: [
      { id: "top", label: "Top", r: [0, 0, 1, 0.3], tag: "s", flavor: ["Decanters of sherry and port.", "A silver tray and a fruit bowl."] },
      { id: "cupboard", label: "Cupboard", r: [0.06, 0.38, 0.42, 0.56], tag: "c", flavor: ["The good china, stacked high.", "Table linen and napkin rings."] },
    ],
    activity: { part: "top", act: "pouring myself a nightcap", title: "Decanters", yes: "The port is down by a glass, and a sticky glass stands beside the decanter. Someone poured a drink here.", no: "The decanters are full to the stopper and every glass is polished dry. Nobody poured a drink here." },
    hidden: { label: "Behind the cupboard's back wall", r: [0.52, 0.38, 0.42, 0.56], phrase: "behind the back wall of a sideboard cupboard", found: "behind the back wall of the sideboard cupboard" },
  },
  table: {
    label: "Table",
    parts: [
      { id: "top", label: "Table top", r: [0, 0, 1, 0.2], tag: "s", flavor: ["A bowl of wax fruit and a lace runner.", "Breadcrumbs and a folded newspaper."] },
      { id: "under", label: "Under the table", r: [0.06, 0.3, 0.88, 0.7], tag: "f", flavor: ["A dropped napkin.", "Nothing but table legs and a cat's toy."] },
    ],
    activity: { part: "top", act: "playing patience at the table", title: "Playing cards", yes: "A game of patience is laid out on the table, half finished.", no: "The table is bare and the only pack of cards in the room is still sealed in its wrapper." },
    hidden: { label: "Drawer under the tabletop", r: [0.3, 0.2, 0.4, 0.1], phrase: "in a hidden drawer under a tabletop", found: "in the hidden drawer under the tabletop" },
  },
  stove: {
    label: "Kitchen range",
    parts: [
      { id: "hob", label: "Hob", r: [0, 0, 1, 0.18], tag: "s", flavor: ["A kettle and a heavy iron pan.", "A stockpot, simmering bones for tomorrow."] },
      { id: "oven", label: "Oven", r: [0.08, 0.3, 0.5, 0.42], tag: "c", flavor: ["Empty and still faintly warm.", "A tray of burnt scones, forgotten."] },
    ],
    activity: { part: "hob", act: "making a cup of cocoa", title: "Milk pan", yes: "The milk pan sits on the hob with a skin of cocoa in it, still faintly warm.", no: "The milk pan hangs clean and dry on its hook, and the cocoa tin is still sealed." },
    hidden: { label: "Ash pit", r: [0.62, 0.76, 0.32, 0.2], phrase: "in the ash pit under a kitchen range", found: "in the ash pit under the range" },
  },
  pantry: {
    label: "Pantry shelves",
    parts: [
      { id: "jars", label: "Jars", r: [0.06, 0.04, 0.88, 0.42], tag: "c", flavor: ["Pickled onions, jam and a jar of buttons.", "Preserved plums, labelled in a careful hand."] },
      { id: "bin", label: "Flour bin", r: [0.1, 0.62, 0.5, 0.34], tag: "c", flavor: ["Flour. Just flour.", "Flour, with a scoop buried in it."] },
    ],
    hidden: { label: "Bottom of the flour bin", r: [0.62, 0.62, 0.32, 0.34], phrase: "buried at the bottom of a flour bin", found: "buried at the bottom of the flour bin" },
  },
  winerack: {
    label: "Wine rack",
    parts: [{ id: "rack", label: "Bottles", r: [0.04, 0.04, 0.92, 0.7], tag: "c", flavor: ["Claret, mostly, and a few dusty ports.", "Hock and champagne, laid down years ago."] }],
    activity: { part: "rack", act: "choosing a wine for tomorrow's lunch", title: "Wine bottles", yes: "Fresh fingermarks in the dust on several bottles, and one bottle pulled half out. Someone was choosing wine here.", no: "Dust lies thick and unbroken on every bottle. Nobody has touched these racks in weeks." },
    hidden: { label: "Gap behind the rack", r: [0.04, 0.78, 0.92, 0.18], phrase: "in a gap behind a wine rack", found: "in the gap behind the wine rack" },
  },
  barrel: {
    label: "Barrel",
    parts: [{ id: "barrel", label: "Barrel", r: [0, 0.1, 1, 0.9], tag: "c", flavor: ["Empty. Smells of old sherry.", "Half full of sand for the fire buckets."] }],
    hidden: { label: "Under the loose lid", r: [0.1, 0, 0.8, 0.14], phrase: "inside an empty barrel, under a loose lid", found: "inside the barrel, under the loose lid" },
  },
  billiard: {
    label: "Billiard table",
    parts: [
      { id: "cloth", label: "Table", r: [0, 0, 1, 0.42], tag: "s", flavor: ["Green baize, brushed smooth.", "A small burn mark near one corner."] },
      { id: "pockets", label: "Pockets", r: [0, 0.42, 1, 0.16], tag: "c", flavor: ["A red ball and a lot of chalk dust.", "Empty leather pockets."] },
    ],
    activity: { part: "cloth", act: "practising at the billiard table", title: "Billiard balls", yes: "The balls are scattered across the baize and one cue has fresh chalk on its tip. Someone was practising tonight.", no: "The balls sit racked in their triangle and the chalk is untouched. No game was played tonight." },
    hidden: { label: "Under the slate", r: [0.3, 0.62, 0.4, 0.2], phrase: "wedged under the slate of a billiard table", found: "wedged under the slate of the billiard table" },
  },
  cuerack: {
    label: "Cue rack",
    parts: [{ id: "rack", label: "Cue rack", r: [0, 0, 1, 1], tag: "s", flavor: ["Four cues, one with a chipped tip.", "Cues and a scoreboard stuck at 47 to 12."] }],
  },
  potting: {
    label: "Potting bench",
    parts: [
      { id: "pots", label: "Flowerpots", r: [0.04, 0, 0.6, 0.26], tag: "c", flavor: ["Seedlings in neat rows, labelled in pencil.", "Cuttings of geranium, rooting in jars."] },
      { id: "tools", label: "Tools", r: [0.66, 0, 0.3, 0.26], tag: "s", flavor: ["A trowel, twine and a pair of gloves.", "Secateurs and a watering can."] },
    ],
    activity: { part: "pots", act: "repotting the orchids", title: "Orchid pots", yes: "Damp, fresh soil in two orchid pots and a muddy trowel on the bench. Someone repotted here tonight.", no: "The soil in every pot is dry and crusted, and the trowel is clean. Nobody repotted anything tonight." },
    hidden: { label: "Under the sack of soil", r: [0.1, 0.62, 0.8, 0.34], phrase: "under a sack of potting soil", found: "under the sack of potting soil" },
  },
  palm: {
    label: "Potted palm",
    parts: [{ id: "pot", label: "Palm pot", r: [0.18, 0.66, 0.64, 0.34], tag: "c", flavor: ["Soil and a few cigarette ends.", "Moss and a lost ping-pong ball."] }],
    hidden: { label: "Deep in the soil", r: [0.3, 0.7, 0.4, 0.14], phrase: "deep in the soil of a large potted palm", found: "deep in the soil of the potted palm" },
  },
  birdcage: {
    label: "Birdcage",
    parts: [{ id: "cage", label: "Birdcage", r: [0.04, 0.02, 0.92, 0.34], tag: "c", flavor: ["A canary, asleep with its head under a wing.", "A canary on its swing, watching you with one bright eye."] }],
    activity: { part: "cage", act: "feeding the canary", title: "Seed cup", yes: "The seed cup is full of fresh seed and the water dish is topped up. Someone fed the bird tonight.", no: "The seed cup holds nothing but empty husks and the water dish is nearly dry. Nobody has fed the bird since morning." },
    hidden: { label: "Under the sand tray", r: [0.04, 0.36, 0.92, 0.08], phrase: "under the sand tray of a birdcage", found: "under the sand tray of the birdcage" },
  },
  sofa: {
    label: "Sofa",
    parts: [{ id: "cushions", label: "Cushions", r: [0.1, 0.3, 0.8, 0.36], tag: "c", flavor: ["A lost earring back. Gold-plated, nothing more.", "Crumbs and a theatre programme."] }],
  },
  gramophone: {
    label: "Gramophone",
    parts: [{ id: "record", label: "Gramophone", r: [0, 0, 1, 1], tag: "s", flavor: ["A record of dance music, scratched.", "The horn is dented. A stack of records beside it."] }],
    activity: { part: "record", act: "listening to records", title: "Gramophone", yes: "A record lies on the turntable and the needle arm is out of its rest. Someone was listening to records.", no: "The needle arm is clamped in its rest and every record is in its sleeve, filed away." },
  },
  chest: {
    label: "Blanket chest",
    parts: [{ id: "lid", label: "Chest", r: [0, 0, 1, 1], tag: "c", flavor: ["Blankets and mothballs.", "Old curtains, folded."] }],
    hidden: { label: "False bottom of the chest", r: [0.1, 0.62, 0.8, 0.3], phrase: "under the false bottom of a blanket chest", found: "under the false bottom of the blanket chest" },
  },
  sidetable: {
    label: "Side table",
    parts: [{ id: "top", label: "Side table", r: [0, 0, 1, 0.5], tag: "s", flavor: ["A lamp and an empty glass.", "A vase of wilting lilies."] }],
  },
  body: {
    label: "The victim",
    parts: [
      { id: "victim", label: "The victim", r: [0, 0, 0.7, 0.66], tag: "-" },
      { id: "pockets", label: "Pockets", r: [0.7, 0, 0.3, 1], tag: "-", flavor: ["A cigar case, a key ring and a few coins."] },
      { id: "under", label: "Under the victim", r: [0, 0.66, 0.7, 0.34], tag: "-", flavor: ["Nothing under the body but the floor."] },
    ],
  },
};

// Rooms: furniture boxes in a 400 x 260 scene (wall down to y = 175). body: free floor for the victim.
// senses: what a witness glimpses through the door; k: the furniture kinds that give it away to the field agent.
export const ROOMS = [
  { id: "library", name: "Library", theme: "library", body: [24, 200, 120, 46], senses: [{ t: "a great stone fireplace takes up one wall", k: ["fireplace"] }, { t: "it smells of old leather bindings", k: ["bookshelf"] }],
    furniture: [
    ["bookshelf", 10, 28, 92, 152], ["painting", 170, 18, 60, 52], ["fireplace", 148, 84, 104, 100], ["armchair", 262, 124, 66, 66], ["sidetable", 340, 146, 44, 44], ["rug", 166, 202, 156, 38]] },
  { id: "study", name: "Study", theme: "study", body: [24, 200, 124, 46], senses: [{ t: "a writing desk stands under a lamp", k: ["desk"] }, { t: "it smells of old leather bindings", k: ["bookshelf"] }],
    furniture: [
    ["bookshelf", 10, 28, 92, 152], ["painting", 160, 26, 84, 58], ["desk", 140, 116, 128, 72], ["window", 296, 22, 86, 108], ["armchair", 300, 134, 66, 62]] },
  { id: "music", name: "Music room", theme: "music", body: [150, 204, 126, 44], senses: [{ t: "a piano gleams in the lamplight", k: ["piano"] }, { t: "the brass horn of a gramophone shines", k: ["gramophone"] }],
    furniture: [
    ["piano", 14, 92, 150, 96], ["painting", 192, 24, 74, 56], ["gramophone", 196, 104, 60, 80], ["window", 290, 22, 90, 104], ["sofa", 270, 136, 120, 58]] },
  { id: "conservatory", name: "Conservatory", theme: "conservatory", body: [146, 206, 130, 42], senses: [{ t: "it smells of wet earth and orchids", k: ["potting", "palm"] }, { t: "palm fronds brush the glass", k: ["palm"] }, { t: "a canary chirps somewhere", k: ["birdcage"] }],
    furniture: [
    ["potting", 18, 112, 138, 72], ["palm", 176, 52, 74, 136], ["armchair", 258, 132, 66, 62], ["birdcage", 332, 34, 58, 150]] },
  { id: "billiard", name: "Billiard room", theme: "billiard", body: [16, 206, 110, 42], senses: [{ t: "a lamp hangs low over green baize", k: ["billiard"] }, { t: "it smells of cue chalk and cigar smoke", k: ["cuerack", "billiard"] }],
    furniture: [
    ["cuerack", 18, 36, 42, 128], ["painting", 150, 26, 92, 60], ["billiard", 112, 130, 186, 74], ["sideboard", 314, 104, 76, 80]] },
  { id: "dining", name: "Dining room", theme: "dining", body: [270, 204, 118, 44], senses: [{ t: "a grandfather clock ticks in the corner", k: ["clock"] }, { t: "a long table is laid for breakfast", k: ["table"] }],
    furniture: [
    ["clock", 18, 36, 44, 150], ["painting", 128, 22, 92, 60], ["table", 76, 138, 196, 62], ["sideboard", 306, 102, 82, 82], ["window", 236, 22, 60, 76]] },
  { id: "kitchen", name: "Kitchen", theme: "kitchen", body: [36, 204, 140, 44], senses: [{ t: "it smells of bread and coal smoke", k: ["stove"] }, { t: "jars of preserves line the shelves", k: ["pantry"] }],
    furniture: [
    ["stove", 16, 96, 112, 90], ["pantry", 148, 28, 92, 154], ["window", 270, 26, 90, 78], ["table", 254, 136, 132, 60]] },
  { id: "bedroom", name: "Master bedroom", theme: "bedroom", body: [12, 202, 134, 44], senses: [{ t: "it smells of lavender and face powder", k: ["vanity"] }, { t: "a big bed is turned down for the night", k: ["bed"] }],
    furniture: [
    ["wardrobe", 16, 26, 100, 160], ["window", 186, 22, 90, 78], ["bed", 148, 116, 172, 86], ["vanity", 334, 92, 56, 92], ["rug", 166, 210, 160, 34]] },
  { id: "cellar", name: "Wine cellar", theme: "cellar", body: [148, 204, 142, 44], senses: [{ t: "stone steps lead down into the cold", k: ["winerack", "barrel"] }, { t: "it smells of old wine and damp", k: ["winerack"] }],
    furniture: [
    ["winerack", 14, 32, 132, 150], ["barrel", 164, 116, 68, 68], ["barrel", 240, 116, 68, 68], ["chest", 318, 134, 72, 52]] },
];

// ---------- building the case ----------
// The generator works backwards from the answer: it picks the murderer, weapon and motive, then a proof that rules
// out each innocent suspect in a different way, then builds the house, the clues and the dialogue around that
// proof, and finally adds red herrings. Every piece of evidence that proves something is recorded as a deduction:
// the tokens a player must hold (clues entered, questions asked, observations made) and the fact they establish.
// The solver (below) checks that the facts single out one answer only when both detectives work together.
const fmtTime = (mins) => {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

function layoutRoom(room, victim) {
  const furniture = room.furniture.map(([kind, x, y, w, h], i) => ({ kind, x, y, w, h, id: `${room.id}.${i}` }));
  if (victim) {
    const [x, y, w, h] = room.body;
    furniture.push({ kind: "body", x, y, w, h, id: `${room.id}.body`, look: victim.look });
  }
  const abs = (box, r) => ({ x: box.x + r[0] * box.w, y: box.y + r[1] * box.h, w: r[2] * box.w, h: r[3] * box.h });
  const mk = (box, def, parentId) => {
    const node = { id: `${parentId}.${def.id}`, label: def.label, tag: def.tag, def, ...abs(box, def.r) };
    if (def.children) node.children = def.children.map((c) => mk(node, c, node.id));
    return node;
  };
  for (const f of furniture) {
    const k = KINDS[f.kind];
    f.label = k.label;
    f.children = k.parts.map((p) => mk(f, p, f.id));
    if (k.hidden) f.hiddenDef = { ...k.hidden, ...abs(f, k.hidden.r) };
  }
  return { id: room.id, name: room.name, theme: room.theme, body: room.body, senses: room.senses, furniture };
}

export function leaves(node) {
  if (!node.children || !node.children.length) return [node];
  return node.children.flatMap(leaves);
}
export function walk(room, fn) {
  const go = (n, depth) => { fn(n, depth); (n.children || []).forEach((c) => go(c, depth + 1)); };
  room.furniture.forEach((f) => go(f, 0));
}

const PRO = { m: { he: "he", him: "him", his: "his", self: "himself" }, f: { he: "she", him: "her", his: "her", self: "herself" } };
const HAIR_WORD = { dark: "a single dark hair: black or brown, it's hard to say in this light", pale: "a single pale hair: fair, grey or white, it's hard to say in this light", red: "a single red hair" };

function build(code, attempt) {
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

  // Three suspects with three different initials. One is the murderer (M). Each of the others independently lies
  // about where they were to hide a secret (L) or tells the truth (H).
  const chosen = [];
  for (const s of R.shuffle(SUSPECTS)) if (chosen.length < 3 && !chosen.some((c) => c.surname[0] === s.surname[0])) chosen.push(s);
  const mi = R.int(3);
  const suspects = chosen.map((lib, i) => ({ id: lib.id, lib, role: i === mi ? "M" : side === "lovers" || R.int(2) ? "L" : "H", name: lib.name, short: lib.short, title: lib.title }));
  const M = suspects[mi];
  const others = (s) => suspects.filter((o) => o !== s);
  const innocents = others(M);
  const there = (s) => s.role === "H" || (s === M && trueAlibi); // really was where they say

  // Weapons: the real one, and a decoy of the same kind that somebody moved for an innocent reason.
  const ofCause = R.shuffle(WEAPONS.filter((w) => w.cause === cause));
  const weapon = ofCause[0], decoy = ofCause[1];

  // Motives: two grudges each, all six different. The first is live tonight; the second was settled before.
  const mot = R.shuffle(MOTIVES);
  suspects.forEach((s, i) => { s.motive = mot[2 * i]; s.settled = mot[2 * i + 1]; s.temper = s.lib.temper; });

  // ---------- rooms and where everybody was ----------
  // The scene plus two more rooms off the hall. The murderer hides the weapon in a room where no truthful person
  // sat; truthful people sat together in the other one. When the body was moved, the murder room is the
  // murderer's own alibi room and the weapon went into the scene with the body.
  const rooms = R.shuffle(ROOMS).slice(0, 3).map((r, i) => layoutRoom(r, i === 0 ? victim : null));
  const [S, A, B] = rooms;
  const roomOf = (x) => rooms.find((r) => r.furniture.includes(x));
  const roomOfLeaf = (l) => rooms.find((r) => l.id.startsWith(`${r.id}.`));
  const acts = (r) => r.furniture.filter((x) => KINDS[x.kind].activity);
  const usedActs = new Set();
  const takeIn = (rs, orElse) => {
    const o = R.shuffle(rs.flatMap(acts)).filter((x) => !usedActs.has(x));
    if (!o.length) { if (orElse) return orElse(); throw new Error("no activity left"); }
    usedActs.add(o[0]);
    return o[0];
  };
  const hideRoom = core === "moved" ? S : R.pick([A, B]);
  const calm = core === "moved" ? null : hideRoom === A ? B : A; // where truthful people sat
  const mF = core === "moved" ? takeIn([A, B]) : null;
  const MR = core === "moved" ? roomOf(mF) : S;
  const quiet = core === "moved" ? (MR === A ? B : A) : calm;
  for (const s of suspects) {
    const fu = s === M ? mF || takeIn(trueAlibi ? [A, B].filter((r) => r !== hideRoom || core === "staged") : [A, B])
      : s.role === "H" ? takeIn([quiet], () => { s.role = "L"; return takeIn([A, B]); }) : takeIn([A, B]);
    s.claim = { f: fu, room: roomOf(fu), act: KINDS[fu.kind].activity };
  }

  // Times: the murder on a quarter hour, so a clock chimes. The watch shows it, unless the murderer moved the hands.
  const T = 21 * 60 + 45 + 15 * R.int(5);
  const time = fmtTime(T);
  const watchAt = core === "staged" ? T + 45 + 5 * R.int(5) : T + R.int(4);
  const watch = fmtTime(watchAt);
  const servedAt = T - 45 - 5 * R.int(4);
  const served = fmtTime(servedAt);
  const keyAt = core === "poison" ? servedAt : T; // the moment that matters for an alibi
  for (const s of suspects) {
    s.from = s === M && core === "staged" ? T + 15 + 5 * R.int(3)
      : s === M && core === "poison" ? servedAt + 10 + 5 * R.int(3)
      : core === "poison" ? servedAt - 10 - 5 * R.int(4) : T - 30 - 5 * R.int(5);
    s.until = watchAt + 20 + 5 * R.int(4);
  }

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

  // ---------- secrets and traces on people ----------
  const lovers = side === "lovers" ? innocents : [];
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
  const corroborator = new Map(); // liar -> who saw them
  for (const s of innocents) if (route.get(s) === "C" && !lovers.includes(s)) corroborator.set(s, R.int(3) ? innocents.find((o) => o !== s) : M);

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
    addClue(`alibi_${s.id}`, { title: s.claim.act.title, icon: "magnifier", text: there(s) ? s.claim.act.yes : s.claim.act.no });
    for (const m of [s.motive, s.settled]) addClue(`motive_${s.id}_${m.id}`, { title: "Private papers", icon: m.icon, text: f(m.doc, { who: nm(s), surname: s.lib.surname }) });
  }
  const slow = core === "poison" ? " The label warns that it works slowly: death follows within the hour." : "";
  addClue("weapon", { title: cap(weapon.name), icon: weapon.id, text: `${cap(an(weapon.name))} with ${weapon.mark}, hidden ${spotWeapon.hiddenDef.found}: ${weapon.trace}.${slow}${traceVal.hair ? ` Caught on it is ${HAIR_WORD[traceVal.hair]}.` : ""}` });
  const decoySpot = R.int(5) < 2 && spareSpots.length ? spareSpots.pop() : null;
  addClue("decoy", { title: cap(decoy.name), icon: decoy.id, text: `${cap(an(decoy.name))} with ${decoy.mark}${decoySpot ? `, tucked away ${decoySpot.hiddenDef.found}` : ""}. It has been moved today: a clean ring in the dust shows where it usually stands.` });
  if (core === "moved") addClue("stain", { title: "Scrubbed stain", icon: "magnifier", text: "A patch scrubbed almost white, still damp and smelling of carbolic soap. A rusty rim remains in the cracks. Somebody cleaned up here tonight." });
  const shoe = traceVal.shoes && SHOES.find((x) => x.id === traceVal.shoes);
  const smoke = traceVal.smoke && SMOKES.find((x) => x.id === traceVal.smoke);
  if (shoe) addClue("print", { title: "Footprint", icon: "magnifier", text: `In a smear of spilt ${R.pick(["port", "ash", "soil from an upset plant"])} right beside the body: ${shoe.print}. It is fresh.` });
  if (smoke) addClue("ash", { title: "Ash", icon: "cigarette", text: `On the floor of the ${rn(S)}, where nobody has swept since the murder: ${smoke.ash}.` });

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
    const item = library.pop(), owner = owners[finds.length % 3], id = `find${finds.length}`;
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

  // ---------- hints (the interrogator learns them) ----------
  const hints = {};
  hints.hWeapon = { id: "hWeapon", room: roomOf(spotWeapon).id, spot: spotWeapon.id, clue: "weapon", text: `${nm(W)}: "${sighting}"` };
  for (const lk of Object.values(locks)) hints[lk.hint] = { id: lk.hint, lock: lk.id, text: f(R.pick(LOCK_RULES[lk.type]), { phrase: lk.phrase }) };
  const HIDE_SAY = [
    "I saw {V} go into {room} this afternoon, straight after words with {owner}, and put something away {phrase}.",
    "{V} had {owner} in for a talk this afternoon. Afterwards I saw {Vhim} go into {room} and tuck a paper away {phrase}.",
    "If you want {V}'s secrets, try {room}. I saw {Vhim} hide something there this morning, {phrase}. {owner} had just left {Vhim}, in a temper.",
  ];
  const HIDE_ANON = ["Somebody was in {room} this morning, hiding something {phrase}. I saw a hand, not a face."];
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

  // ---------- dialogue ----------
  // requires: tokens the interrogator must hold. clue:x = clue code entered, q:sid:qid = question asked, ev:x = event,
  // o:sid:dim = something seen when looking closely. Lines depend on facts, never on the part a suspect plays.
  const say = (s, text) => (R.int(3) === 0 ? `${s.lib.voice}${text}` : text);
  const evening = R.shuffle(EVENING), noticed = R.shuffle(NOTICED);
  const chime = `I heard a cry from the direction of the ${rn(MR)}, just as the hall clock chimed. ${time}, it must have been.`;
  const relation = {};
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) relation[`${suspects[i].id}|${suspects[j].id}`] = R.pick(RELATIONS);
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
    else if (s.secret.lover) confront[`alibi_${s.id}`] = { requires: [asked], text: `Fine. I wasn't in the ${rn(room)}. I was ${tryst}, with ${nm(s.secret.lover)}, from before ${fmtTime(keyAt)} until long after. We have kept it from everyone for a year, and I would rather it stayed that way.${seenToo}`, mood: press, gives: s === W ? ["hWeapon"] : [], events: [broken] };
    else confront[`alibi_${s.id}`] = { requires: [asked], text: `Fine. I wasn't in the ${rn(room)}. I was ${f(s.secret.act)}. Make of that what you like.${seenToo}`, mood: press, gives: s === W ? ["hWeapon"] : [], events: [broken] };
    for (const o of others(s)) {
      const z = corroborator.get(o);
      confront[`alibi_${o.id}`] = z === s
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
      fallback: say(s, R.pick(["I don't see what that has to do with me.", "Should that mean something to me?", "I've never seen it before."])) };
  });

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

function codeFor(caseCode, id, salt) {
  let n = hash(`${caseCode}:${id}:${salt}`), s = "";
  for (let i = 0; i < 3; i++) { s += ALPHA[n % ALPHA.length]; n = Math.floor(n / ALPHA.length); }
  return s;
}

function briefing(victim, manor, S, suspects, rooms) {
  return `A storm rages over ${manor}. At eleven, ${victim.name} was found dead in the ${rn(S)}. The doors were locked and the telephone lines are down; nobody has left. ` +
    `Three people are still in the house: ${suspects.map((s) => `${s.name} (${s.title.toLowerCase()})`).join(", ")}. ` +
    `The police can't get through before morning. Until then, the case is yours.`;
}

// ---------- solver ----------
// Two layers. Availability: nodes { who: "F" | "I", requires, gives } say what each detective can reach; tokens
// cross between them only by exchange (clue:* to the interrogator, hint:* to the field agent), and each exchange is
// a round. Deduction: at every round the detectives pool what they know (they talk), the case's deductions turn
// that into facts, and the facts filter every possible accusation. A case is fair when exactly one accusation
// survives at the end, and more than one suspect survives before the first exchange.
export function nodesOf(k) {
  const nodes = [];
  for (const r of k.rooms) for (const l of r.furniture.flatMap(leaves)) {
    const c = k.content[l.id];
    if (c && c.lock) {
      const lk = k.locks[c.lock];
      nodes.push({ who: "F", requires: [], gives: [`clue:${lk.lockClue}`], at: l.id });
      nodes.push({ who: "F", requires: [`hint:${lk.hint}`], gives: [`clue:${lk.clue}`], at: l.id });
    } else if (c && c.clue) nodes.push({ who: "F", requires: [], gives: [`clue:${c.clue}`], at: l.id });
  }
  for (const h of Object.values(k.hiddenSpots)) nodes.push({ who: "F", requires: [`hint:${h.hint}`], gives: [`clue:${h.clue}`], at: h.id });
  for (const s of k.suspects) {
    const d = k.dialog[s.id];
    for (const q of d.questions) nodes.push({ who: "I", requires: q.requires, gives: [...q.gives.map((g) => `hint:${g}`), ...q.events] });
    for (const [cid, c] of Object.entries(d.confront)) nodes.push({ who: "I", requires: [`clue:${cid}`, ...c.requires], gives: [...c.gives.map((g) => `hint:${g}`), ...c.events] });
    for (const o of d.observations) nodes.push({ who: "I", requires: o.requires, gives: [...o.gives.map((g) => `hint:${g}`), ...o.events] });
  }
  return nodes;
}

// Every accusation the players could make: suspect × weapon × motive.
export function hypotheses(k) {
  return k.suspects.flatMap((s) => WEAPONS.flatMap((w) => MOTIVES.map((m) => ({ s: s.id, w: w.id, m: m.id }))));
}

// The facts that follow from a set of tokens. Deductions may give tokens that other deductions need.
export function factsFrom(k, tokens) {
  const known = new Set(tokens);
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of k.deductions) if (d.gives && !known.has(d.gives) && d.needs.every((t) => known.has(t))) { known.add(d.gives); grew = true; }
  }
  return k.deductions.filter((d) => d.fact && d.needs.every((t) => known.has(t)));
}

// Facts: who (the murderer is one of allow), weapon (one of allow), mot+ (s had grudge m), mot- (s's grudge m was
// settled). A fact told by a suspect (by) holds unless that suspect is the murderer. Everybody had exactly two
// grudges (the rules say so), so once both of a suspect's papers are known, their motive is one of the two.
export const GRUDGES = 2;
export function survivors(k, tokens, all = hypotheses(k)) {
  const facts = factsFrom(k, tokens);
  const docs = {};
  for (const d of facts) if (d.fact.t === "mot+") (docs[d.fact.s] ||= new Set()).add(d.fact.m);
  return all.filter((h) => (!docs[h.s] || docs[h.s].size < GRUDGES || docs[h.s].has(h.m)) && facts.every(({ fact }) => {
    if (fact.by && fact.by === h.s) return true;
    if (fact.t === "who") return fact.allow.includes(h.s);
    if (fact.t === "weapon") return fact.allow.includes(h.w);
    if (fact.t === "mot-") return !(fact.s === h.s && fact.m === h.m);
    return true;
  }));
}

export function solve(k, exchange = true) {
  const nodes = nodesOf(k);
  const all = hypotheses(k);
  const know = { F: new Set(), I: new Set() };
  const history = [];
  for (let round = 0; ; round++) {
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of nodes) {
        if (!n.requires.every((t) => know[n.who].has(t))) continue;
        for (const g of n.gives) if (!know[n.who].has(g)) { know[n.who].add(g); grew = true; }
      }
    }
    const pooled = new Set([...know.F, ...know.I]);
    const left = survivors(k, pooled, all);
    history.push({ round, left: left.length, who: new Set(left.map((h) => h.s)).size });
    if (left.length === 1 && k.goal.every((g) => pooled.has(g))) return { solved: true, rounds: round, history, answer: left[0], pooled };
    if (!exchange) return { solved: false, rounds: round, history, pooled };
    let moved = false;
    for (const t of know.F) if (t.startsWith("clue:") && !know.I.has(t)) { know.I.add(t); moved = true; }
    for (const t of know.I) if (t.startsWith("hint:") && !know.F.has(t)) { know.F.add(t); moved = true; }
    if (!moved) return { solved: false, rounds: round, history, pooled };
  }
}

export const MAX_ROUNDS = 4;
export function validate(k) {
  const problems = [];
  const together = solve(k, true);
  if (!together.solved) problems.push("not solvable");
  else {
    const a = together.answer, sol = k.solution;
    if (a.s !== sol.suspect || a.w !== sol.weapon || a.m !== sol.motive) problems.push("solves to the wrong answer");
    if (together.rounds < 2) problems.push(`only ${together.rounds} exchange rounds`);
    if (together.rounds > MAX_ROUNDS) problems.push(`${together.rounds} exchange rounds`);
  }
  if (solve(k, false).solved) problems.push("solvable without exchange");
  if (together.history[0].who < 2) problems.push("the murderer is known before any exchange");
  for (const d of k.deductions) if (d.fact && d.fact.t === "who" && (d.fact.allow.length < 2 || !d.fact.allow.includes(k.solution.suspect))) problems.push(`bad fact: ${d.why}`);
  const codes = [...Object.values(k.clues), ...Object.values(k.hints)].map((x) => x.code);
  if (new Set(codes).size !== codes.length) problems.push("duplicate codes");
  const given = new Set(nodesOf(k).flatMap((n) => n.gives));
  for (const id of Object.keys(k.hints)) if (!given.has(`hint:${id}`)) problems.push(`hint ${id} never given`);
  for (const id of Object.keys(k.clues)) if (!given.has(`clue:${id}`)) problems.push(`clue ${id} not placed`);
  return problems;
}

const cache = new Map();
export function makeCase(code) {
  if (cache.has(code)) return cache.get(code);
  for (let attempt = 0; attempt < 50; attempt++) {
    let k;
    try { k = build(code, attempt); } catch { continue; }
    if (!validate(k).length) { cache.set(code, k); return k; }
  }
  throw new Error(`No solvable case for ${code}`);
}

// Looks up a code the player typed. Returns { kind: "clue" | "hint", item } or null.
export function lookup(k, input) {
  const c = normCode(input);
  for (const item of Object.values(k.clues)) if (item.code === c) return { kind: "clue", item };
  for (const item of Object.values(k.hints)) if (item.code === c) return { kind: "hint", item };
  return null;
}

export function checkAccusation(k, a) {
  const parts = { suspect: a.suspect === k.solution.suspect, weapon: a.weapon === k.solution.weapon, motive: a.motive === k.solution.motive };
  return { parts, correct: Object.values(parts).filter(Boolean).length };
}

// One generation attempt, without validation. For tests and the metrics script.
export const buildAttempt = build;
