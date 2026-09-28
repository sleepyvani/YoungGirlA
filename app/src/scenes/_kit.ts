// Shared kit for every plate, so recurring motifs look identical everywhere:
//  - beat helpers (the grid from data/audio.json)
//  - Japanese karaoke: horizontal and vertical word runs, lit per character from the aligned `syl`
//  - the SEAL (朱印): a vermilion hanko, pre-rendered once, stamped with an overshoot
//  - the BAR (目線): the black eye bar / redaction bar
//  - the MOSAIC: GLSL pixelation helpers (a news censor's mosaic)
//  - backgrounds: ink and bone paper passes
import * as THREE from 'three';
import type { AudioData } from '../engine/audio';
import { FSPass, SCALE } from '../engine/gl';
import { Lyrics, type Word } from '../engine/lyrics';
import { rgba, mixRGBA } from '../engine/palette';
import { F, font, measure } from '../engine/type';
import { clamp, ease, hash, lerp, mulberry32, prog, smoothstep } from '../engine/util';

// ------------------------------------------------------------------ beats
/** Beat times in [t0, t1). */
export const beatsIn = (au: AudioData, t0: number, t1: number) => au.beats.filter((b) => b >= t0 && b < t1);
/** Last beat at/before t (+ tol): where a cut before a word goes. */
export const cutBeat = (au: AudioData, t: number, tol = 0.02) => au.timeOfBeat(Math.floor(au.beatAt(t + tol)));
/** The latest time in a sorted list at or before t (or -99). */
export function lastAt(ts: number[], t: number) {
  let lo = 0, hi = ts.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ts[m]! <= t) lo = m + 1; else hi = m; }
  return lo > 0 ? ts[lo - 1]! : -99;
}
/** Index of the latest time in a sorted list at or before t (-1 before the first). */
export function idxAt(ts: number[], t: number) {
  let lo = 0, hi = ts.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ts[m]! <= t) lo = m + 1; else hi = m; }
  return lo - 1;
}
/** Decaying pulse from the latest of `ts` (1 at the hit, half-life hl). */
export const pulseAt = (ts: number[], t: number, hl = 0.12) => { const b = lastAt(ts, t); return b < -50 ? 0 : Math.pow(0.5, (t - b) / hl); };

// ------------------------------------------------------------------ karaoke
export interface KStyle {
  family: string;
  size: number;
  /** extra spacing between characters (px) and between words (px) */
  tracking?: number;
  gap?: number;
  /** colours (Canvas2D) */
  unsung?: string;
  sung?: string;
  now?: string;
  /** seconds of anticipation: a word shows dim this long before it is sung (default 0.4); Infinity = always */
  ghost?: number;
  /** romaji under (horizontal) / beside (vertical) the words */
  romaji?: boolean;
  romajiSize?: number;
  romajiColor?: string;
  /** after the word ends, keep it in `now` colour this long (seconds) */
  hold?: number;
}

export interface KChar { ch: string; w: Word; i: number; x: number; y: number; adv: number }
export interface KRun { chars: KChar[]; width: number; words: { w: Word; x0: number; x1: number; y0: number; y1: number }[] }

const DEF = (s: KStyle) => ({
  tracking: 0, gap: s.size * 0.28, unsung: rgba('bone', 0.26), sung: rgba('bone', 0.96), now: rgba('signal', 1),
  ghost: 0.4, romaji: true, romajiSize: Math.max(13, s.size * 0.2), romajiColor: rgba('ash', 0.75), hold: 0, ...s,
});

/** Lay words out in a horizontal run (x from 0, baseline 0). */
export function runH(words: Word[], st: KStyle): KRun {
  const s = DEF(st);
  const chars: KChar[] = [];
  const ws: KRun['words'] = [];
  let x = 0;
  words.forEach((w, wi) => {
    if (wi > 0) x += s.gap;
    const x0 = x;
    Array.from(w.w).forEach((ch, i) => {
      const adv = measure(ch, s.family, s.size) + s.tracking;
      chars.push({ ch, w, i, x, y: 0, adv });
      x += adv;
    });
    ws.push({ w, x0, x1: x - s.tracking, y0: -s.size * 0.88, y1: s.size * 0.12 });
  });
  return { chars, width: x, words: ws };
}

