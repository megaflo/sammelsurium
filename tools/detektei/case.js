// Case library, generator and solver. Pure functions: the same case number gives the same case on every
// device running the same VERSION. Both devices build the whole case; each role only shows its own side.

export const VERSION = 1;
export const BUDGET = 36; // actions per detective: 11:30 pm until 5:30 am, 10 minutes each
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
export const VICTIMS = [
  { name: "Lord Ambrose Thorne", short: "Lord Thorne" },
  { name: "Lady Cordelia Blackwood", short: "Lady Blackwood" },
  { name: "Sir Jasper Wren", short: "Sir Jasper" },
  { name: "Lady Honoria Vale", short: "Lady Vale" },
  { name: "Mr. Silas Grimshaw", short: "Mr. Grimshaw" },
  { name: "Mrs. Edith Marlowe", short: "Mrs. Marlowe" },
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

// Where the honest suspect was. Nobody can check it, but the trace fits.
const HONEST = [
  { act: "in my room upstairs, writing letters", trace: "Ink stains on {n}'s fingers: a lot of writing tonight, it seems." },
  { act: "in the drawing room, doing a jigsaw puzzle of the Alps", trace: "A small jigsaw piece, all blue sky, is stuck to {n}'s sleeve." },
  { act: "out in the stables, seeing to a lame horse", trace: "Straw on {n}'s shoes, and a smell of horse and liniment." },
  { act: "in the servants' hall, polishing the silver", trace: "A grey smudge of silver polish on {n}'s cuff." },
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

const NOISE = [
  { title: "Crossword", icon: "paper", text: "A half-finished crossword. Someone has pencilled MOTIVE into 7 across, then rubbed it out." },
  { title: "Matchbook", icon: "matches", text: "A matchbook from the Blue Parrot Club, London. Three matches used." },
  { title: "Train ticket", icon: "ticket", text: "An unused ticket for the 6:15 train to London, dated tomorrow." },
  { title: "Pawn ticket", icon: "ticket", text: "A pawn ticket for a silver pocket watch, from a shop in Brighton." },
  { title: "Unfinished poem", icon: "paper", text: "An unsigned love poem. It breaks off mid-rhyme." },
  { title: "Torn photograph", icon: "photo", text: "Half of a photograph: a seaside pier, and a hand holding an ice cream." },
];

// ---------- library: furniture ----------
// Rects are fractions of the furniture's box: [x, y, w, h]. Tags: s = surface, c = container, f = floor.
// activity: what a suspect can claim to have done here; "no" is the room's state when the claim is a lie.
// hidden: a spot that only appears once a hint about it is applied in the right room.
export const KINDS = {
  bookshelf: {
    label: "Bookshelf",
    parts: [
      { id: "top", label: "Upper shelves", r: [0.06, 0.04, 0.88, 0.44], tag: "c", flavor: ["Rows of leather-bound sermons and atlases. Nothing tucked between them.", "Travel diaries, pressed flowers in a few. Nothing else."] },
      { id: "low", label: "Lower shelves", r: [0.06, 0.52, 0.88, 0.44], tag: "c", flavor: ["Old magazines and a chess set with a missing knight.", "Bound volumes of Punch, in order."] },
    ],
    activity: { part: "top", act: "looking for a book to read", title: "Undisturbed books", no: "The books stand in tight rows under an even film of dust. Not one has been taken out in weeks." },
    hidden: { label: "Loose back panel", r: [0.56, 0.08, 0.32, 0.18], phrase: "behind a loose panel at the back of a bookshelf", found: "behind a loose panel at the back of the bookshelf" },
  },
  desk: {
    label: "Writing desk",
    parts: [
      { id: "top", label: "Desktop", r: [0.02, 0, 0.96, 0.22], tag: "s", flavor: ["A blotter, a pen tray and a brass lamp.", "A pile of unopened bills, squared neatly."] },
      { id: "drawer", label: "Drawer", r: [0.08, 0.26, 0.4, 0.22], tag: "c", flavor: ["Envelopes, stamps and a stick of sealing wax.", "Paper clips and a broken fountain pen."] },
    ],
    activity: { part: "top", act: "writing letters at the desk", title: "Dry inkwell", no: "The inkwell has dried to a crust and the blotter is spotless. Nobody wrote anything here tonight." },
    hidden: { label: "False drawer bottom", r: [0.52, 0.26, 0.4, 0.22], phrase: "under the false bottom of a desk drawer", found: "under the false bottom of the desk drawer" },
  },
  fireplace: {
    label: "Fireplace",
    parts: [
      { id: "mantel", label: "Mantelpiece", r: [0, 0, 1, 0.16], tag: "s", flavor: ["A carriage clock and two china dogs.", "Invitations propped behind a pair of candles."] },
      { id: "grate", label: "Grate", r: [0.24, 0.4, 0.52, 0.56], tag: "f", flavor: ["Ash and the charred stub of a log.", "Grey ash. Nothing in it but ash."] },
    ],
    activity: { part: "grate", act: "sitting by the fire", title: "Cold grate", no: "The grate is cold and swept clean. No fire was lit here tonight." },
    hidden: { label: "Smoke shelf", r: [0.3, 0.2, 0.4, 0.16], phrase: "up a chimney, on the smoke shelf", found: "up the chimney, on the smoke shelf" },
  },
  armchair: {
    label: "Armchair",
    parts: [
      { id: "seat", label: "Between the cushions", r: [0.12, 0.38, 0.76, 0.28], tag: "c", flavor: ["A lost sixpence and some biscuit crumbs.", "A hairpin. No, a bent paper clip."] },
    ],
    activity: { part: "seat", act: "dozing in the armchair", title: "Smooth cushions", no: "The cushions are plump and perfectly smooth. Nobody has sat here for hours." },
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
    activity: { part: "sill", act: "watching the storm from the window", title: "Fogged window", no: "The window is fogged over from inside, and nobody has wiped a spot clear. Nobody stood here looking out." },
    hidden: { label: "Hollow pelmet", r: [0, 0, 1, 0.1], phrase: "in the hollow pelmet box above some curtains", found: "in the hollow pelmet above the curtains" },
  },
  painting: {
    label: "Painting",
    parts: [{ id: "frame", label: "Painting", r: [0, 0, 1, 1], tag: "s", flavor: ["A gloomy ancestor in oils, looking down a long nose.", "A ship in a storm. The varnish has yellowed."] }],
    hidden: { label: "Wall safe behind the painting", r: [0.25, 0.25, 0.5, 0.5], phrase: "in a wall safe behind a painting", found: "in the wall safe behind the painting" },
  },
  piano: {
    label: "Piano",
    parts: [
      { id: "keys", label: "Keyboard", r: [0.06, 0.38, 0.88, 0.14], tag: "s", flavor: ["The middle C sticks a little.", "Ivory keys, yellowed with age."] },
      { id: "stand", label: "Music stand", r: [0.3, 0.06, 0.4, 0.28], tag: "s", flavor: ["Sheet music for a Strauss waltz.", "A book of hymns, open at the funeral march. Cheerful."] },
      { id: "bench", label: "Piano bench", r: [0.32, 0.72, 0.36, 0.28], tag: "c", flavor: ["Old song books and a tuning fork.", "Under the lid: a tin of rosin and a pencil."] },
    ],
    activity: { part: "keys", act: "playing the piano", title: "Locked piano", no: "The keyboard lid is locked, and its key hangs on a hook under a film of dust. Nobody played tonight." },
    hidden: { label: "Inside the piano", r: [0.06, 0.06, 0.22, 0.28], phrase: "inside a piano, under the lid", found: "inside the piano, under the lid" },
  },
  clock: {
    label: "Grandfather clock",
    parts: [
      { id: "face", label: "Clock face", r: [0.1, 0.04, 0.8, 0.24], tag: "s", flavor: ["The clock is three minutes fast.", "The hands stand at the right time. It ticks loudly."] },
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
    activity: { part: "spread", act: "lying down with a headache", title: "Untouched bed", no: "The bedspread is crisp and tightly tucked in. Nobody has lain here tonight." },
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
    activity: { part: "top", act: "pouring myself a nightcap", title: "Full decanters", no: "The decanters are full to the stopper and every glass is polished dry. Nobody poured a drink here." },
    hidden: { label: "Behind the cupboard's back wall", r: [0.52, 0.38, 0.42, 0.56], phrase: "behind the back wall of a sideboard cupboard", found: "behind the back wall of the sideboard cupboard" },
  },
  table: {
    label: "Table",
    parts: [
      { id: "top", label: "Table top", r: [0, 0, 1, 0.2], tag: "s", flavor: ["A bowl of wax fruit and a lace runner.", "Breadcrumbs and a folded newspaper."] },
      { id: "under", label: "Under the table", r: [0.06, 0.3, 0.88, 0.7], tag: "f", flavor: ["A dropped napkin.", "Nothing but table legs and a cat's toy."] },
    ],
    activity: { part: "top", act: "playing patience at the table", title: "Sealed cards", no: "The table is bare and the only pack of cards in the room is still sealed in its wrapper." },
    hidden: { label: "Drawer under the tabletop", r: [0.3, 0.2, 0.4, 0.1], phrase: "in a hidden drawer under a tabletop", found: "in the hidden drawer under the tabletop" },
  },
  stove: {
    label: "Kitchen range",
    parts: [
      { id: "hob", label: "Hob", r: [0, 0, 1, 0.18], tag: "s", flavor: ["A kettle and a heavy iron pan.", "A stockpot, simmering bones for tomorrow."] },
      { id: "oven", label: "Oven", r: [0.08, 0.3, 0.5, 0.42], tag: "c", flavor: ["Empty and still faintly warm.", "A tray of burnt scones, forgotten."] },
    ],
    activity: { part: "hob", act: "making a cup of cocoa", title: "Clean milk pan", no: "The milk pan hangs clean and dry on its hook, and the cocoa tin is still sealed." },
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
    activity: { part: "rack", act: "choosing a wine for tomorrow's lunch", title: "Unbroken dust", no: "Dust lies thick and unbroken on every bottle. Nobody has touched these racks in weeks." },
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
    activity: { part: "cloth", act: "practising at the billiard table", title: "Racked balls", no: "The balls sit racked in their triangle and the chalk is untouched. No game was played tonight." },
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
    activity: { part: "pots", act: "repotting the orchids", title: "Dry soil", no: "The soil in every pot is dry and crusted, and the trowel is clean. Nobody repotted anything tonight." },
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
    activity: { part: "record", act: "listening to records", title: "Locked gramophone", no: "The needle arm is clamped in its rest and every record is in its sleeve, filed away." },
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
      { id: "victim", label: "The victim", r: [0, 0, 0.7, 1], tag: "-" },
      { id: "pockets", label: "Pockets", r: [0.7, 0, 0.3, 1], tag: "-", flavor: ["A cigar case, a key ring and a few coins."] },
    ],
    hidden: { label: "Under the victim", r: [0.2, 0.62, 0.5, 0.38], phrase: "under the victim's body", found: "under the victim's body" },
  },
};

// Rooms: furniture boxes in a 400 x 260 scene (wall down to y = 175). body: free floor for the victim.
export const ROOMS = [
  { id: "library", name: "Library", theme: "library", body: [24, 200, 120, 46], furniture: [
    ["bookshelf", 10, 28, 92, 152], ["painting", 170, 18, 60, 52], ["fireplace", 148, 84, 104, 100], ["armchair", 262, 124, 66, 66], ["sidetable", 340, 146, 44, 44], ["rug", 166, 202, 156, 38]] },
  { id: "study", name: "Study", theme: "study", body: [24, 200, 124, 46], furniture: [
    ["bookshelf", 10, 28, 92, 152], ["painting", 160, 26, 84, 58], ["desk", 140, 116, 128, 72], ["window", 296, 22, 86, 108], ["armchair", 300, 134, 66, 62]] },
  { id: "music", name: "Music room", theme: "music", body: [150, 204, 126, 44], furniture: [
    ["piano", 14, 92, 150, 96], ["painting", 192, 24, 74, 56], ["gramophone", 196, 104, 60, 80], ["window", 290, 22, 90, 104], ["sofa", 270, 136, 120, 58]] },
  { id: "conservatory", name: "Conservatory", theme: "conservatory", body: [146, 206, 130, 42], furniture: [
    ["potting", 18, 112, 138, 72], ["palm", 176, 52, 74, 136], ["window", 284, 18, 98, 104], ["armchair", 296, 132, 66, 62]] },
  { id: "billiard", name: "Billiard room", theme: "billiard", body: [16, 206, 110, 42], furniture: [
    ["cuerack", 18, 36, 42, 128], ["painting", 150, 26, 92, 60], ["billiard", 112, 130, 186, 74], ["sideboard", 314, 104, 76, 80]] },
  { id: "dining", name: "Dining room", theme: "dining", body: [270, 204, 118, 44], furniture: [
    ["clock", 18, 36, 44, 150], ["painting", 128, 22, 92, 60], ["table", 76, 138, 196, 62], ["sideboard", 306, 102, 82, 82], ["window", 236, 22, 60, 76]] },
  { id: "kitchen", name: "Kitchen", theme: "kitchen", body: [36, 204, 140, 44], furniture: [
    ["stove", 16, 96, 112, 90], ["pantry", 148, 28, 92, 154], ["window", 270, 26, 90, 78], ["table", 254, 136, 132, 60]] },
  { id: "bedroom", name: "Master bedroom", theme: "bedroom", body: [12, 202, 134, 44], furniture: [
    ["wardrobe", 16, 26, 100, 160], ["window", 186, 22, 90, 78], ["bed", 148, 116, 172, 86], ["vanity", 334, 92, 56, 92], ["rug", 166, 210, 160, 34]] },
  { id: "cellar", name: "Wine cellar", theme: "cellar", body: [148, 204, 142, 44], furniture: [
    ["winerack", 14, 32, 132, 150], ["barrel", 164, 116, 68, 68], ["barrel", 240, 116, 68, 68], ["chest", 318, 134, 72, 52]] },
];

// ---------- building the case ----------
const fmtTime = (mins) => {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
export const clockAt = (used) => fmtTime(23 * 60 + 30 + used * 10);

function layoutRoom(room, isScene) {
  const furniture = room.furniture.map(([kind, x, y, w, h], i) => ({ kind, x, y, w, h, id: `${room.id}.${i}` }));
  if (isScene) {
    const [x, y, w, h] = room.body;
    furniture.push({ kind: "body", x, y, w, h, id: `${room.id}.body` });
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
  return { id: room.id, name: room.name, theme: room.theme, body: room.body, furniture };
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

  // Three suspects with three different hair colours, in a random order and with random roles.
  const pool = R.shuffle(SUSPECTS);
  const chosen = [];
  for (const s of pool) if (chosen.length < 3 && !chosen.some((c) => c.tone === s.tone)) chosen.push(s);
  const roles = R.shuffle(["M", "R", "H"]);
  const suspects = chosen.map((lib, i) => ({ id: lib.id, lib, role: roles[i], name: lib.name, short: lib.short, title: lib.title }));
  const by = Object.fromEntries(suspects.map((s) => [s.role, s]));
  const M = by.M, Rr = by.R, H = by.H;

  // Rooms: the scene plus two more. Claimed rooms need something one can claim to have done there.
  const roomDefs = R.shuffle(ROOMS).slice(0, 3);
  const scene = roomDefs[0];
  const rooms = roomDefs.map((r) => layoutRoom(r, r === scene));
  const [S, A, B] = rooms;

  const cause = R.pick(Object.keys(CAUSES));
  const ofCause = R.shuffle(WEAPONS.filter((w) => w.cause === cause));
  const weapon = ofCause[0], decoy = ofCause[1];

  const motives = R.shuffle(MOTIVES).slice(0, 3);
  const motiveOf = { M: motives[0], R: motives[1], H: motives[2] };
  const secret = SECRETS[motiveOf.R.id];
  const honest = R.pick(HONEST);

  const T = 21 * 60 + 40 + 5 * R.int(15); // between 9:40 and 10:50 pm
  const time = fmtTime(T);
  const later = fmtTime(T + 5 + 5 * R.int(3));

  // Claims: the murderer claims an activity in one room, the liar in the other.
  const [cm, cr] = R.int(2) ? [A, B] : [B, A];
  const pickActivity = (room) => R.pick(room.furniture.filter((f) => KINDS[f.kind].activity));
  const claimM = { room: cm, f: pickActivity(cm) };
  const claimR = { room: cr, f: pickActivity(cr) };
  claimM.act = KINDS[claimM.f.kind].activity;
  claimR.act = KINDS[claimR.f.kind].activity;

  // Hidden spots: the token under the victim, the weapon in another room, the murderer's motive anywhere.
  const hiddenIn = (room) => room.furniture.filter((f) => f.hiddenDef && f.kind !== "body");
  const spotToken = S.furniture.find((f) => f.kind === "body");
  const spotWeapon = R.pick([...hiddenIn(A), ...hiddenIn(B)]);
  const spotMotive = R.pick(rooms.flatMap(hiddenIn).filter((f) => f !== spotToken && f !== spotWeapon));
  const roomOf = (f) => rooms.find((r) => r.furniture.includes(f));

  // ---------- clues (field agent finds them) ----------
  const nm = (s) => s.short;
  const vars = { V, S: S.name, T: time };
  const clues = {};
  const addClue = (id, c) => { clues[id] = { id, ...c }; };
  const struggle = cause === "poison" ? "" : " There was a struggle: a chair is knocked over and the rug is rucked up.";
  addClue("body", { title: "The victim", icon: "watch", text: `${victim.name} lies dead on the floor of the ${rn(S)}, ${CAUSES[cause]}.${struggle} The victim's wristwatch smashed in the fall and stopped at ${time}.` });
  addClue("contraM", { title: claimM.act.title, icon: "magnifier", text: claimM.act.no });
  addClue("contraR", { title: claimR.act.title, icon: "magnifier", text: claimR.act.no });
  const motiveDoc = (m, s) => fill(m.doc, { V, who: nm(s), surname: s.lib.surname });
  addClue("motiveM", { title: `Hidden papers`, icon: motiveOf.M.icon, tag: `Motive for ${nm(M)}: ${motiveOf.M.label}`, text: `${motiveDoc(motiveOf.M, M)} It was hidden ${spotMotive.hiddenDef.found}.` });
  addClue("motiveH", { title: "Papers", icon: motiveOf.H.icon, tag: `Motive for ${nm(H)}: ${motiveOf.H.label}`, text: motiveDoc(motiveOf.H, H) });
  addClue("weapon", { title: cap(weapon.name), icon: weapon.id, tag: "Murder weapon", text: `A ${weapon.name}, hidden ${spotWeapon.hiddenDef.found}: ${weapon.trace}. Caught on it is a single ${M.lib.tone} hair.` });
  addClue("decoy", { title: cap(decoy.name), icon: decoy.id, text: `A ${decoy.name}. Clean and dusty; nobody has handled it in days.` });
  addClue("token", { title: "Something dropped", icon: M.lib.token.icon, text: `${cap(M.lib.token.name)}, lying ${spotToken.hiddenDef.found}. It hasn't been there long: there's no dust on it.` });
  const noise = R.shuffle(NOISE).slice(0, 3);
  noise.forEach((n, i) => addClue(`noise${i}`, { title: n.title, icon: n.icon, text: n.text }));

  // ---------- hints (interrogator learns them) ----------
  const hints = {};
  const motiveFrom = R.pick(["H", "R"]);
  hints.hMotive = { id: "hMotive", room: roomOf(spotMotive).id, spot: spotMotive.id, clue: "motiveM",
    text: `${V} quarrelled with ${nm(M)} this afternoon and waved a paper about. Everyone in the house knows ${V} hid private papers ${spotMotive.hiddenDef.phrase}.` };
  hints.hWeapon = { id: "hWeapon", room: roomOf(spotWeapon).id, spot: spotWeapon.id, clue: "weapon",
    text: `Just after ${time}, ${nm(Rr)} saw ${nm(M)} hurry out of the ${rn(S)} with something wrapped in a cloth. It ended up ${spotWeapon.hiddenDef.phrase}.` };
  hints.hToken = { id: "hToken", room: S.id, spot: spotToken.id, clue: "token",
    text: `${nm(M)} has lost ${M.lib.token.name}, and admits to having been in the ${rn(S)} tonight.` };

  // ---------- placing things in the rooms ----------
  const content = {}; // leaf id -> { clue } or { text }
  const taken = new Set();
  const put = (leaf, c) => { content[leaf.id] = c; taken.add(leaf.id); };
  const partOf = (f, pid) => f.children.find((c) => c.id === `${f.id}.${pid}`);
  put(partOf(claimM.f, claimM.act.part), { clue: "contraM" });
  put(partOf(claimR.f, claimR.act.part), { clue: "contraR" });
  const body = S.furniture.find((f) => f.kind === "body");
  put(body.children[0], { clue: "body" });
  const free = (tags) => R.shuffle(rooms.flatMap((r) => r.furniture.filter((f) => f.kind !== "body").flatMap(leaves))
    .filter((l) => !taken.has(l.id) && tags.includes(l.tag)));
  // Activity parts of unclaimed furniture stay plain so a code never sits where a claim could point.
  const activityLeaf = (l) => rooms.some((r) => r.furniture.some((f) => KINDS[f.kind].activity && l.id === `${f.id}.${KINDS[f.kind].activity.part}`));
  const place = (tags, c) => { const l = free(tags).find((x) => !activityLeaf(x)) || free(tags)[0]; put(l, c); };
  place(["s", "f"], { clue: "decoy" });
  place(["c"], { clue: "motiveH" });
  noise.forEach((_, i) => place(["s", "c", "f"], { clue: `noise${i}` }));
  for (const r of rooms) for (const l of r.furniture.flatMap(leaves)) {
    if (!content[l.id]) content[l.id] = { text: R.pick(l.def.flavor || ["Nothing of interest."]) };
  }
  // Hidden spots exist only where a hint points.
  const hiddenSpots = {};
  for (const h of Object.values(hints)) {
    const f = rooms.flatMap((r) => r.furniture).find((x) => x.id === h.spot);
    hiddenSpots[h.spot] = { id: `${f.id}.hidden`, furniture: f.id, room: h.room, label: f.hiddenDef.label, hint: h.id, clue: h.clue,
      x: f.hiddenDef.x, y: f.hiddenDef.y, w: f.hiddenDef.w, h: f.hiddenDef.h };
  }

  // ---------- dialogue ----------
  // requires: tokens the interrogator must hold. clue:x = clue code entered, q:sid:qid = question asked, ev:x = event.
  const say = (s, text) => `${s.lib.voice}${text}`;
  const others = (s) => suspects.filter((o) => o !== s);
  const opinion = (s, o) => {
    if (o === M && s.role === motiveFrom) return { text: hints.hMotive.text, gives: ["hMotive"] };
    if (s === M && o === Rr) return { text: `${nm(Rr)} slipped away straight after dinner. You might ask where to.` };
    if (s === M && o === H) return { text: `${nm(H)}? Quiet. I hardly noticed ${nm(H)} all evening.` };
    if (s === Rr && o === M) return { text: (`${nm(M)} was in a black mood at dinner. Snapped at ${V} over the soup.`) };
    if (s === Rr && o === H) return { text: (`${nm(H)} is harmless. Dull, but harmless.`) };
    if (s === H && o === Rr) return { text: (`${nm(Rr)} was jumpy all evening and kept looking at the clock.`) };
    return { text: (`${nm(o)} kept out of my way, and I kept out of theirs.`) };
  };
  const where = {
    M: `At ${time}? I was in the ${rn(claimM.room)}, ${claimM.act.act}. Alone, I'm afraid.`,
    R: `I was in the ${rn(claimR.room)}, ${claimR.act.act}. Nobody else was there.`,
    H: `I was ${honest.act}. At about ${time} I heard a door slam downstairs, and footsteps.`,
  };
  const evening = {
    M: `Dinner at eight, coffee at nine. After that I kept to myself.`,
    R: `Dinner, then I excused myself early. A headache.`,
    H: `Dinner at eight. ${V} was in a foul mood and left the table early, before nine.`,
  };
  const noticed = {
    M: `Nothing at all. I was quite absorbed in what I was doing.`,
    R: `No. Nothing. Why would I have noticed anything?`,
    H: `Only the door and the footsteps, just after ${time}. Somebody in a hurry.`,
  };
  const dialog = {};
  for (const s of suspects) {
    const qs = [
      { id: "about", label: `Who are you to ${V}?`, text: say(s, fill(s.lib.about, { V })), mood: "calm" },
      { id: "evening", label: "What did you do this evening?", text: evening[s.role], mood: "calm" },
      ...others(s).map((o) => ({ id: `on:${o.id}`, label: `What do you make of ${nm(o)}?`, mood: "calm", ...opinion(s, o) })),
      { id: "where", label: `Where were you at ${time}?`, requires: ["clue:body"], text: where[s.role], mood: s.role === "H" ? "calm" : "uneasy" },
      { id: "noticed", label: "Did you notice anything unusual?", requires: ["clue:body"], text: noticed[s.role], mood: s.role === "R" ? "uneasy" : "calm" },
    ];
    for (const q of qs) { q.requires = q.requires || []; q.gives = q.gives || []; q.events = [`q:${s.id}:${q.id}`]; }
    const confront = {};
    const asked = `q:${s.id}:where`;
    if (s === M) {
      confront.contraM = { requires: [asked], text: `...All right. I wasn't in the ${rn(claimM.room)}. I went to the ${rn(S)} to have it out with ${V}, about a private matter. But ${V} was alive when I left. I swear it.`, mood: "afraid", events: ["ev:Mbroken"] };
      confront.token = { requires: ["ev:Mbroken"], text: `So I dropped it when I was there. I've told you I was there.`, mood: "angry", alt: `That? I could have lost that anywhere, any day this week.` };
      confront.weapon = { text: `A hair? Half this house has been in and out of every room. That proves nothing!`, mood: "angry" };
      confront.motiveM = { text: fill(motiveOf.M.admit, { V }), mood: "angry" };
    }
    if (s === Rr) {
      confront.contraR = { requires: [asked], text: `Fine. I wasn't in the ${rn(claimR.room)}. I was ${fill(secret.act, { V })}. ${fill(motiveOf.R.admit, { V })} But on my way back, just after ${time}, I saw ${nm(M)} hurry out of the ${rn(S)} with something wrapped in a cloth. I followed at a distance and saw where it went: ${spotWeapon.hiddenDef.phrase}.`, mood: "afraid", gives: ["hWeapon"], events: ["ev:Rbroken"] };
    }
    if (s === H) {
      confront.motiveH = { text: fill(motiveOf.H.admit, { V }) + ` But I was ${honest.act} all evening.`, mood: "uneasy" };
    }
    confront.body = { text: "Dreadful. Simply dreadful. Must you show me that?", mood: "uneasy" };
    confront.decoy = { text: `A ${decoy.name}? What about it?`, mood: "calm" };
    if (s !== M) confront.weapon = { text: `Good heavens. Is that what did it? I've never touched it.`, mood: "afraid" };
    for (const c of Object.values(confront)) { c.requires = c.requires || []; c.gives = c.gives || []; c.events = c.events || []; }

    const fillN = (t) => fill(t, { n: nm(s), V });
    const obs = [];
    if (s === M) {
      obs.push({ id: "o1", text: `${nm(s)} keeps one hand pressed to ${s.lib.look.token === "earring" || s.lib.look.token === "hairpin" ? "the side of the head" : "the chest"}, as if hiding something.`, requires: [], region: s.lib.look.token });
      obs.push({ id: "o2", text: `${fillN(s.lib.token.missing)}`, requires: ["ev:Mbroken"], gives: ["hToken"], region: s.lib.look.token, missing: true });
    } else if (s === Rr) {
      obs.push({ id: "o1", text: fillN(secret.trace), requires: [], region: "body" });
    } else {
      obs.push({ id: "o1", text: fillN(honest.trace), requires: [], region: "body" });
    }
    obs.forEach((o) => { o.gives = o.gives || []; });
    dialog[s.id] = { questions: qs, confront, observations: obs,
      fallback: say(s, R.pick(["I don't see what that has to do with me.", "Should that mean something to me?", "I've never seen it before."])) };
  }

  const solution = { suspect: M.id, weapon: weapon.id, motive: motiveOf.M.id };
  const story = [
    `${M.name} killed ${victim.name} in the ${rn(S)} at ${time}. The motive: ${motiveOf.M.label.toLowerCase()}. ${motiveDoc(motiveOf.M, M)}`,
    `${nm(M)} used the ${weapon.name}, carried it out wrapped in a cloth and hid it ${spotWeapon.hiddenDef.found}. At the scene ${nm(M)} lost ${M.lib.token.name}; it ended up ${spotToken.hiddenDef.found}.`,
    `${nm(M)} claimed to have been in the ${rn(claimM.room)}, ${claimM.act.act}. That was a lie.`,
    `${nm(Rr)} lied too, to hide a secret: ${nm(Rr)} was ${fill(secret.told, { V })}.`,
    `${nm(H)} told the truth from the start.`,
  ];

  const kase = { code, version: VERSION, attempt, victim, manor, cause, time, later, rooms, scene: S.id, suspects, weapon: weapon.id, decoy: decoy.id,
    clues, hints, content, hiddenSpots, dialog, solution, story, briefing: briefing(victim, manor, S, suspects, rooms) };
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
    `The police can't get through before dawn. Until then, the case is yours.`;
}

// ---------- solver ----------
// Nodes: { who: "F" | "I", requires: tokens, gives: tokens }. Tokens cross between the detectives only by
// exchange: clue:* from the field agent to the interrogator, hint:* the other way.
export function nodesOf(k) {
  const nodes = [];
  for (const r of k.rooms) for (const l of r.furniture.flatMap(leaves)) {
    const c = k.content[l.id];
    if (c && c.clue) nodes.push({ who: "F", requires: [], gives: [`clue:${c.clue}`], at: l.id });
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
export const GOAL = ["clue:weapon", "clue:motiveM", "clue:token", "ev:Mbroken", "ev:Rbroken"];

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
    if (GOAL.every((g) => all.has(g))) return { solved: true, rounds };
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
  for (const id of Object.keys(k.clues)) {
    const placed = Object.values(k.content).some((c) => c.clue === id) || Object.values(k.hiddenSpots).some((h) => h.clue === id);
    if (!placed) problems.push(`clue ${id} not placed`);
  }
  return problems;
}

const cache = new Map();
export function makeCase(code) {
  if (cache.has(code)) return cache.get(code);
  for (let attempt = 0; attempt < 50; attempt++) {
    const k = build(code, attempt);
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
