// All graphics are SVG strings. Rooms use a 400 x 260 scene; portraits 120 x 140; icons 64 x 64.

const r = (x, y, w, h, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const c = (cx, cy, rr, fill, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${fill}" ${extra}/>`;
const e = (cx, cy, rx, ry, fill, extra = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const p = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
const l = (x1, y1, x2, y2, stroke, sw = 1, extra = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const g = (x, y, inner) => `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${inner}</g>`;
const n = (v) => +v.toFixed(1);

function seq(seed) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
}

// ---------- room themes ----------
const THEMES = {
  library: { wall: "#4a2c28", wall2: "#53332e", trim: "#2f1c14", floor: "#5d3f27", floor2: "#523722", wood: "#6b4426", wood2: "#4a2d18", pattern: "stripes" },
  study: { wall: "#2e4238", wall2: "#344a3f", trim: "#22180f", floor: "#5a3e26", floor2: "#4f3520", wood: "#7a5232", wood2: "#55361f", pattern: "panels" },
  music: { wall: "#3b3350", wall2: "#433a5a", trim: "#241d30", floor: "#7a5a36", floor2: "#6a4c2c", wood: "#3a2418", wood2: "#24150d", pattern: "damask" },
  conservatory: { wall: "#1d3346", wall2: "#d9d2bf", trim: "#cfc7b2", floor: "#b5a587", floor2: "#8a7a5c", wood: "#8a6a44", wood2: "#5e4628", pattern: "glass" },
  billiard: { wall: "#5a2626", wall2: "#632c2c", trim: "#2a1610", floor: "#4d3220", floor2: "#43291a", wood: "#5b3a1f", wood2: "#3d2512", pattern: "stripes" },
  dining: { wall: "#5f4a2c", wall2: "#6a5332", trim: "#2e2012", floor: "#5a3c22", floor2: "#4e331c", wood: "#6e4626", wood2: "#4b2e18", pattern: "damask" },
  kitchen: { wall: "#cfc6ae", wall2: "#bdb39a", trim: "#7a6c52", floor: "#8a8478", floor2: "#77716a", wood: "#9a7448", wood2: "#6e5232", pattern: "tiles" },
  bedroom: { wall: "#56435e", wall2: "#614c6a", trim: "#2c2030", floor: "#6b4a2e", floor2: "#5c3f27", wood: "#7a4e2c", wood2: "#55331b", pattern: "dots" },
  cellar: { wall: "#4b463f", wall2: "#57524a", trim: "#2c2925", floor: "#3b3833", floor2: "#33302c", wood: "#6a4a2a", wood2: "#46301a", pattern: "bricks" },
};

function backdrop(t) {
  let s = r(0, 0, 400, 175, t.wall);
  if (t.pattern === "stripes") for (let x = 0; x < 400; x += 24) s += r(x, 0, 12, 175, t.wall2);
  // Wainscot: a chair rail, then raised panels that stop above the skirting board.
  if (t.pattern === "panels") { s += r(0, 120, 400, 55, t.wall2) + r(0, 118, 400, 3, t.trim, `opacity=".7"`); for (let x = 6; x < 400; x += 56) s += r(x, 127, 44, 32, "none", `stroke="${t.trim}" stroke-opacity=".5"`); }
  if (t.pattern === "damask") for (let y = 14; y < 170; y += 30) for (let x = (y / 30) % 2 ? 0 : 20; x < 410; x += 40) s += p(`M${x} ${y - 7}l5 7-5 7-5-7z`, t.wall2);
  if (t.pattern === "dots") for (let y = 10; y < 170; y += 20) for (let x = (y / 20) % 2 ? 0 : 10; x < 410; x += 20) s += c(x, y, 2, t.wall2);
  if (t.pattern === "tiles") { for (let y = 0; y < 175; y += 16) s += l(0, y, 400, y, t.wall2, 1); for (let y = 0; y < 175; y += 16) for (let x = (y / 16) % 2 ? 0 : 12; x < 400; x += 24) s += l(x, y, x, y + 16, t.wall2, 1); }
  if (t.pattern === "bricks") for (let y = 0; y < 175; y += 14) for (let x = (y / 14) % 2 ? -14 : 0; x < 400; x += 28) s += r(x + 1, y + 1, 26, 12, t.wall2, `rx="2"`);
  if (t.pattern === "glass") {
    // A lean-to: glazing on the left on a low brick wall, the cream house wall (with the window) on the right.
    s += r(0, 0, 268, 175, "#1a2c3d");
    s += c(120, 30, 12, "#e9e4c8", `opacity=".6"`);
    for (let i = 0; i < 30; i++) { const x = (i * 97) % 268, y = (i * 53) % 140; s += l(x, y, x - 4, y + 12, "#6d8aa6", 1, `opacity=".35"`); }
    for (let i = 0; i < 5; i++) s += r(i * 53 - 2, 0, 4, 175, t.trim);
    for (let y = 0; y < 140; y += 44) s += r(0, y - 2, 268, 4, t.trim);
    s += r(0, 136, 268, 6, t.trim);
    s += r(0, 142, 268, 33, "#4e3a30");
    for (let y = 142; y < 175; y += 11) for (let x = (y - 142) / 11 % 2 ? -11 : 0; x < 268; x += 22) s += r(x + 1, y + 1, 20, 9, "#7a4a36", `rx="1"`);
    s += r(268, 0, 132, 175, t.wall2) + r(268, 164, 132, 11, t.floor2) + r(262, 0, 10, 175, t.trim) + r(258, 0, 18, 6, t.trim);
  }
  if (t.pattern === "panels") s += r(0, 163, 400, 12, t.trim, `opacity=".55"`);
  else if (t.pattern !== "glass" && t.pattern !== "bricks" && t.pattern !== "tiles") s += r(0, 150, 400, 25, t.trim, `opacity=".55"`);
  s += r(0, 172, 400, 6, t.trim);
  // floor
  s += r(0, 175, 400, 85, t.floor);
  if (t.pattern === "tiles" || t.pattern === "bricks") {
    for (let y = 182; y < 260; y += 18) s += l(0, y, 400, y, t.floor2, 2);
    for (let x = 0; x < 400; x += 36) s += l(x, 175, x + (x - 200) * 0.25, 260, t.floor2, 2);
  } else if (t.pattern === "glass") {
    for (let y = 175, i = 0; y < 260; y += 17, i++) for (let x = i % 2 ? 0 : 25; x < 400; x += 50) s += r(x, y, 25, 17, t.floor2);
  } else {
    for (let y = 180; y < 260; y += 10) s += l(0, y, 400, y, t.floor2, 1.5);
    for (let y = 175, i = 0; y < 260; y += 10, i++) for (let x = (i * 37) % 70; x < 400; x += 70) s += l(x, y, x, y + 10, t.floor2, 1.5);
  }
  return s;
}

// ---------- furniture ----------
const F = {
  bookshelf(w, h, t, rnd) {
    let s = r(0, 0, w, h, t.wood2) + r(3, 3, w - 6, h - 6, "#1d120c");
    const cols = ["#7a2a22", "#2d4d6b", "#4f6b35", "#8a6a2a", "#5a3a5e", "#a24a2a", "#2e2e2e", "#6b5232"];
    const rows = 5, rh = (h - 6) / rows;
    for (let i = 0; i < rows; i++) {
      const y0 = 3 + i * rh;
      let x = 5;
      while (x < w - 8) {
        const bw = 3 + rnd() * 5, bh = rh * (0.6 + rnd() * 0.32);
        if (x + bw > w - 5) break;
        s += r(n(x), n(y0 + rh - 3 - bh), n(bw), n(bh), cols[Math.floor(rnd() * cols.length)]);
        x += bw + 0.6;
      }
      s += r(3, n(y0 + rh - 3), w - 6, 3, t.wood);
    }
    return s + r(0, 0, w, 4, t.wood) + r(0, h - 5, w, 5, t.wood);
  },
  desk(w, h, t) {
    let s = r(4, h * 0.2, 6, h * 0.8, t.wood2) + r(w - 10, h * 0.2, 6, h * 0.8, t.wood2);
    s += r(0, h * 0.2, w, h * 0.32, t.wood) + r(0, h * 0.14, w, h * 0.08, t.wood2);
    s += r(w * 0.08, h * 0.26, w * 0.4, h * 0.22, t.wood2, `opacity=".6"`) + r(w * 0.52, h * 0.26, w * 0.4, h * 0.22, t.wood2, `opacity=".6"`);
    s += c(w * 0.28, h * 0.37, 1.6, "#d8b45a") + c(w * 0.72, h * 0.37, 1.6, "#d8b45a");
    s += r(w * 0.14, h * 0.06, w * 0.3, h * 0.08, "#3d5a3a") + r(w * 0.6, -h * 0.12, 3, h * 0.26, "#c9a24a") + p(`M${w * 0.55} ${-h * 0.12}h${w * 0.14}l-4 -10h-${w * 0.14 - 8}z`, "#3a6b46");
    s += e(w * 0.5, h * 0.1, 4, 2, "#222");
    return s;
  },
  fireplace(w, h, t) {
    let s = r(w * 0.05, h * 0.14, w * 0.9, h * 0.86, "#8a8073") + r(0, 0, w, h * 0.16, t.wood) + r(-3, h * 0.12, w + 6, h * 0.05, t.wood2);
    // stone courses on the surround
    for (let i = 1; i < 6; i++) { const y = h * (0.14 + i * 0.143); s += l(w * 0.05, y, w * 0.95, y, "#00000018", 1); for (let k = 0; k < 4; k++) { const x = w * (0.05 + (k + (i % 2 ? 0.5 : 0)) * 0.225); if (x > w * 0.06 && x < w * 0.94) s += l(x, y - h * 0.143, x, y, "#00000018", 1); } }
    s += p(`M${w * 0.22} ${h}V${h * 0.48}Q${w * 0.5} ${h * 0.28} ${w * 0.78} ${h * 0.48}V${h}z`, "#151110");
    // a dying fire: glowing embers under two logs, behind the grate
    s += e(w * 0.5, h * 0.9, w * 0.2, h * 0.07, "#e0782a", `opacity=".25"`) + e(w * 0.5, h * 0.9, w * 0.13, h * 0.03, "#d8642a", `opacity=".8"`);
    s += r(w * 0.34, h * 0.84, w * 0.3, h * 0.05, "#3a2416", `rx="2"`) + r(w * 0.4, h * 0.8, w * 0.26, h * 0.05, "#4a2e1a", `rx="2" transform="rotate(-6 ${w * 0.53} ${h * 0.82})"`);
    for (let i = 0; i < 5; i++) s += l(w * (0.3 + i * 0.1), h * 0.78, w * (0.3 + i * 0.1), h * 0.95, "#3a3632", 2);
    s += e(w * 0.5, h * 0.95, w * 0.2, 2.5, "#4a3a30");
    s += r(w * 0.15, -h * 0.1, 10, h * 0.1, "#d8d0c0") + c(w * 0.15 + 5, -h * 0.1 - 2, 1.5, "#f2c14a");
    s += r(w * 0.78, -h * 0.12, 12, h * 0.12, "#c9a24a", `rx="2"`) + c(w * 0.78 + 6, -h * 0.06, 3.5, "#f4ead2");
    return s;
  },
  armchair(w, h, t) {
    const col = t.chair || "#7a2f2a";
    let s = p(`M${w * 0.14} ${h * 0.6}V${h * 0.12}Q${w * 0.5} ${-h * 0.06} ${w * 0.86} ${h * 0.12}V${h * 0.6}z`, col);
    s += r(0, h * 0.34, w * 0.2, h * 0.46, col, `rx="6"`) + r(w * 0.8, h * 0.34, w * 0.2, h * 0.46, col, `rx="6"`);
    s += r(w * 0.12, h * 0.38, w * 0.76, h * 0.34, col, `rx="4"`) + r(w * 0.12, h * 0.38, w * 0.76, h * 0.06, "#ffffff14", `rx="3"`) + r(w * 0.12, h * 0.67, w * 0.76, h * 0.03, "#00000026");
    s += r(w * 0.08, h * 0.7, w * 0.84, h * 0.14, col) + r(w * 0.1, h * 0.84, 5, h * 0.16, t.wood2) + r(w * 0.9 - 5, h * 0.84, 5, h * 0.16, t.wood2);
    return s;
  },
  rug(w, h) {
    return p(`M${w * 0.08} 0H${w * 0.92}L${w} ${h}H0z`, "#7a2a2a") + p(`M${w * 0.14} 4H${w * 0.86}L${w * 0.93} ${h - 4}H${w * 0.07}z`, "none", `stroke="#d9b36a" stroke-width="2"`) + e(w / 2, h / 2, w * 0.18, h * 0.24, "#2d3f5a");
  },
  window(w, h, t) {
    let s = r(0, 0, w, h * 0.1, t.wood2) + r(w * 0.18, h * 0.1, w * 0.64, h * 0.78, "#d8d2c0");
    s += r(w * 0.22, h * 0.13, w * 0.56, h * 0.72, "#0f1d30");
    s += c(w * 0.62, h * 0.3, 6, "#e9e4c8", `opacity=".75"`);
    for (let i = 0; i < 9; i++) s += l(w * (0.25 + (i % 5) * 0.11), h * (0.18 + (i * 0.07) % 0.6), w * (0.23 + (i % 5) * 0.11), h * (0.27 + (i * 0.07) % 0.6), "#7d97b3", 1, `opacity=".6"`);
    s += r(w * 0.49, h * 0.13, 2, h * 0.72, "#d8d2c0") + r(w * 0.22, h * 0.48, w * 0.56, 2, "#d8d2c0");
    s += r(w * 0.16, h * 0.86, w * 0.68, h * 0.07, "#cfc7b2");
    const cur = t.curtain || "#7a2333";
    s += p(`M0 ${h * 0.1}H${w * 0.24}Q${w * 0.16} ${h * 0.55} ${w * 0.22} ${h}H0z`, cur) + p(`M${w} ${h * 0.1}H${w * 0.76}Q${w * 0.84} ${h * 0.55} ${w * 0.78} ${h}H${w}z`, cur);
    for (let i = 1; i < 4; i++) s += l(w * 0.05 * i, h * 0.12, w * 0.05 * i, h, "#00000030", 1.5) + l(w - w * 0.05 * i, h * 0.12, w - w * 0.05 * i, h, "#00000030", 1.5);
    return s;
  },
  painting(w, h, t, rnd) {
    let s = r(0, 0, w, h, "#b48a3a") + r(4, 4, w - 8, h - 8, "#8a6424") + r(6, 6, w - 12, h - 12, "#2b2a22");
    if (rnd() < 0.5) {
      s += e(w / 2, h * 0.45, w * 0.13, h * 0.17, "#c9a07a") + p(`M${w * 0.25} ${h - 6}Q${w * 0.5} ${h * 0.5} ${w * 0.75} ${h - 6}z`, "#3d2b22") + p(`M${w * 0.36} ${h * 0.36}Q${w / 2} ${h * 0.12} ${w * 0.64} ${h * 0.36}z`, "#4a3424");
    } else {
      s += r(6, h * 0.55, w - 12, h * 0.45 - 6, "#2c4256") + p(`M${w * 0.3} ${h * 0.7}L${w * 0.45} ${h * 0.3}L${w * 0.5} ${h * 0.7}z`, "#d8cfb8") + p(`M${w * 0.22} ${h * 0.72}H${w * 0.62}L${w * 0.56} ${h * 0.8}H${w * 0.28}z`, "#4a3020");
    }
    return s;
  },
  piano(w, h, t) {
    let s = r(0, 0, w, h * 0.38, t.piano || "#1a1210") + r(-3, -2, w + 6, 6, t.piano || "#1a1210");
    s += r(w * 0.3, h * 0.08, w * 0.4, h * 0.24, "#e9e1cc") + l(w * 0.34, h * 0.14, w * 0.66, h * 0.14, "#555", 0.7) + l(w * 0.34, h * 0.2, w * 0.66, h * 0.2, "#555", 0.7);
    s += r(0, h * 0.38, w, h * 0.14, "#f4efe2");
    for (let i = 0; i < 26; i++) s += l(w * 0.02 + i * (w * 0.96 / 26), h * 0.38, w * 0.02 + i * (w * 0.96 / 26), h * 0.52, "#9a9384", 0.6);
    for (let i = 0; i < 26; i++) if ([1, 2, 4, 5, 6].includes(i % 7)) s += r(w * 0.02 + i * (w * 0.96 / 26) - 1.5, h * 0.38, 3, h * 0.08, "#111");
    s += r(0, h * 0.52, w, h * 0.2, t.piano || "#1a1210") + r(w * 0.04, h * 0.72, 7, h * 0.28, "#120c0a") + r(w * 0.96 - 7, h * 0.72, 7, h * 0.28, "#120c0a");
    s += r(w * 0.32, h * 0.74, w * 0.36, h * 0.1, "#3a2418") + r(w * 0.34, h * 0.84, 4, h * 0.16, "#2a170e") + r(w * 0.66 - 4, h * 0.84, 4, h * 0.16, "#2a170e");
    s += r(w * 0.1, -h * 0.14, 6, h * 0.12, "#c9a24a") + c(w * 0.1 + 3, -h * 0.16, 1.5, "#f2c14a");
    return s;
  },
  clock(w, h, t) {
    let s = r(w * 0.1, h * 0.02, w * 0.8, h * 0.3, t.wood) + p(`M${w * 0.05} ${h * 0.04}Q${w * 0.5} ${-h * 0.06} ${w * 0.95} ${h * 0.04}z`, t.wood2);
    s += c(w / 2, h * 0.16, w * 0.32, "#efe6cc") + c(w / 2, h * 0.16, w * 0.32, "none", `stroke="#b48a3a" stroke-width="2"`);
    s += l(w / 2, h * 0.16, w / 2, h * 0.09, "#222", 1.5) + l(w / 2, h * 0.16, w * 0.64, h * 0.18, "#222", 1.2);
    s += r(w * 0.16, h * 0.32, w * 0.68, h * 0.48, t.wood2) + r(w * 0.26, h * 0.36, w * 0.48, h * 0.36, "#1a120c");
    s += l(w / 2, h * 0.36, w * 0.56, h * 0.64, "#c9a24a", 1.4) + c(w * 0.56, h * 0.65, 4, "#d8b45a");
    s += r(w * 0.06, h * 0.8, w * 0.88, h * 0.2, t.wood);
    return s;
  },
  wardrobe(w, h, t) {
    // Both doors stand open: a coat on the rail on the left, shelves with a hatbox and linen on the right.
    let s = r(0, 0, w, h, t.wood) + r(-3, 0, w + 6, h * 0.04, t.wood2);
    s += r(w * 0.04, h * 0.04, w * 0.92, h * 0.78, "#1a120c") + r(w * 0.485, h * 0.04, w * 0.03, h * 0.78, t.wood);
    // hat shelf across the top
    s += r(w * 0.04, h * 0.2, w * 0.92, h * 0.02, t.wood);
    s += r(w * 0.12, h * 0.1, w * 0.12, h * 0.09, "#1c1c22") + r(w * 0.08, h * 0.185, w * 0.2, h * 0.015, "#1c1c22") + r(w * 0.12, h * 0.16, w * 0.12, h * 0.012, "#5a2a2a");
    s += r(w * 0.58, h * 0.15, w * 0.3, h * 0.05, "#6a5a7a", `rx="1"`) + r(w * 0.6, h * 0.12, w * 0.26, h * 0.03, "#8a7a5a", `rx="1"`);
    // coat on the rail
    s += l(w * 0.06, h * 0.235, w * 0.47, h * 0.235, "#8a8d92", 1.5) + l(w * 0.27, h * 0.235, w * 0.27, h * 0.26, "#999", 1);
    s += p(`M${w * 0.12} ${h * 0.29}L${w * 0.27} ${h * 0.25}L${w * 0.42} ${h * 0.29}L${w * 0.46} ${h * 0.79}H${w * 0.08}z`, "#4a4e5a");
    s += l(w * 0.27, h * 0.29, w * 0.27, h * 0.79, "#363a44", 1) + p(`M${w * 0.21} ${h * 0.27}L${w * 0.27} ${h * 0.36}L${w * 0.33} ${h * 0.27}`, "none", `stroke="#363a44" stroke-width="1.2"`);
    s += c(w * 0.27, h * 0.42, 1.5, "#222") + c(w * 0.27, h * 0.5, 1.5, "#222");
    s += r(w * 0.12, h * 0.6, w * 0.12, 2, "#363a44") + r(w * 0.3, h * 0.6, w * 0.12, 2, "#363a44");
    // right side: hatbox on a shelf, linen below
    s += r(w * 0.515, h * 0.44, w * 0.445, h * 0.02, t.wood);
    s += r(w * 0.6, h * 0.28, w * 0.3, h * 0.16, "#a8763e", `rx="2"`) + r(w * 0.6, h * 0.33, w * 0.3, h * 0.025, "#7a3a4a") + e(w * 0.75, h * 0.28, w * 0.15, h * 0.015, "#c08a4e");
    s += r(w * 0.58, h * 0.62, w * 0.32, h * 0.06, "#e9e1cc", `rx="1"`) + r(w * 0.6, h * 0.68, w * 0.3, h * 0.06, "#cfc6ae", `rx="1"`) + r(w * 0.58, h * 0.74, w * 0.32, h * 0.08, "#e9e1cc", `rx="1"`);
    // open doors, seen edge-on
    s += p(`M${w * 0.04} ${h * 0.04}L${-w * 0.16} ${h * 0.08}V${h * 0.78}L${w * 0.04} ${h * 0.82}z`, t.wood2);
    s += p(`M${w * 0.96} ${h * 0.04}L${w * 1.16} ${h * 0.08}V${h * 0.78}L${w * 0.96} ${h * 0.82}z`, t.wood2);
    s += r(w * 0.04, h * 0.84, w * 0.92, h * 0.13, t.wood2, `opacity=".6"`) + c(w / 2, h * 0.905, 2, "#d8b45a");
    return s;
  },
  bed(w, h, t) {
    let s = r(0, -h * 0.1, w * 0.06, h, t.wood2) + p(`M0 ${-h * 0.1}Q${w * 0.03} ${-h * 0.3} ${w * 0.06} ${-h * 0.1}z`, t.wood2);
    s += r(w * 0.02, h * 0.42, w * 0.96, h * 0.32, "#e9e1cc") + r(w * 0.04, h * 0.14, w * 0.26, h * 0.26, "#f6f1e4", `rx="6"`);
    s += p(`M${w * 0.3} ${h * 0.16}H${w * 0.98}V${h * 0.7}H${w * 0.3}z`, t.spread || "#6b2f4a") + p(`M${w * 0.3} ${h * 0.16}H${w * 0.98}V${h * 0.26}H${w * 0.3}z`, "#f6f1e4", `opacity=".5"`);
    s += r(w * 0.32, h * 0.62, w * 0.66, h * 0.08, "#00000026");
    s += r(w * 0.94, h * 0.06, w * 0.06, h * 0.94, t.wood2) + r(w * 0.04, h * 0.74, w * 0.9, h * 0.06, t.wood);
    s += r(w * 0.06, h * 0.8, w * 0.88, h * 0.2, "#00000040");
    return s;
  },
  vanity(w, h, t) {
    let s = e(w / 2, h * 0.22, w * 0.32, h * 0.2, t.wood2) + e(w / 2, h * 0.22, w * 0.26, h * 0.16, "#9fb3c2") + p(`M${w * 0.34} ${h * 0.12}l${w * 0.12} ${h * 0.18}`, "none", `stroke="#ffffff70" stroke-width="2"`);
    s += r(0, h * 0.5, w, h * 0.12, t.wood) + r(w * 0.3, h * 0.43, w * 0.4, h * 0.08, "#8a2f4a", `rx="2"`);
    s += r(w * 0.04, h * 0.62, w * 0.92, h * 0.2, t.wood2) + r(w * 0.1, h * 0.66, w * 0.8, h * 0.13, t.wood, `opacity=".5"`) + c(w / 2, h * 0.725, 1.6, "#d8b45a");
    s += r(w * 0.06, h * 0.82, 4, h * 0.18, t.wood2) + r(w * 0.94 - 4, h * 0.82, 4, h * 0.18, t.wood2);
    s += r(w * 0.1, h * 0.4, 5, h * 0.1, "#c9b7e0") + r(w * 0.82, h * 0.42, 6, h * 0.08, "#e0c9a7", `rx="2"`);
    return s;
  },
  sideboard(w, h, t) {
    let s = r(0, h * 0.3, w, h * 0.58, t.wood) + r(-2, h * 0.27, w + 4, h * 0.05, t.wood2);
    s += r(w * 0.06, h * 0.38, w * 0.42, h * 0.46, t.wood2, `opacity=".6"`) + r(w * 0.52, h * 0.38, w * 0.42, h * 0.46, t.wood2, `opacity=".6"`);
    s += c(w * 0.44, h * 0.6, 1.6, "#d8b45a") + c(w * 0.56, h * 0.6, 1.6, "#d8b45a");
    s += r(w * 0.06, h * 0.88, 5, h * 0.12, t.wood2) + r(w * 0.94 - 5, h * 0.88, 5, h * 0.12, t.wood2);
    s += p(`M${w * 0.14} ${h * 0.27}v-${h * 0.12}l3-${h * 0.06}h4l3 ${h * 0.06}v${h * 0.12}z`, "#a85a3a", `opacity=".85"`);
    s += p(`M${w * 0.34} ${h * 0.27}v-${h * 0.1}l2-${h * 0.06}h4l2 ${h * 0.06}v${h * 0.1}z`, "#c9a24a", `opacity=".85"`);
    s += p(`M${w * 0.62} ${h * 0.27}h${w * 0.24}l-3-6h-${w * 0.24 - 6}z`, "#c0c0c8");
    return s;
  },
  table(w, h, t) {
    let s = p(`M${w * 0.04} 0H${w * 0.96}L${w} ${h * 0.2}H0z`, t.wood) + r(0, h * 0.2, w, h * 0.1, t.wood2);
    s += r(w * 0.04, h * 0.3, 6, h * 0.7, t.wood2) + r(w * 0.96 - 6, h * 0.3, 6, h * 0.7, t.wood2) + r(w * 0.22, h * 0.3, 5, h * 0.6, t.wood2, `opacity=".7"`) + r(w * 0.78 - 5, h * 0.3, 5, h * 0.6, t.wood2, `opacity=".7"`);
    s += r(w * 0.31, h * 0.215, w * 0.38, h * 0.07, t.wood, `opacity=".55"`) + c(w * 0.5, h * 0.25, 1.4, "#d8b45a");
    s += e(w * 0.5, h * 0.08, w * 0.08, h * 0.05, "#c0c0c8") + c(w * 0.48, h * 0.04, 3, "#b33a2a") + c(w * 0.53, h * 0.04, 3, "#d8a83a");
    return s;
  },
  stove(w, h, t, rnd, f) {
    let s = r(0, h * 0.18, w, h * 0.82, "#24262a") + r(-3, h * 0.12, w + 6, h * 0.08, "#3a3d42");
    const top = f ? -f.y : -h * 0.6;
    s += r(w * 0.8, top, w * 0.1, h * 0.12 - top, "#2b2d31") + r(w * 0.78, h * 0.02, w * 0.14, 4, "#3a3d42") + r(w * 0.78, top + 30, w * 0.14, 3, "#3a3d42");
    s += r(w * 0.08, h * 0.3, w * 0.5, h * 0.42, "#33363b") + r(w * 0.12, h * 0.34, w * 0.42, h * 0.34, "none", `stroke="#8a8d92" stroke-width="1.5"`) + r(w * 0.25, h * 0.48, w * 0.16, 3, "#b8bcc2");
    s += r(w * 0.62, h * 0.3, w * 0.32, h * 0.4, "#33363b") + c(w * 0.78, h * 0.5, 4, "#b8bcc2");
    s += r(w * 0.62, h * 0.76, w * 0.32, h * 0.2, "#1a1b1e") + l(w * 0.66, h * 0.86, w * 0.9, h * 0.86, "#555", 1);
    s += p(`M${w * 0.14} ${h * 0.12}q0-${h * 0.14} ${w * 0.12}-${h * 0.14}t${w * 0.12} ${h * 0.14}z`, "#5a5e66") + r(w * 0.25, -h * 0.06, 3, 4, "#5a5e66");
    s += r(w * 0.46, h * 0.04, w * 0.2, h * 0.08, "#3a3d42") + r(w * 0.66, h * 0.07, w * 0.12, 2, "#3a3d42");
    return s;
  },
  pantry(w, h, t) {
    let s = r(0, 0, w, h, t.wood2) + r(3, 3, w - 6, h - 6, "#3a2a1c");
    for (let i = 1; i < 4; i++) s += r(3, h * 0.16 * i, w - 6, 3, t.wood);
    const jar = ["#b33a2a", "#d8a83a", "#6b8a3a", "#8a3a6b", "#c96a2a"];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) s += r(w * 0.08 + i * w * 0.17, h * (0.06 + row * 0.16), w * 0.12, h * 0.1, jar[(i + row) % 5], `rx="2" opacity=".85"`) + r(w * 0.08 + i * w * 0.17, h * (0.05 + row * 0.16), w * 0.12, h * 0.025, "#d8d2c0");
    s += r(w * 0.1, h * 0.64, w * 0.48, h * 0.32, "#c8c2b0", `rx="3"`) + r(w * 0.1, h * 0.64, w * 0.48, h * 0.05, "#a8a290") + `<text x="${w * 0.34}" y="${h * 0.84}" font-size="${w * 0.1}" text-anchor="middle" fill="#6a6252" font-family="serif">FLOUR</text>`;
    s += p(`M${w * 0.64} ${h * 0.96}q-2-${h * 0.2} ${w * 0.14}-${h * 0.26}q${w * 0.16} ${h * 0.06} ${w * 0.14} ${h * 0.26}z`, "#b39a6a");
    return s;
  },
  winerack(w, h, t) {
    let s = r(0, 0, w, h * 0.76, t.wood2);
    const cols = 7, rows = 6, cw = w / cols, rh = (h * 0.74) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const cx = cw * (i + 0.5), cy = rh * (j + 0.5) + 2;
      s += c(cx, cy, Math.min(cw, rh) * 0.4, "#121a10") + c(cx, cy, Math.min(cw, rh) * 0.18, (i + j) % 3 ? "#2d3b22" : "#4a1a22");
    }
    for (let i = 0; i <= cols; i++) s += l(i * cw, 0, i * cw, h * 0.76, t.wood, 2);
    s += r(0, h * 0.76, w, h * 0.03, t.wood) + r(4, h * 0.79, w - 8, h * 0.21, "#0000004d");
    s += r(0, h * 0.76, 5, h * 0.24, t.wood) + r(w - 5, h * 0.76, 5, h * 0.24, t.wood) + r(w / 2 - 2.5, h * 0.76, 5, h * 0.24, t.wood);
    return s;
  },
  barrel(w, h, t) {
    let s = e(w / 2, h * 0.12, w * 0.42, h * 0.1, t.wood2) + p(`M${w * 0.08} ${h * 0.12}Q0 ${h * 0.55} ${w * 0.08} ${h * 0.95}H${w * 0.92}Q${w} ${h * 0.55} ${w * 0.92} ${h * 0.12}z`, t.wood);
    for (let i = 1; i < 6; i++) s += l(w * (0.08 + i * 0.14), h * 0.14, w * (0.08 + i * 0.14), h * 0.94, t.wood2, 1);
    s += p(`M${w * 0.04} ${h * 0.3}Q${w / 2} ${h * 0.36} ${w * 0.96} ${h * 0.3}`, "none", `stroke="#3a3a3a" stroke-width="3"`) + p(`M${w * 0.04} ${h * 0.78}Q${w / 2} ${h * 0.84} ${w * 0.96} ${h * 0.78}`, "none", `stroke="#3a3a3a" stroke-width="3"`);
    s += e(w / 2, h * 0.12, w * 0.36, h * 0.07, "#7a5530");
    return s;
  },
  billiard(w, h, t) {
    let s = p(`M${w * 0.06} 0H${w * 0.94}L${w} ${h * 0.42}H0z`, "#5b3a1f") + p(`M${w * 0.09} ${h * 0.04}H${w * 0.91}L${w * 0.96} ${h * 0.38}H${w * 0.04}z`, "#1f6b3a");
    s += r(0, h * 0.42, w, h * 0.16, "#4a2e18");
    for (const x of [0.05, 0.5, 0.95]) s += c(w * x, h * 0.44, 3.5, "#111");
    s += r(w * 0.06, h * 0.58, 9, h * 0.42, "#3d2512") + r(w * 0.94 - 9, h * 0.58, 9, h * 0.42, "#3d2512") + r(w / 2 - 5, h * 0.58, 10, h * 0.42, "#3d2512");
    const cx = w * 0.62, cy = h * 0.2;
    [[0, 0], [5, -3], [5, 3], [10, -6], [10, 0], [10, 6]].forEach(([dx, dy], i) => { s += c(cx + dx, cy + dy * 0.6, 2.6, ["#c92a2a", "#d8a83a", "#2a5ac9", "#6b2a8a", "#c96a2a", "#111"][i]); });
    s += c(w * 0.3, h * 0.24, 2.6, "#f4efe2");
    return s;
  },
  cuerack(w, h, t) {
    let s = r(0, h * 0.06, w, h * 0.06, t.wood) + r(0, h * 0.86, w, h * 0.06, t.wood);
    for (let i = 0; i < 4; i++) { const x = w * (0.16 + i * 0.22); s += l(x, h * 0.02, x, h * 0.9, "#c9a46a", 2.5) + l(x, h * 0.6, x, h * 0.9, "#3a2414", 3.5) + r(x - 1.2, h * 0.01, 2.4, 3, "#2a5ac9"); }
    return s;
  },
  potting(w, h, t) {
    let s = r(0, h * 0.24, w, h * 0.08, t.wood) + r(w * 0.04, h * 0.32, 5, h * 0.68, t.wood2) + r(w * 0.96 - 5, h * 0.32, 5, h * 0.68, t.wood2) + r(w * 0.04, h * 0.88, w * 0.92, 4, t.wood2);
    for (let i = 0; i < 4; i++) { const x = w * (0.06 + i * 0.14); s += p(`M${x} ${h * 0.1}h${w * 0.11}l-2 ${h * 0.14}h-${w * 0.11 - 4}z`, "#b45a32") + p(`M${x + w * 0.055} ${h * 0.1}q-6-10 -2-16m2 16q6-12 3-18`, "none", `stroke="#4a7a3a" stroke-width="2"`); }
    s += l(w * 0.72, h * 0.24, w * 0.8, h * 0.02, "#8a8d92", 2) + p(`M${w * 0.82} ${h * 0.24}h${w * 0.12}v-${h * 0.12}h-${w * 0.12}z`, "#6a8a9a");
    s += p(`M${w * 0.12} ${h * 0.88}q-2-${h * 0.22} ${w * 0.08}-${h * 0.26}h${w * 0.6}q${w * 0.08} ${h * 0.06} ${w * 0.06} ${h * 0.26}z`, "#9a8058");
    return s;
  },
  palm(w, h) {
    let s = "";
    const fr = [[-0.45, 0.18], [-0.3, 0.02], [0, -0.04], [0.3, 0.04], [0.45, 0.2], [-0.2, 0.3], [0.2, 0.32]];
    const bx = w / 2, by = h * 0.62;
    for (const [dx, dy] of fr) {
      // Each frond arches up from the pot and tapers to its tip.
      const tx = w * (0.5 + dx), ty = h * (dy + 0.24), len = Math.hypot(tx - bx, ty - by), nx = (by - ty) / len, ny = (tx - bx) / len;
      const mx = (bx + tx) / 2, my = (by + ty) / 2 - len * 0.18, side = dx < 0 ? -1 : 1;
      s += p(`M${n(bx)} ${n(by)}Q${n(mx + nx * len * 0.16 * side)} ${n(my + ny * len * 0.16 * side)} ${n(tx)} ${n(ty)}Q${n(mx - nx * len * 0.04 * side)} ${n(my - ny * len * 0.04 * side)} ${n(bx)} ${n(by)}z`, "#3f7a3a", `stroke="#2a5a28" stroke-width="1"`);
    }
    s += p(`M${w * 0.16} ${h * 0.66}H${w * 0.84}L${w * 0.76} ${h}H${w * 0.24}z`, "#a8582e") + r(w * 0.13, h * 0.64, w * 0.74, h * 0.05, "#8a4422");
    s += e(w / 2, h * 0.645, w * 0.33, h * 0.016, "#3a2a1c") + l(w / 2, h * 0.58, w / 2, h * 0.645, "#5a4228", 3);
    return s;
  },
  birdcage(w, h) {
    // A brass cage on a pedestal stand, a canary on its perch.
    const brass = "#c9a24a", dark = "#8a6a2a", top = h * 0.1, bot = h * 0.38;
    let s = l(w / 2, h * 0.44, w / 2, h * 0.96, dark, 3) + p(`M${w * 0.18} ${h}L${w / 2} ${h * 0.9}L${w * 0.82} ${h}`, "none", `stroke="${dark}" stroke-width="3" stroke-linecap="round"`);
    s += r(w * 0.42, h * 0.44, w * 0.16, h * 0.03, dark);
    s += p(`M${w * 0.06} ${top}Q${w / 2} ${-h * 0.04} ${w * 0.94} ${top}z`, "#1a2c3d", `opacity=".35"`);
    s += l(w * 0.22, h * 0.27, w * 0.78, h * 0.27, "#6a4a2a", 1.5) + e(w * 0.44, h * 0.235, w * 0.12, h * 0.03, "#e8c84a") + c(w * 0.56, h * 0.215, h * 0.022, "#e8c84a") + p(`M${w * 0.32} ${h * 0.24}l-${w * 0.1} ${h * 0.02}l${w * 0.04} -${h * 0.025}z`, "#d8b43a") + c(w * 0.575, h * 0.21, 0.8, "#1a1a1a") + p(`M${w * 0.6} ${h * 0.21}l${w * 0.05} ${h * 0.006}l-${w * 0.05} ${h * 0.008}z`, "#d87a2a");
    s += r(w * 0.7, h * 0.3, w * 0.12, h * 0.03, "#b8bcc2") + r(w * 0.18, h * 0.3, w * 0.1, h * 0.03, "#d8c890");
    for (let i = 0; i <= 8; i++) { const x = w * (0.06 + i * 0.11); s += l(x, top, x, bot, brass, 1); }
    s += p(`M${w * 0.06} ${top}Q${w / 2} ${-h * 0.04} ${w * 0.94} ${top}`, "none", `stroke="${brass}" stroke-width="1.5"`);
    for (let i = 1; i < 8; i++) { const x = w * (0.06 + i * 0.11); s += p(`M${w / 2} ${h * 0.02}Q${x} ${h * 0.03} ${x} ${top}`, "none", `stroke="${brass}" stroke-width=".8"`); }
    s += l(w * 0.06, top, w * 0.94, top, brass, 1.5) + r(w * 0.02, bot, w * 0.96, h * 0.05, brass) + r(w * 0.02, bot + h * 0.035, w * 0.96, h * 0.015, dark);
    s += c(w / 2, h * 0.012, 2.5, "none", `stroke="${brass}" stroke-width="1.2"`);
    return s;
  },
  sofa(w, h, t) {
    const col = t.chair || "#3f5a7a";
    let s = r(w * 0.06, 0, w * 0.88, h * 0.5, col, `rx="10"`) + r(0, h * 0.26, w * 0.12, h * 0.5, col, `rx="6"`) + r(w * 0.88, h * 0.26, w * 0.12, h * 0.5, col, `rx="6"`);
    s += r(w * 0.1, h * 0.42, w * 0.8, h * 0.3, col, `rx="4" stroke="#00000033"`) + l(w / 2, h * 0.44, w / 2, h * 0.72, "#00000033", 1.5);
    s += r(w * 0.04, h * 0.72, w * 0.92, h * 0.12, col) + r(w * 0.08, h * 0.84, 5, h * 0.16, "#2a1a10") + r(w * 0.92 - 5, h * 0.84, 5, h * 0.16, "#2a1a10");
    return s;
  },
  gramophone(w, h, t) {
    let s = r(w * 0.2, h * 0.58, w * 0.6, h * 0.42, t.wood2) + r(w * 0.1, h * 0.44, w * 0.8, h * 0.16, t.wood) + e(w * 0.5, h * 0.44, w * 0.36, h * 0.04, "#151515");
    s += l(w * 0.66, h * 0.44, w * 0.5, h * 0.3, "#b48a3a", 2.5) + p(`M${w * 0.5} ${h * 0.32}L${w * 0.08} ${h * 0.02}Q${w * 0.02} ${h * 0.2} ${w * 0.2} ${h * 0.24}z`, "#c9a24a", `stroke="#8a6424"`);
    return s;
  },
  chest(w, h, t) {
    let s = p(`M0 ${h * 0.3}Q${w / 2} ${-h * 0.05} ${w} ${h * 0.3}z`, t.wood2) + r(0, h * 0.3, w, h * 0.7, t.wood);
    const lid = (x) => { const u = x / w; return h * ((1 - u) * (1 - u) * 0.3 - 2 * u * (1 - u) * 0.05 + u * u * 0.3); };
    for (const x0 of [w * 0.2, w * 0.8 - 5]) s += p(`M${n(x0)} ${n(lid(x0))}L${n(x0 + 5)} ${n(lid(x0 + 5))}V${h}H${n(x0)}z`, "#3a3a3a", `opacity=".8"`);
    s += l(0, h * 0.3, w, h * 0.3, "#00000055", 1.5) + r(w * 0.44, h * 0.26, w * 0.12, h * 0.2, "#c9a24a", `rx="1"`) + c(w / 2, h * 0.34, 1.6, "#2a1a10") + r(w / 2 - 0.6, h * 0.34, 1.2, h * 0.06, "#2a1a10");
    return s;
  },
  sidetable(w, h, t) {
    let s = e(w / 2, h * 0.5, w / 2, h * 0.06, t.wood) + r(w / 2 - 3, h * 0.5, 6, h * 0.46, t.wood2) + e(w / 2, h * 0.97, w * 0.3, h * 0.04, t.wood2);
    s += r(w * 0.46, h * 0.08, 4, h * 0.38, "#c9a24a") + p(`M${w * 0.24} ${h * 0.16}H${w * 0.76}L${w * 0.66} -${h * 0.1}H${w * 0.34}z`, "#e8c97a") + e(w * 0.5, h * 0.18, w * 0.26, 2, "#00000022");
    return s;
  },
  body(w, h, t, rnd, f) {
    // A figure lying on its back seen from above, head to the left, one arm thrown out. f.look sets hair, clothes and build.
    const L = (f && f.look) || { hair: "short", hairColor: "#6a6a6a", suit: "#2b2a33", shirt: "#f4efe2" };
    const skin = "#e4c2a8", shoe = "#1c1714", dress = !!L.dress, cy = h * 0.55;
    const X = (v) => n(w * v), Y = (v) => n(h * v);
    const limb = (pts, col, sw, cap = "round") => p(`M${pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join("L")}`, "none", `stroke="${col}" stroke-width="${n(sw)}" stroke-linecap="${cap}" stroke-linejoin="round"`);
    let s = e(w * 0.52, h * 0.8, w * 0.48, h * 0.14, "#00000040");
    const hr = Math.min(h * 0.17, w * 0.06), hx = w * 0.19 - hr * 1.35;
    // Long hair fans out on the floor behind the head.
    if (L.hair === "long") s += p(`M${n(hx)} ${n(cy - hr * 1.15)}Q${n(hx - hr * 2.6)} ${n(cy - hr * 1.4)} ${n(hx - hr * 2.2)} ${n(cy)}Q${n(hx - hr * 2.6)} ${n(cy + hr * 1.4)} ${n(hx)} ${n(cy + hr * 1.15)}z`, L.hairColor);
    // Legs: trousers with shoes, or stockinged shins under a skirt.
    if (dress) {
      s += limb([[0.78, 0.47], [0.93, 0.42]], "#3a2f2c", h * 0.09) + limb([[0.78, 0.63], [0.93, 0.7]], "#3a2f2c", h * 0.09);
      s += e(w * 0.95, h * 0.41, h * 0.05, h * 0.07, shoe) + e(w * 0.95, h * 0.71, h * 0.05, h * 0.07, shoe);
      s += p(`M${X(0.5)} ${Y(0.36)}L${X(0.82)} ${Y(0.24)}Q${X(0.85)} ${Y(0.55)} ${X(0.82)} ${Y(0.86)}L${X(0.5)} ${Y(0.74)}z`, L.suit);
      s += p(`M${X(0.62)} ${Y(0.34)}Q${X(0.7)} ${Y(0.5)} ${X(0.8)} ${Y(0.42)}M${X(0.62)} ${Y(0.68)}Q${X(0.7)} ${Y(0.6)} ${X(0.8)} ${Y(0.7)}`, "none", `stroke="#00000033" stroke-width="1.2"`);
    } else {
      s += limb([[0.5, 0.45], [0.92, 0.4]], L.suit, h * 0.17, "butt") + limb([[0.5, 0.65], [0.92, 0.71]], L.suit, h * 0.17, "butt");
      s += e(w * 0.94, h * 0.39, h * 0.06, h * 0.09, shoe) + e(w * 0.94, h * 0.72, h * 0.06, h * 0.09, shoe);
    }
    // Arm along the side, under the torso's edge.
    s += limb([[0.22, 0.76], [0.38, 0.85], [0.5, 0.84]], L.suit, h * 0.12) + c(w * 0.53, h * 0.84, h * 0.06, skin);
    // Neck, then the torso over it.
    s += r(n(hx + hr * 0.6), n(cy - hr * 0.4), n(w * 0.2 - hx - hr * 0.4), n(hr * 0.8), skin);
    s += p(`M${X(0.19)} ${Y(0.38)}Q${X(0.19)} ${Y(0.27)} ${X(0.25)} ${Y(0.27)}L${X(0.5)} ${Y(0.34)}Q${X(0.55)} ${Y(0.55)} ${X(0.5)} ${Y(0.76)}L${X(0.25)} ${Y(0.83)}Q${X(0.19)} ${Y(0.83)} ${X(0.19)} ${Y(0.72)}z`, L.suit);
    // Collar: shirt and lapels for the men, a lace neckline and brooch for the women.
    if (dress) s += p(`M${X(0.19)} ${Y(0.44)}Q${X(0.25)} ${Y(0.55)} ${X(0.19)} ${Y(0.66)}z`, L.shirt) + c(w * 0.27, cy, h * 0.045, "#e8e0d0");
    else {
      s += p(`M${X(0.19)} ${Y(0.42)}L${X(0.3)} ${n(cy)}L${X(0.19)} ${Y(0.68)}z`, L.shirt) + l(X(0.2), n(cy), X(0.28), n(cy), "#5a1f24", h * 0.05);
      s += p(`M${X(0.19)} ${Y(0.4)}L${X(0.31)} ${n(cy)}M${X(0.19)} ${Y(0.7)}L${X(0.31)} ${n(cy)}`, "none", `stroke="#00000055" stroke-width="1.2"`);
    }
    // The other arm thrown out above the head, the watch on its wrist.
    s += limb([[0.27, 0.28], [0.3, 0.12], [0.37, 0.1]], L.suit, h * 0.12) + c(w * 0.4, h * 0.1, h * 0.06, skin) + r(n(w * 0.365), n(h * 0.04), 2.4, n(h * 0.12), "#c9a24a", `rx="1"`);
    // Head: hair at the crown, face turned up.
    if (L.hair !== "long" && L.hair !== "bald") s += c(hx - hr * 0.28, cy, hr, L.hairColor);
    if (L.hair === "long") s += c(hx - hr * 0.3, cy, hr * 1.02, L.hairColor);
    s += c(hx, cy, hr * (L.hair === "bald" ? 1 : 0.9), skin);
    if (L.hair === "bald") s += p(`M${n(hx - hr * 0.3)} ${n(cy - hr * 0.95)}A${n(hr)} ${n(hr)} 0 0 0 ${n(hx - hr * 0.3)} ${n(cy + hr * 0.95)}`, "none", `stroke="${L.hairColor}" stroke-width="${n(hr * 0.28)}" stroke-linecap="round"`);
    // Closed eyes: a short curved lid line each, running across the face.
    for (const ey of [cy - hr * 0.34, cy + hr * 0.34]) s += p(`M${n(hx + hr * 0.22)} ${n(ey - hr * 0.17)}Q${n(hx + hr * 0.34)} ${n(ey)} ${n(hx + hr * 0.22)} ${n(ey + hr * 0.17)}`, "none", `stroke="#5a4038" stroke-width="${n(Math.max(0.8, hr * 0.12))}" stroke-linecap="round"`);
    return s;
  },
};

// The room scene. opts.revealed: hidden spots to draw opened.
export function roomArt(room, opts = {}) {
  const t = THEMES[room.theme];
  let s = backdrop(t);
  const order = room.furniture.slice().sort((a, b) => (a.kind === "rug" || a.kind === "body" ? -1 : 0) - (b.kind === "rug" || b.kind === "body" ? -1 : 0) || (a.y + a.h) - (b.y + b.h));
  for (const f of order) s += g(f.x, f.y, F[f.kind](f.w, f.h, t, seq(f.id), f));
  // Locks: a box standing on its spot, or a brass padlock on the furniture part it closes.
  for (const lk of opts.locks || []) {
    const cx = lk.x + lk.w / 2, by = lk.y + lk.h;
    if (lk.box) {
      const w = Math.min(26, Math.max(14, lk.w * 0.5)), h = w * 0.62, x = cx - w / 2, y = by - h - 1;
      const col = { strongbox: "#5d646c", tin: "#8a3a2a", attache: "#6a3f22" }[lk.box];
      s += `<g class="lockbox" pointer-events="none">${r(n(x), n(y), n(w), n(h), col, `rx="1.5" stroke="#1d1a17" stroke-width=".8"`)}${c(n(cx), n(y + h * 0.55), n(h * 0.22), "#d8b45a")}</g>`;
    } else {
      const cy = lk.y + lk.h / 2;
      s += `<g class="padlock" pointer-events="none">${p(`M${n(cx - 2.6)} ${n(cy - 1)}v-2.2a2.6 2.6 0 0 1 5.2 0v2.2`, "none", `stroke="#c9cdd2" stroke-width="1.2"`)}${r(n(cx - 3.8), n(cy - 1), 7.6, 6, "#d8b45a", `rx="1"`)}${c(n(cx), n(cy + 1.8), 0.9, "#2a2320")}</g>`;
    }
  }
  for (const h of opts.revealed || []) {
    s += `<g class="opened">${r(n(h.x), n(h.y), n(h.w), n(h.h), "#0d0907", `rx="2" stroke="#e8c15a" stroke-width="1.5" stroke-dasharray="3 2"`)}${p(`M${n(h.x + h.w / 2)} ${n(h.y + h.h / 2 - 5)}l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z`, "#f2d27a")}</g>`;
  }
  // lamplight
  s += `<rect width="400" height="260" fill="url(#lamp)" pointer-events="none"/>`;
  return s;
}
export const ROOM_DEFS = `<defs><radialGradient id="lamp" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#ffd890" stop-opacity=".08"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs>`;

// ---------- portraits ----------
const REGIONS = { buttons: [60, 124, 11], studs: [60, 122, 10], lapel: [45, 120, 9], tiepin: [60, 126, 9], strap: [45, 114, 9], earring: [83, 82, 8], hairpin: [74, 30, 10], body: [60, 120, 26] };

export function portrait(look, o = {}) {
  const mood = o.mood || "calm";
  const sk = look.skin, hc = look.hairColor, col = look.color, ac = look.accent, ex = look.extras;
  const lost = o.lost; // the murderer's token is missing
  const shade = "#00000030";
  let s = `<defs><radialGradient id="pbg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#4a3b4f"/><stop offset="1" stop-color="#1b1520"/></radialGradient></defs>`;
  s += r(0, 0, 120, 140, "url(#pbg)");
  // hair behind the head
  if (look.hair === "wavy") s += p("M32 60Q28 30 60 26Q92 30 88 60Q94 92 86 112H34Q26 92 32 60z", hc);
  if (look.hair === "bob") s += p("M34 62Q32 30 60 28Q88 30 86 62L88 90H32z", hc);
  if (look.hair === "braid") s += p("M80 70Q92 92 86 118", "none", `stroke="${hc}" stroke-width="9" stroke-linecap="round" stroke-dasharray="6 2"`);
  // body and outfit
  s += r(52, 82, 16, 22, sk) + r(52, 82, 16, 9, shade);
  const torso = "M8 140Q12 108 40 102Q60 110 80 102Q108 108 112 140z";
  if (look.outfit === "uniform") {
    s += p(torso, col) + p("M17 113L33 104L35 108L20 117z", ac) + p("M103 113L87 104L85 108L100 117z", ac);
    s += p("M52 102L60 116L68 102", "none", `stroke="#2d3a22" stroke-width="3"`);
    s += c(60, 118, 2.4, ac) + (lost ? r(58, 125, 4, 1, "#2d3a22") : c(60, 126, 2.4, ac)) + c(60, 134, 2.4, ac);
  } else if (look.outfit === "dress") {
    s += p(torso, col) + p("M48 102L60 120L72 102", sk) + p("M44 102L60 124L76 102", "none", `stroke="${ac}" stroke-width="2"`);
  } else if (look.outfit === "tailcoat") {
    s += p(torso, col) + p("M48 102L60 140L72 102z", ac) + p("M48 102L56 140H44z", "#2c2c36") + p("M72 102L64 140H76z", "#2c2c36");
    s += c(60, 116, 1.6, "#eae3d0", `stroke="#999" stroke-width=".5"`) + (lost ? "" : c(60, 123, 1.6, "#eae3d0", `stroke="#999" stroke-width=".5"`)) + c(60, 130, 1.6, "#eae3d0", `stroke="#999" stroke-width=".5"`);
  } else if (look.outfit === "suit") {
    s += p(torso, col) + p("M50 102L60 130L70 102z", "#efe9dc") + p("M50 102L40 124L56 130z", shade) + p("M70 102L80 124L64 130z", shade);
    if (ex.includes("tie")) s += p("M57 104h6l-1 4 3 22-5 6-5-6 3-22z", ac);
    if (look.token === "tiepin" && !lost) s += r(55, 125, 10, 1.8, "#e2c15a");
    if (look.token === "lapel") s += lost ? c(43, 118, 0.7, "#222") + c(45, 121, 0.7, "#222") : p("M41 116a4 4 0 1 1 6 0l-1.5 0a2.5 2.5 0 1 0-3 0z", "#e2c15a");
  } else if (look.outfit === "apron") {
    s += p(torso, col) + p("M40 112H80V140H40z", ac) + l(40, 112, 46, 102, ac, 3) + (lost ? p("M80 112L84 106", "none", `stroke="${ac}" stroke-width="3"`) : l(80, 112, 74, 102, ac, 3));
    s += c(45, 112, 1.8, "#7a5a3a") + (lost ? "" : c(75, 112, 1.8, "#7a5a3a"));
  } else if (look.outfit === "smock") {
    s += p(torso, col) + p("M52 102Q60 112 68 102", "none", `stroke="#8a4418" stroke-width="2"`);
    s += (lost ? r(58, 116, 4, 1, "#8a4418") : c(60, 117, 2.2, ac)) + c(60, 126, 2.2, ac) + c(60, 135, 2.2, ac);
    s += c(42, 128, 2, "#3a7ac9", `opacity=".7"`) + c(78, 120, 1.6, "#e8c23a", `opacity=".8"`);
  } else if (look.outfit === "cardigan") {
    s += p(torso, col) + p("M50 102L60 114L70 102z", ac) + p("M60 114V140", "none", `stroke="#00000040" stroke-width="2"`) + c(63.5, 121, 1.6, "#d8d2c0") + c(63.5, 131, 1.6, "#d8d2c0");
  } else if (look.outfit === "overalls") {
    s += p(torso, "#c9b48a") + p("M40 114H80V140H40z", col) + (lost ? l(80, 114, 76, 104, col, 4) : l(80, 114, 72, 102, col, 4)) + l(40, 114, 48, 102, col, 4);
    s += c(45, 114, 2.2, "#d8b45a") + (lost ? "" : c(75, 114, 2.2, "#d8b45a"));
  }
  if (ex.includes("bowtie")) s += p("M52 100l8 4 8-4v8l-8-4-8 4z", "#111");
  if (ex.includes("scarf")) s += p("M46 98Q60 108 74 98L76 104Q60 116 44 104z", "#2a6a8a") + p("M64 106l6 16-6 2-3-16z", "#2a6a8a");
  if (ex.includes("pearls")) for (let i = 0; i < 9; i++) s += c(48 + i * 3, 103 + Math.sin((i / 8) * Math.PI) * 5, 1.5, "#f4efe2");
  // head
  s += e(37, 64, 4, 6, sk) + e(83, 64, 4, 6, sk);
  if (look.token === "earring") s += c(37, 72, 2, look.earring || "#f4efe2", `stroke="#bbb" stroke-width=".4"`) + (lost ? "" : c(83, 72, 2, look.earring || "#f4efe2", `stroke="#bbb" stroke-width=".4"`));
  s += e(60, 60, 22, 27, sk);
  // hair on top
  const hairTop = {
    short: "M38 56Q36 32 60 32Q84 32 82 56Q78 42 60 42Q42 42 38 56z",
    bald: "M38 60Q37 50 40 46L42 58zM82 60Q83 50 80 46L78 58z",
    bun: "M38 56Q38 32 60 32Q82 32 82 56Q74 40 60 40Q46 40 38 56z",
    wavy: "M38 58Q36 32 60 32Q84 32 82 58Q78 40 66 42Q60 50 50 42Q42 44 38 58z",
    slick: "M38 54Q38 32 62 32Q84 34 82 54Q80 40 66 40L56 44Q44 42 38 54z",
    curly: "",
    bob: "M38 60Q36 32 60 32Q84 32 82 60Q80 42 60 40Q40 42 38 60z",
    braid: "M38 56Q38 32 60 32Q82 32 82 56Q76 40 60 40Q44 40 38 56z",
    capped: "",
  }[look.hair];
  if (hairTop) s += p(hairTop, hc);
  if (look.hair === "curly") for (let i = 0; i < 11; i++) s += c(38 + i * 4.4, 40 - Math.sin((i / 10) * Math.PI) * 9, 6, hc);
  if (look.hair === "bun") {
    s += c(60, 26, 9, hc);
    s += l(66, 22, 76, 30, "#8a5a2a", 1.6) + (lost ? "" : l(54, 22, 44, 30, "#8a5a2a", 1.6));
    if (lost) s += p("M48 40q-6 8-4 20", "none", `stroke="${hc}" stroke-width="1.4"`);
  }
  if (look.hair === "capped") s += p("M35 66Q32 36 60 36Q88 36 85 66Q82 48 60 47Q38 48 35 66z", hc) + p("M38 44Q36 22 60 22Q84 22 82 44Q60 36 38 44z", "#f4f1ea") + p("M37 44Q60 34 83 44", "none", `stroke="#d8d2c0" stroke-width="2"`);
  if (ex.includes("beret")) s += e(58, 34, 22, 7, "#2a2a3a") + c(58, 27, 2, "#2a2a3a");
  if (ex.includes("cap")) s += p("M36 48Q38 30 60 30Q82 30 84 46Q60 40 36 48z", "#6a5a3a") + p("M36 48Q60 40 86 46L92 50Q60 46 34 52z", "#5a4a30");
  // face, by mood
  const brow = { calm: ["M46 50h10", "M64 50h10"], uneasy: ["M46 50l10-2", "M64 48l10 2"], afraid: ["M46 48l10-4", "M64 44l10 4"], angry: ["M46 46l10 5", "M64 51l10-5"] }[mood];
  s += p(brow[0], "none", `stroke="${hc === "#ecebe6" ? "#9a958a" : hc}" stroke-width="2.4" stroke-linecap="round"`) + p(brow[1], "none", `stroke="${hc === "#ecebe6" ? "#9a958a" : hc}" stroke-width="2.4" stroke-linecap="round"`);
  if (mood === "afraid") s += e(51, 58, 3.4, 3.4, "#fff") + e(69, 58, 3.4, 3.4, "#fff");
  s += e(51, 58, 2, mood === "angry" ? 1.4 : 2.2, "#1a1414") + e(69, 58, 2, mood === "angry" ? 1.4 : 2.2, "#1a1414");
  s += p("M60 60Q58 70 56 72Q60 74 63 72", "none", `stroke="#00000055" stroke-width="1.4"`);
  const mouth = { calm: "M53 79Q60 83 67 79", uneasy: "M53 80q3.5-2 7 0t7 0", afraid: "M56 80a4 3 0 1 0 8 0a4 3 0 1 0-8 0", angry: "M53 82Q60 77 67 82" }[mood];
  s += p(mouth, mood === "afraid" ? "#5a2a2a" : "none", `stroke="#7a3a3a" stroke-width="2" stroke-linecap="round"`);
  if (mood === "afraid" || mood === "uneasy") s += p("M80 44q3 5 0 7q-3-2 0-7z", "#9fd0f0", `opacity="${mood === "afraid" ? 0.9 : 0.5}"`);
  if (ex.includes("moustache")) s += p("M48 76Q54 70 60 74Q66 70 72 76Q66 74 60 77Q54 74 48 76z", hc);
  if (ex.includes("beard")) s += p("M40 66Q42 92 60 94Q78 92 80 66Q76 84 60 84Q44 84 40 66z", hc) + p("M52 76Q60 72 68 76", "none", `stroke="${hc}" stroke-width="3"`);
  if (ex.includes("glasses")) s += c(51, 58, 6, "none", `stroke="#2a2a2a" stroke-width="1.4"`) + c(69, 58, 6, "none", `stroke="#2a2a2a" stroke-width="1.4"`) + l(57, 58, 63, 58, "#2a2a2a", 1.4);
  if (ex.includes("monocle")) s += c(69, 58, 6.5, "#ffffff22", `stroke="#c9a24a" stroke-width="1.5"`) + p("M75 60q6 20-2 40", "none", `stroke="#c9a24a" stroke-width=".8"`);
  // highlighted detail
  if (o.highlight && REGIONS[o.highlight]) {
    const [hx, hy, hr] = REGIONS[o.highlight];
    s += c(hx, hy, hr, "none", `class="spot" stroke="#ffd36a" stroke-width="2" stroke-dasharray="4 3"`);
  }
  return `<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.label || "Portrait"}">${s}</svg>`;
}

// ---------- icons (64 x 64) ----------
const ink = "#2a2320", paper = "#efe6cf", gold = "#d8b45a", steel = "#b8bec6";
const ICONS = {
  watch: c(32, 34, 18, gold) + c(32, 34, 14, paper) + l(32, 34, 32, 24, ink, 2) + l(32, 34, 40, 36, ink, 2) + p("M22 26l20 16M24 42l16-18", "none", `stroke="#8a8a8a" stroke-width="1"`) + r(28, 12, 8, 5, gold),
  magnifier: c(27, 27, 15, "#9fc3d8", `stroke="${ink}" stroke-width="4" fill-opacity=".5"`) + l(38, 38, 54, 54, ink, 7, `stroke-linecap="round"`) + p("M20 22a9 9 0 0 1 8-6", "none", `stroke="#fff" stroke-width="2"`),
  will: p("M14 8h28l8 8v40H14z", paper) + p("M42 8v8h8", "#d8ccb0") + [18, 24, 30, 36].map((y) => l(20, y, 44, y, "#8a7f6a", 1.5)).join("") + c(38, 48, 6, "#b3261e") + p("M34 52l-3 8 4-2 3 3 1-8", "#b3261e"),
  photo: r(10, 14, 44, 36, "#f4efe2", `transform="rotate(-6 32 32)"`) + r(14, 18, 36, 24, "#5a6670", `transform="rotate(-6 32 32)"`) + c(28, 28, 5, "#c9b9a0", `transform="rotate(-6 32 32)"`) + p("M18 40l10-8 8 6 6-4 6 6z", "#3a444c", `transform="rotate(-6 32 32)"`),
  ledger: r(12, 10, 40, 46, "#5a2a1e", `rx="2"`) + r(16, 14, 34, 38, paper) + [20, 26, 32, 38, 44].map((y) => l(20, y, 46, y, "#8a9ab0", 1)).join("") + l(36, 16, 36, 50, "#c9433a", 1) + p("M22 30l6 6M28 30l-6 6", "none", `stroke="#c9433a" stroke-width="1.6"`),
  letter: r(8, 16, 48, 32, paper) + p("M8 16l24 18 24-18", "none", `stroke="#a89a7a" stroke-width="2"`) + p("M32 40a4 4 0 0 1 6-5a4 4 0 0 1 6 5l-6 6z", "#c9433a"),
  clipping: p("M12 10h40l-3 6 3 6-3 6 3 6-3 6 3 6-3 6 3 6H12z", "#ddd3b8") + r(16, 14, 30, 6, ink) + [26, 31, 36, 41, 46].map((y) => l(16, y, 44, y, "#7a7060", 2)).join("") + e(32, 34, 14, 8, "none", `stroke="#b3261e" stroke-width="2"`),
  paper: p("M14 8h30l6 6v42H14z", paper) + [18, 24, 30, 36, 42].map((y) => l(20, y, 44, y, "#8a7f6a", 1.5)).join(""),
  matches: r(14, 12, 36, 40, "#1f3a6b", `rx="3"`) + r(14, 40, 36, 12, "#c9433a") + r(14, 38, 36, 2, gold) + p("M28 30q2-7 8-7q-2 3 0 4q-4 0-5 3z", "#4a8ac9") + `<text x="32" y="20.5" font-size="6.5" text-anchor="middle" fill="${gold}" font-family="serif" letter-spacing=".3">BLUE</text><text x="32" y="35.5" font-size="6" text-anchor="middle" fill="${gold}" font-family="serif" letter-spacing=".3">PARROT</text>`,
  ticket: p("M8 20h48v8a4 4 0 0 0 0 8v8H8v-8a4 4 0 0 0 0-8z", "#e8d9a8") + l(20, 20, 20, 44, "#8a7a4a", 1, `stroke-dasharray="2 2"`) + `<text x="38" y="35" font-size="8" text-anchor="middle" fill="#6a5a2a" font-family="serif">No. 615</text>`,
  button: c(32, 32, 16, gold, `stroke="#8a6a2a" stroke-width="2"`) + c(27, 28, 2.4, "#6a4a1a") + c(37, 28, 2.4, "#6a4a1a") + c(27, 37, 2.4, "#6a4a1a") + c(37, 37, 2.4, "#6a4a1a"),
  hairpin: p("M16 50L46 14", "none", `stroke="#8a5a2a" stroke-width="5" stroke-linecap="round"`) + p("M22 52L52 18", "none", `stroke="#a8743a" stroke-width="4" stroke-linecap="round"`) + c(48, 15, 5, "#c99a5a"),
  stud: c(32, 32, 12, "#f4efe2", `stroke="#bbb" stroke-width="2"`) + c(28, 28, 3, "#fff") + l(32, 44, 32, 54, steel, 3),
  earring: l(32, 10, 32, 26, steel, 2) + c(32, 10, 4, "none", `stroke="${steel}" stroke-width="2"`) + c(32, 36, 11, "#f4efe2", `stroke="#ccc" stroke-width="1"`) + c(28, 32, 3, "#fff"),
  lapelpin: p("M20 48a14 14 0 1 1 24 0l-5 0a9 9 0 1 0-14 0z", gold) + [0, 1, 2, 3, 4, 5].map((i) => c(32 + 13 * Math.cos(Math.PI * (0.9 + i * 0.24)), 38 + 13 * Math.sin(Math.PI * (0.9 + i * 0.24)), 1.3, "#6a4a1a")).join(""),
  tiepin: r(10, 28, 44, 8, gold, `rx="3"`) + c(46, 32, 4, "#b3261e"),
  handkerchief: p("M12 14l40-4 2 40-40 4z", "#f4efe2", `stroke="#d8cfb8" stroke-width="1.5"`) + c(26, 26, 2.4, "#9a2a22") + c(31, 30, 1.6, "#9a2a22") + c(36, 24, 1.8, "#9a2a22") + `<text x="40" y="48" font-size="10" fill="#4a5a8a" font-family="serif" font-style="italic">A</text>`,
  pills: r(14, 20, 36, 26, "#e8e2d0", `rx="4"`) + r(14, 16, 36, 8, "#c9433a", `rx="3"`) + r(20, 30, 24, 10, paper) + l(22, 35, 42, 35, "#8a7f6a", 1),
  cigarette: r(8, 30, 12, 7, "#d89a5a", `rx="1"`) + r(20, 30, 28, 7, "#f4efe2") + r(19, 30, 2, 7, gold) + r(47, 30, 4, 7, "#8a8580") + r(50, 30, 2, 7, "#e0642a") + c(17, 33.5, 1.4, "#c9433a", `opacity=".7"`) + p("M52 28q4-6 0-11q-4-6 2-11", "none", `stroke="#9a9aa2" stroke-width="1.5"`),
  glass: p("M18 10h28l-6 28h-16z", "#c8dce8", `opacity=".7" stroke="#8aa2b2"`) + l(32, 38, 32, 52, "#8aa2b2", 2) + p("M22 54h20", "none", `stroke="#8aa2b2" stroke-width="3"`) + p("M39 14l-4 18", "none", `stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".7"`),
  key: c(18, 32, 9, "none", `stroke="${gold}" stroke-width="4"`) + l(27, 32, 54, 32, gold, 4) + l(46, 32, 46, 40, gold, 4) + l(52, 32, 52, 38, gold, 4) + p("M12 22q-4-10 6-12", "none", `stroke="#b3261e" stroke-width="2"`),
  glove: p("M20 56V30l-6-12q0-4 4-2l6 10V10q0-4 4-4t4 4v14V8q0-4 4-4t4 4v16V12q0-4 4-4t4 4v28q0 10-8 16z", "#6a4428"),
  cartridge: r(26, 22, 12, 30, gold, `rx="1"`) + p("M26 22q6-18 12 0z", "#b87a3a") + r(24, 50, 16, 4, "#a8843a"),
  cup: p("M14 24h32v14q0 12-16 12t-16-12z", "#f4efe2", `stroke="#cfc6ae"`) + p("M46 28q10 0 8 8t-8 6", "none", `stroke="#cfc6ae" stroke-width="3"`) + e(30, 52, 22, 4, "#e2d8c0") + p("M20 24q4 4 8 0", "none", `stroke="#c9433a" stroke-width="2.5"`),
  // weapons
  candlestick: r(28, 8, 8, 14, "#f4efe2") + p("M32 2q-4 4 0 6q4-2 0-6z", "#f2a93a") + p("M22 22h20l-4 6h-12z", gold) + r(29, 28, 6, 18, gold) + p("M18 56h28l-4-10h-20z", gold),
  poker: l(14, 54, 46, 10, "#4a4a4e", 4, `stroke-linecap="round"`) + p("M46 10l6-4 2 6-4 2", "none", `stroke="#4a4a4e" stroke-width="3"`) + c(14, 54, 5, gold),
  bookend: p("M14 54V20h14l22 34z", "#d8d2c8", `stroke="#a8a090" stroke-width="2"`) + p("M18 24v26M22 30l8 20", "none", `stroke="#b8b0a2" stroke-width="1"`),
  cane: p("M40 56L26 18Q22 8 32 6Q42 6 40 16", "none", `stroke="#3a2414" stroke-width="5" stroke-linecap="round"`) + c(36, 9, 5, steel),
  letteropener: p("M22 42L50 10Q54 8 54 12L28 48z", steel) + p("M50 10L28 46", "none", `stroke="#8a9098" stroke-width="1"`) + p("M18 38l12 12-3 3-12-12z", gold) + p("M17 49l6 6-5 5q-3 1-5-1l-1-2z", "#5a2a1e") + c(13, 57, 2.4, gold),
  knife: p("M8 56l8-8 34-34q6 0 4 6L20 54z", steel) + p("M8 56l8-8 6 6-8 8z", "#3a2414"),
  dagger: p("M32 4l5 34h-10z", steel) + r(20, 38, 24, 5, gold, `rx="2"`) + r(29, 43, 6, 13, "#5a2a1e") + c(32, 58, 3.5, gold),
  arsenic: r(18, 18, 28, 36, "#6a7a5a", `rx="3"`) + r(16, 14, 32, 6, "#4a5a3a", `rx="2"`) + p("M24 30h16v14H24z", paper) + c(32, 36, 4, ink) + l(28, 42, 36, 32, ink, 1.5) + l(28, 32, 36, 42, ink, 1.5),
  drops: p("M26 22h12v6l4 6v20H22V34l4-6z", "#3a6a9a", `opacity=".9"`) + r(27, 12, 10, 10, "#2a2a2a") + r(24, 38, 16, 10, paper),
  cord: p("M10 20Q30 4 40 20T54 40Q40 60 24 46T12 30", "none", `stroke="#c9433a" stroke-width="4" stroke-linecap="round"`) + p("M50 40l6 10-4 2", "#d8b45a"),
  belt: p("M14 22Q26 12 38 22T56 22Q60 34 48 38Q30 42 20 46T10 52", "none", `stroke="#5a3a6b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"`) + [26, 33, 40].map((x) => c(x, 22 - (x === 33 ? 1 : 0), 1, "#2a1a30")).join("") + r(6, 14, 12, 14, "none", `rx="2" stroke="${gold}" stroke-width="2.5"`) + l(12, 16, 12, 26, gold, 2),
  wire: e(32, 32, 16, 12, "none", `stroke="${steel}" stroke-width="1.6"`) + e(32, 32, 12, 9, "none", `stroke="${steel}" stroke-width="1.6"`) + r(6, 28, 4, 10, "#c9a46a") + r(54, 28, 4, 10, "#c9a46a"),
  // ui
  interrogator: r(6, 10, 34, 24, paper, `rx="6"`) + p("M14 34l-2 8 10-8z", paper) + r(24, 26, 34, 22, "#d8b45a", `rx="6"`) + p("M48 48l4 8-10-8z", "#d8b45a") + c(15, 22, 2, ink) + c(23, 22, 2, ink) + c(31, 22, 2, ink),
  fieldagent: c(26, 26, 15, "#9fc3d8", `stroke="${paper}" stroke-width="4" fill-opacity=".35"`) + l(37, 37, 54, 54, paper, 7, `stroke-linecap="round"`) + p("M18 34l4-10 6 6 4-8", "none", `stroke="${gold}" stroke-width="2"`),
  hint: r(10, 8, 44, 34, paper, `rx="6"`) + p("M20 42l-4 12 14-12z", paper) + `<text x="32" y="33" font-size="24" text-anchor="middle" fill="${ink}" font-weight="700" font-family="serif">?</text>`,
  confront: r(12, 6, 40, 52, "#d8ccb0", `rx="3"`) + `<text x="32" y="46" font-size="38" text-anchor="middle" fill="#b3261e" font-weight="800" font-family="serif">!</text>`,
  eye: p("M4 32Q32 6 60 32Q32 58 4 32z", paper) + c(32, 32, 11, "#4a6a8a") + c(32, 32, 5, ink) + c(28, 28, 2.5, "#fff"),
  notebook: r(12, 6, 40, 52, "#6b2f2a", `rx="3"`) + r(18, 6, 34, 52, "#7a3a32", `rx="2"`) + [14, 22, 30, 38, 46].map((y) => r(10, y, 6, 3, steel, `rx="1"`)).join("") + r(24, 14, 22, 10, paper, `rx="1"`),
  code: r(6, 18, 52, 28, paper, `rx="5"`) + `<text x="32" y="38" font-size="16" text-anchor="middle" fill="${ink}" font-weight="700" font-family="ui-monospace,monospace">A7K</text>`,
  strongbox: r(8, 18, 48, 34, "#5d646c", `rx="3" stroke="#3a3f45" stroke-width="2"`) + r(8, 18, 48, 8, "#6f777f", `rx="3"`) + c(32, 38, 8, gold, `stroke="#8a6a2a" stroke-width="1.5"`) + l(32, 33, 32, 38, ink, 2) + [24, 40].map((x) => c(x, 46, 1.6, "#3a3f45")).join(""),
  tin: r(12, 22, 40, 30, "#8a3a2a", `rx="4"`) + r(10, 18, 44, 8, "#a8483a", `rx="3"`) + p("M27 22v-8a5 5 0 0 1 10 0v8", "none", `stroke="${steel}" stroke-width="3"`) + r(25, 22, 14, 11, gold, `rx="2"`) + c(32, 27, 1.8, ink),
  attache: r(6, 22, 52, 32, "#6a3f22", `rx="4"`) + p("M24 22v-6h16v6", "none", `stroke="#4a2a16" stroke-width="4"`) + l(6, 34, 58, 34, "#4a2a16", 1.5) + [18, 46].map((x) => r(x - 4, 30, 8, 8, gold, `rx="1"`)).join("") + r(28, 30, 8, 8, "#c9cdd2", `rx="1"`),
  gavel: r(10, 14, 28, 14, "#7a4a2a", `rx="3" transform="rotate(-35 24 21)"`) + l(26, 28, 50, 54, "#5a3418", 5, `stroke-linecap="round"`) + r(30, 50, 26, 6, "#5a3418", `rx="2"`),
  door: r(16, 6, 32, 52, "#5a3a22", `rx="2"`) + r(20, 10, 24, 20, "#4a2e1a") + r(20, 34, 24, 20, "#4a2e1a") + c(42, 34, 2.4, gold),
  person: c(32, 22, 11, "#c9b9a0") + p("M12 58q0-20 20-20t20 20z", "#c9b9a0"),
};
export function icon(name, label = "") {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" ${label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`}>${ICONS[name] || ICONS.magnifier}</svg>`;
}

export function logo() {
  let s = r(0, 0, 200, 120, "#141019");
  s += c(150, 28, 12, "#e9e4c8", `opacity=".85"`) + c(156, 24, 11, "#141019");
  s += p("M20 110V60l20-14 20 14V40h10v14l30-22 30 22V30h10v32l20 14v34z", "#2a2236");
  for (const [x, y] of [[30, 76], [46, 76], [80, 66], [96, 66], [112, 66], [80, 88], [112, 88], [150, 84]]) s += r(x, y, 8, 10, (x * y) % 3 ? "#e8c15a" : "#3a3046");
  s += r(92, 90, 14, 20, "#1a1420");
  s += c(140, 74, 22, "#9fc3d8", `stroke="#efe6cf" stroke-width="5" fill-opacity=".18"`) + l(156, 90, 178, 112, "#efe6cf", 8, `stroke-linecap="round"`);
  for (let i = 0; i < 18; i++) s += l((i * 37) % 200, (i * 29) % 60, (i * 37) % 200 - 3, (i * 29) % 60 + 10, "#6d8aa6", 1, `opacity=".4"`);
  return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s}</svg>`;
}