/** Lay words out in a vertical run (縦書き): y from 0 downward, x = column centre 0. */
export function runV(words: Word[], st: KStyle): KRun {
  const s = DEF(st);
  const chars: KChar[] = [];
  const ws: KRun['words'] = [];
  let y = 0;
  const step = s.size * 1.02 + s.tracking;
  words.forEach((w, wi) => {
    if (wi > 0) y += s.gap;
    const y0 = y;
    Array.from(w.w).forEach((ch, i) => { chars.push({ ch, w, i, x: 0, y, adv: step }); y += step; });
    ws.push({ w, x0: -s.size / 2, x1: s.size / 2, y0, y1: y });
  });
  return { chars, width: y, words: ws };
}

/** Is `w` the word being sung (or held) at t? */
const isNow = (w: Word, t: number, hold: number) => t >= w.start && t < w.end + hold;

/**
 * Draw a laid-out run at (ox, oy) (horizontal: left end of the baseline; vertical: top of the column
 * centre). Characters wipe per their aligned times: the lit part in `now` while its word is being sung,
 * `sung` after, `unsung` before; characters are hidden until `ghost` s before their word.
 * `alpha(ch)` can modulate each character (fades, reveals).
 */
export function drawRun(c: CanvasRenderingContext2D, run: KRun, ox: number, oy: number, t: number, st: KStyle, vertical = false, alpha?: (k: KChar) => number) {
  const s = DEF(st);
  const base = c.globalAlpha;
  c.save();
  c.font = font(s.family, s.size);
  c.textBaseline = vertical ? 'middle' : 'alphabetic';
  c.textAlign = vertical ? 'center' : 'left';
  for (const k of run.chars) {
    const w = k.w;
    const vis = s.ghost === Infinity ? 1 : smoothstep(w.start - s.ghost, w.start - s.ghost + 0.12, t);
    const a = vis * (alpha ? alpha(k) : 1);
    if (a <= 0.003) continue;
    const p = Lyrics.charProgress(w, k.i, t);
    const hot = isNow(w, t, s.hold);
    const x = ox + k.x, y = oy + k.y;
    const cy = vertical ? y + s.size * 0.5 : y;
    c.globalAlpha = a * base;
    if (p < 1) { c.fillStyle = s.unsung; c.fillText(k.ch, x, cy); }
    if (p > 0) {
      c.save();
      c.beginPath();
      if (vertical) c.rect(x - s.size, y - s.size * 0.1, s.size * 2, s.size * 1.1 * p + s.size * 0.1);
      else c.rect(x - 2, oy - s.size * 1.2, k.adv * p + 2, s.size * 1.6);
      c.clip();
      c.fillStyle = hot ? s.now : s.sung;
      c.fillText(k.ch, x, cy);
      c.restore();
    }
  }
  if (s.romaji) {
    c.font = font(F.mono(400), s.romajiSize);
    c.letterSpacing = `${s.romajiSize * 0.08}px`;
    for (const r of run.words) {
      const w = r.w;
      const vis = s.ghost === Infinity ? 1 : smoothstep(w.start - s.ghost, w.start - s.ghost + 0.12, t);
      if (vis <= 0.003) continue;
      const p = Lyrics.wordProgress(w, t);
      c.globalAlpha = base * vis * (alpha ? alpha(run.chars.find((k) => k.w === w)!) : 1);
      c.fillStyle = p <= 0 ? rgba('ash', 0.35) : isNow(w, t, s.hold) ? s.now : s.romajiColor;
      if (vertical) {
        c.save();
        c.translate(ox + s.size * 0.62 + s.romajiSize * 0.4, oy + r.y0);
        c.rotate(Math.PI / 2);
        c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText(w.r, 0, 0);
        c.restore();
      } else {
        c.textAlign = 'center';
        c.fillText(w.r, ox + (r.x0 + r.x1) / 2, oy + s.size * 0.18 + s.romajiSize * 1.25);
      }
    }
    c.letterSpacing = '0px';
  }
  c.restore();
}

/** Convenience: lay out and draw a horizontal run centred (or left-aligned) at (x, y). */
export function karaokeH(c: CanvasRenderingContext2D, words: Word[], x: number, y: number, t: number, st: KStyle, align: 'left' | 'center' | 'right' = 'center', alpha?: (k: KChar) => number) {
  const run = runH(words, st);
  const ox = align === 'left' ? x : align === 'center' ? x - run.width / 2 : x - run.width;
  drawRun(c, run, ox, y, t, st, false, alpha);
  return { run, ox };
}

