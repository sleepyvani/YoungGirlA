// "Exhibit 7: your voice, far" (lines 14–17). Hairline rings go out from the centre on every vocal
// onset (a reverb you can see); the text lives on them.
//   ああ           — mincho, held in the centre
//   君の ×3        — each 君の rides out on a ring
//   声が           — 声 fills the centre; the rings turn vermilion
//   遠い ×14       — each 遠い starts close and recedes into the distance along a spiral
//   傷つけないで    — written slowly around the outermost ring
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { F, font } from '../engine/type';
import { LIN, rgba } from '../engine/palette';
import { Lyrics, type Word } from '../engine/lyrics';
import { ease, lerp, prog, smoothstep, TAU } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH } from './_kit';

export function drawRings(lb: LineBatch, onsets: number[], t: number, speed: number, hotColor = LIN.signal) {
  const recent = onsets.filter((o) => o <= t && t - o < 2.6);
  for (const o of recent) {
    const age = t - o, r = 60 + age * speed;
    const a = Math.pow(1 - age / 2.6, 1.6);
    const hot = age < 0.25 ? 1 - age / 0.25 : 0;
    const col: [number, number, number] = [lerp(LIN.bone[0] * 0.5, hotColor[0] * 2, hot), lerp(LIN.bone[1] * 0.5, hotColor[1] * 2, hot), lerp(LIN.bone[2] * 0.5, hotColor[2] * 2, hot)];
    const n = 180;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
      lb.seg2(960 + Math.cos(a0) * r, 540 + Math.sin(a0) * r * 0.92, 960 + Math.cos(a1) * r, 540 + Math.sin(a1) * r * 0.92, 1.3, col, a);
    }
  }
  return recent.length;
}

export default class Echo extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  lb = new LineBatch(20000, { screen2D: true, blend: 'add' });
  words: Word[] = [];
  aa!: Word; kimi: Word[] = []; koe!: Word; tooi: Word[] = []; kizu!: Word;
  onsets: number[] = [];
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.words = [14, 15, 16, 17].flatMap((i) => lyrics.lines[i]!.words);
    this.aa = this.words[0]!;
    this.kimi = this.words.filter((w) => w.w === '君の');
    this.koe = this.words.find((w) => w.w === '声が')!;
    this.tooi = this.words.filter((w) => w.w === '遠い');
    this.kizu = this.words.find((w) => w.w === '傷つけないで')!;
    this.onsets = audio.events('vocal', this.ctx.start - 2, this.ctx.end + 1).map((e) => e[0]);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 0, t });
    const lb = this.lb; lb.clear();
    const hotK = smoothstep(this.koe.start - 0.1, this.koe.start + 0.2, t);
    const n = drawRings(lb, this.onsets, t, lerp(380, 640, hotK));
    lb.render(renderer, out);
    const L = this.layer; L.clear();
    const c = L.ctx;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const t0 = this.tooi[0]!.start;
    // ああ / 声
    const aaA = smoothstep(this.aa.start - 0.3, this.aa.start, t) * (1 - smoothstep(this.kimi[0]!.start - 0.2, this.kimi[0]!.start + 0.2, t));
    if (aaA > 0) { c.globalAlpha = aaA; c.font = font(F.mincho(700), 260); c.fillStyle = Lyrics.wordProgress(this.aa, t) < 1 ? rgba('signal', 1) : rgba('bone', 0.9); c.fillText('ああ', 960, 530); }
    const koeA = smoothstep(this.koe.start - 0.15, this.koe.start + 0.05, t) * (1 - smoothstep(t0 - 0.2, t0 + 0.1, t));
    if (koeA > 0) { c.globalAlpha = koeA; c.font = font(F.mincho(700), 420); c.fillStyle = t < this.koe.end ? rgba('ember', 1) : rgba('bone', 0.95); c.fillText('声', 960, 520); }
    // 君の ×3 on rings
    this.kimi.forEach((w, i) => {
      const age = t - w.start;
      if (age < -0.25 || t > t0) return;
      const r = 80 + Math.max(0, age) * 150;
      const ang = -Math.PI / 2 + (i - 1) * 0.9;
      c.globalAlpha = smoothstep(-0.25, 0, age) * (1 - smoothstep(3.5, 5, age));
      c.save();
      c.translate(960 + Math.cos(ang) * r * 1.5, 540 + Math.sin(ang) * r);
      c.font = font(F.sans(900), 96);
      c.fillStyle = t < w.end ? rgba('signal', 1) : rgba('bone', 0.9);
      c.fillText(w.w, 0, 0);
      c.restore();
    });
    // 遠い ×14: recede along a spiral
    this.tooi.forEach((w, i) => {
      const age = t - w.start;
      if (age < -0.08) return;
      const k = ease.outCubic(Math.min(1, Math.max(0, age) / 2.2));
      const ang = i * 0.9 + k * 1.2;
      const r = lerp(0, 620, k);
      const s = lerp(1.6, 0.18, k);
      c.globalAlpha = smoothstep(-0.08, 0, age) * (1 - 0.7 * k) * (1 - smoothstep(this.kizu.start + 0.5, this.kizu.start + 1.2, t));
      c.save();
      c.translate(960 + Math.cos(ang) * r * 1.3, 540 + Math.sin(ang) * r * 0.75);
      c.scale(s, s);
      c.font = font(F.sans(900), 150);
      c.fillStyle = age >= 0 && t < w.end ? rgba('signal', 1) : rgba('bone', 0.9);
      c.fillText(w.w, 0, 0);
      c.restore();
    });
    // 傷つけないで around the ring
    const kA = smoothstep(this.kizu.start - 0.3, this.kizu.start, t);
    if (kA > 0) {
      const chars = Array.from(this.kizu.w);
      chars.forEach((ch, i) => {
        const a = -Math.PI / 2 - 0.55 + i * 0.22;
        const p = Lyrics.charProgress(this.kizu, i, t);
        c.save();
        c.globalAlpha = kA;
        c.translate(960 + Math.cos(a) * 380, 560 + Math.sin(a) * 350);
        c.rotate(a + Math.PI / 2);
        c.font = font(F.mincho(700), 84);
        c.fillStyle = p <= 0 ? rgba('bone', 0.25) : p < 1 ? rgba('signal', 1) : rgba('bone', 0.95);
        c.fillText(ch, 0, 0);
        c.restore();
      });
    }
    c.globalAlpha = 1;
    // karaoke: the current line
    const line = this.ctx.lyrics.lines.slice(14, 18).filter((l) => l.words[0]!.start - 0.4 <= t).pop() ?? this.ctx.lyrics.lines[14]!;
    const st = { family: F.sans(900), size: 50, romajiSize: 15 };
    const run = runH(line.words, st);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    drawRun(c, run, 960 - run.width / 2, 1000, t, st);
    label(c, 'EXHIBIT 7 · 声 / 遠い', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    label(c, `${n} ECHOES`, W - 110, 96, { size: 13, color: rgba('ash', 0.5), align: 'right' });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.09);
    return { bloom: 0.8, vignette: 0.45, zoom: 1 + kick * 0.01 };
  }
}
void prog;
