// Generates every drawing on the page as a flat SVG in one graphic language:
// filled shapes only, light from the upper left, tone steps instead of gradients.
// Run: node tools/drawings.mjs   (writes into img/)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'img');
mkdirSync(OUT, { recursive: true });

const C = {
  ground: '#0f1f10', ground2: '#162a17', ground3: '#1f3720',
  brass: '#c9a45c', brassLit: '#e6c886', brassDark: '#7d6130',
  key: '#f2efe6', keyShade: '#d3cdbf', keyBlack: '#0a0a0a',
  fabricA: '#2c2f2c', fabricB: '#121312',
  leather: '#5a3a22', leatherLit: '#7a5232', leatherDark: '#3a2516',
  ink: '#f4f1ea',
};
const FINISH = {
  black: { lit: '#2b2d2b', mid: '#1b1c1b', dark: '#0b0c0b', grille: '#080908', hole: '#262826' },
  red: { lit: '#b8282c', mid: '#8e1b1e', dark: '#5a1012', grille: '#1a0606', hole: '#6e1517' },
  pearl: { lit: '#efe9dc', mid: '#d6cebd', dark: '#a99f8b', grille: '#2a2824', hole: '#8d8676' },
  green: { lit: '#2f5a3a', mid: '#1f4229', dark: '#13291a', grille: '#07120a', hole: '#25432d' },
  blue: { lit: '#2c4a63', mid: '#1d3447', dark: '#11202d', grille: '#060c11', hole: '#24384a' },
};