/** Largest size (<= max) at which the words fit in maxWidth as a horizontal run. */
export function fitRun(words: Word[], family: string, maxWidth: number, max: number, gapK = 0.28) {
  const w100 = runH(words, { family, size: 100, gap: 100 * gapK }).width;
  return Math.min(max, (100 * maxWidth) / Math.max(1, w100));
}

/** Split a line's words into rows no wider than maxW at `size` (greedy). */
export function wrapWords(words: Word[], family: string, size: number, maxW: number, gapK = 0.28) {
  const rows: Word[][] = [];
  let row: Word[] = [];
  for (const w of words) {
    const test = [...row, w];
    if (row.length && runH(test, { family, size, gap: size * gapK }).width > maxW) { rows.push(row); row = [w]; } else row = test;
  }
  if (row.length) rows.push(row);
  return rows;
}

// ------------------------------------------------------------------ the seal (朱印)
const sealCache = new Map<string, HTMLCanvasElement>();
/**
 * A hanko seal as a pre-rendered canvas (vermilion ink with a worn texture). `lines` are columns read
 * right to left (vertical), e.g. ['少女', 'Ａ']. `shape`: 'square' | 'round'. Size in logical px.
 */
export function sealCanvas(lines: string[], size: number, shape: 'square' | 'round' = 'square', seed = 7, color = rgba('signal', 1)) {
  const key = `${lines.join('|')}:${size}:${shape}:${seed}:${color}`;
  const hit = sealCache.get(key);
  if (hit) return hit;
  const S = Math.ceil(size * SCALE * 1.1);
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d')!;
  c.scale(S / (size * 1.1), S / (size * 1.1));
  c.translate(size * 0.55, size * 0.55);
  const R = size / 2;
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = size * 0.055;
  c.beginPath();
  if (shape === 'round') c.arc(0, 0, R * 0.94, 0, Math.PI * 2);
  else c.roundRect(-R * 0.92, -R * 0.92, R * 1.84, R * 1.84, R * 0.12);
  c.stroke();
  // characters: columns right to left, each column's chars stacked
  const cols = lines.length;
  const colW = (R * 1.5) / cols;
  const maxChars = Math.max(...lines.map((l) => Array.from(l).length));
  const ch = Math.min(colW * 0.98, (R * 1.5) / maxChars);
  c.font = font(F.mincho(700), ch);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((l, ci) => {
    const x = R * 0.75 - colW * (ci + 0.5);
    const chars = Array.from(l);
    chars.forEach((k, i) => {
      const y = (i - (chars.length - 1) / 2) * ch * 1.02;
      c.save();
      c.translate(x, y);
      c.scale(colW / ch > 1.2 ? 1.25 : 1, 1);
      c.fillText(k, 0, ch * 0.04);
      c.restore();
    });
  });
  // wear: knock out specks and a few pale streaks
  const rnd = mulberry32(seed);
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 520; i++) {
    const x = (rnd() - 0.5) * size, y = (rnd() - 0.5) * size, r = size * (0.002 + 0.012 * rnd() ** 3);
    c.globalAlpha = 0.4 + 0.6 * rnd();
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 0.35;
  for (let i = 0; i < 4; i++) {
    const y = (rnd() - 0.5) * size, a = (rnd() - 0.5) * 0.3;
    c.save(); c.rotate(a); c.fillRect(-size, y, size * 2, size * (0.006 + 0.012 * rnd())); c.restore();
  }
  sealCache.set(key, cv);
  return cv;
}

/**
 * Stamp a seal at (x, y) with rotation `rot`: before t0 nothing; at t0 it slams in from 1.35× with an
 * overshoot and a brief darker "wet" pass. Returns the stamp's impact pulse (for shake/flash).
 */
export function stamp(c: CanvasRenderingContext2D, seal: HTMLCanvasElement, x: number, y: number, size: number, rot: number, t: number, t0: number, alpha = 1) {
  if (t < t0 - 0.06) return 0;
  const k = prog(t, t0 - 0.06, t0, ease.inQuad);
  const sc = t < t0 ? lerp(1.35, 1, k) : 1 + 0.035 * Math.exp(-(t - t0) * 30) * Math.cos((t - t0) * 60);
  const a = (t < t0 ? k * 0.6 : 1) * alpha;
  const s = size * 1.1 * sc;
  c.save();
  c.translate(x, y); c.rotate(rot);
  c.globalAlpha *= a;
  c.drawImage(seal, -s / 2, -s / 2, s, s);
  c.restore();
  return t >= t0 ? Math.pow(0.5, (t - t0) / 0.08) : 0;
}

