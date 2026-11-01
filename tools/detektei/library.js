// The case library: people, motives, weapons, traces, finds, dialogue and locks. Pure data; the generator picks
// from it. Adding entries here adds variety; any change alters every case, so bump VERSION in util.js.

// ---------- library: people ----------
// look: how the body is drawn on the floor. hair is "bald", "short" or "long".
export const VICTIMS = [
  { name: "Lord Ambrose Thorne", pro: "m", short: "Lord Thorne", look: { hair: "bald", hairColor: "#9a9a96", suit: "#2b2a33", shirt: "#f4efe2" } },
  { name: "Lady Cordelia Blackwood", pro: "f", short: "Lady Blackwood", look: { hair: "long", hairColor: "#2a1f1d", suit: "#5a2a4a", shirt: "#e9dcc8", dress: true } },
  { name: "Sir Jasper Wren", pro: "m", short: "Sir Jasper", look: { hair: "short", hairColor: "#6b4a2b", suit: "#3a3f4a", shirt: "#f4efe2" } },
  { name: "Lady Honoria Vale", pro: "f", short: "Lady Vale", look: { hair: "long", hairColor: "#b9b6b0", suit: "#2f5a4a", shirt: "#e9dcc8", dress: true } },
  { name: "Mr. Silas Grimshaw", pro: "m", short: "Mr. Grimshaw", look: { hair: "short", hairColor: "#1f1b1b", suit: "#4a3a2a", shirt: "#f4efe2" } },
  { name: "Mrs. Edith Marlowe", pro: "f", short: "Mrs. Marlowe", look: { hair: "long", hairColor: "#7a4a2a", suit: "#2f3f6a", shirt: "#e9dcc8", dress: true } },
  { name: "Sir Percival Dunmore", pro: "m", short: "Sir Percival", look: { hair: "short", hairColor: "#c9c4b8", suit: "#2a3a2a", shirt: "#f4efe2" } },
  { name: "Mrs. Lavinia Crowe", pro: "f", short: "Mrs. Crowe", look: { hair: "long", hairColor: "#3b2a20", suit: "#3a2a5a", shirt: "#e9dcc8", dress: true } },
];
export const MANORS = ["Thornbury Hall", "Ravenscourt", "Hollowmere Manor", "Blackwood House", "Wrenfield Park", "Ashgrove Manor",
  "Fenwick Grange", "Coldharbour House", "Stillwater Abbey", "Kestrel Hall", "Morwenna Court"];

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
    token: { name: "a horn button from an apron strap", icon: "hornbutton", missing: "One strap of {n}'s apron hangs loose; its horn button is gone." },
    look: { skin: "#e9b08e", hair: "capped", hairColor: "#b8452a", outfit: "apron", color: "#6f8296", accent: "#f4f1ea", extras: [], token: "strap" } },
  { id: "lark", temper: "afraid", name: "Theo Lark", short: "Theo Lark", surname: "Lark", title: "Portrait painter", tone: "black",
    about: "{V} commissioned a portrait. I've been here a month and painted nothing worth keeping.", voice: "Ah. ",
    token: { name: "a paint-flecked wooden button", icon: "woodbutton", missing: "{n}'s painting smock is missing a wooden button near the top." },
    look: { skin: "#c98f6a", hair: "curly", hairColor: "#1e1a19", outfit: "smock", color: "#c46b2b", accent: "#e8d6a8", extras: ["beret", "scarf"], token: "buttons" } },
  { id: "finch", temper: "afraid", name: "Miss Clara Finch", short: "Miss Finch", surname: "Finch", title: "Private secretary", tone: "red",
    about: "I kept {V}'s diary and letters for six years.", voice: "",
    token: { name: "a small silver earring", icon: "silverearring", missing: "{n} has a silver earring in one ear only." },
    look: { skin: "#f3d2bb", hair: "bob", hairColor: "#8e3b1f", outfit: "cardigan", color: "#5f8668", accent: "#efe7d3", extras: ["glasses"], token: "earring", earring: "#c8ccd4" } },
  { id: "vance", temper: "angry", name: "Rupert Vance", short: "Vance", surname: "Vance", title: "Business partner", tone: "brown",
    about: "{V} and I built the company together, thirty years ago.", voice: "Frankly? ",
    token: { name: "a gold tie pin", icon: "tiepin", missing: "{n}'s tie is held by nothing; a tiny hole shows where a tie pin sat." },
    look: { skin: "#d9a582", hair: "short", hairColor: "#4a3020", outfit: "suit", color: "#555c66", accent: "#9b2d2d", extras: ["beard", "tie"], token: "tiepin" } },
  { id: "hartley", temper: "angry", name: "Nell Hartley", short: "Nell", surname: "Hartley", title: "Gardener", tone: "fair",
    about: "I keep the grounds. {V} cared more for the roses than for the people.", voice: "Aye. ",
    token: { name: "a brass button from a dungaree strap", icon: "button", missing: "One of {n}'s dungaree straps is tied in a knot; its brass button is gone." },
    look: { skin: "#e2a988", hair: "braid", hairColor: "#d6b35e", outfit: "overalls", color: "#4f6b3a", accent: "#e9dfc4", extras: ["cap"], token: "strap" } },
  { id: "quill", temper: "afraid", name: "Reverend Septimus Quill", short: "Reverend Quill", surname: "Quill", title: "Vicar of the parish", tone: "white",
    about: "I have been {V}'s vicar for nine years. {V} came to church at Christmas, and only to be seen.", voice: "Dear me. ",
    token: { name: "a mother-of-pearl shirt stud", icon: "stud", missing: "{n}'s shirt front is fastened with two studs where there should be three." },
    look: { skin: "#eac3a4", hair: "short", hairColor: "#e8e6e0", outfit: "tailcoat", color: "#1c1c22", accent: "#f4f1ea", extras: ["glasses"], token: "studs" } },
  { id: "garrow", temper: "angry", name: "Miss Rosalind Garrow", short: "Miss Garrow", surname: "Garrow", title: "Actress, a house guest", tone: "brown",
    about: "{V} saw me as Lady Macbeth in the West End and invited me down for the week. I'm beginning to see why.", voice: "Really, darling. ",
    token: { name: "an emerald drop earring", icon: "earring", missing: "{n} wears an emerald earring in one ear only." },
    look: { skin: "#eec4a6", hair: "wavy", hairColor: "#5a3a22", outfit: "dress", color: "#2f6a5a", accent: "#e8d8b0", extras: ["pearls"], token: "earring", earring: "#3fa36b" } },
];

