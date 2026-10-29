// 西安霍纳手风琴艺术中心 — the spotlight, the playable accordion, the bass keys, entrances.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Reveal once on entry; never leaves content hidden.
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  targets.forEach((el) => io.observe(el));
  addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
  }, 2500));
})();

// ---------- the spotlight follows whichever exhibit is nearest the middle of the screen ----------
(() => {
  const root = document.querySelector('.light');
  const spots = [...document.querySelectorAll('[data-spot]')];
  if (!root || !spots.length) return;
  const cur = { x: innerWidth / 2, y: innerHeight * 0.4, w: innerWidth * 0.36, h: innerHeight * 0.44 };
  const tgt = { ...cur };
  const ptr = { x: 0, y: 0 };
  let lit = null;
  if (finePointer) addEventListener('pointermove', (e) => { ptr.x = (e.clientX / innerWidth - 0.5) * 2; ptr.y = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  const aim = () => {
    let best = null, bestD = Infinity;
    for (const el of spots) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
      if (d < bestD) { bestD = d; best = { el, r }; }
    }
    if (!best) { tgt.h = innerHeight * 0.3; return; }
    const { el, r } = best;
    if (el !== lit) { lit?.classList.remove('is-lit'); el.classList.add('is-lit'); lit = el; }
    tgt.x = r.left + r.width / 2 + ptr.x * innerWidth * 0.03;
    tgt.y = Math.min(innerHeight * 0.85, Math.max(innerHeight * 0.15, r.top + r.height * 0.45)) + ptr.y * innerHeight * 0.02;
    tgt.w = Math.max(innerWidth * 0.28, r.width * 0.8);
    tgt.h = Math.max(innerHeight * 0.32, r.height * 0.75);
  };
  const paint = () => {
    root.style.setProperty('--lx', cur.x.toFixed(1) + 'px');
    root.style.setProperty('--ly', cur.y.toFixed(1) + 'px');
    root.style.setProperty('--lw', cur.w.toFixed(1) + 'px');
    root.style.setProperty('--lh', cur.h.toFixed(1) + 'px');
    root.style.setProperty('--bw', (cur.w * 0.42).toFixed(1) + 'px');
  };
  const k = reduced ? 1 : 0.075;
  const loop = () => {
    aim();
    for (const key of ['x', 'y', 'w', 'h']) cur[key] += (tgt[key] - cur[key]) * k;
    paint();
    if (!document.hidden) requestAnimationFrame(loop);
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(loop); });
  requestAnimationFrame(loop);
})();

// ---------- a small reed synth shared by the accordion and the bass keys ----------
const synth = (() => {
  let ctx = null, out = null;
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const ensure = () => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor();
      out = ctx.createGain(); out.gain.value = 0.5;
      out.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  };
  // A voice is a set of detuned saws through a low-pass; its level is driven from outside.
  const voice = (notes, reeds = 1) => {
    ensure();
    const t = ctx.currentTime;
    const amp = ctx.createGain(); amp.gain.setValueAtTime(0, t);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.8;
    lp.connect(amp).connect(out);
    const level = 0.16 / Math.sqrt(notes.length * reeds);
    const det = reeds === 3 ? [-14, 0, 14] : [0];
    const oscs = [];
    for (const m of notes) for (const d of det) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d;
      const g = ctx.createGain(); g.gain.value = level;
      o.connect(g).connect(lp); o.start(t); oscs.push(o);
    }
    return {
      set(v, tc = 0.04) { amp.gain.setTargetAtTime(v, ctx.currentTime, tc); },
      stop(after = 0.25) {
        const now = ctx.currentTime;
        amp.gain.cancelScheduledValues(now); amp.gain.setValueAtTime(amp.gain.value, now);
        amp.gain.linearRampToValueAtTime(0, now + after);
        oscs.forEach((o) => o.stop(now + after + 0.05));
      },
    };
  };
  return { voice };
})();

