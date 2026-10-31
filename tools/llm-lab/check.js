// Test cases, prompts and grading for the LLM lab. No DOM and no network, so node can test it.

export const MOODS = ["calm", "uneasy", "afraid", "angry"];

const TIME = /\b\d{1,2}:\d{2}\b/g;
const META = /\b(here is|here's|rewritten|rewrite|as an ai|certainly|sure[,!]|i cannot|i can't assist|note:|the user (wants|asks)|let me (break|think)|okay, so)/i;
const BANNED_OBJECTS = /\b(knife|dagger|blood|glove|key|keys|letter|note|poison|poker|candlestick|gun|revolver|rope|cord|body|corpse|clue|footprints?|stain|stains|photograph|diary|safe|locket|ring)\b/i;
const words = (s) => s.toLowerCase().match(/[a-zà-ÿ']+/g) || [];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordCount = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);

// What a rewrite must keep: times and rooms are hard facts, surnames are soft.
export function extractFacts(text, vocab) {
  const low = text.toLowerCase();
  return {
    times: [...new Set(text.match(TIME) || [])],
    rooms: vocab.rooms.filter((r) => low.includes(r)),
    names: vocab.surnames.filter((n) => new RegExp(`\\b${escapeRe(n)}\\b`, "i").test(text)),
  };
}

export function cleanOutput(s) {
  let t = String(s ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^\s*<think>\s*/i, "").trim();
  t = t.replace(/^["“”']+|["“”']+$/g, "").trim();
  return t;
}

const norm = (s) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const overlap = (a, b) => {
  const A = new Set(words(a)), B = new Set(words(b));
  const both = [...A].filter((w) => B.has(w)).length;
  return both / (new Set([...A, ...B]).size || 1);
};
// First-person statements about what the character did or where they were, unless they only name a feeling.
const FEELING = "afraid|sorry|so|too|very|just|not|furious|angry|scared|nervous|tired|distracted|restless|shocked|upset|worried|terrified|wrong|mistaken|sure|quite";
const CLAIM = new RegExp(`\\bI(?:'ve been| have been| was| were| went| saw| heard| stayed| kept| had)\\b(?!\\W+(?:${FEELING})\\b)`, "i");
const TITLES = new Set(["mr", "mrs", "miss", "ms", "lord", "lady", "sir", "dr", "colonel", "major", "captain", "professor", "reverend", "the"]);

// Original sentences whose own long words (not shared with another sentence) are all missing from the output.
function droppedSentences(orig, out) {
  const sents = (orig.match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);
  const longWords = (s) => [...new Set(words(s).filter((w) => w.length >= 5))];
  const count = new Map();
  for (const s of sents) for (const w of longWords(s)) count.set(w, (count.get(w) || 0) + 1);
  const have = new Set(words(out));
  return sents.filter((s) => {
    const own = longWords(s).filter((w) => count.get(w) === 1);
    return own.length > 0 && own.every((w) => !have.has(w));
  });
}

const sentences = (s) => { const t = s.replace(/\.{2,}|…/g, ","); return (t.match(/[^.!?]+[.!?]+/g) || [t]).filter((x) => x.trim()).length; };

export function grade(c, raw, vocab) {
  const out = cleanOutput(raw);
  const problems = [], warnings = [];
  if (!out) return { out, pass: false, problems: ["empty output"], warnings, kept: 0 };
  if (META.test(out)) problems.push("meta text (\"here is...\", \"rewritten\", ...)");
  if (/\n/.test(out)) problems.push("more than one line");
  if (/(^|\n|\s)(mood|character|line|rewriter|the detective|detective)\s*:/i.test(out) || /^[A-Z][\w. ]{1,30}:\s/.test(out)) problems.push("label or prompt echo (\"Mood:\", \"Name:\", ...)");
  let kept = null, unchanged = false;
  if (c.kind === "rewrite") {
    if (norm(out) === norm(c.text)) { problems.push("copied the input unchanged"); unchanged = true; }
    else if (overlap(out, c.text) >= 0.85) { warnings.push("nearly unchanged"); unchanged = true; }
    const lower = out.toLowerCase();
    for (const t of c.facts.times) if (!out.includes(t)) problems.push(`lost time ${t}`);
    for (const r of c.facts.rooms) if (!lower.includes(r)) problems.push(`lost room "${r}"`);
    const invented = (out.match(TIME) || []).filter((t) => !c.text.includes(t));
    if (invented.length) problems.push(`invented time ${invented.join(", ")}`);
    if (out.length > c.text.length * 2.2 + 40) problems.push("far longer than the original");
    for (const n of c.facts.names) if (!new RegExp(`\\b${escapeRe(n)}\\b`, "i").test(out)) warnings.push(`lost name ${n}`);
    const src = [...new Set(words(c.text).filter((w) => w.length >= 5))];
    const have = new Set(words(out));
    kept = src.length ? src.filter((w) => have.has(w)).length / src.length : 1;
    for (const s of droppedSentences(c.text, out).slice(0, 2)) problems.push(`dropped: "${s.slice(0, 40)}"`);
    if (kept < 0.25) problems.push(`drifted: kept only ${Math.round(kept * 100)}% of the longer words`);
    else if (kept < 0.4) warnings.push(`kept only ${Math.round(kept * 100)}% of the longer words`);
  } else {
    const n = wordCount(out);
    const short = c.kind === "flourish" || c.kind === "gesture";
    const max = c.kind === "gesture" ? 10 : short ? 15 : 40;
    if (n < (short ? 2 : 3)) problems.push("too short");
    if (n > max) problems.push(`too long (${n} words)`);
    if (/\d/.test(out)) problems.push("contains digits");
    if (c.kind === "gesture") {
      if (!/^\*[^*]+\*$/.test(out)) problems.push("not a single *stage direction*");
      if (/["“”]/.test(out)) problems.push("contains speech");
    }
    if ((c.kind === "flourish" || c.kind === "filler") && CLAIM.test(out)) problems.push("claims where the character was or what they did");
    if (c.kind === "filler" || c.kind === "flourish") {
      if (/\b(he|she) (said|replied|snapped|whispered|smiled|looked)\b|^\s*[A-Z][a-z]+ (looked|smiled|turned|said)\b/.test(out)) problems.push("narration instead of speech");
    }
    if (c.kind === "atmosphere" || c.kind === "flourish" || c.kind === "gesture" || c.kind === "filler") {
      if (sentences(out) > 2) problems.push("more than two sentences");
      const m = out.match(BANNED_OBJECTS);
      if (m) problems.push(`names an object ("${m[0]}")`);
      const who = (vocab.names || vocab.surnames).find((s) => new RegExp(`\\b${escapeRe(s)}\\b`, "i").test(out));
      if (who) problems.push(`names a person (${who})`);
      const room = vocab.rooms.find((r) => r !== c.room && out.toLowerCase().includes(r));
      if (room) problems.push(`names a room (${room})`);
    }
  }
  return { out, pass: problems.length === 0, problems, warnings, kept, unchanged };
}

const SYSTEM = "You write dialogue and narration for a 1920s country-house murder mystery game. Reply with the requested text only: no quotation marks, no notes, no explanation.";

// Hand-written examples from an invented setting, so none of the test lines or rooms appear in them.
// Each kind has one example per mood; few-shot prompts use the one for the target mood plus the next mood.
const QUILL = "Dr. Quill, family physician.", PELL = "Mrs. Pell, cook.", ROOK = "Mr. Rook, solicitor.", VANE = "Miss Vane, governess.";
const ASK = "Where were you this evening?";
const SHOTS = {
  rewrite: [
    [{ kind: "rewrite", who: ROOK, mood: "calm", text: "I was in the boathouse from 8:10 pm until 9:00 pm, mending a net." }, "Quite so. The boathouse, from 8:10 pm until 9:00 pm, mending a net. An uneventful evening."],
    [{ kind: "rewrite", who: PELL, mood: "uneasy", text: "The gardener left the greenhouse at 7:30 pm. He did not say where he was going." }, "The gardener left the greenhouse at 7:30 pm, did he? And he did not say where he was going. Odd. Very odd."],
    [{ kind: "rewrite", who: QUILL, mood: "afraid", text: "Nobody came to the boathouse after 9:00 pm. I locked the door myself." }, "N-nobody came to the boathouse after 9:00 pm, I swear it! I locked the door myself."],
    [{ kind: "rewrite", who: PELL, mood: "angry", text: "I told the maid about the broken window at 6:45 pm." }, "I told the maid about that broken window at 6:45 pm, and what did she do? Nothing!"],
  ],
  filler: [
    [{ kind: "filler", who: ROOK, mood: "calm" }, "Hm. I really couldn't say, Inspector."],
    [{ kind: "filler", who: PELL, mood: "uneasy" }, "Oh, I wouldn't know about that. Why do you ask?"],
    [{ kind: "filler", who: QUILL, mood: "afraid" }, "I... I couldn't say, Inspector. Why do you ask me that?"],
    [{ kind: "filler", who: PELL, mood: "angry" }, "What has that to do with anything? Ask someone else."],
  ],
  flourish: [
    [{ kind: "flourish", who: ROOK, mood: "calm", question: ASK }, "Ah, yes. Well, then."],
    [{ kind: "flourish", who: PELL, mood: "uneasy", question: ASK }, "Hm. If you must ask."],
    [{ kind: "flourish", who: QUILL, mood: "afraid", question: ASK }, "Oh dear. Must we go into that?"],
    [{ kind: "flourish", who: VANE, mood: "angry", question: ASK }, "Hmph. Another question, is it?"],
  ],
  gesture: [
    [{ kind: "gesture", who: ROOK, mood: "calm" }, "*folds his hands and waits*"],
    [{ kind: "gesture", who: VANE, mood: "uneasy" }, "*glances aside, rubs the back of her neck*"],
    [{ kind: "gesture", who: QUILL, mood: "afraid" }, "*wrings his hands, eyes darting*"],
    [{ kind: "gesture", who: PELL, mood: "angry" }, "*folds her arms and glares*"],
  ],
  atmosphere: [
    [{ kind: "atmosphere", room: "boathouse" }, "Rain needles the water outside, and the wind sighs through every gap in the boards."],
    [{ kind: "atmosphere", room: "greenhouse" }, "Thunder grumbles far off, and the air smells of wet earth and old smoke."],
  ],
};

function promptFor(c) {
  if (c.kind === "rewrite") return `Character: ${c.who}\nMood: ${c.mood}\n\nRewrite this line in the character's voice and mood. Keep the meaning. Keep every name, time and room exactly as written. Do not drop any sentence and do not add new facts. Keep it about as long as the original.\n\nLine: ${c.text}`;
  if (c.kind === "filler") return `Character: ${c.who}\nMood: ${c.mood}\n\nThe detective asks something that has nothing to do with the case. Write the character's reply in one or two short sentences, under 20 words. Speak in the first person and say nothing about what the character did or where they were.`;
  if (c.kind === "gesture") return `Character: ${c.who}\nMood: ${c.mood}\n\nWrite one short stage direction in asterisks, under 8 words, describing the character's body language while the detective speaks. No speech, no places, no objects.`;
  if (c.kind === "flourish") return `Character: ${c.who}\nMood: ${c.mood}\n\nThe detective asks: "${c.question}"\nWrite a short interjection, under 12 words, that this character says before answering. Do not answer the question. Do not say what the character did or where they were. Do not mention any times, places, people or objects.`;
  return `Write one sentence, under 25 words, of atmosphere for the ${c.room} of a manor house on a stormy night. Describe only light, sound, smell or weather. Do not mention people or objects.`;
}

function shotsFor(c) {
  const list = SHOTS[c.kind] || [];
  if (!c.mood) return list;
  const i = MOODS.indexOf(c.mood);
  return [list[i], list[(i + 1) % MOODS.length]].filter(Boolean);
}

export function buildMessages(c, modelId = "", fewShot = false) {
  let user = promptFor(c);
  if (/qwen3/i.test(modelId)) user += " /no_think";
  const shots = fewShot ? shotsFor(c).flatMap(([s, a]) => [{ role: "user", content: promptFor(s) }, { role: "assistant", content: a }]) : [];
  return [{ role: "system", content: SYSTEM }, ...shots, { role: "user", content: user }];
}

export function vocabOf(k) {
  const last = (n) => n.trim().split(/\s+/).pop();
  return {
    rooms: k.rooms.map((r) => r.name.toLowerCase()),
    surnames: [...new Set([k.victim.name, ...k.suspects.map((s) => s.name)].map(last))],
    names: [...new Set([k.victim.name, ...k.suspects.map((s) => s.name)].flatMap((n) => n.replace(/\./g, "").split(/\s+/)).filter((w) => w.length > 2 && !TITLES.has(w.toLowerCase())))],
  };
}

// Real lines from a Detektei case, graded on the facts they carry, plus invented-from-scratch lines.
export function buildCases(k, { maxRewrite = 12 } = {}) {
  const vocab = vocabOf(k);
  const V = k.victim.short;
  const who = (s) => `${s.name}, ${s.title.toLowerCase()}. ${s.lib.about.replace(/\{V\}/g, V)}`;
  const rewrites = [];
  for (const s of k.suspects) {
    const d = k.dialog[s.id];
    for (const q of d.questions) rewrites.push({ id: `${s.id}/${q.id}`, who: who(s), text: q.text, mood: q.mood });
    for (const [id, cf] of Object.entries(d.confront)) {
      if (cf && cf.text && cf.mood !== "calm" && cf.text.length > 50) rewrites.push({ id: `${s.id}/confront:${id}`, who: who(s), text: cf.text, mood: cf.mood });
    }
  }
  // Prefer lines that carry a time or a room, then spread the rest across suspects; give calm lines other moods.
  const weight = (r) => (extractFacts(r.text, vocab).times.length ? 2 : 0) + (extractFacts(r.text, vocab).rooms.length ? 1 : 0);
  const picked = rewrites.map((r, i) => ({ r, i })).sort((a, b) => weight(b.r) - weight(a.r) || a.i - b.i).slice(0, maxRewrite).map((x) => x.r);
  const cases = picked.map((r, i) => {
    const mood = r.mood === "calm" ? MOODS[i % 4] : r.mood;
    return { kind: "rewrite", id: r.id, who: r.who, text: r.text, mood, facts: extractFacts(r.text, vocab) };
  });
  k.suspects.forEach((s, i) => {
    for (const mood of MOODS.slice(0, 2 + (i % 3))) cases.push({ kind: "filler", id: `${s.id}/filler`, who: who(s), mood });
  });
  k.suspects.forEach((s, i) => {
    const q = k.dialog[s.id].questions.find((x) => x.id === "where");
    for (const mood of [MOODS[(i + 1) % 4], MOODS[(i + 2) % 4]]) cases.push({ kind: "flourish", id: `${s.id}/flourish`, who: who(s), mood, question: q.label });
  });
  k.suspects.forEach((s, i) => {
    for (const mood of [MOODS[(i + 1) % 4], MOODS[(i + 3) % 4]]) cases.push({ kind: "gesture", id: `${s.id}/gesture`, who: who(s), mood });
  });
  for (const r of k.rooms) cases.push({ kind: "atmosphere", id: `${r.id}/atmosphere`, room: r.name.toLowerCase() });
  return { cases, vocab };
}