let uid = 0;
const r = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
const c = (x, y, rad, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${fill}"/>`;
const p = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const f = (n) => Math.round(n * 100) / 100;
const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"><title>${title}</title>${body}</svg>\n`;
const save = (name, w, h, body, title) => writeFileSync(join(OUT, name), svg(w, h, body, title));

// ---------- the accordion, front view, in local units (body 400 tall) ----------
function accordion({ finish = 'black', whites = 24, folds = 6, fw = 11, bassW = 84, strap = true, closedStrap = false, plate = 'HOHNER' }) {
  const F = FINISH[finish];
  const id = `a${uid++}`;
  const H = 400;
  const tx = 40, tw = 112;            // treble body
  const bx = tx + tw;                 // bellows start
  const bw = folds * 2 * fw;
  const sx = bx + bw;                 // bass body start
  const W = sx + bassW;
  const parts = [];
  parts.push(`<defs><pattern id="${id}h" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${F.grille}"/><circle cx="3" cy="3" r="1.55" fill="${F.hole}"/></pattern></defs>`);

  // register switches on the top edge
  for (let i = 0; i < 7; i++) {
    parts.push(r(tx + 12 + i * 13, -13, 9, 13, C.key), r(tx + 12 + i * 13, -13, 2.5, 13, C.keyShade));
  }
  parts.push(r(tx + 6, -3, tw - 16, 4, C.brassDark));

  // keyboard frame and keys
  parts.push(r(0, 6, tx, H - 12, F.dark));
  const k0 = 16, kH = (H - 32) / whites;
  for (let i = 0; i < whites; i++) {
    const y = k0 + i * kH;
    parts.push(r(4, y, 32, kH - 1.6, C.key), r(28, y, 8, kH - 1.6, C.keyShade));
  }
  const blackAfter = [0, 1, 3, 4, 5];
  for (let i = 0; i < whites - 1; i++) {
    if (!blackAfter.includes(i % 7)) continue;
    const y = k0 + (i + 1) * kH - kH * 0.32;
    parts.push(r(4, y, 19, kH * 0.62, C.keyBlack), r(4, y, 19, kH * 0.14, '#2a2a2a'));
  }

  // treble body: lit face, shaded side, bevel
  parts.push(r(tx, 0, tw, H, F.lit), r(tx + tw - 12, 0, 12, H, F.dark), r(tx, 0, tw - 12, 7, F.mid), r(tx, H - 7, tw - 12, 7, F.mid));
  // grille with brass surround
  const gx = tx + 10, gy = 26, gw = tw - 34, gh = 196;
  parts.push(r(gx - 4, gy - 4, gw + 8, gh + 8, C.brassDark), r(gx - 4, gy - 4, gw + 8, 3, C.brass));
  parts.push(`<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="url(#${id}h)"/>`);
  // a fretwork motif cut into the grille
  const mx = gx + gw / 2, my = gy + gh / 2;
  parts.push(p(`M${mx} ${my - 46} L${mx + 22} ${my} L${mx} ${my + 46} L${mx - 22} ${my} Z`, F.mid));
  parts.push(p(`M${mx} ${my - 30} L${mx + 13} ${my} L${mx} ${my + 30} L${mx - 13} ${my} Z`, F.grille));
  parts.push(c(mx, my, 5, C.brass), c(mx - 1.3, my - 1.3, 2, C.brassLit));
  // name plate
  if (plate) {
    parts.push(r(gx + 6, gy + gh + 22, gw - 12, 17, C.brass), r(gx + 6, gy + gh + 22, gw - 12, 3, C.brassLit));
    parts.push(`<text x="${mx}" y="${gy + gh + 35}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="11" letter-spacing="2.6" fill="${F.dark}">${plate}</text>`);
  }
  // lower inlay panel with chin switch and a rosette
  parts.push(r(gx, 300, gw, 74, F.mid), r(gx, 300, gw, 5, F.dark));
  parts.push(c(mx, 337, 9, C.brassDark), c(mx, 337, 6, C.brass), c(mx - 2, 335, 2.2, C.brassLit));
  parts.push(r(tx + tw - 8, 150, 6, 22, C.key), r(tx + tw - 8, 150, 6, 4, C.keyShade));

  // bellows: tapes, pleats, brass corners
  for (let i = 0; i < folds * 2; i++) {
    parts.push(r(bx + i * fw, 10, fw, H - 20, i % 2 ? C.fabricB : C.fabricA));
  }
  parts.push(r(bx, 0, bw, 12, F.mid), r(bx, H - 12, bw, 12, F.mid), r(bx, 0, bw, 3, F.lit));
  for (let i = 0; i <= folds * 2; i += 2) {
    const x = bx + i * fw - 3.5;
    parts.push(r(x, 0, 7, 16, C.brass), r(x, 0, 2.5, 16, C.brassLit), r(x, H - 16, 7, 16, C.brass), r(x, H - 16, 2.5, 16, C.brassLit));
    parts.push(c(x + 3.5, 11, 1.1, C.brassDark), c(x + 3.5, H - 11, 1.1, C.brassDark));
  }
  if (closedStrap) {
    parts.push(r(tx + tw - 18, 186, bw + 46, 28, C.leather), r(tx + tw - 18, 186, bw + 46, 6, C.leatherLit));
    parts.push(c(sx + 10, 200, 7, C.brass), c(sx + 8, 198, 2.5, C.brassLit));
  }

  // bass body with strap, adjuster and air button
  parts.push(r(sx, 0, bassW, H, F.lit), r(sx, 0, 8, H, F.mid), r(sx + bassW - 10, 0, 10, H, F.dark));
  parts.push(r(sx + 8, H - 7, bassW - 18, 7, F.mid));
  parts.push(c(sx + 22, 52, 7, C.key), c(sx + 21, 51, 4.5, C.keyShade));
  if (strap) {
    const s0 = sx + bassW * 0.42, sw = bassW * 0.3;
    parts.push(r(s0, 34, sw, H - 70, C.leather), r(s0, 34, sw * 0.28, H - 70, C.leatherLit), r(s0 + sw - 3, 34, 3, H - 70, C.leatherDark));
    parts.push(c(s0 + sw / 2, 30, sw * 0.62, C.brassDark), c(s0 + sw / 2, 30, sw * 0.46, C.brass), c(s0 + sw / 2 - 2, 28, sw * 0.18, C.brassLit));
    parts.push(r(s0 - 3, H - 52, sw + 6, 16, C.brassDark), r(s0 - 3, H - 52, sw + 6, 4, C.brass));
  }
  return { body: parts.join(''), W, H: H + 14, top: -14 };
}

function place(obj, cx, baseY, height) {
  const s = height / obj.H;
  return `<g transform="translate(${f(cx - (obj.W * s) / 2)} ${f(baseY - (obj.H + obj.top) * s)}) scale(${f(s)})">${obj.body}</g>`;
}

// ---------- scene: an accordion on a plinth, like an object in a dim gallery ----------
function plinthScene(name, title, { w = 750, h = 1000, bg = C.ground, plinth = C.ground2, plinthLit = C.ground3, fill = 0.62, plinthTop = 0.8, ...a }) {
  const obj = accordion(a);
  const s = Math.min((h * fill) / obj.H, (w * 0.86) / obj.W);
  const ow = obj.W * s;
  const top = h * plinthTop;
  const pw = Math.min(w, ow * 1.18);
  const body = [
    r(0, 0, w, h, bg),
    r((w - pw) / 2, top, pw, h - top, plinth), r((w - pw) / 2, top, pw, 8, plinthLit),
    place(obj, w / 2, top + 2, obj.H * s),
  ].join('');
  save(name, w, h, body, title);
}

// hero: the bellows pulled open, in three finishes of one framing, crossfaded on the page
for (const [fin, word] of [['black', '黑色'], ['red', '红色'], ['pearl', '珍珠白']]) {
  plinthScene(`hero-${fin}.svg`, `一架${word} 120 贝斯手风琴，风箱拉开，立在展台上`, { w: 1600, h: 760, fill: 0.7, plinthTop: 0.86, finish: fin, whites: 24, folds: 16, fw: 13 });
}

// showcase chapters, each on the darkest tone of its own picture
plinthScene('ch-kids.svg', '一架红色的 16 贝斯儿童手风琴', { bg: '#2a1011', plinth: '#3a1718', plinthLit: '#4b1f20', finish: 'red', whites: 12, folds: 4, fw: 10, bassW: 56, fill: 0.42 });
plinthScene('ch-grade.svg', '一架珍珠白 96 贝斯手风琴，风箱半开', { bg: '#1c1b17', plinth: '#29271f', plinthLit: '#363328', finish: 'pearl', whites: 21, folds: 6, fill: 0.56 });
plinthScene('ch-adult.svg', '一架黑色 120 贝斯手风琴，风箱拉开', { bg: '#000000', plinth: '#111211', plinthLit: '#1b1c1b', finish: 'black', whites: 24, folds: 9, fw: 10, fill: 0.6 });

// ---------- reed block close-up ----------
function reedBlock(w, h, bg, { file = true } = {}) {
  const parts = [r(0, 0, w, h, bg)];
  const bx = w * 0.07, bw = w * 0.86, by = h * 0.36, bh = h * 0.36;
  // the wooden block: top face, front face, grain bands, end
  parts.push(r(bx, by - h * 0.05, bw, h * 0.05, '#a3764a'), r(bx, by, bw, bh, '#7a5532'));
  for (let i = 0; i < 7; i++) parts.push(r(bx, by + bh * (0.12 + i * 0.13), bw, bh * 0.035, i % 2 ? '#6e4c2c' : '#86603a'));
  parts.push(r(bx + bw - w * 0.025, by - h * 0.05, w * 0.025, bh + h * 0.05, '#4a321d'));
  // reed plates from low (tall) to high (short)
  const n = 9, gap = bw / n;
  for (let i = 0; i < n; i++) {
    const pw = gap * 0.74, ph = bh * (0.92 - i * 0.055);
    const px = bx + i * gap + gap * 0.13, py = by + bh - ph - bh * 0.04;
    parts.push(r(px - 3, py - 3, pw + 6, ph + 6, '#8b5a22'), r(px, py, pw, ph, '#a9ada7'), r(px, py, pw * 0.16, ph, '#c9ccc6'));
    const sw = pw * 0.17, sh = ph * 0.78, sy = py + ph * 0.11;
    const s1 = px + pw * 0.22, s2 = px + pw * 0.6;
    parts.push(r(s1, sy, sw, sh, '#151515'), r(s1 + sw * 0.2, sy + sh * 0.04, sw * 0.6, sh * 0.96, '#e3e4df'), r(s1 + sw * 0.2, sy + sh * 0.04, sw * 0.18, sh * 0.96, '#ffffff'));
    parts.push(c(s1 + sw / 2, sy + sh + ph * 0.035, sw * 0.42, C.brass), c(s1 + sw / 2 - 1, sy + sh + ph * 0.03, sw * 0.16, C.brassLit));
    parts.push(r(s2, sy, sw, sh, '#151515'), r(s2 - sw * 0.25, sy - ph * 0.02, sw * 1.5, sh * 0.7, '#4a3322'), r(s2 - sw * 0.25, sy - ph * 0.02, sw * 0.35, sh * 0.7, '#5f4330'));
  }
  if (file) {
    // a tuning file lying in front of the block
    const fy = h * 0.82;
    parts.push(r(w * 0.2, fy, w * 0.42, h * 0.018, '#8f948f'), r(w * 0.2, fy, w * 0.42, h * 0.006, '#c9ccc6'));
    parts.push(r(w * 0.62, fy - h * 0.006, w * 0.2, h * 0.03, C.leather), r(w * 0.62, fy - h * 0.006, w * 0.2, h * 0.01, C.leatherLit), r(w * 0.6, fy - h * 0.004, w * 0.025, h * 0.026, C.brass));
  }
  return parts.join('');
}
save('reeds.svg', 800, 1000, reedBlock(800, 1000, C.ground), '簧片座特写：铝制簧板上铆着钢簧片');
save('ch-repair.svg', 750, 1000, reedBlock(750, 1000, '#1e140c'), '待调音的簧片座和一把调音锉');

// ---------- bellows close-up ----------
function bellows(w, h, bg) {
  const parts = [r(0, 0, w, h, bg)];
  const top = h * 0.14, bot = h * 0.86, n = 10, pw = w / n;
  parts.push(r(0, top - h * 0.06, w, h * 0.06, FINISH.black.lit), r(0, bot, w, h * 0.06, FINISH.black.lit));
  parts.push(r(0, top - h * 0.06, w, h * 0.012, '#3b3d3b'));
  for (let i = 0; i < n; i++) {
    const x = i * pw;
    parts.push(p(`M${f(x)} ${f(top)} L${f(x + pw / 2)} ${f(top + h * 0.03)} L${f(x + pw / 2)} ${f(bot - h * 0.03)} L${f(x)} ${f(bot)} Z`, C.fabricA));
    parts.push(p(`M${f(x + pw / 2)} ${f(top + h * 0.03)} L${f(x + pw)} ${f(top)} L${f(x + pw)} ${f(bot)} L${f(x + pw / 2)} ${f(bot - h * 0.03)} Z`, C.fabricB));
  }
  for (let i = 0; i <= n; i++) {
    const x = i * pw;
    for (const y of [top, bot]) {
      const dir = y === top ? 1 : -1;
      parts.push(p(`M${f(x - 16)} ${f(y)} L${f(x + 16)} ${f(y)} L${f(x)} ${f(y + dir * 44)} Z`, C.brass));
      parts.push(p(`M${f(x - 16)} ${f(y)} L${f(x - 5)} ${f(y)} L${f(x)} ${f(y + dir * 44)} Z`, C.brassLit));
      parts.push(c(x, y + dir * 14, 2.4, C.brassDark));
    }
  }
  // frame pins along the top band
  for (let i = 0; i < 16; i++) parts.push(c(30 + i * ((w - 60) / 15), top - h * 0.03, 3, '#9aa09a'));
  return parts.join('');
}
save('bellows.svg', 1280, 800, bellows(1280, 800, C.ground), '风箱的褶皱与黄铜包角');

// ---------- bass buttons, seen from above ----------
function bassField(w, h, bg, { rotate = -24, rows = 6, cols = 12 } = {}) {
  const parts = [r(0, 0, w, h, bg)];
  const s = Math.min(w, h) / 9.2;
  const g = [];
  g.push(r(-s * 1.4, -s * 1.2, (cols + rows / 2 + 1.6) * s, (rows * 0.87 + 1.6) * s, FINISH.black.lit));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * s + row * s * 0.5, y = row * s * 0.87;
      const rad = row < 2 ? s * 0.36 : s * 0.32;
      g.push(c(x, y, rad + s * 0.06, '#0d0e0d'), c(x, y, rad, '#bdb6a5'), c(x - rad * 0.12, y - rad * 0.12, rad * 0.8, C.key));
      const note = (col - 4 + 120) % 12; // col 4 = C
      if (row === 1 && note === 0) { g.push(c(x - rad * 0.12, y - rad * 0.12, rad * 0.32, '#9e9786'), c(x - rad * 0.2, y - rad * 0.2, rad * 0.16, C.brassLit)); }
      if (row === 1 && (note === 4 || note === 8)) g.push(c(x - rad * 0.12, y - rad * 0.12, rad * 0.26, '#cfc8b8'));
    }
  }
  // strap edge crossing the panel
  g.push(r(-s * 1.4, rows * 0.87 * s + s * 0.1, (cols + rows / 2 + 1.6) * s, s * 0.9, C.leather), r(-s * 1.4, rows * 0.87 * s + s * 0.1, (cols + rows / 2 + 1.6) * s, s * 0.22, C.leatherLit));
  parts.push(`<g transform="translate(${f(w * 0.18)} ${f(h * 0.42)}) rotate(${rotate})">${g.join('')}</g>`);
  return parts.join('');
}
save('bass.svg', 900, 900, bassField(900, 900, C.ground), '左手贝斯键盘的斜排按键，C 键上有一颗定位钻');
save('bass-surface.svg', 900, 900, bassField(900, 900, C.ground2, { rotate: -18 }), '左手贝斯键盘的斜排按键');

