import test from "node:test";
import assert from "node:assert/strict";
import { pack, unpack } from "../tools/kartenrunde/net.js";

const FP = "7B:8B:F0:65:5F:78:E2:51:3B:AC:6F:F3:3F:46:1B:35:DC:B8:5F:64:1A:24:C2:3D:A7:9C:BA:4B:E1:2A:B3:11";

const chrome = `v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=candidate:1 1 udp 2113937151 192.168.43.5 40001 typ host generation 0 network-cost 999\r\na=candidate:2 1 udp 2113937151 b1f0c3a2-1111-4222-8333-444455556666.local 40002 typ host generation 0\r\na=ice-ufrag:abcd\r\na=ice-pwd:0123456789abcdefghijkl\r\na=fingerprint:sha-256 ${FP}\r\na=setup:actpass\r\na=mid:0\r\na=sctp-port:5000\r\n`;

// Firefox writes the transport in capitals and adds IPv6 and non-host candidates.
const firefox = `v=0\r\no=mozilla...THIS_IS_SDPARTA-99.0 1 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=fingerprint:sha-256 ${FP}\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=candidate:0 1 UDP 2122252543 192.168.43.9 55000 typ host\r\na=candidate:1 1 UDP 2122187007 fe80::1 55001 typ host\r\na=candidate:2 1 TCP 2105458943 192.168.43.9 9 typ host tcptype active\r\na=candidate:3 1 UDP 1686052607 203.0.113.4 55002 typ srflx raddr 192.168.43.9 rport 55000\r\na=sendrecv\r\na=ice-pwd:fedcba9876543210fedcba98\r\na=ice-ufrag:wxyz\r\na=mid:0\r\na=setup:active\r\na=sctp-port:5000\r\n`;

test("Chrome offer round-trips and keeps mDNS candidates", () => {
  const code = pack({ type: "offer", sdp: chrome });
  assert.match(code, /^KR1~o~abcd~/);
  const { type, sdp } = unpack(code, "offer");
  assert.equal(type, "offer");
  assert.match(sdp, /a=fingerprint:sha-256 7B:8B:F0/);
  assert.match(sdp, /192\.168\.43\.5 40001 typ host/);
  assert.match(sdp, /b1f0c3a2-1111-4222-8333-444455556666\.local 40002 typ host/);
  assert.match(sdp, /a=setup:actpass/);
});

test("Firefox SDP (uppercase UDP, other candidate types) yields the IPv4 host candidate", () => {
  const code = pack({ type: "answer", sdp: firefox });
  const { sdp } = unpack(code, "answer");
  assert.match(sdp, /192\.168\.43\.9 55000 typ host/);
  assert.doesNotMatch(sdp, /fe80|203\.0\.113|55001|55002/);
  assert.match(sdp, /a=setup:active/);
});

test("pack explains when there is no usable address", () => {
  assert.throws(() => pack({ type: "offer", sdp: chrome.replace(/a=candidate.*\r\n/g, "") }), /No usable network address.*no candidates at all/);
});

test("IPv6 is a fallback and link-local addresses are dropped; the error lists what was offered", () => {
  const v6 = chrome.replace(/a=candidate.*\r\n/g, "") .replace("a=ice-ufrag", "a=candidate:1 1 udp 2113937151 fe80::1 40001 typ host\r\na=candidate:2 1 udp 2113937151 fd00::5 40002 typ host\r\na=ice-ufrag");
  assert.match(unpack(pack({ type: "offer", sdp: v6 }), "offer").sdp, /fd00::5 40002 typ host/);
  const onlyLinkLocal = v6.replace(/a=candidate:2.*\r\n/, "");
  assert.throws(() => pack({ type: "offer", sdp: onlyLinkLocal }), /offered: udp host fe80::1/);
});

test("unpack rejects codes of the wrong kind", () => {
  const offer = pack({ type: "offer", sdp: chrome });
  assert.throws(() => unpack(offer, "answer"), /host's code/);
  assert.throws(() => unpack("hello", "offer"), /not a Kartenrunde/);
});

test("addressesOf lists the addresses inside a code", async () => {
  const { addressesOf } = await import("../tools/kartenrunde/net.js");
  assert.deepEqual(addressesOf(pack({ type: "offer", sdp: chrome })), ["192.168.43.5", "b1f0c3a2-1111-4222-8333-444455556666.local"]);
});

test("the DTLS setup role travels with the code", () => {
  const passive = chrome.replace("a=setup:actpass", "a=setup:passive");
  assert.match(unpack(pack({ type: "answer", sdp: passive }), "answer").sdp, /a=setup:passive/);
  assert.match(unpack(pack({ type: "offer", sdp: chrome }), "offer").sdp, /a=setup:actpass/);
  // codes without the role field (older versions) still work
  assert.match(unpack("KR1~a~abcd~0123456789abcdefghijkl~AAAA~10.0.0.2:4000", "answer").sdp, /a=setup:active/);
});
