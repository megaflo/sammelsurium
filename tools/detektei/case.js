// Case library, generator and solver. Pure functions: the same case number gives the same case on every
// device running the same VERSION. Both devices build the whole case; each role only shows its own side.

export const VERSION = 4;
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
  { name: "Lord Ambrose Thorne", short: "Lord Thorne", look: { hair: "bald", hairColor: "#9a9a96", suit: "#2b2a33", shirt: "#f4efe2" } },
  { name: "Lady Cordelia Blackwood", short: "Lady Blackwood", look: { hair: "long", hairColor: "#2a1f1d", suit: "#5a2a4a", shirt: "#e9dcc8", dress: true } },
  { name: "Sir Jasper Wren", short: "Sir Jasper", look: { hair: "short", hairColor: "#6b4a2b", suit: "#3a3f4a", shirt: "#f4efe2" } },
  { name: "Lady Honoria Vale", short: "Lady Vale", look: { hair: "long", hairColor: "#b9b6b0", suit: "#2f5a4a", shirt: "#e9dcc8", dress: true } },
  { name: "Mr. Silas Grimshaw", short: "Mr. Grimshaw", look: { hair: "short", hairColor: "#1f1b1b", suit: "#4a3a2a", shirt: "#f4efe2" } },
  { name: "Mrs. Edith Marlowe", short: "Mrs. Marlowe", look: { hair: "long", hairColor: "#7a4a2a", suit: "#2f3f6a", shirt: "#e9dcc8", dress: true } },
];
export const MANORS = ["Thornbury Hall", "Ravenscourt", "Hollowmere Manor", "Blackwood House", "Wrenfield Park", "Ashgrove Manor"];

// tone: hair colour word used by traces. Three suspects in a case always have three different tones.
// token: the small personal item the murderer loses at the scene; look.token says where it is drawn.
export const SUSPECTS = [
  { id: "hale", name: "Colonel Archibald Hale", short: "Colonel Hale", surname: "Hale", title: "Retired colonel", tone: "grey",
    about: "{V} and I served together in India. Forty years of friendship. Mostly.", voice: "Hmph. ",
    token: { name: "a brass button from a military jacket", icon: "button", missing: "{n}'s jacket has a gap where a brass button should be. Loose threads hang from it." },
    look: { skin: "#e8b796", hair: "short", hairColor: "#a7a7a2", outfit: "uniform", color: "#4b5d3a", accent: "#c9a227", extras: ["moustache", "monocle"], token: "buttons" } },
  { id: "pryce", name: "Dr. Imogen Pryce", short: "Dr. Pryce", surname: "Pryce", title: "Family doctor", tone: "black",
    about: "I have been {V}'s doctor for twelve years. Not an easy patient.", voice: "",
    token: { name: "a tortoiseshell hairpin", icon: "hairpin", missing: "One of {n}'s tortoiseshell hairpins is missing; a strand of hair has come loose from the bun." },
    look: { skin: "#f0cfb4", hair: "bun", hairColor: "#231c1c", outfit: "dress", color: "#2f4a7a", accent: "#d9e2ef", extras: ["glasses"], token: "hairpin" } },
  { id: "crane", name: "Edmund Crane", short: "Crane", surname: "Crane", title: "Butler", tone: "white",
    about: "I have served this house for thirty years, and {V} for twenty of them.", voice: "Ahem. ",
    token: { name: "a pearl shirt stud", icon: "stud", missing: "{n}'s starched shirt front is missing one of its three pearl studs." },
    look: { skin: "#efc9ab", hair: "bald", hairColor: "#ecebe6", outfit: "tailcoat", color: "#1d1d24", accent: "#ffffff", extras: ["bowtie"], token: "studs" } },
  { id: "ash", name: "Lady Vivienne Ash", short: "Lady Ash", surname: "Ash", title: "Old family friend", tone: "fair",
    about: "{V} and I grew up together in this house. We have quarrelled since the nursery.", voice: "Oh, really. ",
    token: { name: "a pearl earring", icon: "earring", missing: "{n} wears a pearl earring in one ear only. The other earlobe is bare and a little red." },
    look: { skin: "#f6d6c0", hair: "wavy", hairColor: "#e0c16a", outfit: "dress", color: "#8c1c2c", accent: "#f3ede2", extras: ["pearls"], token: "earring" } },
  { id: "morrow", name: "Felix Morrow", short: "Felix", surname: "Morrow", title: "Nephew of the house", tone: "brown",
    about: "I'm family. The black sheep, {V} would say, and often did.", voice: "Look. ",
    token: { name: "a gold lapel pin shaped like a horseshoe", icon: "lapelpin", missing: "{n}'s lapel shows two small holes where a pin used to sit." },
    look: { skin: "#e3b48f", hair: "slick", hairColor: "#5b3a22", outfit: "suit", color: "#7a6440", accent: "#c8b27a", extras: ["tie"], token: "lapel" } },
  { id: "bell", name: "Mrs. Agatha Bell", short: "Mrs. Bell", surname: "Bell", title: "Cook", tone: "red",
    about: "I've cooked for {V} for fifteen years. Never a word of thanks.", voice: "Well! ",
    token: { name: "a horn button from an apron strap", icon: "button", missing: "One strap of {n}'s apron hangs loose; its horn button is gone." },
    look: { skin: "#e9b08e", hair: "capped", hairColor: "#b8452a", outfit: "apron", color: "#6f8296", accent: "#f4f1ea", extras: [], token: "strap" } },
  { id: "lark", name: "Theo Lark", short: "Theo Lark", surname: "Lark", title: "Portrait painter", tone: "black",
    about: "{V} commissioned a portrait. I've been here a month and painted nothing worth keeping.", voice: "Ah. ",
    token: { name: "a paint-flecked wooden button", icon: "button", missing: "{n}'s painting smock is missing a wooden button near the top." },
    look: { skin: "#c98f6a", hair: "curly", hairColor: "#1e1a19", outfit: "smock", color: "#c46b2b", accent: "#e8d6a8", extras: ["beret", "scarf"], token: "buttons" } },
  { id: "finch", name: "Miss Clara Finch", short: "Miss Finch", surname: "Finch", title: "Private secretary", tone: "red",
    about: "I kept {V}'s diary and letters for six years.", voice: "",
    token: { name: "a small silver earring", icon: "earring", missing: "{n} has a silver earring in one ear only." },
    look: { skin: "#f3d2bb", hair: "bob", hairColor: "#8e3b1f", outfit: "cardigan", color: "#5f8668", accent: "#efe7d3", extras: ["glasses"], token: "earring", earring: "#c8ccd4" } },
  { id: "vance", name: "Rupert Vance", short: "Vance", surname: "Vance", title: "Business partner", tone: "brown",
    about: "{V} and I built the company together, thirty years ago.", voice: "Frankly? ",
    token: { name: "a gold tie pin", icon: "tiepin", missing: "{n}'s tie is held by nothing; a tiny hole shows where a tie pin sat." },
    look: { skin: "#d9a582", hair: "short", hairColor: "#4a3020", outfit: "suit", color: "#555c66", accent: "#9b2d2d", extras: ["beard", "tie"], token: "tiepin" } },
  { id: "hartley", name: "Nell Hartley", short: "Nell", surname: "Hartley", title: "Gardener", tone: "fair",
    about: "I keep the grounds. {V} cared more for the roses than for the people.", voice: "Aye. ",
    token: { name: "a brass button from a dungaree strap", icon: "button", missing: "One of {n}'s dungaree straps is tied in a knot; its brass button is gone." },
    look: { skin: "#e2a988", hair: "braid", hairColor: "#d6b35e", outfit: "overalls", color: "#4f6b3a", accent: "#e9dfc4", extras: ["cap"], token: "strap" } },
];

