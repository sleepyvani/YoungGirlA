// "Exhibit 4: grains of a dream" (lines 8–9). Several thousand grains, each a pure function of time:
// every grain has a home in each formation and travels between them with a staggered ease, plus a
// drift that loosens between formations.
//   捨ててきた      — the grains lie thrown away, a heap at the bottom of the frame
//   夢を            — they lift into a loose cloud
//   集めて          — gathered: they condense into 夢
//   ちょっと ちょっと — 夢 holds; a few grains start to slip
//   間違えたから     — …and land wrong (vermilion, off by a little); then the dream sinks away
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { F, font, textPoints } from '../engine/type';
import { LIN, rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { clamp, ease, hash, keys, lerp, noise2, prog, pulse, smoothstep, TAU } from '../engine/util';
import { Ground, beatsIn, drawRun, fitRun, idxAt, label, lastAt, pulseAt, runH } from './_kit';

const N = 4200;
type P = { x: number; y: number };

export default class Dream extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  lb = new LineBatch(N + 64, { screen2D: true, blend: 'add' });
  L!: Line;
  forms: { t: number; pts: P[]; loose: number; name: string }[] = [];
  beats: number[] = [];
  heap: P[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = { ...lyrics.lines[8]!, words: [...lyrics.lines[8]!.words, ...lyrics.lines[9]!.words] };
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
    // formations
    const yume = textPoints('夢', F.mincho(700), 560, 7, 3).map((p) => ({ x: 960 - 280 + p.x, y: 470 + 220 + p.y }));
    const cloud = (seed: number, cx: number, cy: number, rx: number, ry: number) =>
      Array.from({ length: N }, (_, i) => { const a = hash(i, seed) * TAU, r = Math.sqrt(hash(i, seed + 1)); return { x: cx + Math.cos(a) * r * rx, y: cy + Math.sin(a) * r * ry }; });
    const field = Array.from({ length: N }, (_, i) => ({ x: hash(i, 21) * W, y: hash(i, 22) * (H - 200) + 40 }));
    const left = Array.from({ length: N }, (_, i) => ({ x: -200 - hash(i, 31) * 900, y: 300 + (hash(i, 32) - 0.5) * 420 }));
    const heap = Array.from({ length: N }, (_, i) => { const u = hash(i, 41) * 2 - 1; return { x: 960 + u * 900, y: 900 - Math.pow(1 - Math.abs(u), 1.6) * 120 * hash(i, 42) - 10 }; });
    const sink = Array.from({ length: N }, (_, i) => ({ x: 960 + (hash(i, 61) - 0.5) * 1700, y: 1180 + hash(i, 62) * 300 }));
    const w0 = this.L.words;
    this.forms = [
      { t: this.ctx.start - 2, pts: field, loose: 1.2, name: 'field' },
      { t: w0[0]!.start, pts: heap, loose: 0.3, name: 'heap' },
      { t: w0[1]!.start, pts: cloud(5, 960, 470, 520, 260), loose: 1, name: 'cloud' },
      { t: w0[2]!.start, pts: yume, loose: 0.08, name: 'yume2' },
      { t: this.ctx.end - 1.6, pts: sink, loose: 0.6, name: 'sink' },
    ];
    void left;
  }

  private home(f: { pts: P[] }, i: number) {
    const p = f.pts[i % f.pts.length]!;
    // spread duplicates slightly so repeats don't stack
    const k = Math.floor(i / f.pts.length);
    return k ? { x: p.x + (hash(i, 7) - 0.5) * 5, y: p.y + (hash(i, 8) - 0.5) * 5 } : p;
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 0, t });
    const lb = this.lb; lb.clear();
    const fi = Math.max(0, idxAt(this.forms.map((x) => x.t), t));
    const A = this.forms[Math.max(0, fi - 1)]!, B = this.forms[fi]!;
    const kick = pulseAt(this.beats, t, 0.09);
    const barBeat = lastAt(this.beats, t);
    const archGlow = 0;
    const tMachi = this.L.words[5]!.start;
    const mistakeK = B.name === 'yume2' || B.name === 'sink' ? smoothstep(this.L.words[4]!.start, tMachi + 0.3, t) : 0;
    for (let i = 0; i < N; i++) {
      const st = hash(i, 11) * 0.55;
      const k = ease.inOutCubic(prog(t, B.t + st * 0.8, B.t + 0.75 + st, ease.linear));
      const a = this.home(A, i), b = this.home(B, i);
      let x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k);
      // drift: stronger while loose, a curl of 2D value noise
      const loose = lerp(A.loose, B.loose, k);
      const ph = hash(i, 12) * 100;
      x += noise2(ph + t * 0.35, i * 0.01) * 26 * loose + Math.sin(t * 0.9 + ph) * 6 * loose;
      y += noise2(i * 0.01, ph + t * 0.35) * 22 * loose;
      // the march: hop on each beat
      // mistakes: 1 in 11 grains of the second 夢 lands a little off, vermilion
      const wrong = (B.name === 'yume2' || B.name === 'sink') && hash(i, 13) < 0.09;
      if (wrong) { x += (hash(i, 14) - 0.5) * 90 * mistakeK; y += (hash(i, 15) - 0.5) * 90 * mistakeK; }
      // velocity for the streak
      const dx = (b.x - a.x) * (k > 0 && k < 1 ? 0.012 : 0), dy = (b.y - a.y) * (k > 0 && k < 1 ? 0.012 : 0);
      const tw = 0.6 + 0.4 * Math.sin(t * (3 + hash(i, 16) * 4) + ph);
      const s = (0.35 + 0.5 * hash(i, 17)) * tw * (1 + kick * 0.6) * (1 + archGlow * 0.8);
      const col: [number, number, number] = wrong ? [LIN.signal[0] * 2.2 * mistakeK + LIN.bone[0] * 0.6 * (1 - mistakeK), LIN.signal[1] * 2.2 * mistakeK + LIN.bone[1] * 0.6 * (1 - mistakeK), LIN.signal[2] * 2.2 * mistakeK + LIN.bone[2] * 0.6 * (1 - mistakeK)]
        : B.name === 'arch' && archGlow > 0 && hash(i, 18) < 0.25 ? [LIN.ember[0] * 1.6 * s, LIN.ember[1] * 1.6 * s, LIN.ember[2] * 1.6 * s] : [LIN.bone[0] * 0.75 * s, LIN.bone[1] * 0.75 * s, LIN.bone[2] * 0.75 * s];
      lb.seg2(x - dx, y - dy, x + 0.01, y, 2.2 + hash(i, 19) * 1.4, col, 0.9);
    }
    lb.render(renderer, out);

    // ---- text layer
    const L = this.layer; L.clear();
    const c = L.ctx;
    // karaoke line, bottom
    const fam = F.sans(900);
    const size = Math.min(56, fitRun(this.L.words, fam, 1640, 56));
    const st = { family: fam, size, romajiSize: 16 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 960, t, st);
    // labels
    label(c, 'EXHIBIT 4 · 夢の粒', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    label(c, `n = ${N}`, W - 110, 96, { size: 13, color: rgba('ash', 0.45), align: 'right' });
    if (B.name === 'yume2' || B.name === 'sink') label(c, `誤差  ${(mistakeK * 9).toFixed(1)} %`, W - 110, 122, { size: 14, family: F.dot(), color: rgba('signal', 0.9 * mistakeK), align: 'right', spacing: 1 });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const zoom = keys(t, [[this.L.words[2]!.start, 1.0], [this.ctx.end, 1.06, ease.inCubic]]);
    return { bloom: 0.75, vignette: 0.45, zoom: zoom * (1 + kick * 0.006), flash: pulse(t, this.L.words[2]!.start, 0.12) * 0.012 };
  }
}
void clamp;