// ---------- the hero accordion: drawn live so its bellows can open and close ----------
(() => {
  const btn = document.getElementById('squeeze');
  if (!btn) return;
  const NS = 'http://www.w3.org/2000/svg';
  const FIN = {
    black: { lit: '#2b2d2b', mid: '#1b1c1b', dark: '#0b0c0b', grille: '#080908', hole: '#262826' },
    red: { lit: '#b8282c', mid: '#8e1b1e', dark: '#5a1012', grille: '#1a0606', hole: '#6e1517' },
    pearl: { lit: '#efe9dc', mid: '#d6cebd', dark: '#a99f8b', grille: '#2a2824', hole: '#8d8676' },
  };
  const W = 820, H = 400, Y = 22, TW = 152, SW = 84, FOLDS = 16, REST = 170, MIN = 70, MAX = 520;
  const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  const circ = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  const K = '#f2efe6', KS = '#d3cdbf', B = '#c9a45c', BL = '#e6c886', BD = '#7d6130';

  // treble side: keyboard, body, grille, name plate
  let treble = rect(0, 6, 40, H - 12, 'var(--dark)');
  const whites = 24, kH = (H - 32) / whites;
  for (let i = 0; i < whites; i++) treble += rect(4, 16 + i * kH, 32, kH - 1.6, K) + rect(28, 16 + i * kH, 8, kH - 1.6, KS);
  for (let i = 0; i < whites - 1; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) treble += rect(4, 16 + (i + 1) * kH - kH * 0.32, 19, kH * 0.62, '#0a0a0a');
  for (let i = 0; i < 7; i++) treble += rect(52 + i * 13, -13, 9, 13, K) + rect(52 + i * 13, -13, 2.5, 13, KS);
  treble += rect(40, 0, 112, H, 'var(--lit)') + rect(140, 0, 12, H, 'var(--dark)') + rect(40, 0, 100, 7, 'var(--mid)') + rect(40, H - 7, 100, 7, 'var(--mid)');
  treble += rect(46, 22, 86, 204, BD) + rect(46, 22, 86, 3, B) + '<rect x="50" y="26" width="78" height="196" fill="url(#holes)"/>';
  treble += '<path d="M89 78 L111 124 L89 170 L67 124 Z" fill="var(--mid)"/><path d="M89 94 L102 124 L89 154 L76 124 Z" fill="var(--grille)"/>' + circ(89, 124, 5, B) + circ(87.7, 122.7, 2, BL);
  treble += rect(56, 244, 66, 17, B) + rect(56, 244, 66, 3, BL) + '<text x="89" y="257" text-anchor="middle" font-family="Georgia, serif" font-size="11" letter-spacing="2.6" fill="var(--dark)">HOHNER</text>';
  treble += rect(50, 300, 78, 74, 'var(--mid)') + rect(50, 300, 78, 5, 'var(--dark)') + circ(89, 337, 9, BD) + circ(89, 337, 6, B) + circ(87, 335, 2.2, BL);
  // bass side: body, strap, air button
  let bass = rect(0, 0, SW, H, 'var(--lit)') + rect(0, 0, 8, H, 'var(--mid)') + rect(SW - 10, 0, 10, H, 'var(--dark)') + circ(22, 52, 7, K) + circ(21, 51, 4.5, KS);
  bass += rect(35, 34, 25, H - 70, '#5a3a22') + rect(35, 34, 7, H - 70, '#7a5232') + rect(57, 34, 3, H - 70, '#3a2516') + circ(47.5, 30, 15.6, BD) + circ(47.5, 30, 11.6, B) + circ(45.5, 28, 4.5, BL);
  bass += rect(32, H - 52, 31, 16, BD) + rect(32, H - 52, 31, 4, B);

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} 470`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs><pattern id="holes" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--grille)"/><circle cx="3" cy="3" r="1.55" fill="var(--hole)"/></pattern></defs>
    <rect x="80" y="${Y + H}" width="660" height="48" fill="#15120e"/><rect x="80" y="${Y + H + 10}" width="660" height="38" fill="#100e0b"/><rect x="80" y="${Y + H}" width="660" height="1.5" fill="#c8a96a"/>
    <g class="t">${treble}</g><g class="b"></g><g class="s">${bass}</g>`;
  const gT = svg.querySelector('.t'), gB = svg.querySelector('.b'), gS = svg.querySelector('.s');
  btn.querySelector('.squeeze-fallback')?.remove();
  btn.append(svg);

  const setFinish = (name) => { for (const [k, v] of Object.entries(FIN[name])) svg.style.setProperty('--' + k, v); };
  setFinish('black');
  document.querySelectorAll('.swatch').forEach((s) => s.addEventListener('click', () => {
    setFinish(s.dataset.finish);
    document.querySelectorAll('.swatch').forEach((o) => o.setAttribute('aria-pressed', String(o === s)));
  }));

  let open = REST;
  const draw = (bw) => {
    open = bw;
    const fw = bw / (FOLDS * 2);
    const x0 = (W - (TW + bw + SW)) / 2;
    let p = '';
    for (let i = 0; i < FOLDS * 2; i++) p += rect((i * fw).toFixed(2), 10, (fw + 0.4).toFixed(2), H - 20, i % 2 ? '#121312' : '#2c2f2c');
    p += rect(0, 0, bw.toFixed(2), 12, 'var(--mid)') + rect(0, H - 12, bw.toFixed(2), 12, 'var(--mid)') + rect(0, 0, bw.toFixed(2), 3, 'var(--lit)');
    for (let i = 0; i <= FOLDS * 2; i += 2) { const x = (i * fw - 3.5).toFixed(2); p += rect(x, 0, 7, 16, B) + rect(x, H - 16, 7, 16, B); }
    gB.innerHTML = p;
    gT.setAttribute('transform', `translate(${x0.toFixed(2)} ${Y})`);
    gB.setAttribute('transform', `translate(${(x0 + TW).toFixed(2)} ${Y})`);
    gS.setAttribute('transform', `translate(${(x0 + TW + bw).toFixed(2)} ${Y})`);
  };
  draw(REST);

  // I–IV–V–I: each breath plays the next chord, its bass note underneath
  const CHORDS = [[36, 48, 55, 60, 64], [41, 53, 57, 60, 65], [43, 55, 59, 62, 67], [36, 48, 55, 60, 64]];
  let step = 0, v = null, busy = false, dragged = false;
  const hint = document.querySelector('.hint');
  const begin = () => { if (!v) { v = synth.voice(CHORDS[step % CHORDS.length], 3); step++; } hint?.classList.add('is-gone'); };
  const end = () => { v?.stop(0.3); v = null; };
  const clamp = (x) => Math.max(MIN, Math.min(MAX, x));

  // One breath: the bellows open and close, the sound follows their speed.
  const breathe = () => {
    if (busy) return;
    busy = true; begin();
    const t0 = performance.now(), dur = 1900, from = open;
    let last = from;
    const tick = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const bw = from + (MAX - 40 - from) * Math.sin(Math.PI * u);
      v?.set(Math.min(1, Math.abs(bw - last) * 0.12 + 0.15), 0.05);
      last = bw; draw(bw);
      if (u < 1) requestAnimationFrame(tick); else { draw(from); end(); busy = false; }
    };
    requestAnimationFrame(tick);
  };

  // Drag: pull the bellows by hand; no movement, no sound.
  let drag = null;
  btn.addEventListener('pointerdown', (e) => {
    if (busy) return;
    dragged = false;
    drag = { x: e.clientX, bw: open, last: open, t: performance.now(), moved: false, id: e.pointerId };
  });
  btn.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const scale = W / btn.getBoundingClientRect().width;
    const dx = (e.clientX - drag.x) * scale;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) { drag.moved = true; btn.setPointerCapture(e.pointerId); btn.classList.add('is-drag'); begin(); }
    const bw = clamp(drag.bw + dx * 2);
    const now = performance.now(), dt = Math.max(8, now - drag.t);
    v?.set(Math.min(1, (Math.abs(bw - drag.last) / dt) * 0.9), 0.03);
    drag.last = bw; drag.t = now;
    draw(bw);
  });
  const release = () => {
    if (!drag) return;
    const moved = drag.moved; drag = null;
    btn.classList.remove('is-drag');
    if (!moved) return;
    dragged = true;
    // the bellows settle back to rest, letting out the last of the air
    const from = open, t0 = performance.now();
    busy = true;
    const settle = (now) => {
      const u = Math.min(1, (now - t0) / 700), eased = 1 - (1 - u) ** 3;
      draw(from + (REST - from) * eased);
      v?.set((1 - u) * Math.min(1, Math.abs(from - REST) / 300), 0.05);
      if (u < 1) requestAnimationFrame(settle); else { end(); busy = false; }
    };
    requestAnimationFrame(settle);
  };
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('click', (e) => {
    // a click that ends a drag is not a tap; Enter and Space (detail 0) always breathe
    if (dragged && e.detail !== 0) { dragged = false; return; }
    dragged = false; breathe();
  });
})();