// What a suspect's motive is, as found in a document, and how the suspect talks about it.
export const MOTIVES = [
  { id: "inheritance", label: "Inheritance", icon: "will",
    doc: "A new will in {V}'s hand, signed last week. {who} is cut out entirely; the old will left {who} half the estate.",
    admit: "Yes, {V} meant to cut me out of the will. I was furious. But furious isn't murderous." },
  { id: "blackmail", label: "Blackmail", icon: "photo",
    doc: "Photographs and a note in {V}'s hand: \"{who}: two hundred pounds a month, or everyone sees these.\"",
    admit: "{V} was bleeding me dry with those photographs. I won't pretend I'm sorry it's over." },
  { id: "debts", label: "Debts", icon: "ledger",
    doc: "An IOU for four thousand pounds, signed by {who}. {V} has written across it: \"Pay by Monday or I call it in.\"",
    admit: "I owed {V} money. A great deal. {V} wasn't the forgiving kind." },
  { id: "jealousy", label: "Jealousy", icon: "letter",
    doc: "A love letter from {V} to the person {who} hoped to marry. It is dated this week.",
    admit: "{V} took the one person I cared about. Just to prove {V} could." },
  { id: "revenge", label: "Revenge", icon: "clipping",
    doc: "A yellowed newspaper clipping: \"{surname} family ruined in share swindle\". {V}'s name is circled in ink.",
    admit: "{V} ruined my family twenty years ago. I never forgot it." },
  { id: "exposure", label: "Fear of exposure", icon: "ledger",
    doc: "Ledger pages in {who}'s handwriting, with {V}'s red notes in the margin: \"Money missing. Police on Monday.\"",
    admit: "I borrowed from the accounts. {V} found out. I meant to pay it all back." },
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
export const WEAPONS = [
  { id: "candlestick", name: "brass candlestick", cause: "blunt", trace: "a dent in its base and a dark smear" },
  { id: "poker", name: "fire poker", cause: "blunt", trace: "blood dried on its hooked end" },
  { id: "bookend", name: "marble bookend", cause: "blunt", trace: "a chip off one corner and a dark stain" },
  { id: "cane", name: "silver-topped walking cane", cause: "blunt", trace: "the silver knob is dented and stained" },
  { id: "letteropener", name: "letter opener", cause: "sharp", trace: "the blade wiped, but blood remains in the engraving" },
  { id: "knife", name: "carving knife", cause: "sharp", trace: "blood dried along the handle" },
  { id: "dagger", name: "ornamental dagger", cause: "sharp", trace: "the blade is stained to the hilt" },
  { id: "arsenic", name: "tin of rat poison", cause: "poison", trace: "almost empty, the lid pried open" },
  { id: "drops", name: "bottle of heart drops", cause: "poison", trace: "empty, though the label says it was full yesterday" },
  { id: "cord", name: "curtain cord", cause: "cord", trace: "kinked and frayed in the middle" },
  { id: "belt", name: "dressing gown belt", cause: "cord", trace: "twisted tight and stretched" },
  { id: "wire", name: "coil of piano wire", cause: "cord", trace: "two loops wound around pencil stubs as handles" },
];

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
const OPINIONS = [
  "{o} kept out of my way, and I kept out of theirs.",
  "{o} was in a black mood at dinner. Snapped at {V} over the soup.",
  "{o} is harmless. Dull, but harmless.",
  "{o} was jumpy all evening and kept looking at the clock.",
  "{o} slipped away straight after dinner. You might ask where to.",
  "{o}? Quiet. I hardly noticed {o} all evening.",
  "{o} and {V} were thick as thieves once. Not lately.",
];
const ALONE = ["Alone, I'm afraid.", "Nobody else was there.", "On my own, the whole time.", "Nobody can vouch for me, if that's what you mean."];

// ---------- library: twists ----------
// A case has at most one twist in how the murder was done (core) and at most one in what the others did (side),
// and often none. No twist is ever announced: each only adds clues and statements that don't fit the obvious story.
//   staged:     the murderer set the victim's watch forward; their alibi holds for the false time only.
//   planted:    a weapon that can't have made the wounds lies by the body; the real one is hidden.
//   moved:      the victim died in another room and was dragged to where they lie.
//   poison:     the poison went into a drink an hour earlier; the murderer's alibi for the death is true.
//   frame:      the murderer left an innocent suspect's lost belonging under the body.
//   lovers:     the two innocent suspects lie to hide an affair.
//   confession: an innocent suspect confesses to protect the murderer, and gets the method wrong.
const CORE_TWISTS = ["staged", "planted", "moved", "poison"];
const SIDE_TWISTS = ["frame", "lovers", "confession"];
const CONFESS = {
  blunt: "struck {V} down with the first heavy thing I could lay my hands on",
  sharp: "stabbed {V}. A blade from the kitchen. It was over in a moment",
  poison: "put poison in {V}'s glass and watched {V} drink it",
  cord: "strangled {V} with a cord from the curtains",
};
const BONDS = [
  "{P} is {M}'s child, born out of wedlock and never acknowledged",
  "{P} has loved {M}, without a word, for twenty years",
  "{M} once saved {P} from ruin, and {P} never forgot it",
  "{P} and {M} grew up as brother and sister in a children's home, and kept it from everyone",
];
const TRYST = ["in the summer house", "in the boathouse down by the lake", "in the old nursery at the top of the house", "in the chauffeur's flat over the garage"];
const TRYST_TRACE = ["A crushed rose petal is caught in {n}'s collar.", "{n} smells faintly of somebody else's scent: lily of the valley.", "There is a smear of lipstick, not quite wiped away, near {n}'s ear."];
const STAGED_TELL = [
  "Odd, though: the winding crown is pulled out, the way you pull it to set the hands.",
  "Odd, though: the hands still turn when you touch the crown. Someone has pulled it out to set them.",
];

// Combination locks: the victim set every lock to the date of an event. The field agent finds dated keepsakes
// around the house; only the interrogator learns which event counts. The dials take day and month.
const LOCK_EVENTS = [
  { id: "wedding", phrase: "{V}'s wedding", item: "A silver-framed wedding photograph. On the back, in faded ink: \"Our wedding day, {date}.\"" },
  { id: "firm", phrase: "the founding of {V}'s firm", item: "A brass plaque from an old office door: \"Est. {date}. Honest dealing.\" Someone has scratched out \"Honest\"." },
  { id: "derby", phrase: "{V}'s Derby win", item: "A racing print of a bay colt crossing the line, inscribed \"Lucky Star, the Derby, {date}\"." },
  { id: "medal", phrase: "{V}'s medal for bravery", item: "A velvet medal case. Inside the lid: \"For conspicuous gallantry, {date}.\"" },
  { id: "house", phrase: "{V}'s purchase of this house", item: "A framed deed of sale for the house, signed and sealed on {date}." },
  { id: "child", phrase: "the birth of {V}'s only child", item: "A silver christening cup, engraved \"Born {date}\"." },
  { id: "mother", phrase: "{V}'s mother's death", item: "A black-edged memorial card: \"In loving memory. Fell asleep {date}.\"" },
  { id: "voyage", phrase: "{V}'s homecoming from India", item: "A steamer ticket stub, kept in a little frame: \"Bombay to Southampton, landed {date}\"." },
];
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
  { id: "conservatory", name: "Conservatory", theme: "conservatory", body: [146, 206, 130, 42], senses: [{ t: "it smells of wet earth and orchids", k: ["potting", "palm"] }, { t: "palm fronds brush the glass", k: ["palm"] }],
    furniture: [
    ["potting", 18, 112, 138, 72], ["palm", 176, 52, 74, 136], ["window", 284, 18, 98, 104], ["armchair", 296, 132, 66, 62]] },
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

function build(code, attempt) {
  const R = rng(hash(`${code}#${attempt}`));
  const victim = R.pick(VICTIMS);
  const manor = R.pick(MANORS);
  const V = victim.short;
  const nm = (s) => s.short;
  const cause = R.pick(Object.keys(CAUSES));

  // Twists come first: they decide who may lie and where people claim to have been.
  const coreFits = (t) => (t === "poison" ? cause === "poison" : t === "moved" ? cause !== "poison" : true);
  let core = R.int(10) < 6 ? R.pick(CORE_TWISTS.filter(coreFits)) : null;
  const side = R.int(10) < 5 ? R.pick(SIDE_TWISTS) : null;

  // Three suspects with three different hair colours, in a random order. One is the murderer (M). Each of the
  // others independently lies to hide a secret (L) or tells the truth (H): a case has zero, one or two such liars.
  const pool = R.shuffle(SUSPECTS);
  const chosen = [];
  for (const s of pool) if (chosen.length < 3 && !chosen.some((c) => c.tone === s.tone)) chosen.push(s);
  const mi = R.int(3);
  const suspects = chosen.map((lib, i) => ({ id: lib.id, lib, role: i === mi ? "M" : side === "lovers" || R.int(2) ? "L" : "H", name: lib.name, short: lib.short, title: lib.title }));
  const M = suspects[mi];
  const others = (s) => suspects.filter((o) => o !== s);
  const W = R.pick(others(M)); // saw the weapon being hidden

  // Rooms: the scene plus two more. Every pair of rooms offers at least three activities to claim.
  const rooms = R.shuffle(ROOMS).slice(0, 3).map((r, i) => layoutRoom(r, i === 0 ? victim : null));
  const [S, A, B] = rooms;
  const roomOf = (f) => rooms.find((r) => r.furniture.includes(f));

  const ofCause = R.shuffle(WEAPONS.filter((w) => w.cause === cause));
  const weapon = ofCause[0], decoy = ofCause[1];

  // Every suspect has a motive and claims an activity somewhere. When the body was moved, the murderer names the
  // room where the murder really happened, and nobody truthful claims to have been there as well.
  const motives = R.shuffle(MOTIVES).slice(0, 3);
  suspects.forEach((s, i) => { s.motive = motives[i]; s.lost = R.int(2) === 0; });
  const claimable = R.shuffle([A, B].flatMap((r) => r.furniture.filter((f) => KINDS[f.kind].activity)));
  const take = (ok) => { const i = claimable.findIndex(ok); return i < 0 ? null : claimable.splice(i, 1)[0]; };
  const claims = new Map([[M, take(() => true)]]);
  const mRoom = roomOf(claims.get(M));
  for (const s of others(M).sort((a, b) => (a.role === "H" ? 0 : 1) - (b.role === "H" ? 0 : 1))) {
    let f = core === "moved" && s.role === "H" ? take((x) => roomOf(x) !== mRoom) : take(() => true);
    if (!f) { core = null; f = take(() => true); }
    claims.set(s, f);
  }
  for (const s of suspects) { const f = claims.get(s); s.claim = { f, room: roomOf(f), act: KINDS[f.kind].activity }; }
  const trueAlibi = core === "staged" || core === "moved" || core === "poison"; // the murderer's alibi checks out
  const MR = core === "moved" ? mRoom : S; // where the murder happened

  // Times: the murder on a quarter hour, so a clock chimes. The watch shows it, unless the murderer moved the hands.
  const T = 21 * 60 + 45 + 15 * R.int(5);
  const time = fmtTime(T);
  const watchAt = core === "staged" ? T + 45 + 5 * R.int(5) : T + R.int(4);
  const watch = fmtTime(watchAt);
  const served = fmtTime(T - 45 - 5 * R.int(4));
  const later = fmtTime(T + 10 + 5 * R.int(2));

  // Secrets and traces. A lying suspect shows the trace of their secret. The murderer, when caught in a lie, falls
  // back on a made-up secret of the same kind, but shows a trace that doesn't fit it.
  const lovers = side === "lovers" ? others(M) : [];
  const tryst = R.pick(TRYST), trystTrace = R.pick(TRYST_TRACE);
  for (const s of suspects) if (s.role === "L") s.secret = lovers.includes(s) ? { lover: lovers.find((o) => o !== s) } : SECRETS[s.motive.id];
  M.cover = trueAlibi ? null : SECRETS[M.motive.id];
  const spareTraces = R.shuffle(TRACES.filter((t) => !suspects.some((s) => SECRETS[s.motive.id].trace === t)));
  for (const s of suspects) s.trace = lovers.includes(s) ? trystTrace : s.role === "L" ? s.secret.trace : spareTraces.pop();

  // Hidden spots: the weapon in another room; some motive papers and unrelated things too, so a hidden spot
  // doesn't promise a real clue.
  const hiddenIn = (room) => room.furniture.filter((f) => f.hiddenDef);
  const bodyF = S.furniture.find((f) => f.kind === "body");
  const spotWeapon = R.pick([...hiddenIn(A), ...hiddenIn(B)].filter((f) => roomOf(f) !== MR));
  const spare = R.shuffle(rooms.flatMap(hiddenIn).filter((f) => f !== spotWeapon));
  for (const s of suspects) s.docSpot = R.int(2) && spare.length ? spare.pop() : null;
  const decoySpot = R.int(5) < 2 && spare.length ? spare.pop() : null;
  const leadSpots = [];
  for (let i = R.int(3); i > 0 && spare.length; i--) leadSpots.push(spare.pop());
  // A lock in about two cases out of three. It holds the papers of a suspect whose papers aren't hidden elsewhere.
  const lockable = suspects.filter((s) => !s.docSpot);
  let locked = R.int(3) && lockable.length ? R.pick(lockable) : null;

  // How a witness describes the room something went into: by a sight or smell that, among this case's rooms with
  // that kind of furniture, only that room has. The field agent has to work out which room it is.
  const kindsOf = (r) => new Set(r.furniture.map((f) => f.kind));
  const glimpse = (f) => {
    const room = roomOf(f);
    const fits = (sense, r) => sense.k.some((k) => kindsOf(r).has(k)) && kindsOf(r).has(f.kind);
    const ok = R.shuffle(room.senses).filter((sense) => rooms.filter((r) => fits(sense, r)).length === 1);
    return ok.length ? `a room where ${ok[0].t}` : `the ${rn(room)}`;
  };

  // ---------- clues (field agent finds them) ----------
  const clues = {};
  const addClue = (id, c) => { clues[id] = { id, ...c }; };
  let bodyText = `${victim.name} lies dead on the floor of the ${rn(S)}, ${CAUSES[cause]}.`;
  if (core === "moved") bodyText += ` Yet nothing in the room is disturbed, and two long scuff marks run across the floor from the door to the body.`;
  else if (cause !== "poison") bodyText += " There was a struggle: a chair is knocked over and the rug is rucked up.";
  if (core === "poison") bodyText += " The glass smells of lemon and cloves: a hot toddy, long gone cold.";
  bodyText += ` The victim's wristwatch smashed in the fall and stopped at ${watch}.`;
  if (core === "staged") bodyText += ` ${R.pick(STAGED_TELL)}`;
  addClue("body", { title: "The victim", icon: "watch", text: bodyText });
  for (const s of suspects) {
    const honest = s.role === "H" || (s === M && trueAlibi);
    addClue(`alibi_${s.id}`, { title: s.claim.act.title, icon: "magnifier", text: honest ? s.claim.act.yes : s.claim.act.no });
    const doc = fill(s.motive.doc, { V, who: nm(s), surname: s.lib.surname });
    addClue(`motive_${s.id}`, { title: "Private papers", icon: s.motive.icon, text: s.docSpot ? `${doc} It was hidden ${s.docSpot.hiddenDef.found}.` : doc });
  }
  const slow = core === "poison" ? " The label warns that it works slowly: death follows within the hour." : "";
  addClue("weapon", { title: cap(weapon.name), icon: weapon.id, text: `${cap(an(weapon.name))}, hidden ${spotWeapon.hiddenDef.found}: ${weapon.trace}.${slow} Caught on it is a single ${M.lib.tone} hair.` });
  addClue("decoy", { title: cap(decoy.name), icon: decoy.id, text: `${cap(an(decoy.name))}${decoySpot ? `, tucked away ${decoySpot.hiddenDef.found}` : ""}. Clean and dusty; nobody has handled it in days.` });
  // A truthful suspect, if there is one, was in the room the planted weapon was taken from and noticed it go.
  let planted = null, plantedFrom = null, plantWitness = null;
  if (core === "planted") {
    planted = R.pick(WEAPONS.filter((w) => w.cause !== cause));
    const honest = others(M).filter((s) => s.role === "H");
    plantWitness = honest.length ? R.pick(honest) : null;
    plantedFrom = plantWitness ? plantWitness.claim.room : R.pick([A, B]);
    addClue("planted", { title: cap(planted.name), icon: planted.id, text: `${cap(an(planted.name))}, lying in plain sight in the ${rn(S)}: ${planted.trace}.` });
  }
  if (core === "moved") addClue("stain", { title: "Scrubbed stain", icon: "magnifier", text: "A patch scrubbed almost white, still damp and smelling of carbolic soap. A rusty rim remains in the cracks. Somebody cleaned up here tonight." });

  // ---------- placing things in the rooms ----------
  const content = {}; // leaf id -> { clue }, { text } or { lock: true, clue }
  const taken = new Set();
  const put = (leaf, c) => { content[leaf.id] = c; taken.add(leaf.id); };
  const partOf = (f, pid) => f.children.find((c) => c.id === `${f.id}.${pid}`);
  const roomOfLeaf = (l) => rooms.find((r) => l.id.startsWith(`${r.id}.`));
  for (const s of suspects) put(partOf(s.claim.f, s.claim.act.part), { clue: `alibi_${s.id}` });
  put(partOf(bodyF, "victim"), { clue: "body" });
  const freeLeaves = (where, room) => R.shuffle((room ? [room] : rooms).flatMap((r) => r.furniture.filter((f) => f.kind !== "body").flatMap(leaves)))
    .filter((l) => !taken.has(l.id) && where.includes(l.tag));
  const place = (where, c, room) => { const l = freeLeaves(where, room)[0]; if (l) put(l, c); return l; };
  let lock = null;
  if (locked) {
    const l = place("c", { lock: true, clue: `motive_${locked.id}` });
    if (l) {
      const [event, ...rest] = R.shuffle(LOCK_EVENTS);
      const dates = [];
      while (dates.length < 3) {
        const d = [1 + R.int(28), 1 + R.int(12)];
        if (!dates.some((x) => x[0] === d[0] && x[1] === d[1])) dates.push(d);
      }
      const two = (n) => String(n).padStart(2, "0");
      lock = { leaf: l.id, clue: `motive_${locked.id}`, combo: two(dates[0][0]) + two(dates[0][1]), event: event.id };
      const label = l.label.toLowerCase();
      addClue("lock", { title: `Locked ${label}`, icon: "key", text: `The ${label} in the ${rn(roomOfLeaf(l))} is locked with four little brass dials: two for the day, two for the month. Whatever is inside, ${V} wanted it kept safe.` });
      lock.phrase = fill(event.phrase, { V });
      [event, rest[0], rest[1]].forEach((e, i) => {
        const text = fill(e.item, { V, date: `${dates[i][0]} ${MONTHS[dates[i][1] - 1]}` });
        if (!place("sw", { text }) && !place("c", { text })) throw new Error("no room for a keepsake");
      });
    } else locked = null;
  }
  for (const s of suspects) if (!s.docSpot && s !== locked) place("c", { clue: `motive_${s.id}` });
  if (!decoySpot) place("sf", { clue: "decoy" });
  if (planted) place("sf", { clue: "planted" }, S);
  if (core === "moved" && !place("f", { clue: "stain" }, MR) && !place("s", { clue: "stain" }, MR)) place("c", { clue: "stain" }, MR);

  // Presence: a dropped belonging puts its owner in a room. Fresh at the scene only for the murderer (or for the
  // suspect the murderer frames), fresh in the claimed room only for a truthful suspect, dusty for anyone.
  const presence = {}; // clue id -> { owner, fresh, room, planted }
  const token = (s) => s.lib.token;
  const finds = []; // { id, item, owner, fresh, open, lead }
  const library = R.shuffle(FINDS);
  const fillFind = (item, s) => fill(item.text, { V, X: nm(s), I: s.lib.surname[0] });
  let atScene, framed = null;
  if (side === "frame") {
    framed = R.pick(others(M));
    framed.lost = true;
    M.lost = false;
    atScene = `token_${framed.id}`;
    addClue(atScene, { title: "Something dropped", icon: token(framed).icon, text: `${cap(token(framed).name)}, lying under the victim's body.${FRESH}` });
    presence[atScene] = { owner: framed, fresh: true, room: S, planted: true };
  } else if (M.lost) {
    atScene = `token_${M.id}`;
    addClue(atScene, { title: "Something dropped", icon: token(M).icon, text: `${cap(token(M).name)}, lying under the victim's body.${FRESH}` });
    presence[atScene] = { owner: M, fresh: true, room: S };
  } else {
    const item = library.splice(library.findIndex((x) => x.presence), 1)[0];
    atScene = `find${finds.length}`;
    addClue(atScene, { title: item.title, icon: item.icon, text: `${fillFind(item, M)} It was lying under the victim's body.${FRESH}` });
    finds.push({ id: atScene, item, owner: M, fresh: true, open: false });
    presence[atScene] = { owner: M, fresh: true, room: S };
  }
  put(partOf(bodyF, "under"), { clue: atScene });
  for (const s of others(M)) {
    if (!s.lost || s === framed) continue;
    const fresh = s.role === "H" && R.int(2) === 0;
    const id = `token_${s.id}`;
    const l = place("sf", { clue: id }, fresh ? s.claim.room : null);
    if (!l) { s.lost = false; continue; }
    addClue(id, { title: "Something dropped", icon: token(s).icon, text: `${cap(token(s).name)}.${fresh ? FRESH : DUSTY}` });
    presence[id] = { owner: s, fresh, room: roomOfLeaf(l) };
  }

  // Finds: about three in five of the remaining places hold one, each owned by a random suspect.
  let want = Math.round(freeLeaves("scfw").length * 0.6);
  const owners = R.shuffle(suspects);
  while (want > 0 && library.length) {
    const item = library.pop(), owner = owners[finds.length % 3], id = `find${finds.length}`;
    let fresh = false, room = null;
    if (item.presence) {
      fresh = owner.role !== "L" && R.int(2) === 0;
      room = fresh ? (owner === M ? S : owner.claim.room) : null;
    }
    const l = place(item.where, { clue: id }, room);
    if (!l) continue;
    want--;
    addClue(id, { title: item.title, icon: item.icon, text: fillFind(item, owner) + (item.presence ? (fresh ? FRESH : DUSTY) : "") });
    finds.push({ id, item, owner, fresh, open: true });
    if (item.presence) presence[id] = { owner, fresh, room: roomOfLeaf(l) };
  }
  for (const r of rooms) for (const l of r.furniture.flatMap(leaves)) {
    if (!content[l.id]) content[l.id] = { text: R.pick(l.def.flavor || ["Nothing of interest."]) };
  }

  // ---------- hints (interrogator learns them) ----------
  const hints = {};
  const hidden = []; // { hint, spot, clue, about }
  const sighting = core === "poison"
    ? `At about ${served} I saw someone come out of the ${rn(S)} with something small in their hand, a bottle or a tin. It was too dark to see who. They went into ${glimpse(spotWeapon)} and hid it ${spotWeapon.hiddenDef.phrase}.`
    : `Just after ${time} I saw someone hurry out of the ${rn(MR)} with something wrapped in a cloth. It was too dark to see who. They went into ${glimpse(spotWeapon)} and hid it ${spotWeapon.hiddenDef.phrase}.`;
  hints.hWeapon = { id: "hWeapon", room: roomOf(spotWeapon).id, spot: spotWeapon.id, clue: "weapon", text: `${nm(W)}: "${sighting}"` };
  for (const s of suspects) if (s.docSpot) hidden.push({ hint: `hDoc_${s.id}`, spot: s.docSpot, clue: `motive_${s.id}`, about: s });
  if (decoySpot) hidden.push({ hint: "hLead0", spot: decoySpot, clue: "decoy", about: R.pick(suspects) });
  const papers = library.filter((x) => !x.presence && x.where.includes("c"));
  for (const spot of leadSpots) {
    if (!papers.length) break;
    const item = papers.pop(), owner = R.pick(suspects), id = `find${finds.length}`;
    addClue(id, { title: item.title, icon: item.icon, text: `${fillFind(item, owner)} It was hidden ${spot.hiddenDef.found}.` });
    finds.push({ id, item, owner, fresh: false, open: false });
    hidden.push({ hint: `hLead${hidden.length}`, spot, clue: id, about: R.pick(suspects) });
  }
  if (lock) hints.hLock = { id: "hLock", text: `${V} set every lock in the house to the date of ${lock.phrase}.` };

  // Some opinions are fixed by a twist; the rest may carry a hint about a hidden spot.
  const fixedOpinion = {}; // `${speaker}>${about}` -> text
  const confessor = side === "confession" ? R.pick(others(M)) : null;
  const server = core === "poison" ? R.pick(others(M).filter((s) => s !== confessor)) : null;
  if (confessor) fixedOpinion[`${confessor.id}>${M.id}`] = `Leave ${nm(M)} out of this. ${nm(M)} has suffered enough in this house.`;
  if (server) fixedOpinion[`${server.id}>${M.id}`] = `${nm(M)} carried a hot toddy to ${V} in the ${rn(S)} at about ${served}. Very attentive, for once.`;
  const opinionHint = {}; // `${speaker}>${about}` -> hint id
  for (const h of hidden) {
    hints[h.hint] = { id: h.hint, room: roomOf(h.spot).id, spot: h.spot.id, clue: h.clue,
      text: `${V} had words with ${nm(h.about)} this afternoon and waved a paper about. Later ${V} was seen going into ${glimpse(h.spot)} to hide something ${h.spot.hiddenDef.phrase}.` };
    const carriers = finds.filter((f) => f.open && !f.item.presence && !f.lead && f.owner !== h.about);
    const speakers = others(h.about).filter((s) => !opinionHint[`${s.id}>${h.about.id}`] && !fixedOpinion[`${s.id}>${h.about.id}`]);
    if (carriers.length && (R.int(2) || !speakers.length)) R.pick(carriers).lead = h.hint;
    else if (speakers.length) opinionHint[`${R.pick(speakers).id}>${h.about.id}`] = h.hint;
    else {
      const any = finds.filter((f) => f.open && !f.item.presence && !f.lead);
      if (!any.length) throw new Error("no one to carry a hint");
      R.pick(any).lead = h.hint;
    }
  }

  // ---------- dialogue ----------
  // requires: tokens the interrogator must hold. clue:x = clue code entered, q:sid:qid = question asked, ev:x = event.
  // Lines depend on facts (where someone was, what they saw), never on a fixed part a suspect plays.
  const say = (s, text) => `${s.lib.voice}${text}`;
  const evening = R.shuffle(EVENING), noticed = R.shuffle(NOTICED);
  // Somebody heard the cry and the clock. Never the murderer when the murderer's alibi depends on the time.
  const chimer = R.pick(suspects.filter((s) => !(s === W && s.role === "H") && !(s === M && trueAlibi)));
  const chime = `I heard a cry from the direction of the ${rn(MR)}, just as the hall clock chimed. ${time}, it must have been.`;
  let opinions = [];
  const nextOpinion = () => { if (!opinions.length) opinions = R.shuffle(OPINIONS); return opinions.pop(); };
  // Suspects who really were where they claim saw each other there. Anyone else says they were alone, true or not.
  // A murderer with a staged alibi only turned up after the murder, and a truthful witness says when.
  const start = new Map(suspects.map((s) => [s, s === M && core === "staged" ? T + 15 + 5 * R.int(3) : T - 30 - 5 * R.int(5)]));
  const there = (s) => s.role === "H" || (s === M && trueAlibi);
  const company = (s) => {
    const with_ = there(s) ? suspects.filter((o) => o !== s && there(o) && o.claim.room === s.claim.room) : [];
    if (!with_.length) return R.pick(ALONE);
    const o = with_[0];
    const late = o === M && core === "staged" ? ` ${nm(o)} came in at about ${fmtTime(start.get(o))}.` : "";
    return `${nm(o)} was there too, ${o.claim.act.act}.${late}`;
  };
  const wrong = R.pick(Object.keys(CAUSES).filter((c) => c !== cause));
  const lockKnower = lock ? R.pick(suspects) : null;
  const dialog = {};
  suspects.forEach((s, idx) => {
    const opinion = (o) => {
      const key = `${s.id}>${o.id}`;
      if (fixedOpinion[key]) return { text: say(s, fixedOpinion[key]) };
      const hid = opinionHint[key];
      return hid ? { text: say(s, hints[hid].text), gives: [hid] } : { text: say(s, fill(nextOpinion(), { o: nm(o), V })) };
    };
    const { room, act } = s.claim;
    const until = watchAt + 20 + 5 * R.int(4);
    const qs = [
      { id: "about", label: `Who are you to ${V}?`, text: say(s, fill(s.lib.about, { V })) },
      { id: "evening", label: "What did you do this evening?", text: say(s, fill(evening[idx], { V })) },
      ...others(s).map((o) => ({ id: `on:${o.id}`, label: `What do you make of ${nm(o)}?`, ...opinion(o) })),
      { id: "where", label: `Where were you at ${watch}?`, requires: ["clue:body"], text: say(s, `At ${watch}? I was in the ${rn(room)}, ${act.act}, from ${fmtTime(start.get(s))} until ${fmtTime(until)}. ${company(s)}`) },
      s === W && s.role === "H"
        ? { id: "noticed", label: "Did you notice anything unusual?", requires: ["clue:body"], text: say(s, `Yes. ${sighting}`), gives: ["hWeapon"] }
        : { id: "noticed", label: "Did you notice anything unusual?", requires: ["clue:body"], text: say(s, s === chimer ? chime : fill(noticed[idx], { T: time })) },
    ];
    for (const q of qs) { q.mood = "calm"; q.requires = q.requires || []; q.gives = q.gives || []; q.events = [`q:${s.id}:${q.id}`]; }

    // witness: true marks a reaction to something the suspect doesn't own.
    const confront = {};
    const asked = `q:${s.id}:where`;
    const broken = `ev:broken_${s.id}`;
    const seenToo = s === W ? ` But on my way back... ${sighting}` : "";
    if (s.role === "H" || (s === M && trueAlibi)) {
      confront[`alibi_${s.id}`] = { requires: [asked], text: `Exactly as I told you. I was in the ${rn(room)}, ${act.act}.`, mood: "calm" };
    } else if (s === M) {
      confront[`alibi_${s.id}`] = { requires: [asked], text: `Fine. I wasn't in the ${rn(room)}. I was ${fill(M.cover.act, { V })}. ${fill(s.motive.admit, { V })}`, mood: "afraid", events: [broken] };
    } else if (s.secret.lover) {
      confront[`alibi_${s.id}`] = { requires: [asked], text: `Fine. I wasn't in the ${rn(room)}. I was ${tryst}, with ${nm(s.secret.lover)}. We have kept it from everyone for a year, and I would rather it stayed that way.${seenToo}`, mood: "afraid", gives: s === W ? ["hWeapon"] : [], events: [broken] };
    } else {
      confront[`alibi_${s.id}`] = { requires: [asked], text: `Fine. I wasn't in the ${rn(room)}. I was ${fill(s.secret.act, { V })}. ${fill(s.motive.admit, { V })}${seenToo}`, mood: "afraid", gives: s === W ? ["hWeapon"] : [], events: [broken] };
    }
    confront[`motive_${s.id}`] = { text: fill(s.motive.admit, { V }), mood: "uneasy" };
    const owned = (id, react) => {
      const p = presence[id];
      if (!p.fresh) return { text: react ? fill(react, { V }) : "That's mine. I lost it days ago. Look at the dust on it.", mood: "calm" };
      if (p.planted) return { text: "That's mine, yes. I lost it yesterday and turned my room upside down looking for it. How on earth did it get there?", mood: "afraid" };
      if (p.room === S && s === M) return { text: "That? I could have lost that anywhere, any day this week.", mood: "angry" };
      return { text: `Yes, that's mine. I was in the ${rn(p.room)} this evening, as I told you.`, mood: "calm" };
    };
    if (s.lost) confront[`token_${s.id}`] = owned(`token_${s.id}`);
    for (const f of finds) {
      if (f.owner !== s) continue;
      if (f.item.presence) { confront[f.id] = owned(f.id, f.item.react); continue; }
      const lead = f.lead ? ` But if you want something worth your time: ${hints[f.lead].text}` : "";
      confront[f.id] = { text: fill(f.item.react, { V }) + lead, mood: "uneasy", gives: f.lead ? [f.lead] : [] };
    }
    confront.body = s === confessor
      ? { text: `Stop. Stop! It was me. I ${fill(CONFESS[wrong], { V })}. Take me away and leave the others in peace.`, mood: "afraid", events: ["ev:confess"] }
      : { text: "Dreadful. Simply dreadful. Must you show me that?", mood: "uneasy" };
    confront.decoy = { text: `${cap(an(decoy.name))}? What about it?`, mood: "calm" };
    confront.weapon = s === M ? { text: "A hair? Half this house has been in and out of every room. That proves nothing!", mood: "angry" }
      : s === confessor ? { text: "I... yes. I threw it away afterwards. I don't remember where.", mood: "afraid" }
      : { text: "Good heavens. Is that what did it? I've never touched it.", mood: "afraid" };
    if (framed && s === M) confront[atScene] = { text: `That's ${nm(framed)}'s, isn't it? Well. There you are, then.`, mood: "calm", witness: true };
    if (framed && s !== M && s !== framed) confront[atScene] = { text: `That's ${nm(framed)}'s. ${nm(framed)} dropped it at dinner yesterday, and ${nm(M)} picked it up and promised to hand it back.`, mood: "uneasy", events: ["ev:frame"], witness: true };
    if (planted && s === M) confront.planted = { text: "Well, there's your weapon, Inspector. What more do you want?", mood: "angry", witness: true };
    if (planted && s === plantWitness) confront.planted = { text: `That ${planted.name}? It belongs in the ${rn(plantedFrom)}. It was there at ${later}, I'm certain; I remember it catching the light. When I looked up again a while later, it was gone.`, mood: "uneasy", events: ["ev:planted"], witness: true };
    if (core === "moved" && s === M) confront.stain = { text: "Something spilled, I expect. The maids are forever scrubbing.", mood: "uneasy", witness: true };
    if (lock) confront.lock = s === lockKnower
      ? { text: `The combination? ${V} set every lock in the house to the date of ${lock.phrase}. Sentimental, for someone so hard.`, mood: "calm", gives: ["hLock"], witness: true }
      : { text: `${V} never told me the combination. Ask ${nm(lockKnower)}; ${V} trusted ${nm(lockKnower)} with that sort of thing.`, mood: "calm", witness: true };
    for (const c of Object.values(confront)) { c.requires = c.requires || []; c.gives = c.gives || []; c.events = c.events || []; }

    const fillN = (t) => fill(t, { n: nm(s), V });
    const obs = [];
    if (s.lost) obs.push({ id: "lost", text: fillN(token(s).missing), region: s.lib.look.token, missing: true });
    obs.push({ id: "trace", text: fillN(s.trace), region: "body" });
    obs.forEach((o) => { o.requires = []; o.gives = []; });
    dialog[s.id] = { questions: qs, confront, observations: obs,
      fallback: say(s, R.pick(["I don't see what that has to do with me.", "Should that mean something to me?", "I've never seen it before."])) };
  });

  const hiddenSpots = {};
  for (const h of Object.values(hints)) {
    if (!h.spot) continue;
    const f = rooms.flatMap((r) => r.furniture).find((x) => x.id === h.spot);
    hiddenSpots[h.spot] = { id: `${f.id}.hidden`, furniture: f.id, room: h.room, label: f.hiddenDef.label, hint: h.id, clue: h.clue,
      x: f.hiddenDef.x, y: f.hiddenDef.y, w: f.hiddenDef.w, h: f.hiddenDef.h };
  }

  // What both detectives must be able to reach between them. The deduction is theirs.
  const solution = { suspect: M.id, weapon: weapon.id, motive: M.motive.id };
  const goal = ["clue:weapon", `clue:motive_${M.id}`, `clue:${atScene}`];
  if (!trueAlibi) goal.push(`ev:broken_${M.id}`);
  if (core === "staged") goal.push(`q:${chimer.id}:noticed`);
  if (core === "planted") goal.push("clue:planted", ...(plantWitness ? ["ev:planted"] : []));
  if (core === "moved") goal.push("clue:stain");
  if (core === "poison") goal.push(`q:${server.id}:on:${M.id}`);
  if (side === "frame") goal.push("ev:frame");
  if (side === "confession") goal.push("ev:confess");
  for (const s of lovers) goal.push(`ev:broken_${s.id}`);

  const { act: mAct } = M.claim;
  const story = [
    `${M.name} killed ${victim.name} ${core === "moved" ? `in the ${rn(MR)}, then dragged the body into the ${rn(S)}` : `in the ${rn(S)}`}. The motive: ${M.motive.label.toLowerCase()}. ${fill(M.motive.doc, { V, who: nm(M), surname: M.lib.surname })}`,
    core === "poison"
      ? `${nm(M)} put the ${weapon.name} into the hot toddy ${nm(M)} brought ${V} at ${served}, then hid it ${spotWeapon.hiddenDef.found}. The poison worked slowly; ${V} died at ${time}.`
      : `It happened at ${time}. ${nm(M)} used the ${weapon.name}, carried it out wrapped in a cloth and hid it ${spotWeapon.hiddenDef.found}.`,
  ];
  if (core === "staged") story.push(`${nm(M)} then set ${V}'s watch forward to ${watch} and went to the ${rn(M.claim.room)} to be seen ${mAct.act}. The alibi was real, but for the wrong time.`);
  if (core === "moved") story.push(`${nm(M)} scrubbed the floor of the ${rn(MR)} and then claimed to have spent the evening there, ${mAct.act}. That much was true: it was where ${V} died.`);
  if (core === "poison") story.push(`At ${time}, ${nm(M)} really was in the ${rn(M.claim.room)}, ${mAct.act}. The alibi was true, and meant nothing.`);
  if (core === "planted") story.push(`To mislead, ${nm(M)} fetched ${an(planted.name)} from the ${rn(plantedFrom)} and left it in the ${rn(S)}. It could not have made the wounds.`);
  if (!trueAlibi) story.push(`${nm(M)} claimed to have been in the ${rn(M.claim.room)}, ${mAct.act}. That was a lie, and so was the story about ${fill(M.cover.told, { V })}.`);
  story.push(framed
    ? `Under the body ${nm(M)} left ${token(framed).name} that ${nm(framed)} had lost the day before, to throw suspicion on ${nm(framed)}.`
    : `At the scene ${nm(M)} lost ${M.lost ? token(M).name : `a ${clues[atScene].title.toLowerCase()}`}; it ended up under the body.`);
  if (lovers.length) story.push(`${nm(lovers[0])} and ${nm(lovers[1])} both lied about where they were: they were together ${tryst}, and nobody was to know.`);
  else for (const s of others(M)) story.push(s.role === "L"
    ? `${nm(s)} lied too, to hide a secret: ${nm(s)} was ${fill(s.secret.told, { V })}.`
    : `${nm(s)} told the truth: ${nm(s)} really was in the ${rn(s.claim.room)}, ${s.claim.act.act}.`);
  if (confessor) story.push(`${nm(confessor)} confessed to shield ${nm(M)}: ${fill(R.pick(BONDS), { P: nm(confessor), M: nm(M) })}. But ${V} was ${CAUSES[cause].split(/[:;]/)[0]}, not killed the way ${nm(confessor)} described.`);
  story.push(`${nm(W)} saw the murderer ${core === "poison" ? "hide the poison" : "carry the weapon away"}${W.role === "L" ? `, but only said so once the lie about the ${rn(W.claim.room)} fell apart` : ""}.`);

  const kase = { code, version: VERSION, attempt, victim, manor, cause, time, watch, later, rooms, scene: S.id, murderRoom: MR.id, suspects, weapon: weapon.id, decoy: decoy.id,
    twists: [core, side].filter(Boolean), clues, hints, content, hiddenSpots, lock, dialog, solution, goal, story, briefing: briefing(victim, manor, S, suspects, rooms) };
  // Codes: three characters, unique within the case.
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
// Nodes: { who: "F" | "I", requires: tokens, gives: tokens }. Tokens cross between the detectives only by
// exchange: clue:* from the field agent to the interrogator, hint:* the other way.
export function nodesOf(k) {
  const nodes = [];
  for (const r of k.rooms) for (const l of r.furniture.flatMap(leaves)) {
    const c = k.content[l.id];
    if (c && c.lock) {
      nodes.push({ who: "F", requires: [], gives: ["clue:lock"], at: l.id });
      nodes.push({ who: "F", requires: ["hint:hLock"], gives: [`clue:${c.clue}`], at: l.id });
    } else if (c && c.clue) nodes.push({ who: "F", requires: [], gives: [`clue:${c.clue}`], at: l.id });
  }
  for (const h of Object.values(k.hiddenSpots)) nodes.push({ who: "F", requires: [`hint:${h.hint}`], gives: [`clue:${h.clue}`], at: h.id });
  for (const s of k.suspects) {
    const d = k.dialog[s.id];
    for (const q of d.questions) nodes.push({ who: "I", requires: q.requires, gives: [...q.gives.map((g) => `hint:${g}`), ...q.events] });
    for (const [cid, c] of Object.entries(d.confront)) nodes.push({ who: "I", requires: [`clue:${cid}`, ...c.requires], gives: [...c.gives.map((g) => `hint:${g}`), ...c.events] });
    for (const o of d.observations) nodes.push({ who: "I", requires: o.requires, gives: o.gives.map((g) => `hint:${g}`) });
  }
  return nodes;
}

export function solve(k, exchange = true) {
  const nodes = nodesOf(k);
  const know = { F: new Set(), I: new Set() };
  let rounds = 0;
  for (;;) {
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of nodes) {
        if (!n.requires.every((t) => know[n.who].has(t))) continue;
        for (const g of n.gives) if (!know[n.who].has(g)) { know[n.who].add(g); grew = true; }
      }
    }
    const all = new Set([...know.F, ...know.I]);
    if (k.goal.every((g) => all.has(g))) return { solved: true, rounds };
    if (!exchange) return { solved: false, rounds };
    let moved = false;
    for (const t of know.F) if (t.startsWith("clue:") && !know.I.has(t)) { know.I.add(t); moved = true; }
    for (const t of know.I) if (t.startsWith("hint:") && !know.F.has(t)) { know.F.add(t); moved = true; }
    if (!moved) return { solved: false, rounds };
    rounds++;
  }
}

export function validate(k) {
  const problems = [];
  const together = solve(k, true);
  if (!together.solved) problems.push("not solvable");
  if (solve(k, false).solved) problems.push("solvable without exchange");
  if (together.rounds < 2) problems.push(`only ${together.rounds} exchange rounds`);
  const codes = [...Object.values(k.clues), ...Object.values(k.hints)].map((x) => x.code);
  if (new Set(codes).size !== codes.length) problems.push("duplicate codes");
  const given = new Set(nodesOf(k).flatMap((n) => n.gives));
  for (const id of Object.keys(k.hints)) if (!given.has(`hint:${id}`)) problems.push(`hint ${id} never given`);
  for (const id of Object.keys(k.clues)) {
    const placed = Object.values(k.content).some((c) => c.clue === id || (c.lock && id === "lock")) || Object.values(k.hiddenSpots).some((h) => h.clue === id);
    if (!placed) problems.push(`clue ${id} not placed`);
  }
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