// What a suspect's motive is, as found in a document, and how the suspect talks about it. Every suspect has two
// grudges in every case; one of them was settled before tonight. settled: the paper that shows it, found in the
// rooms. told: how a third person who knows about the settlement puts it. dinner: how it came up at dinner.
export const MOTIVES = [
  { id: "inheritance", title: "New will", label: "Inheritance", icon: "will",
    doc: "A new will in {V}'s hand, signed last week. {who} is cut out entirely; the old will left {who} half the estate.",
    admit: "Yes, {V} meant to cut me out of the will. I was furious. But furious isn't murderous.",
    settled: { title: "Solicitor's letter", icon: "letter", text: "A letter from {V}'s solicitor, dated yesterday: at {Vhis} request the new will has been destroyed, and the old one, which provides for {who}, stands." },
    told: "That new will? {V} had it torn up. {who} was in the old will again by yesterday; {V} told me so {Vself}.",
    dinner: "{V} talked about wills over the soup. {who} went quite white." },
  { id: "blackmail", title: "Photographs", label: "Blackmail", icon: "photo",
    doc: "Photographs and a note in {V}'s hand: \"{who}: two hundred pounds a month, or everyone sees these.\"",
    admit: "{V} was bleeding me dry with those photographs. I won't pretend I'm sorry it's over.",
    settled: { title: "Envelope of negatives", icon: "photo", text: "An envelope of photographic negatives, with a note in {V}'s hand: \"Returned to {who}. We are quits.\"" },
    told: "{V} gave those photographs back to {who} last week. I saw the envelope change hands. That business was over.",
    dinner: "{V} made a joke about photographs at dinner. Nobody laughed, {who} least of all." },
  { id: "debts", title: "IOU", label: "Debts", icon: "bill",
    doc: "An IOU for four thousand pounds, signed by {who}. {V} has written across it: \"Pay by Monday or I call it in.\"",
    admit: "I owed {V} money. A great deal. {VHe} wasn't the forgiving kind.",
    settled: { title: "Receipt", icon: "bill", text: "A receipt in {V}'s hand: \"Received from {who} the sum of four thousand pounds. Paid in full.\" It is dated yesterday." },
    told: "That IOU was paid off. Every penny, yesterday; {V} crowed about it at tea.",
    dinner: "{V} said at dinner that some people in this house owed {Vhim} money. {who} studied the tablecloth." },
  { id: "jealousy", title: "Letter to a sweetheart", label: "Jealousy", icon: "loveletter",
    doc: "A love letter from {V} to the person {who} hoped to marry. It is dated this week.",
    admit: "{V} took the one person I cared about. Just to prove {Vhe} could.",
    settled: { title: "Note from a sweetheart", icon: "letter", text: "A note to {V} from the person {who} hoped to marry: \"Please stop writing to me. I have given my word to {who}, and I mean to keep it.\"" },
    told: "Whatever {V} wrote in those letters, it came to nothing. The engagement to {who} is on again; I had it from {V}.",
    dinner: "{V} read out a letter at dinner, a love letter. {who} left the table for a minute." },
  { id: "revenge", title: "Newspaper clipping", label: "Revenge", icon: "clipping",
    doc: "A yellowed newspaper clipping: \"{surname} family ruined in share swindle\". {V}'s name is circled in ink.",
    admit: "{V} ruined my family twenty years ago. I never forgot it.",
    settled: { title: "Deed of settlement", icon: "will", text: "A deed signed by {V} and {who} last month: {V} repays the {surname} family's losses from the old share swindle, with interest. Both have signed." },
    told: "{V} paid back the {surname} family last month, every pound lost in that old swindle. {who} shook {Vhis} hand on it; I was there.",
    dinner: "Somebody mentioned the stock market at dinner. {who} put down the fork and stared at {V}." },
  { id: "exposure", title: "Ledger pages", label: "Fear of exposure", icon: "ledger",
    doc: "Ledger pages in {who}'s handwriting, with {V}'s red notes in the margin: \"Money missing. Police on Monday.\"",
    admit: "I borrowed from the accounts. {V} found out. I meant to pay it all back.",
    settled: { title: "Note on the accounts", icon: "paper", text: "A note in {V}'s hand: \"{who} has put back every penny. No police. The matter is closed.\"" },
    told: "The missing money? {who} put it all back. {V} said the matter was closed, and {V} didn't say that lightly.",
    dinner: "{V} said something at dinner about auditors. {who} laughed too loudly." },
  { id: "eviction", title: "Letter of eviction", label: "Eviction", icon: "letter",
    doc: "A letter in {V}'s hand, dated today: \"{who} is to leave this house by the end of the month, and is not to come back.\" Sealed, ready for the post.",
    admit: "{V} meant to turn me out of this house. Where would I have gone, at my age?",
    settled: { title: "Torn-up letter", icon: "scrap", text: "The pieces of a torn-up letter ordering {who} out of the house. Across them, in {V}'s hand: \"Changed my mind. {who} stays.\"" },
    told: "{V} tore up that letter about turning {who} out. I watched {Vhim} do it, yesterday after lunch.",
    dinner: "{V} said at dinner that some people had outstayed their welcome. {who} stopped eating." },
  { id: "forgery", title: "Forged cheque", label: "Forgery", icon: "bill",
    doc: "A cheque for five hundred pounds bearing {V}'s signature, and pinned to it {V}'s note: \"Not my hand. {who} forged it. The bank hears of it on Monday.\"",
    admit: "I signed {V}'s name. Once. I was desperate, and {V} found out.",
    settled: { title: "Letter from the bank", icon: "letter", text: "A letter from {V}'s bank, dated yesterday: at {Vhis} instruction the disputed cheque has been honoured, and no complaint will be made against {who}." },
    told: "That cheque business? {V} squared it with the bank. No complaint against {who}; {V} told me so {Vself}.",
    dinner: "{V} talked about forgers at dinner, and how they always hang themselves in the end. {who} reached for the wine." },
  { id: "theft", title: "Pawnbroker's letter", label: "Theft", icon: "ticket",
    doc: "A pawnbroker's letter to {V}: the family's emerald brooch was pawned in London last month by {who}. {V} has underlined the name twice.",
    admit: "I pawned the brooch. I meant to buy it back before anyone noticed. {V} noticed.",
    settled: { title: "Pawnbroker's receipt", icon: "ticket", text: "A pawnbroker's receipt: the emerald brooch, redeemed in full. Pinned to it, in {V}'s hand: \"Back where it belongs. {who} and I are square.\"" },
    told: "The brooch is back in its case; {who} redeemed it. {V} showed me the receipt and said that was the end of it.",
    dinner: "{V} asked at dinner whether anyone had seen the emerald brooch lately. {who} said nothing at all." },
];