// ---------- sizes, from 8 to 120 bass ----------
const sizes = [8, 12, 16, 24, 32, 40, 48, 60, 72, 80, 96, 120];
const cycle = ['red', 'pearl', 'black', 'green', 'blue', 'red', 'black', 'pearl', 'green', 'red', 'black', 'pearl'];
sizes.forEach((b, i) => {
  const t = (b - 8) / 112;
  const obj = accordion({ finish: cycle[i], whites: Math.round(10 + t * 14), folds: 3 + Math.round(t * 2), fw: 10, bassW: 50 + t * 34, closedStrap: true, plate: b >= 32 ? 'HOHNER' : '' });
  const w = 400, h = 600, base = 470;
  const body = [
    r(0, 0, w, h, C.ground2), r(0, base, w, h - base, C.ground3),
    place(obj, w / 2, base + 2, 190 + t * 190),
    `<text x="${w / 2}" y="${base + 78}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="${C.ink}">${b}</text>`,
    `<text x="${w / 2}" y="${base + 108}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="17" letter-spacing="3" fill="#9aa39a">BASS</text>`,
  ].join('');
  save(`size-${b}.svg`, w, h, body, `${b} 贝斯手风琴`);
});

// ---------- the wall of instruments in the shop ----------
{
  const w = 900, h = 1200;
  const parts = [r(0, 0, w, h, C.ground), r(w * 0.04, 0, w * 0.92, h, C.ground2)];
  const shelves = [
    [['red', 16, 0.34], ['black', 24, 0.42], ['pearl', 20, 0.38]],
    [['green', 22, 0.4], ['pearl', 24, 0.44]],
    [['black', 24, 0.46], ['blue', 18, 0.36], ['red', 22, 0.4]],
  ];
  shelves.forEach((row, si) => {
    const base = 360 + si * 370;
    parts.push(r(w * 0.04, base, w * 0.92, 26, '#4a321d'), r(w * 0.04, base, w * 0.92, 7, '#6e4c2c'));
    row.forEach(([fin, whites, sc], i) => {
      const obj = accordion({ finish: fin, whites, folds: 3, fw: 10, bassW: 70, closedStrap: true });
      const cx = w * 0.04 + (w * 0.92) * ((i + 0.5) / row.length);
      parts.push(place(obj, cx, base + 1, 300 * sc / 0.44));
    });
  });
  save('wall.svg', w, h, parts.join(''), '琴行墙上三层木架，摆着不同颜色和大小的手风琴');
}

