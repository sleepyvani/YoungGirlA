// "Exhibit 9: speed" (line 10).
//   足りないね       — mincho, left, held a moment
//   早い ×5          — each 早い whips in from alternating sides, stretched, with speed lines, and
//                     stacks into a column of five
//   追いつけないよ    — the line runs right to left across the frame; a vermilion runner stays ahead
//   素っ気なく 残した 思いが — curt: typed, small, in the machine's voice, on a rule
//   憎い ×3          — vermilion bars slam across the frame, 憎い cut out of them in ink
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, frameIdx, hash, lerp, prog, pulse, smoothstep } from '../engine/util';
import { Ground, beatsIn, drawRun, fitRun, label, pulseAt, runH } from './_kit';

export default class Hayai extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L!: Line;
  tari!: Word; hayai: Word[] = []; oi!: Word; quiet: Word[] = []; nikui: Word[] = [];
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[10]!;
    const ws = this.L.words;
    this.tari = ws[0]!;
    this.hayai = ws.filter((w) => w.w === '早い');
    this.oi = ws.find((w) => w.w === '追いつけないよ')!;
    this.quiet = [ws.find((w) => w.w === '素っ気なく')!, ws.find((w) => w.w === '残した')!, ws.find((w) => w.w === '思いが')!];
    this.nikui = ws.filter((w) => w.w === '憎い');
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 0, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const h0 = this.hayai[0]!, hN = this.hayai[this.hayai.length - 1]!;
    const phaseSpeed = t < this.quiet[0]!.start - 0.1;
    let flash = 0, shakeK = 0;

    if (phaseSpeed) {
      // speed lines: horizontal streaks, faster with each 早い
      const n = this.hayai.filter((w) => w.start <= t).length + (t >= this.oi.start ? 3 : 0);
      const v = 600 + n * 700;
      c.fillStyle = rgba('bone', 0.14 + 0.03 * n);
      for (let i = 0; i < 70; i++) {
        const len = 80 + hash(i, 1) * 500;
        const y = 60 + hash(i, 2) * (H - 120);
        const x = W - ((hash(i, 3) * (W + len) + t * v * (0.6 + hash(i, 4))) % (W + len));
        c.fillRect(x, y, len, i % 7 === 0 ? 2 : 1);
      }
      // 足りないね
      const ta = smoothstep(this.tari.start - 0.3, this.tari.start, t) * (1 - smoothstep(h0.start - 0.05, h0.start + 0.2, t));
      if (ta > 0) {
        c.globalAlpha = ta;
        c.font = font(F.mincho(700), 150); c.textBaseline = 'middle';
        const p = Lyrics.wordProgress(this.tari, t);
        c.fillStyle = p < 1 ? rgba('signal', 1) : rgba('bone', 0.95);
        c.fillText(this.tari.w, 200, 520);
        c.globalAlpha = 1;
      }
      // 早い ×5 — whip in and stack
      this.hayai.forEach((w, i) => {
        if (t < w.start - 0.12) return;
        const k = prog(t, w.start - 0.12, w.start + 0.05, ease.outExpo);
        const dir = i % 2 ? 1 : -1;
        const out = prog(t, this.oi.start - 0.1, this.oi.start + 0.2, ease.inCubic);
        const x = lerp(960 - dir * 1600, 960, k) + out * -2400;
        const y = 170 + i * 150;
        const stretch = lerp(3.2, 1.35, k);
        c.save();
        c.translate(x, y); c.scale(stretch, 1);
        c.font = font(F.sans(900), 130); c.textAlign = 'center'; c.textBaseline = 'middle';
        const hot = t >= w.start && t < w.end + 0.05;
        c.fillStyle = hot ? rgba('signal', 1) : rgba('bone', 0.9);
        c.fillText(w.w, 0, 0);
        c.restore();
        label(c, `${(i + 1) * 20} km/h`, x + 230, y + 50, { size: 13, color: rgba('ash', 0.6 * (1 - out)) });
      });
      // 追いつけないよ — runs right to left, runner ahead
      if (t >= this.oi.start - 0.2) {
        const u = prog(t, this.oi.start - 0.2, this.oi.end, ease.linear);
        const x = lerp(W + 100, -900, u);
        c.font = font(F.sans(900), 140); c.textBaseline = 'middle';
        const run = Array.from(this.oi.w);
        let xx = x;
        run.forEach((ch, i) => {
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
      // the curt part: typed on a rule
      const q0 = this.quiet[0]!;
      const x0 = 380, y0 = 540;
      c.fillStyle = rgba('bone', 0.35);
      c.fillRect(x0, y0 + 36, 1160 * prog(t, q0.start - 0.2, q0.start + 0.4, ease.outCubic), 1);
      let x = x0;
      c.font = font(F.dot(), 64); c.textBaseline = 'alphabetic';
      for (const w of this.quiet) {
        const chars = Array.from(w.w);
        chars.forEach((ch, i) => {
          const s = Lyrics.charStart(w, i);
          if (t < s) return;
          const hot = t >= w.start && t < w.end;
          c.fillStyle = hot ? rgba('signal', 1) : rgba('bone', 0.9);
          c.fillText(ch, x + c.measureText(chars.slice(0, i).join('')).width, y0);
        });
        const shown = chars.filter((_, i) => Lyrics.charStart(w, i) <= t).length;
        if (shown) label(c, w.r, x, y0 + 72, { size: 15, color: rgba('ash', 0.7), family: F.mono(400) });
        x += c.measureText(w.w).width + 44;
      }
      // cursor
      if (frameIdx(t) % 40 < 24 && t < this.nikui[0]!.start) { c.fillStyle = rgba('signal', 1); c.fillRect(Math.min(x, 1560), y0 - 54, 28, 60); }
      label(c, '供述  STATEMENT', x0, y0 - 110, { size: 14, family: F.dot(), color: rgba('ash', 0.7), spacing: 2 });
      // 憎い ×3: bars
      this.nikui.forEach((w, i) => {
        if (t < w.start - 0.1) return;
        const k = prog(t, w.start - 0.1, w.start, ease.inCubic);
        const y = [190, 760, 470][i]!;
        c.fillStyle = rgba('signal', 1);
        const bw = W * k;
        const from = i % 2 ? W - bw : 0;
        c.fillRect(from, y - 95, bw, 190);
        if (k >= 1) {
          c.save();
          c.font = font(F.sans(900), 170); c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = rgba('ink', 1);
          c.fillText(w.w, 960 + (i - 1) * 380, y + 6);
          c.restore();
        }
        flash = Math.max(flash, pulse(t, w.start, 0.06));
      });
      shakeK = flash;
    }
    label(c, 'EXHIBIT 9 · 早い', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    const fam = F.sans(900);
    const size = Math.min(44, fitRun(this.L.words, fam, 1700, 44));
    const st = { family: fam, size, romajiSize: 14 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 1010, t, st);
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.08);
    return { bloom: 0.6, vignette: 0.4, zoom: 1 + kick * 0.012, flash: flash * 0.02, shake: [Math.sin(t * 91) * shakeK * 14, Math.cos(t * 73) * shakeK * 9] as [number, number], ca: phaseSpeed ? 2.5 : 1.2 };
  }
}