// Where the suspect who lies to hide a secret really was. Keyed by that suspect's motive.
export const SECRETS = {
  inheritance: { act: "in {V}'s dressing room upstairs, reading the new will I was never meant to see", told: "reading {V}'s new will in secret", trace: "A faint smell of {V}'s cologne clings to {n}'s clothes." },
  blackmail: { act: "up in the attic, searching {V}'s old trunks", told: "searching the attic for the photographs {V} held", trace: "There are cobwebs on {n}'s shoulder and dust on both knees." },
  debts: { act: "in the hall, on the telephone, begging creditors for one more week", told: "on the telephone, begging creditors for time", trace: "A telephone number is scribbled in pencil on {n}'s wrist." },
  jealousy: { act: "out in the garden, waiting for someone who never came", told: "waiting in the garden for a secret meeting", trace: "Wet grass clings to {n}'s shoes, and the hems are damp." },
  revenge: { act: "on the terrace with a bottle of {V}'s whisky, thinking about old wrongs", told: "drinking alone on the terrace", trace: "{n}'s breath smells of whisky, and the eyes are red." },
  exposure: { act: "in the gatehouse, burning the account books before anyone could read them", told: "burning the account books in the gatehouse", trace: "There is soot on {n}'s fingertips and a smell of smoke." },
  eviction: { act: "up in the box room, packing my trunk in case I was thrown out tonight", told: "packing a trunk in the box room, ready to leave", trace: "A luggage label is stuck to {n}'s sleeve, and the cuffs are grey with box-room dust." },
  forgery: { act: "in the post room by the back door, steaming open {V}'s letter to the bank", told: "steaming open {V}'s letters in the post room", trace: "{n}'s fingertips are pink and puckered, as if from steam, and there's a smear of sealing wax on one cuff." },
  theft: { act: "in the gun room, hunting through {V}'s cabinet for the pawn ticket", told: "searching the gun room for a pawn ticket", trace: "There's gun oil on {n}'s fingers; the smell of it hangs about the cuffs." },
};

