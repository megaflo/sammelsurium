import { makeCase, parseCaseCode } from "../detektei/case.js";
import { buildCases, buildMessages, grade } from "./check.js";

// Repos are from memory; a wrong name shows up as a load error in the report.
const MODELS = [
  ["HuggingFaceTB/SmolLM2-135M-Instruct", "SmolLM2 135M (repo confirmed)"],
  ["HuggingFaceTB/SmolLM2-360M-Instruct", "SmolLM2 360M (unconfirmed)"],
  ["onnx-community/Qwen2.5-0.5B-Instruct", "Qwen2.5 0.5B"],
  ["onnx-community/Qwen3-0.6B-ONNX", "Qwen3 0.6B"],
  ["onnx-community/Llama-3.2-1B-Instruct", "Llama 3.2 1B"],
  ["onnx-community/gemma-3-1b-it-ONNX", "Gemma 3 1B"],
  ["onnx-community/Qwen2.5-1.5B-Instruct", "Qwen2.5 1.5B"],
];
const MAX_NEW = 96;
const CACHE_KEY = "transformers-cache";
const DEFAULT_CODE = "4-ASZJNY";
const $ = (id) => document.getElementById(id);
const mb = (n) => (n == null ? "?" : (n / 1e6).toFixed(1) + " MB");

$("model").innerHTML = MODELS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("");
$("code").value = DEFAULT_CODE;

const runs = [];
let lib = null, libUrl = "", current = null, busy = false, activeRun = null;

const log = (m) => { $("log").textContent += `${new Date().toISOString().slice(11, 19)} ${m}\n`; $("log").scrollTop = 1e9; };
const status = (m) => { $("status").textContent = m; };
const modelId = () => $("custom").value.trim() || $("model").value;

async function storageInfo() {
  const e = (await navigator.storage?.estimate?.()) || {};
  return { usage: e.usage ?? null, quota: e.quota ?? null, persisted: (await navigator.storage?.persisted?.()) ?? null };
}

async function environment() {
  let gpu = null;
  try {
    const a = await navigator.gpu?.requestAdapter();
    const i = a?.info || {};
    gpu = a ? { vendor: i.vendor, architecture: i.architecture, device: i.device, description: i.description } : "no adapter";
  } catch (e) { gpu = "error: " + e.message; }
  return { ua: navigator.userAgent, cores: navigator.hardwareConcurrency, deviceMemoryGB: navigator.deviceMemory ?? null,
    webgpu: !!navigator.gpu, gpu, crossOriginIsolated, online: navigator.onLine, lib: libUrl };
}

