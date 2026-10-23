// WebRTC without a signalling server: the session descriptions travel as short strings
// (shown as QR codes). Only what a data channel needs is sent: ICE credentials,
// the DTLS fingerprint, UDP host candidates and the DTLS role. The SDP is rebuilt on the other side.

// Goes into every code, so two devices running different versions say so instead of failing
// silently. Keep it equal to the number in the cache name in sw.js (a test checks this).
export const VERSION = "5";

const CONFIG = { iceServers: [] };

// Some browsers close a connection whose RTCPeerConnection nothing refers to any more.
const alive = new Set();

function track(pc) {
  alive.add(pc);
  // close() does not fire connectionstatechange, so forget the connection here.
  const close = pc.close.bind(pc);
  pc.close = () => { alive.delete(pc); close(); };
  const t0 = Date.now();
  pc.trace = [];
  const note = (what) => pc.trace.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${what}`);
  pc.addEventListener("iceconnectionstatechange", () => note(`ice ${pc.iceConnectionState}`));
  pc.addEventListener("connectionstatechange", () => {
    note(`connection ${pc.connectionState}`);
  });
  return pc;
}

// A short report on how far the connection got, shown when it fails.
export async function diagnose(pc) {
  const lines = [`version ${VERSION}`, `ice ${pc.iceConnectionState}, connection ${pc.connectionState}`, ...pc.trace];
  try {
    const local = [];
    const remote = [];
    const pairs = {};
    (await pc.getStats()).forEach((r) => {
      const where = `${r.address || r.ip}:${r.port} ${r.protocol || ""} ${r.candidateType}`;
      if (r.type === "local-candidate") local.push(where);
      else if (r.type === "remote-candidate") remote.push(where);
      else if (r.type === "candidate-pair") pairs[r.state] = (pairs[r.state] || 0) + 1;
    });
    lines.push(`this device: ${local.join("; ") || "none"}`, `other device: ${remote.join("; ") || "none"}`,
      `address pairs: ${Object.entries(pairs).map(([k, v]) => `${v} ${k}`).join(", ") || "none"}`);
  } catch { /* stats are not available everywhere */ }
  return lines.join("\n");
}

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function pack(desc) {
  const sdp = desc.sdp;
  const one = (re) => (sdp.match(re) || [])[1];
  const ufrag = one(/a=ice-ufrag:(\S+)/);
  const pwd = one(/a=ice-pwd:(\S+)/);
  const fp = one(/a=fingerprint:sha-256 (\S+)/i);
  if (!ufrag || !pwd || !fp) throw new Error("Unexpected session description");
  const seen = [...sdp.matchAll(/a=candidate:\S+ 1 (\w+) \d+ (\S+) (\d+) typ (\w+)/gi)]
    .map((m) => ({ proto: m[1].toLowerCase(), ip: m[2], port: m[3], type: m[4].toLowerCase() }));
  // UDP host candidates only. IPv4 first; IPv6 is a fallback, and link-local addresses never route.
  const usable = seen.filter((c) => c.proto === "udp" && c.type === "host" && !/^fe80/i.test(c.ip));
  const cands = [...usable.filter((c) => !c.ip.includes(":")), ...usable.filter((c) => c.ip.includes(":")).slice(0, 2)]
    .map((c) => `${c.ip}:${c.port}`);
  if (!cands.length) {
    const found = seen.length ? seen.map((c) => `${c.proto} ${c.type} ${c.ip}`).join(", ") : "no candidates at all";
    throw new Error(`No usable network address found (browser offered: ${found}). Is this device connected to the hotspot?`);
  }
  const setup = { active: "a", passive: "p", actpass: "c" }[one(/a=setup:(\w+)/)] ?? (desc.type === "offer" ? "c" : "a");
  const fpB64 = toB64(fp.split(":").map((h) => parseInt(h, 16)));
  return ["KR1", desc.type === "offer" ? "o" : "a", ufrag, pwd, fpB64, cands.join(","), setup, VERSION].join("~");
}

export function unpack(code, expectedType) {
  const parts = String(code).trim().split("~");
  if (parts.length < 6 || parts[0] !== "KR1") throw new Error("This is not a Kartenrunde connection code");
  const [, kind, ufrag, pwd, fpB64, cands, setupCode, version] = parts;
  if (version !== VERSION) {
    throw new Error(`The other device runs ${version ? `version ${version}` : "an older version"} of Kartenrunde, this one runs version ${VERSION}. `
      + "Close the page on both devices, open it again while connected to the internet, and check that both show the same version on the start screen.");
  }
  const type = kind === "o" ? "offer" : "answer";
  if (type !== expectedType) throw new Error(type === "offer" ? "That is the host's code, not a reply" : "That is a reply, not the host's code");
  const fp = [...fromB64(fpB64)].map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
  const lines = [
    "v=0", "o=- 1 2 IN IP4 127.0.0.1", "s=-", "t=0 0", "a=group:BUNDLE 0", "a=msid-semantic: WMS",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel", "c=IN IP4 0.0.0.0",
    `a=ice-ufrag:${ufrag}`, `a=ice-pwd:${pwd}`, `a=fingerprint:sha-256 ${fp}`,
    `a=setup:${{ a: "active", p: "passive", c: "actpass" }[setupCode] ?? (type === "offer" ? "actpass" : "active")}`, "a=mid:0", "a=sctp-port:5000", "a=max-message-size:262144",
  ];
  cands.split(",").forEach((c, i) => {
    const k = c.lastIndexOf(":");
    lines.push(`a=candidate:${i + 1} 1 udp ${2122260223 - i} ${c.slice(0, k)} ${c.slice(k + 1)} typ host generation 0`);
  });
  lines.push("a=end-of-candidates");
  return { type, sdp: lines.join("\r\n") + "\r\n" };
}

// Browsers hide local addresses behind random ".local" names unless the page is capturing
// media, and many hotspots do not resolve those names. Holding a camera stream while the
// addresses are gathered makes the browser report the real ones. Without permission we go on.
async function holdCapture() {
  try {
    const stream = await Promise.race([
      navigator.mediaDevices.getUserMedia({ video: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("no answer")), 15000)),
    ]);
    return () => stream.getTracks().forEach((t) => t.stop());
  } catch {
    return () => {};
  }
}

// The addresses inside a code, for showing them to the user.
export function addressesOf(code) {
  return String(code).split("~")[5]?.split(",").map((c) => c.slice(0, c.lastIndexOf(":"))) ?? [];
}

function gathered(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const done = () => { clearTimeout(t); resolve(); };
    const t = setTimeout(done, 4000);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") done(); });
  });
}

const opened = (ch) => new Promise((resolve, reject) => {
  if (ch.readyState === "open") return resolve(ch);
  ch.addEventListener("open", () => resolve(ch), { once: true });
  ch.addEventListener("close", () => reject(new Error("Connection closed")), { once: true });
});

// Host side, step 1: make the code to show to the joining player.
export async function createInvite() {
  const release = await holdCapture();
  const pc = track(new RTCPeerConnection(CONFIG));
  const channel = pc.createDataChannel("kartenrunde");
  try {
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
  } finally { release(); }
  const ready = opened(channel);
  ready.catch(() => {});
  return { pc, channel, code: pack(pc.localDescription), ready };
}

// Host side, step 2: apply the reply code from the guest.
export async function acceptReply(invite, code) {
  await invite.pc.setRemoteDescription(unpack(code, "answer"));
}

// Guest side: take the host's code, produce the reply code.
export async function joinWith(code) {
  const offer = unpack(code, "offer");
  const release = await holdCapture();
  const pc = track(new RTCPeerConnection(CONFIG));
  const ready = new Promise((resolve, reject) => {
    pc.addEventListener("datachannel", (e) => opened(e.channel).then(resolve, reject));
  });
  ready.catch(() => {});
  try {
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
  } finally { release(); }
  return { pc, code: pack(pc.localDescription), ready };
}