// ---------- Xi'an: the south gate and the city wall at dusk ----------
{
  const w = 1920, h = 1080;
  const P = [];
  const sky = ['#0b1a0c', '#0f2112', '#152a18', '#1f3220', '#3b3a22', '#6e5527'];
  const bandH = 600 / sky.length;
  sky.forEach((col, i) => P.push(r(0, i * bandH, w, bandH + 1, col)));
  P.push(c(560, 150, 38, '#e9e1c8'), c(574, 140, 38, sky[1]));
  // distant city
  for (let i = 0; i < 26; i++) {
    const bw = 50 + ((i * 37) % 70), bh = 40 + ((i * 53) % 120);
    P.push(r(i * 76 - 20, 600 - bh, bw, bh, '#2a3324'));
    if (i % 3 === 0) P.push(r(i * 76, 600 - bh + 14, 6, 8, '#e6c886'));
  }
  // wall face: brick courses as tone bands, crenellations on top
  const wy = 600, wh = 170;
  P.push(r(0, wy, w, wh, '#3b3124'));
  for (let i = 0; i < 9; i++) P.push(r(0, wy + 12 + i * 18, w, 9, i % 2 ? '#352b20' : '#433727'));
  P.push(r(0, wy - 16, w, 16, '#4a3d2b'));
  for (let x = 0; x < w; x += 34) P.push(r(x, wy - 34, 20, 18, '#4a3d2b'), r(x, wy - 34, 20, 4, '#5a4a33'));
  // the arrow tower of the south gate
  const gx = 260, gw = 520, gyTop = 360;
  P.push(r(gx, gyTop, gw, wy - gyTop, '#4e3f2b'), r(gx, gyTop, gw, 10, '#5d4b33'), r(gx + gw - 22, gyTop, 22, wy - gyTop, '#3e3222'));
  for (let row = 0; row < 4; row++) for (let col = 0; col < 12; col++) {
    const lit = (row * 12 + col) % 5 === 2;
    P.push(r(gx + 30 + col * 40, gyTop + 34 + row * 48, 16, 22, lit ? '#e6c886' : '#1a150e'));
  }
  P.push(r(gx + gw / 2 - 46, wy + 40, 92, wh - 40, '#120f0a'), p(`M${gx + gw / 2 - 46} ${wy + 40} Q${gx + gw / 2} ${wy - 6} ${gx + gw / 2 + 46} ${wy + 40} Z`, '#120f0a'));
  // two-tier roof with lifted corners
  const roof = (y, x0, x1, depth, col, colLit) => {
    P.push(p(`M${x0 - 60} ${y} Q${x0 - 30} ${y - 10} ${x0 + 20} ${y - depth} L${x1 - 20} ${y - depth} Q${x1 + 30} ${y - 10} ${x1 + 60} ${y} Q${x1 - 10} ${y - 18} ${(x0 + x1) / 2} ${y - 16} Q${x0 + 10} ${y - 18} ${x0 - 60} ${y} Z`, col));
    P.push(r(x0 + 20, y - depth - 8, x1 - x0 - 40, 10, colLit));
  };
  roof(gyTop + 6, gx, gx + gw, 58, '#0b0f0b', '#1c231c');
  P.push(r(gx + 70, gyTop - 130, gw - 140, 80, '#4e3f2b'));
  for (let col = 0; col < 8; col++) P.push(r(gx + 100 + col * 44, gyTop - 112, 16, 22, col % 3 === 1 ? '#e6c886' : '#1a150e'));
  roof(gyTop - 124, gx + 70, gx + gw - 70, 64, '#0b0f0b', '#1c231c');
  // red lanterns under the eaves
  for (let i = 0; i < 6; i++) {
    const lx = gx + 50 + i * ((gw - 100) / 5);
    P.push(r(lx - 1, gyTop + 6, 2, 16, '#2a1a10'), r(lx - 13, gyTop + 20, 26, 5, C.brass), c(lx, gyTop + 42, 18, '#b3262a'), c(lx - 5, gyTop + 37, 7, '#d24a3a'), r(lx - 10, gyTop + 58, 20, 5, C.brass));
  }
  // string of lights along the wall top
  for (let x = 820; x < w; x += 46) P.push(c(x, wy - 42, 4.5, '#e6c886'));
  // a cyclist on the wall, and a walker with an accordion case on the moat bridge
  P.push(c(1300, wy - 66, 10, '#0c0c09'), c(1338, wy - 66, 10, '#0c0c09'), r(1306, wy - 92, 26, 6, '#0c0c09'), c(1320, wy - 108, 6, '#0c0c09'), r(1316, wy - 102, 8, 18, '#0c0c09'));
  // moat and its reflections
  P.push(r(0, wy + wh, w, h - wy - wh, '#0b170d'));
  for (let i = 0; i < 9; i++) P.push(r(0, wy + wh + 14 + i * 16, w, 6, i % 2 ? '#0e1c10' : '#112313'));
  for (let i = 0; i < 6; i++) {
    const lx = gx + 50 + i * ((gw - 100) / 5);
    for (let k = 0; k < 4; k++) P.push(r(lx - 16 + (k % 2) * 8, wy + wh + 40 + k * 26, 26 - k * 4, 6, k < 2 ? '#7a1c1d' : '#4a1415'));
  }
  for (let x = 820; x < w; x += 46) P.push(r(x - 5, wy + wh + 70 + ((x / 46) % 3) * 10, 12, 4, '#5e4a24'));
  // bridge with the walker
  P.push(r(860, wy + wh + 20, 420, 24, '#2a2419'), r(860, wy + wh + 20, 420, 6, '#3a3222'));
  P.push(c(1040, wy + wh - 30, 9, '#0c0c09'), r(1033, wy + wh - 21, 14, 40, '#0c0c09'), r(1047, wy + wh - 6, 26, 22, '#3a2516'), r(1047, wy + wh - 6, 26, 5, '#5a3a22'));
  // trees
  for (const [tx, ty, s] of [[60, 640, 1], [150, 680, 0.8], [1700, 650, 1.1], [1820, 690, 0.9]]) {
    P.push(r(tx - 5 * s, ty, 10 * s, 120 * s, '#07100a'), c(tx, ty - 10 * s, 70 * s, '#081209'), c(tx - 40 * s, ty + 20 * s, 50 * s, '#0a160c'), c(tx + 45 * s, ty + 15 * s, 55 * s, '#091409'));
  }
  save('xian-wall.svg', w, h, P.join(''), '黄昏的西安南门箭楼和城墙，城墙上有人骑车');
}
console.log('drawings written to', OUT);
