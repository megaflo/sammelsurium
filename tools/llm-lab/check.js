// Test cases, prompts and grading for the LLM lab. No DOM and no network, so node can test it.

export const MOODS = ["calm", "uneasy", "afraid", "angry"];

const TIME = /\b\d{1,2}:\d{2}\b/g;
const META = /\b(here is|here's|rewritten|rewrite|as an ai|certainly|sure[,!]|i cannot|i can't assist|note:)/i;
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
  let t = String(s ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  t = t.replace(/^["“”']+|["“”']+$/g, "").trim();
  return t;
}

const sentences = (s) => (s.match(/[^.!?]+[.!?]+/g) || [s]).filter((x) => x.trim()).length;

export function grade(c, raw, vocab) {
  const out = cleanOutput(raw);
  const problems = [], warnings = [];
  if (!out) return { out, pass: false, problems: ["empty output"], warnings, kept: 0 };
  if (META.test(out)) problems.push("meta text (\"here is...\", \"rewritten\", ...)");
  if (/\n/.test(out)) problems.push("more than one line");
  if (/(^|\n|\s)(mood|character|line|rewriter|the detective|detective)\s*:/i.test(out) || /^[A-Z][\w. ]{1,30}:\s/.test(out)) problems.push("label or prompt echo (\"Mood:\", \"Name:\", ...)");
  let kept = null;
  if (c.kind === "rewrite") {
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
    if (kept < 0.25) problems.push(`drifted: kept only ${Math.round(kept * 100)}% of the longer words`);
    else if (kept < 0.4) warnings.push(`kept only ${Math.round(kept * 100)}% of the longer words`);
  } else {
    const n = wordCount(out);
    const max = c.kind === "flourish" ? 15 : 40;
    if (n < (c.kind === "flourish" ? 2 : 3)) problems.push("too short");
    if (n > max) problems.push(`too long (${n} words)`);
    if (/\d/.test(out)) problems.push("contains digits");
    if (c.kind === "atmosphere" || c.kind === "flourish") {
      if (sentences(out) > 2) problems.push("more than two sentences");
      const m = out.match(BANNED_OBJECTS);
      if (m) problems.push(`names an object ("${m[0]}")`);
      const who = vocab.surnames.find((s) => new RegExp(`\\b${escapeRe(s)}\\b`, "i").test(out));
      if (who) problems.push(`names a person (${who})`);
      const room = vocab.rooms.find((r) => out.toLowerCase().includes(r));
      if (room) problems.push(`names a room (${room})`);
    }
  }
  return { out, pass: problems.length === 0, problems, warnings, kept };
}

const SYSTEM = "You write dialogue and narration for a 1920s country-house murder mystery game. Reply with the requested text only: no quotation marks, no notes, no explanation.";

export function buildMessages(c, modelId = "") {
  let user;
  if (c.kind === "rewrite") {
    user = `Character: ${c.who}\nMood: ${c.mood}\n\nRewrite this line in the character's voice and mood. Keep the meaning. Keep every name, time and room exactly as written. Do not add new facts. Keep it about as long as the original.\n\nLine: ${c.text}`;
  } else if (c.kind === "filler") {
    user = `Character: ${c.who}\nMood: ${c.mood}\n\nThe detective asks something that has nothing to do with the case. Write the character's reply in one or two short sentences, under 20 words.`;
  } else if (c.kind === "flourish") {
    user = `Character: ${c.who}\nMood: ${c.mood}\n\nThe detective asks: "${c.question}"\nWrite a short interjection, under 12 words, that this character says before answering. Do not answer the question. Do not mention any times, places, people or objects.`;
  } else {
    user = `Write one sentence, under 25 words, of atmosphere for the ${c.room} of a manor house on a stormy night. Describe only light, sound, smell or weather. Do not mention people or objects.`;
  }
  if (/qwen3/i.test(modelId)) user += " /no_think";
  return [{ role: "system", content: SYSTEM }, { role: "user", content: user }];
}

export function vocabOf(k) {
  const last = (n) => n.trim().split(/\s+/).pop();
  return {
    rooms: k.rooms.map((r) => r.name.toLowerCase()),
    surnames: [...new Set([k.victim.name, ...k.suspects.map((s) => s.name)].map(last))],
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
  for (const r of k.rooms) cases.push({ kind: "atmosphere", id: `${r.id}/atmosphere`, room: r.name.toLowerCase() });
  return { cases, vocab };
}