// Traces an interrogator can notice on a suspect. A lying suspect shows the trace of the secret above; everybody
// else shows one of the remaining traces, so a trace alone never tells who lied.
export const TRACES = [
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
export const WOUNDS = {
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
export const HAIR_GROUP = { black: "dark", brown: "dark", grey: "pale", white: "pale", fair: "pale", red: "red" };
export const SHOES = [
  { id: "hobnails", worn: "heavy hobnailed boots", print: "the print of a heavy boot, every hobnail clear" },
  { id: "pumps", worn: "narrow evening pumps", print: "the print of a narrow evening shoe with a pointed toe" },
  { id: "galoshes", worn: "rubber galoshes over the shoes", print: "the ribbed print of a rubber galosh" },
  { id: "brogues", worn: "brogues", print: "the print of a brogue, its punched pattern clear" },
];
export const SMOKES = [
  { id: "pipe", has: "{n} smells of pipe tobacco; there's a pipe in the breast pocket.", ash: "a fresh plug of pipe ash, still faintly warm" },
  { id: "turkish", has: "{n}'s fingers are stained yellow, and a case of Turkish cigarettes shows in a pocket.", ash: "the stub of a Turkish cigarette, smoked down to the gold band" },
  { id: "cheroot", has: "{n} smells of cheroots, strong and sweet.", ash: "the chewed end of a cheroot" },
  { id: "none", has: "{n} doesn't smoke: clean fingers, and no smell of tobacco at all." },
];
export const HAND_TELL = {
  blunt: "From the angle of the blow, the killer is {hand}-handed.",
  sharp: "From the angle of the wound, the killer held the blade in the {hand} hand.",
  cord: "The cord was pulled hardest from the {hand}: a {hand}-handed killer.",
};

// Finds: everything the field agent can turn up besides the fixed pieces of the case. Each find belongs to a
// suspect ({X}, or the initial {I}). The generator decides per case what a find means: most get an innocent
// explanation, some lead somewhere when their owner is confronted, and "presence" finds put their owner in a
// room, fresh (tonight) or dusty (days ago). where: the spot tags it may lie in.
export const FINDS = [
  { title: "Crossword", icon: "paper", where: "sc", text: "A half-finished crossword with {X}'s name pencilled in the margin. Someone has written MOTIVE into 7 across, then rubbed it out.", react: "I do the crossword every evening. Seven across was MOTIVE. A coincidence, Inspector." },
  { title: "Matchbook", icon: "matches", where: "scf", text: "A matchbook from the Blue Parrot Club, London, with {X}'s initials pencilled inside the cover. Three matches used.", react: "The Blue Parrot? I go dancing there now and then. It's no secret." },
  { title: "Train ticket", icon: "ticket", where: "scw", text: "An unused ticket for the 6:15 train to London, dated tomorrow, in the name of {X}.", react: "I meant to leave in the morning. After tonight, I'd say that's understandable." },
  { title: "Pawn ticket", icon: "ticket", where: "scw", text: "A pawn ticket in the name of {X}, for a silver pocket watch, from a shop in Brighton.", react: "Times have been hard. I'll redeem the watch when I can." },
  { title: "Unfinished poem", icon: "paper", where: "scw", text: "An unfinished love poem in {X}'s handwriting. It breaks off mid-rhyme.", react: "Poetry isn't a crime. Bad poetry, perhaps." },
  { title: "Torn photograph", icon: "photo", where: "scw", text: "Half of a photograph: a seaside pier, and {X} holding an ice cream.", react: "Brighton, years ago. I tore it in a temper. I don't even remember why." },
  { title: "Folded note", icon: "paper", where: "scw", text: "A folded note in {X}'s handwriting: \"After dinner. The usual place. Don't be late.\"", react: "That note is about a game of cards. We play every Saturday. Ask anyone." },
  { title: "Diary page", icon: "paper", where: "scw", text: "A page torn from {V}'s diary: \"Must speak to {X} about the money. This cannot go on.\"", react: "{V} lent me money years ago, and I paid every penny back. Whatever {V} wrote, that matter was closed." },
  { title: "Telegram", icon: "telegram", where: "scw", text: "A telegram to {X}: \"ARRIVING TUESDAY STOP SAY NOTHING TO ANYONE STOP\"", react: "My brother is coming to visit, and the family can't stand him. That's all it is." },
  { title: "Pill box", icon: "pills", where: "sc", text: "An empty pill box from a London chemist, made out to {X}. \"Two at bedtime.\"", react: "Sleeping pills. I haven't slept properly in years. Is that a crime now?" },
  { title: "Jeweller's bill", icon: "bill", where: "scw", text: "An unpaid bill from a Bond Street jeweller, made out to {X}: one diamond brooch.", react: "A gift for someone dear to me. I'll pay it when I can." },
  { title: "Slashed sketch", icon: "sketch", where: "scw", text: "A charcoal sketch of {V}, slashed through twice. It is signed with the initial {I}.", react: "I spoiled the drawing and lost my temper with it. With the drawing, mind you." },
  { title: "Brass key", icon: "key", where: "scf", text: "A small brass key on a ribbon, labelled \"Gatehouse\" in {X}'s handwriting.", react: "I borrowed it weeks ago to fetch the deck chairs, and forgot to give it back." },
  { title: "Revolver cartridge", icon: "cartridge", where: "scf", text: "A single unfired revolver cartridge, wrapped in a sheet of {X}'s letter paper.", react: "My father's. I keep it for luck. The revolver went to a museum years ago." },
  { title: "Railway timetable", icon: "paper", where: "scw", text: "A railway timetable with the 11:15 night train circled in red. {X}'s name is written on the cover.", react: "I like to know my way out of a place. An old habit." },
  { title: "Racing slip", icon: "ticket", where: "scw", text: "A betting slip in {X}'s name: ten pounds on Lucky Lad, the 3:30 at Epsom. Lucky Lad came last.", react: "A harmless flutter. A losing one, as you can see." },
  { title: "Burnt scrap", icon: "scrap", where: "scf", text: "A scrap of burnt paper in {X}'s handwriting. Only a few words are left: \"...will never forgive...\"", react: "A letter to my sister that I thought better of sending. We don't get on." },
  { title: "Love letter", icon: "loveletter", where: "scw", text: "A love letter to {X}, unsigned. The handwriting is shaky.", react: "That letter is private, and it has nothing to do with {V}. Put it away." },
  { title: "Letter of complaint", icon: "letter", where: "scw", text: "A letter from {X} to {V}, complaining about the draughts in the guest rooms. Three pages long.", react: "The draughts in this house are criminal. That's the only crime I've ever accused anyone of." },
  { title: "Opera programme", icon: "paper", where: "scw", text: "A programme from Covent Garden, last Saturday's Tosca, with {X}'s name on the cover and a telephone number pencilled inside.", react: "I went to the opera. The number is my tailor's, if you must know." },
  { title: "Chess problem", icon: "paper", where: "sc", text: "A chess problem clipped from The Times, with {X}'s solution scrawled underneath. It is wrong.", react: "I never claimed to be good at chess. Only keen." },
  { title: "Sweepstake ticket", icon: "ticket", where: "scw", text: "An Irish Sweepstake ticket in {X}'s name. The draw was last week.", react: "A shilling's worth of hope. It didn't come off." },
  { title: "Recipe card", icon: "paper", where: "scw", text: "A recipe card for seed cake in {X}'s handwriting, with a note at the bottom: \"less sugar for {V}\".", react: "{V} liked seed cake. I had it made for {Vhim} once or twice. Is that sinister now?" },
  { title: "Unsent postcard", icon: "letter", where: "scw", text: "A postcard of Blackpool Tower in {X}'s hand, addressed but never sent: \"Wish you were here. Wish I wasn't.\"", react: "A joke for an old friend. I never got round to posting it." },
  { title: "Hotel bill", icon: "bill", where: "scw", text: "A bill from the Grand Hotel, Eastbourne, made out to {X}: two nights, for two guests.", react: "I stayed at the seaside. With whom is my own affair." },
  { title: "Chemist's receipt", icon: "bill", where: "scw", text: "A receipt from the village chemist, made out to {X}: one bottle of laudanum.", react: "For my nerves. Ask the chemist; I buy a bottle every month." },
  { title: "Stained handkerchief", icon: "handkerchief", where: "scf", presence: true, text: "A handkerchief embroidered with the letter {I}, with a few spots of dried blood.", react: "A nosebleed, days ago. The damp in this house gives me nosebleeds." },
  { title: "Spectacle case", icon: "speccase", where: "scf", presence: true, text: "An empty spectacle case. The initial {I} is stamped on the lid.", react: "Oh, there it is. I've been looking for that case all week." },
  { title: "Single glove", icon: "glove", where: "scf", presence: true, text: "A single leather driving glove with the initial {I} stamped inside the cuff.", react: "I lost that glove days ago. I've been driving one-handed ever since." },
  { title: "Cigarette end", icon: "cigarette", where: "sf", presence: true, text: "A cigarette end with a gold band: {X}'s brand. Nobody else in the house smokes them.", react: "I smoke where I please. That one's old, as you can see." },
];
export const FRESH = " It hasn't been there long: there's no dust on it.";
export const DUSTY = " It is grey with dust; it has been lying here for days.";

// Dialogue that any suspect may say, whatever their part in the case. {o} is another suspect.
export const EVENING = [
  "Dinner at eight, coffee at nine. After that I kept to myself.",
  "Dinner, then I excused myself early. A headache.",
  "Dinner at eight. {V} was in a foul mood and left the table early, before nine.",
  "Dinner, a hand of bridge, then everyone went their own way.",
  "We dined at eight. {V} barely said a word all through the meal.",
  "Dinner, and a glass of port after. Then the storm got worse and everyone scattered.",
  "Dinner at eight. {V} picked a quarrel with everyone in turn, then went off alone.",
  "A long dinner, short tempers all round, and an early night for most of us.",
];
export const NOTICED = [
  "Nothing at all. I was quite absorbed in what I was doing.",
  "No. Nothing. Why would I have noticed anything?",
  "Only the storm. It rattled every window in the house.",
  "The lights flickered once, around {T}. That's all.",
  "I heard a door slam somewhere downstairs, a little after {T}. The wind, I thought.",
  "A dog barking out at the stables, just after {T}. Nothing more.",
  "A shutter came loose upstairs around {T} and banged for an age. Nobody went to see to it.",
  "I thought I smelt smoke at one point, but it was only the fires drawing badly in the wind.",
  "Somebody on the back stairs a little before {T}. A servant, I supposed.",
];
export const ALONE = ["Alone, I'm afraid.", "Nobody else was there.", "On my own, the whole time.", "Nobody can vouch for me, if that's what you mean.",
  "I prefer my own company of an evening.", "Quite alone. I like it that way, in a house like this."];

// ---------- library: twists ----------
// A case has at most one twist in how the murder was done and at most one in what the others did, and often none.
// No twist is announced; each changes which facts hold, and the solver checks that the case can still be worked out.
//   staged: the murderer set the victim's watch forward; the murderer's alibi holds for the false time only.
//   moved:  the victim died in the murderer's own alibi room and was dragged to where they lie.
//   poison: the poison went into a drink an hour earlier; the murderer's alibi for the death is true.
//   lovers: the two innocent suspects lie to hide an affair, and give each other away when the lie breaks.
//   frame:  the murderer left an innocent suspect's lost belonging under the body.
export const CORE_TWISTS = ["staged", "moved", "poison"];
export const TRYST = ["in the summer house", "in the boathouse down by the lake", "in the old nursery at the top of the house", "in the chauffeur's flat over the garage",
  "in the old greenhouse behind the stables", "in the folly at the end of the lake path"];
export const TRYST_TRACE = ["A crushed rose petal is caught in {n}'s collar.", "{n} smells faintly of somebody else's scent: lily of the valley.", "There is a smear of lipstick, not quite wiped away, near {n}'s ear.",
  "{n}'s collar is buttoned crooked, as if in a hurry, and there's a leaf caught in it."];
export const STAGED_TELL = [
  "Odd, though: the winding crown is pulled out, the way you pull it to set the hands.",
  "Odd, though: the hands still turn when you touch the crown. Someone has pulled it out to set them.",
  "Odd, though: the crown is pulled out, and there's a fresh scratch beside it, as if a fingernail slipped.",
];

// Relationships between two suspects, as each tells it. {o}: the other one.
export const RELATIONS = [
  { id: "friends", a: "{o} and I go back thirty years. Whatever {o} is, {o} is no killer.", b: "{o} is an old friend. I'd trust {o} with my life." },
  { id: "rivals", a: "{o} and I have never got on. I wouldn't put much past {o}.", b: "{o}? We can't stand each other, and everyone knows it." },
  { id: "kin", a: "{o} is my cousin, for my sins. Family, you know.", b: "{o} and I are cousins. We were close once." },
  { id: "strangers", a: "I barely know {o}. We met on Friday.", b: "{o}? Arrived on Friday. Hardly said a word to me." },
  { id: "debt", a: "{o} owes me twenty pounds and pretends not to remember.", b: "I owe {o} a little money. A trifle. {o} keeps mentioning it." },
  { id: "flame", a: "{o} and I were engaged once, a long time ago. It ended badly.", b: "{o}? We were nearly married, once. Ancient history." },
  { id: "neighbours", a: "{o} lives two villages over. We nod at church and leave it there.", b: "Neighbours, more or less. Perfectly civil, and no more than that." },
];
export const NOT_SEEN = ["I couldn't tell you where {o} was. I didn't see {o} all evening.", "Where {o} really was? No idea, I'm afraid.", "I didn't see {o} after dinner.",
  "Not a glimpse of {o} all evening. Ask somebody else.", "I wasn't keeping an eye on {o}, Inspector. I had my own troubles."];
export const SEEN = [
  "{o} wasn't in the {r}? No. I can tell you where {o} was: I saw {o} {told}, at about {T}.",
  "So {o} lied to you. I'm not surprised. But I saw {o} {told} just before {T}, and {o} was still there when I went past again.",
  "{o} wasn't in the {r}, no. I kept quiet to spare {o} the embarrassment, but I saw {o} {told}, around {T}. I'd swear to it.",
];
export const BODY_REACT = ["Dreadful. Simply dreadful. Must you show me that?", "Put it away, please. I saw enough when they found {Vhim}.", "Poor {V}. Whatever {Vhe} was, {Vhe} didn't deserve that.",
  "I'd rather not look again, if it's all the same to you.", "{V} had enemies. That much is plain from this.", "Cover {Vhim} up, for pity's sake."];
export const WEAPON_REACT = ["Good heavens. Is that what did it? I've never touched it.", "I've seen it about the house, of course. Everyone has.", "Must I look at that? It could have been anyone's hand on it.",
  "That? It's always lying about somewhere in this house.", "Take it away. I don't want my fingers anywhere near it.", "So that's what it was. I'd wondered."];
export const TRACE_REACT = ["Half the house could have left that.", "And you think that points to me? Look again.", "I wouldn't know anything about that.",
  "You read a great deal into very little, Inspector.", "Is that meant to frighten me?"];
export const STAIN_REACT = ["Something spilled, I expect. The maids are forever scrubbing.", "A stain? I never noticed one.", "I haven't been on my knees in that room, Inspector.",
  "The floors in this house have seen a century of spills.", "Ask the maids. Scrubbing is their business, not mine."];
// Where a witness saw a paper hidden. {owner}: whose paper it is; HIDE_ANON when the witness can't say.
export const HIDE_SAY = [
  "I saw {V} go into {room} this afternoon, straight after words with {owner}, and put something away {phrase}.",
  "{V} had {owner} in for a talk this afternoon. Afterwards I saw {Vhim} go into {room} and tuck a paper away {phrase}.",
  "If you want {V}'s secrets, try {room}. I saw {Vhim} hide something there this morning, {phrase}. {owner} had just left {Vhim}, in a temper.",
  "Earlier today I came upon {V} in {room}, putting something away {phrase}. {VHe} had just been shouting at {owner}.",
  "{owner} came out of {V}'s study white as a sheet this morning. Not ten minutes later {V} went into {room}, and hid a paper {phrase}.",
];
export const HIDE_ANON = ["Somebody was in {room} this morning, hiding something {phrase}. I saw a hand, not a face.",
  "This morning I noticed somebody in {room}, hiding something {phrase}. They had their back to me; I couldn't tell you who."];
// What a suspect says when shown something that means nothing to them.
export const SHRUG = ["I don't see what that has to do with me.", "Should that mean something to me?", "I've never seen it before.",
  "You've lost me, Inspector.", "I can't help you with that, I'm afraid."];
export const OTHERS_PAPER = ["That's {o}'s business, not mine.", "I knew nothing about that.", "Well, well. {o} kept that quiet.",
  "I'd rather not discuss {o}'s affairs.", "Good grief. I had no idea.", "{o} never breathed a word of it to me."];

// Combination locks. Each lock is set to a number the field agent finds three candidates for; only the interrogator
// learns which one counts. date: day and month of an event (4 digits). phone: the last three digits of a number.
export const LOCK_EVENTS = [
  { id: "wedding", phrase: "{Vhis} wedding", item: "A silver-framed wedding photograph. On the back, in faded ink: \"Our wedding day, {date}.\"" },
  { id: "firm", phrase: "the founding of {Vhis} firm", item: "A brass plaque from an old office door: \"Est. {date}. Honest dealing.\" Someone has scratched out \"Honest\"." },
  { id: "derby", phrase: "{Vhis} Derby win", item: "A racing print of a bay colt crossing the line, inscribed \"Lucky Star, the Derby, {date}\"." },
  { id: "medal", phrase: "{Vhis} medal for bravery", item: "A velvet medal case. Inside the lid: \"For conspicuous gallantry, {date}.\"" },
  { id: "house", phrase: "the day {Vhe} bought this house", item: "A framed deed of sale for the house, signed and sealed on {date}." },
  { id: "child", phrase: "the birth of {Vhis} only child", item: "A silver christening cup, engraved \"Born {date}\"." },
  { id: "mother", phrase: "{Vhis} mother's death", item: "A black-edged memorial card: \"In loving memory. Fell asleep {date}.\"" },
  { id: "voyage", phrase: "{Vhis} homecoming from India", item: "A steamer ticket stub, kept in a little frame: \"Bombay to Southampton, landed {date}\"." },
];
export const CARDS = [
  { id: "solicitor", phrase: "{Vhis} solicitor", item: "A calling card: \"Mr. H. Pettigrew, Solicitor, Lincoln's Inn. Telephone: Holborn {num}.\"" },
  { id: "doctor", phrase: "{Vhis} physician in London", item: "A calling card: \"Sir R. Ashby, Physician, Harley Street. Telephone: Langham {num}.\"" },
  { id: "bookmaker", phrase: "{Vhis} bookmaker", item: "A grubby calling card: \"Joe Dunne, Turf Accountant. Telephone: Epsom {num}. Discretion assured.\"" },
  { id: "tailor", phrase: "{Vhis} tailor", item: "A calling card: \"Wm. Gieves, Tailor, Savile Row. Telephone: Regent {num}.\"" },
  { id: "bank", phrase: "{Vhis} bank manager", item: "A calling card: \"Mr. A. Crabbe, Manager, County Bank. Telephone: Guildford {num}.\"" },
];
export const LOCK_RULES = {
  date: ["The combination? {V} set every lock in the house to the date of {phrase}. Sentimental, for someone so hard.", "The combination? It's the date of {phrase}, day and month. {V} used it for everything.",
    "Every lock {V} owned opened on the date of {phrase}, the day and then the month. {VHe} told me so once, in a soft moment."],
  phone: ["{V} could never remember numbers. It opens with the last three digits of the telephone number of {phrase}.", "That box? The last three figures of the telephone number of {phrase}. {V} told me once, in drink.",
    "The last three digits of the telephone number of {phrase}. {V} said a number like that was safer than any date."],
};
// Lock objects that stand on a surface or the floor; and furniture parts that can carry a lock of their own.
export const BOXES = [
  { id: "strongbox", label: "steel strongbox", icon: "strongbox" },
  { id: "tin", label: "padlocked tin", icon: "tin" },
  { id: "attache", label: "leather attaché case", icon: "attache" },
];
export const BOX_PLACES = { "desk.top": "on the desk", "table.top": "on the table", "table.under": "under the table", "sidetable.top": "on the side table",
  "bed.under": "under the bed", "sideboard.top": "on the sideboard", "vanity.top": "on the dressing table", "fireplace.mantel": "on the mantelpiece",
  "wardrobe.shelf": "on the hat shelf of the wardrobe", "chest.lid": "in the blanket chest", "potting.tools": "among the tools on the potting bench" };
export const LOCKABLE = ["desk.drawer", "chest.lid", "vanity.box", "wardrobe.drawer", "sideboard.cupboard", "clock.case", "piano.bench"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const HAIR_WORD = { dark: "a single dark hair: black or brown, it's hard to say in this light", pale: "a single pale hair: fair, grey or white, it's hard to say in this light", red: "a single red hair" };