// ------------------------------------------------------------------ the bar (目線)
/**
 * The black bar: slides in from `from` (-1 left, 1 right) and lands at t0 with a hard stop.
 * Draws [x, y, w, h] in `color` (ink by default).
 */
export function bar(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, t0: number, o: { from?: number; dur?: number; color?: string; out?: number } = {}) {
  const dur = o.dur ?? 0.12;
  const k = prog(t, t0 - dur, t0, ease.inCubic);
  if (k <= 0) return;
  const kOut = o.out !== undefined ? prog(t, o.out, o.out + dur, ease.inCubic) : 0;
  const from = o.from ?? -1;
  c.save();
  c.fillStyle = o.color ?? rgba('ink', 1);
  const x0 = from < 0 ? x : x + w * (1 - k);
  const w0 = w * k;
  const x1 = from < 0 ? x0 + w0 * kOut : x0;
  c.fillRect(x1, y, w0 * (1 - kOut), h);
  c.restore();
}

// ------------------------------------------------------------------ the mosaic
/**
 * GLSL: mosaic sampling. `mosaicUV(uv, cellPx)` snaps uv to the centre of its cell (cells in logical
 * px, anchored at `origin` px). Blocks read as the news censor's mosaic when the source is smooth.
 */
export const GLSL_MOSAIC = /* glsl */ `
vec2 mosaicUV(vec2 uv, float cellPx, vec2 origin) {
  vec2 res = vec2(1920.0, 1080.0);
  vec2 px = uv * res - origin;
  return ((floor(px / cellPx) + 0.5) * cellPx + origin) / res;
}`;

/**
 * A fullscreen pass that shows `src` through a mosaic inside a rect (logical px, y down) — the rect
 * feathers by `soft` px — and draws it plain outside. cell <= 1 disables the mosaic.
 */
export class MosaicPass {
  pass = new FSPass(/* glsl */ `
    uniform sampler2D src; uniform float cell; uniform vec4 rect; uniform float soft; uniform float amount; uniform float jitter; uniform float jitterSeed;
    ${GLSL_MOSAIC}
    void main() {
      vec2 px = vec2(vUv.x, 1.0 - vUv.y) * vec2(1920.0, 1080.0);
      vec2 d = max(rect.xy - px, px - rect.zw);
      float inside = 1.0 - smoothstep(-soft, 0.0, max(d.x, d.y));
      vec4 plain = texture(src, vUv);
      if (cell <= 1.0 || inside * amount <= 0.0) { fragColor = plain; return; }
      vec2 o = rect.xy + jitter * (hash22(vec2(jitterSeed, 3.0)) - 0.5) * cell;
      vec2 uvm = mosaicUV(vec2(vUv.x, 1.0 - vUv.y), cell, o);
      vec4 m = texture(src, vec2(uvm.x, 1.0 - uvm.y));
      fragColor = mix(plain, m, inside * amount);
    }`, { src: { value: null }, cell: { value: 24 }, rect: { value: new THREE.Vector4(0, 0, 1920, 1080) }, soft: { value: 0 }, amount: { value: 1 }, jitter: { value: 0 }, jitterSeed: { value: 0 } });
  render(renderer: THREE.WebGLRenderer, src: THREE.Texture, out: THREE.WebGLRenderTarget, o: { cell: number; rect?: [number, number, number, number]; soft?: number; amount?: number; jitter?: number; seed?: number }) {
    const u = this.pass.u;
    u.src!.value = src;
    u.cell!.value = o.cell;
    (u.rect!.value as THREE.Vector4).set(...(o.rect ?? [0, 0, 1920, 1080]));
    u.soft!.value = o.soft ?? 0;
    u.amount!.value = o.amount ?? 1;
    u.jitter!.value = o.jitter ?? 0;
    u.jitterSeed!.value = (o.seed ?? 0) % 997;
    this.pass.render(renderer, out);
  }
}

// ------------------------------------------------------------------ backgrounds
/**
 * Ink or bone-paper ground: `paper` 0 = ink, 1 = bone paper; fibres, a faint vignette and an optional
 * grid (`grid.x` = cell px, `grid.y` = opacity; negative x = ruled lines only).
 */