// ---------- the sizes strip scrolls by drag with a mouse ----------
(() => {
  const strip = document.querySelector('.strip');
  if (!strip) return;
  let x0 = 0, s0 = 0, down = false;
  strip.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; x0 = e.clientX; s0 = strip.scrollLeft; strip.classList.add('is-drag'); strip.setPointerCapture(e.pointerId); });
  strip.addEventListener('pointermove', (e) => { if (down) strip.scrollLeft = s0 - (e.clientX - x0); });
  const end = () => { down = false; strip.classList.remove('is-drag'); };
  strip.addEventListener('pointerup', end); strip.addEventListener('pointercancel', end);
})();

// ---------- three rows of the Stradella bass ----------
(() => {
  const board = document.getElementById('board');
  if (!board) return;
  const NAMES = ['C', '升C', 'D', '降E', 'E', 'F', '升F', 'G', '降A', 'A', '降B', 'B'];
  const COLS = [8, 3, 10, 5, 0, 7, 2, 9]; // 降A 降E 降B F C G D A, a fifth apart
  const ROWS = [{ label: '单音', kind: 'bass', name: '低音' }, { label: '大三', kind: 'major', name: '大三和弦' }, { label: '小三', kind: 'minor', name: '小三和弦' }];
  for (const row of ROWS) {
    const el = document.createElement('div');
    el.className = 'board-row';
    el.innerHTML = `<span class="board-label">${row.label}</span>`;
    for (const pc of COLS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bass-key' + (row.kind === 'bass' && pc === 0 ? ' is-c' : '');
      b.dataset.pc = pc; b.dataset.kind = row.kind;
      b.setAttribute('aria-label', `${NAMES[pc]} ${row.name}`);
      b.innerHTML = `<span>${NAMES[pc]}</span>`;
      el.append(b);
    }
    board.append(el);
  }
  let reeds = 1;
  const live = new Map();
  const notesFor = (kind, pc) => {
    if (kind === 'bass') return [36 + pc, 48 + pc];
    const root = 54 + ((pc - 6 + 12) % 12); // chords sit between 升F3 and F4, as on the instrument
    return [root, root + (kind === 'major' ? 4 : 3), root + 7];
  };
  const start = (b) => {
    if (live.has(b)) return;
    const v = synth.voice(notesFor(b.dataset.kind, +b.dataset.pc), reeds);
    v.set(1, 0.02); live.set(b, v); b.classList.add('is-down');
  };
  const stop = (b) => { const v = live.get(b); if (!v) return; v.stop(0.22); live.delete(b); b.classList.remove('is-down'); };
  board.addEventListener('pointerdown', (e) => { const b = e.target.closest('.bass-key'); if (!b) return; e.preventDefault(); b.setPointerCapture?.(e.pointerId); start(b); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) board.addEventListener(type, (e) => { const b = e.target.closest('.bass-key'); if (b) stop(b); });
  board.addEventListener('keydown', (e) => { const b = e.target.closest('.bass-key'); if (!b || e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return; e.preventDefault(); start(b); });
  board.addEventListener('keyup', (e) => { const b = e.target.closest('.bass-key'); if (b && (e.key === ' ' || e.key === 'Enter')) stop(b); });
  board.addEventListener('focusout', (e) => { const b = e.target.closest('.bass-key'); if (b) stop(b); });
  document.querySelectorAll('.voice-btn').forEach((btn) => btn.addEventListener('click', () => {
    reeds = +btn.dataset.voice;
    document.querySelectorAll('.voice-btn').forEach((o) => o.setAttribute('aria-pressed', String(o === btn)));
  }));
})();
