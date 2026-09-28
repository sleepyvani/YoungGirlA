// "Exhibit 5: the stumble" (line 10: ああ 時に 時に つまずいたって). A staircase in hairlines descends
// across the frame; ああ hangs above it in mincho; each 時に steps down onto a stair on its word; on
// つまずいたって the characters trip one by one and tumble down the remaining stairs (gravity, spin),
// and the instrument files it: 転倒 1件.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, hash, lerp, prog, pulse, smoothstep } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH } from './_kit';

const STEPS = 9, SX = 180, SY = 86, X0 = 260, Y0 = 330; // stair i: top-left at (X0 + i*SX, Y0 + i*SY)
const stairY = (x: number) => Y0 + Math.max(0, Math.min(STEPS - 1, Math.floor((x - X0) / SX))) * SY;

export default class Trip extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L!: Line;
  aa!: Word; toki: Word[] = []; tsuma!: Word;
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[10]!;
    this.aa = this.L.words[0]!;
    this.toki = this.L.words.filter((w) => w.w === '時に');
    this.tsuma = this.L.words.find((w) => w.w === 'つまずいたって')!;
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 0, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    // the stairs
    const draw = prog(t, this.ctx.start, this.ctx.start + 0.5, ease.outCubic);
    c.strokeStyle = rgba('bone', 0.75); c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i < STEPS * draw; i++) {
      const x = X0 + i * SX, y = Y0 + i * SY;
      c.moveTo(x, y); c.lineTo(x + SX, y); c.lineTo(x + SX, y + SY);
    }
    c.stroke();
    c.fillStyle = rgba('bone', 0.12);
    for (let i = 0; i < STEPS * draw; i++) for (let k = 1; k < 6; k++) c.fillRect(X0 + i * SX, Y0 + i * SY + k * 14, SX, 0.8);
    // ああ
    const aA = smoothstep(this.aa.start - 0.3, this.aa.start, t);
    c.save();
    c.globalAlpha = aA;
    c.font = font(F.mincho(700), 150); c.textBaseline = 'alphabetic';
    const ap = Lyrics.wordProgress(this.aa, t);
    c.fillStyle = ap < 1 ? rgba('signal', 1) : rgba('bone', 0.9);
    c.fillText(this.aa.w, 200, 230);
    c.restore();
    // 時に ×2 on stairs 1 and 3
    this.toki.forEach((w, i) => {
      const k = prog(t, w.start - 0.2, w.start + 0.05, ease.outBack);
      if (k <= 0) return;
      const st = 1 + i * 2;
      const x = X0 + st * SX + SX / 2, y = Y0 + st * SY - 8;
      c.save();
      c.globalAlpha = Math.min(1, k * 2);
      c.font = font(F.sans(900), 76); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillStyle = t >= w.start && t < w.end + 0.1 ? rgba('signal', 1) : rgba('bone', 0.9);
      c.fillText(w.w, x, y - 40 * (1 - k));
      c.restore();
    });
    // つまずいたって: characters walk onto stair 5, then trip and tumble
    const chars = Array.from(this.tsuma.w);
    let falls = 0;
    chars.forEach((ch, i) => {
      const s0 = Lyrics.charStart(this.tsuma, i);
      if (t < s0 - 0.2) return;
      const bx = X0 + 5 * SX + 20 + i * 62;
      const trip = s0 + 0.12;
      const dt = Math.max(0, t - trip);
      // tumble: forward, down the stairs, bouncing on each step edge
      const vx = 260 + hash(i, 1) * 180;
      let x = bx + vx * dt;
      let y = stairY(bx) - 8 + 0.5 * 2400 * dt * dt;
      const floor = stairY(x) - 8;
      if (y > floor) { y = floor - Math.abs(Math.sin(dt * 9)) * 30 * Math.exp(-dt * 2); falls++; }
      if (x > X0 + STEPS * SX) { x = X0 + STEPS * SX + (x - X0 - STEPS * SX) * 0.3; y = Y0 + STEPS * SY - 8 + 0.5 * 2400 * Math.max(0, dt - 0.6) ** 2; }
      const rot = dt * (6 + hash(i, 2) * 6) * (hash(i, 3) < 0.5 ? 1 : -1);
      c.save();
      c.translate(x, y - 30); c.rotate(rot);
      c.globalAlpha = smoothstep(s0 - 0.2, s0, t);
      c.font = font(F.sans(900), 76); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = Lyrics.charProgress(this.tsuma, i, t) < 1 || t < this.tsuma.end ? rgba('signal', 1) : rgba('bone', 0.9);
      c.fillText(ch, 0, 0);
      c.restore();
    });
    const fell = t > this.tsuma.start + 0.3;
    label(c, fell ? '転倒  1件' : '転倒  0件', W - 150, 150, { size: 22, family: F.dot(), color: fell ? rgba('signal', 1) : rgba('ash', 0.6), align: 'right', spacing: 3 });
    label(c, 'EXHIBIT 5 · つまずき', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    const st = { family: F.sans(900), size: 48, romajiSize: 15 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 1000, t, st);
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.09);
    const thud = pulse(t, this.tsuma.start + 0.3, 0.1);
    void lerp; void falls; void H;
    return { bloom: 0.6, vignette: 0.4, zoom: 1 + kick * 0.01, shake: [0, thud * 8] as [number, number] };
  }
}