export class Ground {
  pass = new FSPass(/* glsl */ `
    uniform float paper; uniform float t; uniform vec2 grid; uniform vec3 tint; uniform vec2 gridOrigin; uniform float gridGap;
    void main() {
      vec2 px = FRAG_PX; px.y = 1080.0 - px.y;
      float n = fbm(px * vec2(0.004, 0.02), 3) * 0.5 + snoise(px * 0.35) * 0.25;
      vec3 inkC = C_INK * (1.0 + 0.25 * n) + C_INK2 * 0.35 * smoothstep(1.1, 0.2, length((vUv - 0.5) * vec2(1.6, 1.0)));
      vec3 paperC = C_BONE * (0.94 + 0.035 * n) * mix(0.9, 1.0, smoothstep(1.2, 0.3, length((vUv - 0.5) * vec2(1.4, 1.0))));
      vec3 col = mix(inkC, paperC, paper) * tint;
      if (grid.y > 0.0) {
        float cell = abs(grid.x);
        vec2 q = px - gridOrigin;
        float lx = abs(fract(q.x / cell + 0.5) - 0.5) * cell, ly = abs(fract(q.y / cell + 0.5) - 0.5) * cell;
        float line = grid.x < 0.0 ? pxLine(ly, 0.3, 1.0) : max(pxLine(lx, 0.3, 1.0), pxLine(ly, 0.3, 1.0));
        vec3 lc = mix(C_GRAPHITE * 0.6, mix(C_BONE, C_SIGNAL, 0.55) * 0.9, paper);
        col = mix(col, lc, line * grid.y);
      }
      fragColor = vec4(col, 1.0);
    }`, { paper: { value: 0 }, t: { value: 0 }, grid: { value: new THREE.Vector2(0, 0) }, tint: { value: new THREE.Vector3(1, 1, 1) }, gridOrigin: { value: new THREE.Vector2(0, 0) }, gridGap: { value: 0 } });
  render(renderer: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget, o: { paper?: number; t?: number; grid?: [number, number]; gridOrigin?: [number, number]; tint?: [number, number, number] } = {}) {
    const u = this.pass.u;
    u.paper!.value = o.paper ?? 0;
    u.t!.value = o.t ?? 0;
    (u.grid!.value as THREE.Vector2).set(...(o.grid ?? [0, 0]));
    (u.gridOrigin!.value as THREE.Vector2).set(...(o.gridOrigin ?? [0, 0]));
    (u.tint!.value as THREE.Vector3).set(...(o.tint ?? [1, 1, 1]));
    this.pass.render(renderer, out);
  }
}

// ------------------------------------------------------------------ small drawing helpers
/** Mono label with letter spacing. */
export function label(c: CanvasRenderingContext2D, s: string, x: number, y: number, o: { size?: number; color?: string; align?: CanvasTextAlign; family?: string; spacing?: number } = {}) {
  c.save();
  c.font = font(o.family ?? F.mono(500), o.size ?? 13);
  c.letterSpacing = `${o.spacing ?? 3}px`;
  c.fillStyle = o.color ?? rgba('bone', 0.55);
  c.textAlign = o.align ?? 'left';
  c.textBaseline = 'alphabetic';
  c.fillText(s, x, y);
  c.restore();
}

/** A hand-ish red-pen circle around a box, drawn to `k` (0..1) of its length. */
export function penCircle(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, k: number, seed = 1, o: { width?: number; color?: string } = {}) {
  if (k <= 0) return;
  c.save();
  c.strokeStyle = o.color ?? rgba('signal', 1);
  c.lineWidth = o.width ?? 3.2;
  c.lineCap = 'round';
  c.beginPath();
  const n = 80, turns = 1.12 * k;
  const a0 = -2.2 + hash(seed) * 0.6;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = a0 + u * turns * Math.PI * 2;
    const wob = 1 + 0.05 * Math.sin(u * 7 + seed) + 0.04 * u;
    const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();
  c.restore();
}

/** A red-pen straight stroke from a to b drawn to k. */
export function penLine(c: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, k: number, o: { width?: number; color?: string } = {}) {
  if (k <= 0) return;
  c.save();
  c.strokeStyle = o.color ?? rgba('signal', 1);
  c.lineWidth = o.width ?? 3.2;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(lerp(ax, bx, k), lerp(ay, by, k)); c.stroke();
  c.restore();
}

export { mixRGBA, clamp };