async function cachedFiles() {
  try {
    const c = await caches.open(CACHE_KEY), out = [];
    for (const req of await c.keys()) {
      const r = await c.match(req);
      out.push({ url: req.url.replace(/^https?:\/\//, ""), bytes: Number(r.headers.get("content-length")) || null });
    }
    return out;
  } catch (e) { return [{ error: e.message }]; }
}

async function importLib() {
  const url = $("lib").value.trim();
  if (lib && url === libUrl) return lib;
  log(`importing ${url}`);
  lib = await import(url);
  libUrl = url;
  return lib;
}

async function load({ offline }) {
  if (busy) return;
  busy = true;
  for (const b of ["load", "run", "offline"]) $(b).disabled = true;
  const id = modelId(), dtype = $("dtype").value, device = $("device").value;
  const run = { label: offline ? "offline check" : "download", model: id, dtype, device, bytesReported: 0, loadMs: null, error: null, cases: [], env: null, storageBefore: await storageInfo() };
  runs.push(run);
  activeRun = run;
  run.cachedFilesBefore = (await cachedFiles()).filter((f) => !f.error).length;
  const files = new Map();
  const realFetch = globalThis.fetch;
  let envRef = null, realEnvFetch;
  try {
    const { pipeline, env } = await importLib();
    envRef = env;
    if (offline) {
      // Reads from the Cache API do not use fetch, so a fully cached model still loads. Anything that needs the network fails and is logged.
      run.blockedRequests = [];
      const blocked = (input) => {
        const url = String(input && input.url || input);
        run.blockedRequests.push(url);
        log("blocked network request: " + url);
        return Promise.reject(new TypeError("network blocked by the offline check"));
      };
      globalThis.fetch = blocked;
      realEnvFetch = env.fetch;
      if ("fetch" in env) env.fetch = blocked;
    }
    if (current) { try { await current.pipe.dispose(); } catch {} current = null; }
    $("bar").hidden = false; $("bar").value = 0;
    const t0 = performance.now();
    log(`${offline ? "loading from cache only" : "downloading"} ${id} (${dtype}, ${device})`);
    const pipe = await pipeline("text-generation", id, {
      dtype, device,
      progress_callback: (p) => {
        if (p.status === "progress" && p.file) {
          files.set(p.file, { loaded: p.loaded, total: p.total });
          const L = [...files.values()].reduce((a, f) => a + f.loaded, 0), T = [...files.values()].reduce((a, f) => a + f.total, 0);
          $("bar").max = T || 1; $("bar").value = L;
          status(`${p.file}: ${mb(p.loaded)} of ${mb(p.total)} (all files so far ${mb(L)} of ${mb(T)})`);
        } else if (p.status === "ready") status("Model ready.");
      },
    });
    run.loadMs = Math.round(performance.now() - t0);
    // Progress events are also emitted for files read from the cache, so this is not network traffic.
    run.bytesReported = [...files.values()].reduce((a, f) => a + f.loaded, 0);
    run.downloadFiles = [...files].map(([f, v]) => ({ file: f, bytes: v.total }));
    current = { pipe, id, dtype, device };
    run.cachedFiles = await cachedFiles();
    log(`loaded in ${run.loadMs} ms; progress events covered ${mb(run.bytesReported)}; files in cache before: ${run.cachedFilesBefore}, after: ${run.cachedFiles.length}`);
    status(`Loaded ${id} in ${(run.loadMs / 1000).toFixed(1)} s. Files in cache before this load: ${run.cachedFilesBefore}.`);
  } catch (e) {
    run.error = String(e && e.message || e);
    log("ERROR: " + run.error);
    status("Failed: " + run.error);
  } finally {
    globalThis.fetch = realFetch;
    if (envRef && realEnvFetch !== undefined) envRef.fetch = realEnvFetch;
    run.env = await environment();
    run.storageAfter = await storageInfo();
    $("bar").hidden = true;
    busy = false;
    $("load").disabled = false; $("offline").disabled = !current; $("run").disabled = !current;
  }
}

async function runTests() {
  if (busy || !current) return;
  busy = true;
  for (const b of ["load", "run", "offline"]) $(b).disabled = true;
  const run = activeRun;
  run.cases = [];
  $("results").tBodies[0].innerHTML = "";
  try {
    const parsed = parseCaseCode($("code").value);
    if (parsed.error) throw new Error(parsed.error);
    const { cases, vocab } = buildCases(makeCase(parsed.code));
    run.caseCode = parsed.code;
    const temp = Number($("temp").value);
    for (const [i, c] of cases.entries()) {
      status(`Case ${i + 1} of ${cases.length}: ${c.id}`);
      const t0 = performance.now();
      let raw = "", err = null;
      try {
        const res = await current.pipe(buildMessages(c, current.id), { max_new_tokens: MAX_NEW, do_sample: temp > 0, temperature: temp > 0 ? temp : undefined, top_p: 0.9, repetition_penalty: 1.05, return_full_text: false });
        const g = res[0].generated_text;
        raw = Array.isArray(g) ? g.at(-1).content : g;
      } catch (e) { err = String(e && e.message || e); }
      const ms = Math.round(performance.now() - t0);
      const r = err ? { out: "", pass: false, problems: ["error: " + err], warnings: [], kept: null } : grade(c, raw, vocab);
      let tokens = null, generated = null;
      try { tokens = current.pipe.tokenizer.encode(r.out).length; generated = current.pipe.tokenizer.encode(raw).length; } catch {}
      if (!err && generated != null && generated >= MAX_NEW - 2) { r.problems.push("did not stop (hit the token limit)"); r.pass = false; }
      const rec = { id: c.id, kind: c.kind, mood: c.mood || null, input: c.text || c.room || null, output: r.out, pass: r.pass, problems: r.problems, warnings: r.warnings, kept: r.kept == null ? null : Math.round(r.kept * 100) / 100, ms, tokens };
      run.cases.push(rec);
      addRow(rec);
      await new Promise((r) => setTimeout(r));
    }
    summarize(run);
    status("Tests finished.");
  } catch (e) {
    run.error = String(e && e.message || e);
    log("ERROR: " + run.error);
    status("Failed: " + run.error);
  } finally {
    busy = false;
    $("load").disabled = false; $("offline").disabled = false; $("run").disabled = false;
  }
}

function addRow(c) {
  const tr = document.createElement("tr");
  const cell = (t, cls) => { const td = document.createElement("td"); td.textContent = t; if (cls) td.className = cls; tr.append(td); return td; };
  cell(`${c.kind}: ${c.id}`); cell(c.mood || ""); cell(c.input || "", "soft"); cell(c.output, "out");
  cell(c.pass ? "pass" : "FAIL: " + c.problems.join("; ") + (c.warnings.length ? " | " + c.warnings.join("; ") : ""), c.pass ? "ok" : "bad");
  cell(String(c.ms));
  $("results").tBodies[0].append(tr);
}

function summarize(run) {
  const by = {};
  for (const c of run.cases) { const s = (by[c.kind] ||= { n: 0, pass: 0, ms: 0, tokens: 0 }); s.n++; s.pass += c.pass; s.ms += c.ms; s.tokens += c.tokens || 0; }
  run.summary = Object.fromEntries(Object.entries(by).map(([k, s]) => [k, { pass: `${s.pass}/${s.n}`, avgMs: Math.round(s.ms / s.n), tokensPerSec: s.ms ? Math.round(s.tokens / (s.ms / 1000) * 10) / 10 : null }]));
  $("summary").textContent = Object.entries(run.summary).map(([k, s]) => `${k}: ${s.pass} passed, ${s.avgMs} ms avg, ${s.tokensPerSec} tok/s`).join(" · ");
}

async function hub(path) {
  const r = await fetch("https://huggingface.co/api/" + path);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Looks a repo up without downloading it: does it exist, and which ONNX files (with sizes) does it offer?
$("check").onclick = async () => {
  const id = modelId();
  try {
    const m = await hub(`models/${id}?blobs=true`);
    const onnx = (m.siblings || []).filter((f) => /\.onnx(_data)?$/.test(f.rfilename)).map((f) => `${f.rfilename} ${mb(f.size)}`);
    log(`${id}: found. private=${m.private} gated=${m.gated}. ONNX files:\n  ${onnx.join("\n  ") || "(none)"}`);
    status(`${id}: found, ${onnx.length} ONNX files.`);
  } catch (e) {
    log(`${id}: ${e.message}. A 401 or 404 means the repo does not exist, or is private or gated.`);
    status(`${id}: ${e.message}`);
  }
};

// Fills the model list from a Hub search, most downloaded first.
$("findBtn").onclick = async () => {
  const q = $("find").value.trim();
  if (!q) return;
  try {
    const list = await hub(`models?search=${encodeURIComponent(q)}&filter=onnx&sort=downloads&direction=-1&limit=15`);
    if (!list.length) { log(`search "${q}": no results`); return; }
    $("model").innerHTML = list.map((m) => `<option value="${m.id}">${m.id} (${m.downloads ?? "?"} downloads)</option>`).join("");
    log(`search "${q}": ${list.map((m) => m.id).join(", ")}`);
    status(`${list.length} models found; pick one in the Model list.`);
  } catch (e) { log(`search failed: ${e.message}`); status("Search failed: " + e.message); }
};

$("load").onclick = () => load({ offline: false });
$("offline").onclick = () => load({ offline: true });
$("run").onclick = runTests;
$("persist").onclick = async () => {
  const before = await storageInfo();
  let granted = null;
  try { granted = await navigator.storage.persist(); } catch (e) { granted = "error: " + e.message; }
  const after = await storageInfo();
  runs.push({ label: "persist()", granted, before, after });
  log(`persist() -> ${granted}; persisted now: ${after.persisted}`);
  status(`persist() returned ${granted}.`);
};
$("clear").onclick = async () => {
  const ok = await caches.delete(CACHE_KEY);
  log(`deleted ${CACHE_KEY}: ${ok}`); status("Cached models deleted.");
};
$("copy").onclick = async () => {
  const text = JSON.stringify({ when: new Date().toISOString(), runs }, null, 1);
  try { await navigator.clipboard.writeText(text); status("Report copied."); }
  catch { $("log").textContent += "\n--- REPORT ---\n" + text; status("Clipboard blocked; the report is at the end of the log."); }
};

try { parseCaseCode(DEFAULT_CODE).error ? ($("codeMsg").textContent = "default code is invalid") : 0; } catch {}
environment().then((e) => log(`webgpu: ${e.webgpu}, cores: ${e.cores}, memory: ${e.deviceMemoryGB ?? "?"} GB`));
