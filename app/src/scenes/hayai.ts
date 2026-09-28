// "Exhibit 12: speed / hate" (lines 27–33).
//   早い ×14         — each 早い whips in from alternating sides, stretched, with speed lines, and
//                     stacks into a 5-5-4 grid
//   追いつけないよ    — the line runs right to left across the frame; a vermilion runner stays ahead
//   すてきれず 残した 思いが — curt: typed, small, in the machine's voice, on a rule (a statement)
//   憎い ×14         — seals 憎 stamp over it, one per word, bigger and bigger
//   許されないの      — a vermilion bar slams across, the words cut out of it in ink; then the break:
//                     the bar lifts and leaves a void with one hairline
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Word } from '../engine/lyrics';
import { ease, frameIdx, hash, lerp, prog, smoothstep } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH, sealCanvas, stamp } from './_kit';

export default class Hayai extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  words: Word[] = [];
  hayai: Word[] = []; oi!: Word; quiet: Word[] = []; nikui: Word[] = []; yuru!: Word;
  seal!: HTMLCanvasElement;
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.words = [27, 28, 29, 30, 31, 32, 33].flatMap((i) => lyrics.lines[i]!.words);
    const ws = this.words;
    this.hayai = ws.filter((w) => w.w === '早い');
    this.oi = ws.find((w) => w.w === '追いつけないよ')!;
    this.quiet = lyrics.lines[30]!.words;
    this.nikui = ws.filter((w) => w.w === '憎い');
    this.yuru = ws.find((w) => w.w === '許されないの')!;
    this.seal = sealCanvas(['憎'], 200, 'round', 41);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 0, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const phaseSpeed = t < this.quiet[0]!.start - 0.1;
    let impact = 0;
    const lines = this.ctx.lyrics.lines;

    if (phaseSpeed) {
      // speed lines, faster with each 早い
      const n = this.hayai.filter((w) => w.start <= t).length + (t >= this.oi.start ? 4 : 0);
      const v = 600 + n * 320;
      c.fillStyle = rgba('bone', 0.12 + 0.012 * n);
      for (let i = 0; i < 70; i++) {
        const len = 80 + hash(i, 1) * 500;
        const y = 60 + hash(i, 2) * (H - 120);
        const x = W - ((hash(i, 3) * (W + len) + t * v * (0.6 + hash(i, 4))) % (W + len));
        c.fillRect(x, y, len, i % 7 === 0 ? 2 : 1);
      }
      // 早い ×14 — whip in and stack (5-5-4)
      const out = prog(t, this.oi.start - 0.1, this.oi.start + 0.2, ease.inCubic);
      this.hayai.forEach((w, i) => {
        if (t < w.start - 0.1) return;
        const k = prog(t, w.start - 0.1, w.start + 0.04, ease.outExpo);
        const dir = i % 2 ? 1 : -1;
        const col = i % 5, row = Math.floor(i / 5);
        const tx = 330 + col * 315 + (row === 2 ? 157 : 0), ty = 240 + row * 230;
        const x = lerp(tx - dir * 1700, tx, k) - out * 2600, y = ty;
        c.save();
        c.translate(x, y); c.scale(lerp(3.2, 1.3, k), 1);
        c.font = font(F.sans(900), 110); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = t >= w.start && t < w.end + 0.05 ? rgba('signal', 1) : rgba('bone', 0.9);
        c.fillText(w.w, 0, 0);
        c.restore();
      });
      label(c, `${(this.hayai.filter((w) => w.start <= t).length * 20).toString().padStart(3, '0')} km/h`, W - 110, 124, { size: 18, color: rgba('bone', 0.75), align: 'right', family: F.mono(400) });
      // 追いつけないよ — runs right to left, runner ahead
      if (t >= this.oi.start - 0.2) {
        const u = prog(t, this.oi.start - 0.2, this.oi.end, ease.linear);
        const x = lerp(W + 100, -900, u);
        c.font = font(F.sans(900), 140); c.textBaseline = 'middle';
        let xx = x;
        Array.from(this.oi.w).forEach((ch, i) => {
          const p = Lyrics.charProgress(this.oi, i, t);
          c.fillStyle = p <= 0 ? rgba('bone', 0.3) : p < 1 ? rgba('signal', 1) : rgba('bone', 0.92);
          c.fillText(ch, xx, 540);
          xx += c.measureText(ch).width;
        });
        const rx = x - 120 - 160 * Math.sin(u * 3);
        c.fillStyle = rgba('signal', 1);
        c.fillRect(rx - 900, 640, 900, 3);
        c.beginPath(); c.arc(rx, 641, 9, 0, Math.PI * 2); c.fill();
      }
    } else {
      // the statement, typed on a rule
      const q0 = this.quiet[0]!;
      const breakK = smoothstep(this.yuru.end + 0.1, this.yuru.end + 0.5, t);
      const x0 = 380, y0 = 540;
      c.save();
      c.globalAlpha = 1 - breakK;
      c.fillStyle = rgba('bone', 0.35);
      c.fillRect(x0, y0 + 36, 1160 * prog(t, q0.start - 0.2, q0.start + 0.4, ease.outCubic), 1);
      let x = x0;
      c.font = font(F.dot(), 64); c.textBaseline = 'alphabetic';
      for (const w of this.quiet) {
        const chars = Array.from(w.w);
        chars.forEach((ch, i) => {
          if (t < Lyrics.charStart(w, i)) return;
          c.fillStyle = t >= w.start && t < w.end ? rgba('signal', 1) : rgba('bone', 0.9);
          c.fillText(ch, x + c.measureText(chars.slice(0, i).join('')).width, y0);
        });
        if (t >= w.start) label(c, w.r, x, y0 + 72, { size: 15, color: rgba('ash', 0.7), family: F.mono(400) });
        x += c.measureText(w.w).width + 44;
      }
      if (frameIdx(t) % 40 < 24 && t < this.nikui[0]!.start) { c.fillStyle = rgba('signal', 1); c.fillRect(Math.min(x, 1560), y0 - 54, 28, 60); }
      label(c, '供述  STATEMENT', x0, y0 - 110, { size: 14, family: F.dot(), color: rgba('ash', 0.7), spacing: 2 });
      // 憎い ×14: seals
      this.nikui.forEach((w, i) => {
        const sx = 180 + hash(i, 81) * 1560, sy = 150 + hash(i, 82) * 700;
        impact = Math.max(impact, stamp(c, this.seal, sx, sy, 120 + i * 14, (hash(i, 83) - 0.5) * 0.8, t, w.start));
      });
      const nk = this.nikui.filter((w) => w.start <= t).length;
      if (nk) label(c, `憎  ×${nk}`, 150, 170, { size: 40, family: F.dot(), color: rgba('bone', 0.9), spacing: 6 });
      // 許されないの: the bar
      const bk = prog(t, this.yuru.start - 0.1, this.yuru.start, ease.inCubic);
      if (bk > 0) {
        c.fillStyle = rgba('signal', 1);
        c.fillRect(0, 440, W * bk, 200);
        if (bk >= 1) {
          c.font = font(F.sans(900), 150); c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = rgba('ink', 1);
          const chars = Array.from(this.yuru.w);
          const n = chars.filter((_, i) => Lyrics.charStart(this.yuru, i) <= t).length;
          c.fillText(chars.slice(0, n).join(''), 960, 546);
        }
        impact = Math.max(impact, t >= this.yuru.start ? Math.pow(0.5, (t - this.yuru.start) / 0.06) : 0);
      }
      c.restore();
      // the break: a void with one hairline
      if (breakK > 0) {
        c.fillStyle = rgba('bone', 0.5 * breakK);
        c.fillRect(960 - 500 * breakK, 540, 1000 * breakK, 1);
        label(c, '— 無音 —', 960, 600, { size: 14, family: F.dot(), color: rgba('ash', 0.5 * breakK), align: 'center', spacing: 4 });
      }
    }
    label(c, 'EXHIBIT 12 · 早い / 憎い', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    const line = lines.slice(27, 34).filter((l) => l.words[0]!.start - 0.4 <= t).pop() ?? lines[27]!;
    const st = { family: F.sans(900), size: 48, romajiSize: 14 };
    const run = runH(line.words, st);
    drawRun(c, run, 960 - run.width / 2, 1010, t, st);
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.08);
    return { bloom: 0.6, vignette: 0.4, zoom: 1 + kick * 0.012, flash: impact * 0.01, shake: [Math.sin(t * 91) * impact * 12, Math.cos(t * 73) * impact * 8] as [number, number], ca: phaseSpeed ? 2.5 : 1.2 };
  }
}
