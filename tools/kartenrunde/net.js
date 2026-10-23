// WebRTC without a signalling server: the session descriptions travel as short strings
// (shown as QR codes). Only what a data channel needs is sent: ICE credentials,
// the DTLS fingerprint and IPv4 host candidates. The SDP is rebuilt on the other side.

const CONFIG = { iceServers: [] };

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function pack(desc) {
  const sdp = desc.sdp;
  const one = (re) => (sdp.match(re) || [])[1];
  const ufrag = one(/a=ice-ufrag:(\S+)/);
  const pwd = one(/a=ice-pwd:(\S+)/);
  const fp = one(/a=fingerprint:sha-256 (\S+)/);
  if (!ufrag || !pwd || !fp) throw new Error("Unexpected session description");
  const cands = [...sdp.matchAll(/a=candidate:\S+ 1 udp \d+ (\S+) (\d+) typ host/g)]
    .filter((m) => !m[1].includes(":"))
    .map((m) => `${m[1]}:${m[2]}`);
  if (!cands.length) throw new Error("No local network address found. Is this device connected to the hotspot?");
  const fpB64 = toB64(fp.split(":").map((h) => parseInt(h, 16)));
  return ["KR1", desc.type === "offer" ? "o" : "a", ufrag, pwd, fpB64, cands.join(",")].join("~");
}

export function unpack(code, expectedType) {
  const parts = String(code).trim().split("~");
  if (parts.length !== 6 || parts[0] !== "KR1") throw new Error("This is not a Kartenrunde connection code");
  const [, kind, ufrag, pwd, fpB64, cands] = parts;
  const type = kind === "o" ? "offer" : "answer";
  if (type !== expectedType) throw new Error(type === "offer" ? "That is the host's code, not a reply" : "That is a reply, not the host's code");
  const fp = [...fromB64(fpB64)].map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
  const lines = [
    "v=0", "o=- 1 2 IN IP4 127.0.0.1", "s=-", "t=0 0", "a=group:BUNDLE 0", "a=msid-semantic: WMS",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel", "c=IN IP4 0.0.0.0",
    `a=ice-ufrag:${ufrag}`, `a=ice-pwd:${pwd}`, `a=fingerprint:sha-256 ${fp}`,
    `a=setup:${type === "offer" ? "actpass" : "active"}`, "a=mid:0", "a=sctp-port:5000", "a=max-message-size:262144",
  ];
  cands.split(",").forEach((c, i) => {
    const k = c.lastIndexOf(":");
    lines.push(`a=candidate:${i + 1} 1 udp ${2122260223 - i} ${c.slice(0, k)} ${c.slice(k + 1)} typ host generation 0`);
  });
  lines.push("a=end-of-candidates");
  return { type, sdp: lines.join("\r\n") + "\r\n" };
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
  const pc = new RTCPeerConnection(CONFIG);
  const channel = pc.createDataChannel("kartenrunde");
  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc);
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
  const pc = new RTCPeerConnection(CONFIG);
  const ready = new Promise((resolve, reject) => {
    pc.addEventListener("datachannel", (e) => opened(e.channel).then(resolve, reject));
  });
  ready.catch(() => {});
  await pc.setRemoteDescription(offer);
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc);
  return { pc, code: pack(pc.localDescription), ready };
}
