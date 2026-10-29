// 西安霍纳手风琴艺术中心 — entrances, the hero crossfade, the chapters, the sizes strip and the playable bass.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reveal once on entry; never leaves content hidden.
(() => {
  const targets = document.querySelectorAll('[data-reveal], [data-chapter]');
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  targets.forEach((el) => io.observe(el));
  addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
  }, 2500));
})();

// The signature move: the instrument on the counter changes finish, like light shifting in a room.
(() => {
  const frame = document.querySelector('[data-crossfade]');
  if (!frame || reduced) return;
  const imgs = [...frame.querySelectorAll('img')];
  let i = 0, timer = null;
  const tick = () => { imgs[i].classList.remove('is-on'); i = (i + 1) % imgs.length; imgs[i].classList.add('is-on'); };
  const start = () => { if (!timer) timer = setInterval(tick, 5600); };
  const stop = () => { clearInterval(timer); timer = null; };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
})();

// The sizes strip scrolls by drag with a mouse; touch and trackpad scroll natively.
(() => {
  const strip = document.querySelector('.strip');
  if (!strip) return;
  let x0 = 0, s0 = 0, down = false;
  strip.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; x0 = e.clientX; s0 = strip.scrollLeft; strip.classList.add('is-drag'); strip.setPointerCapture(e.pointerId); });
  strip.addEventListener('pointermove', (e) => { if (down) strip.scrollLeft = s0 - (e.clientX - x0); });
  const end = () => { down = false; strip.classList.remove('is-drag'); };
  strip.addEventListener('pointerup', end); strip.addEventListener('pointercancel', end);
})();

// The live thing: three rows of the Stradella bass, voiced with a small reed synth.
(() => {
  const board = document.getElementById('board');
  if (!board) return;
  const NAMES = ['C', '升C', 'D', '降E', 'E', 'F', '升F', 'G', '降A', 'A', '降B', 'B'];
  const COLS = [8, 3, 10, 5, 0, 7, 2, 9]; // 降A 降E 降B F C G D A, a fifth apart
  const ROWS = [
    { label: '单音', kind: 'bass', name: '低音' },
    { label: '大三', kind: 'major', name: '大三和弦' },
    { label: '小三', kind: 'minor', name: '小三和弦' },
  ];
  for (const row of ROWS) {
    const el = document.createElement('div');
    el.className = 'board-row';
    el.innerHTML = `<span class="board-label">${row.label}</span>`;
    for (const pc of COLS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bass-key' + (row.kind === 'bass' && pc === 0 ? ' is-c' : '');
      b.dataset.pc = pc; b.dataset.kind = row.kind;
      const n = NAMES[pc];
      b.setAttribute('aria-label', `${n} ${row.name}`);
      b.innerHTML = `<span>${n}</span>`;
      el.append(b);
    }
    board.append(el);
  }

  let ctx = null, out = null, voices = 1;
  const holder = board.closest('.try-board');
  const live = new Map();
  const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
  const notesFor = (kind, pc) => {
    if (kind === 'bass') return [36 + pc, 48 + pc];
    const root = 54 + ((pc - 6 + 12) % 12); // chords sit between 升F3 and F4, as on the instrument
    return [root, root + (kind === 'major' ? 4 : 3), root + 7];
  };
  const ensure = () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    out = ctx.createGain(); out.gain.value = 0.5;
    out.connect(comp).connect(ctx.destination);
  };
  const start = (btn) => {
    if (live.has(btn)) return;
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const amp = ctx.createGain(); amp.gain.setValueAtTime(0, t);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2600; filter.Q.value = 0.8;
    filter.connect(amp).connect(out);
    const notes = notesFor(btn.dataset.kind, +btn.dataset.pc);
    const level = 0.16 / Math.sqrt(notes.length * voices);
    const oscs = [];
    const detunes = voices === 3 ? [-14, 0, 14] : [0];
    for (const m of notes) for (const d of detunes) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(m); o.detune.value = d;
      const g = ctx.createGain(); g.gain.value = level;
      o.connect(g).connect(filter); o.start(t); oscs.push(o);
    }
    amp.gain.linearRampToValueAtTime(1, t + 0.05);
    live.set(btn, { amp, oscs });
    btn.classList.add('is-down');
    holder.classList.add('is-sounding');
  };
  const stop = (btn) => {
    const v = live.get(btn);
    if (!v) return;
    const t = ctx.currentTime;
    v.amp.gain.cancelScheduledValues(t);
    v.amp.gain.setValueAtTime(v.amp.gain.value, t);
    v.amp.gain.linearRampToValueAtTime(0, t + 0.22);
    v.oscs.forEach((o) => o.stop(t + 0.25));
    live.delete(btn);
    btn.classList.remove('is-down');
    if (!live.size) holder.classList.remove('is-sounding');
  };
  board.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.bass-key'); if (!b) return;
    e.preventDefault(); b.setPointerCapture?.(e.pointerId); start(b);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    board.addEventListener(type, (e) => { const b = e.target.closest('.bass-key'); if (b) stop(b); });
  }
  board.addEventListener('keydown', (e) => {
    const b = e.target.closest('.bass-key');
    if (!b || e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault(); start(b);
  });
  board.addEventListener('keyup', (e) => { const b = e.target.closest('.bass-key'); if (b && (e.key === ' ' || e.key === 'Enter')) stop(b); });
  board.addEventListener('focusout', (e) => { const b = e.target.closest('.bass-key'); if (b) stop(b); });

  document.querySelectorAll('.voice-btn').forEach((btn) => btn.addEventListener('click', () => {
    voices = +btn.dataset.voice;
    document.querySelectorAll('.voice-btn').forEach((o) => o.setAttribute('aria-pressed', String(o === btn)));
  }));
})();
