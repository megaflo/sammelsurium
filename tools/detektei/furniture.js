// Furniture kinds, room layouts, and how a room is laid out for a case.

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
    activity: { part: "top", act: "looking for a book to read", title: "Bookshelf", icon: "books", yes: "One book has been pulled out and pushed back crooked, leaving a clean gap in the dust. Someone was browsing here tonight.", no: "The books stand in tight rows under an even film of dust. Not one has been taken out in weeks." },
    hidden: { label: "Loose back panel", r: [0.56, 0.08, 0.32, 0.18], phrase: "behind a loose panel at the back of a bookshelf", found: "behind a loose panel at the back of the bookshelf" },
  },
  desk: {
    label: "Writing desk",
    parts: [
      { id: "top", label: "Desktop", r: [0.02, 0, 0.96, 0.22], tag: "s", flavor: ["A blotter, a pen tray and a brass lamp.", "A pile of unopened bills, squared neatly."] },
      { id: "drawer", label: "Drawer", r: [0.08, 0.26, 0.4, 0.22], tag: "c", flavor: ["Envelopes, stamps and a stick of sealing wax.", "Paper clips and a broken fountain pen."] },
    ],
    activity: { part: "top", act: "writing letters at the desk", title: "Inkwell", icon: "inkwell", yes: "The ink in the well is fresh, and the blotter shows a few lines in mirror writing. Someone wrote letters here tonight.", no: "The inkwell has dried to a crust and the blotter is spotless. Nobody wrote anything here tonight." },
    hidden: { label: "False drawer bottom", r: [0.52, 0.26, 0.4, 0.22], phrase: "under the false bottom of a desk drawer", found: "under the false bottom of the desk drawer" },
  },
  fireplace: {
    label: "Fireplace",
    parts: [
      { id: "mantel", label: "Mantelpiece", r: [0, 0, 1, 0.16], tag: "s", flavor: ["A carriage clock and two china dogs.", "Invitations propped behind a pair of candles."] },
      { id: "grate", label: "Grate", r: [0.24, 0.4, 0.52, 0.56], tag: "f", flavor: ["Ash and the charred stub of a log.", "Grey ash. Nothing in it but ash."] },
    ],
    activity: { part: "grate", act: "sitting by the fire", title: "Fire grate", icon: "grate", yes: "Embers still glow under the ash. A fire burned here this evening.", no: "The grate is cold and swept clean. No fire was lit here tonight." },
    hidden: { label: "Smoke shelf", r: [0.3, 0.2, 0.4, 0.16], phrase: "up a chimney, on the smoke shelf", found: "up the chimney, on the smoke shelf" },
  },
  armchair: {
    label: "Armchair",
    parts: [
      { id: "seat", label: "Between the cushions", r: [0.12, 0.38, 0.76, 0.28], tag: "c", flavor: ["A lost sixpence and some biscuit crumbs.", "A hairpin. No, a bent paper clip."] },
    ],
    activity: { part: "seat", act: "dozing in the armchair", title: "Armchair cushions", icon: "cushion", yes: "The cushions are flattened and still hold the shape of someone who sat here a long while tonight.", no: "The cushions are plump and perfectly smooth. Nobody has sat here for hours." },
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
    activity: { part: "sill", act: "watching the storm from the window", title: "Window pane", icon: "windowpane", yes: "A clear patch has been wiped in the fogged glass at head height. Someone stood here looking out.", no: "The window is fogged over from inside, and nobody has wiped a spot clear. Nobody stood here looking out." },
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
    activity: { part: "keys", act: "playing the piano", title: "Piano keyboard", icon: "pianokeys", yes: "The keyboard lid is open and a waltz stands on the music stand, its pages turned. Someone played tonight.", no: "The keyboard lid is locked, and its key hangs on a hook under a film of dust. Nobody played tonight." },
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
    activity: { part: "spread", act: "lying down with a headache", title: "Bedspread", icon: "bedspread", yes: "The bedspread is creased and the pillow dented. Someone lay here this evening.", no: "The bedspread is crisp and tightly tucked in. Nobody has lain here tonight." },
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
    activity: { part: "top", act: "pouring myself a nightcap", title: "Decanters", icon: "decanter", yes: "The port is down by a glass, and a sticky glass stands beside the decanter. Someone poured a drink here.", no: "The decanters are full to the stopper and every glass is polished dry. Nobody poured a drink here." },
    hidden: { label: "Behind the cupboard's back wall", r: [0.52, 0.38, 0.42, 0.56], phrase: "behind the back wall of a sideboard cupboard", found: "behind the back wall of the sideboard cupboard" },
  },
  table: {
    label: "Table",
    parts: [
      { id: "top", label: "Table top", r: [0, 0, 1, 0.2], tag: "s", flavor: ["A bowl of wax fruit and a lace runner.", "Breadcrumbs and a folded newspaper."] },
      { id: "under", label: "Under the table", r: [0.06, 0.3, 0.88, 0.7], tag: "f", flavor: ["A dropped napkin.", "Nothing but table legs and a cat's toy."] },
    ],
    activity: { part: "top", act: "playing patience at the table", title: "Playing cards", icon: "cards", yes: "A game of patience is laid out on the table, half finished.", no: "The table is bare and the only pack of cards in the room is still sealed in its wrapper." },
    hidden: { label: "Drawer under the tabletop", r: [0.3, 0.2, 0.4, 0.1], phrase: "in a hidden drawer under a tabletop", found: "in the hidden drawer under the tabletop" },
  },
  stove: {
    label: "Kitchen range",
    parts: [
      { id: "hob", label: "Hob", r: [0, 0, 1, 0.18], tag: "s", flavor: ["A kettle and a heavy iron pan.", "A stockpot, simmering bones for tomorrow."] },
      { id: "oven", label: "Oven", r: [0.08, 0.3, 0.5, 0.42], tag: "c", flavor: ["Empty and still faintly warm.", "A tray of burnt scones, forgotten."] },
    ],
    activity: { part: "hob", act: "making a cup of cocoa", title: "Milk pan", icon: "milkpan", yes: "The milk pan sits on the hob with a skin of cocoa in it, still faintly warm.", no: "The milk pan hangs clean and dry on its hook, and the cocoa tin is still sealed." },
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
    activity: { part: "rack", act: "choosing a wine for tomorrow's lunch", title: "Wine bottles", icon: "bottle", yes: "Fresh fingermarks in the dust on several bottles, and one bottle pulled half out. Someone was choosing wine here.", no: "Dust lies thick and unbroken on every bottle. Nobody has touched these racks in weeks." },
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
    activity: { part: "cloth", act: "practising at the billiard table", title: "Billiard balls", icon: "balls", yes: "The balls are scattered across the baize and one cue has fresh chalk on its tip. Someone was practising tonight.", no: "The balls sit racked in their triangle and the chalk is untouched. No game was played tonight." },
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
    activity: { part: "pots", act: "repotting the orchids", title: "Orchid pots", icon: "flowerpot", yes: "Damp, fresh soil in two orchid pots and a muddy trowel on the bench. Someone repotted here tonight.", no: "The soil in every pot is dry and crusted, and the trowel is clean. Nobody repotted anything tonight." },
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
    activity: { part: "cage", act: "feeding the canary", title: "Seed cup", icon: "seeddish", yes: "The seed cup is full of fresh seed and the water dish is topped up. Someone fed the bird tonight.", no: "The seed cup holds nothing but empty husks and the water dish is nearly dry. Nobody has fed the bird since morning." },
    hidden: { label: "Under the sand tray", r: [0.04, 0.36, 0.92, 0.08], phrase: "under the sand tray of a birdcage", found: "under the sand tray of the birdcage" },
  },
  sofa: {
    label: "Sofa",
    parts: [{ id: "cushions", label: "Cushions", r: [0.1, 0.3, 0.8, 0.36], tag: "c", flavor: ["A lost earring back. Gold-plated, nothing more.", "Crumbs and a theatre programme."] }],
  },
  gramophone: {
    label: "Gramophone",
    parts: [{ id: "record", label: "Gramophone", r: [0, 0, 1, 1], tag: "s", flavor: ["A record of dance music, scratched.", "The horn is dented. A stack of records beside it."] }],
    activity: { part: "record", act: "listening to records", title: "Gramophone", icon: "gramophone", yes: "A record lies on the turntable and the needle arm is out of its rest. Someone was listening to records.", no: "The needle arm is clamped in its rest and every record is in its sleeve, filed away." },
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
export function layoutRoom(room, victim) {
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
