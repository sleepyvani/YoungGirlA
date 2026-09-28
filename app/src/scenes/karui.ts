// "Exhibit 5: weightless" (line 5). 足りないね, then six 軽い, each released from below on its word and
// rising with an upward acceleration (negative gravity), turning a little as it goes; hairlines scroll
// down behind them. The instrument reads the mass dropping word by word.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, hash, lerp, prog, smoothstep } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH } from './_kit';

export default class Karui extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L!: Line;
  karui: Word[] = [];
  tari!: Word;
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[5]!;
    this.tari = this.L.words[0]!;
    this.karui = this.L.words.slice(1);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 0, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    // rising: hairlines scroll down, faster as more is released
    const released = this.karui.filter((w) => w.start <= t).length;
    const speed = 120 + released * 90;
    const off = (t - this.ctx.start) * speed;
    c.fillStyle = rgba('graphite', 0.5);
    for (let i = 0; i < 40; i++) {
      const y = ((i * 37 + off) % (H + 40)) - 20;
      const w = 200 + hash(i, 3) * 900;
      c.fillRect(hash(i, 4) * (W - w), y, w, 1);
    }
    // 足りないね: mincho, left, stays and dims as the 軽い rise
    const ta = smoothstep(this.tari.start - 0.3, this.tari.start, t);
    c.save();
    c.globalAlpha = ta * (1 - 0.6 * smoothstep(this.karui[0]!.start, this.karui[0]!.start + 1, t));
    c.font = font(F.mincho(700), 120);
    c.textBaseline = 'alphabetic';
    const tp = Lyrics.wordProgress(this.tari, t);
    c.fillStyle = rgba('bone', 0.3); c.fillText(this.tari.w, 150, 300);
    c.save(); c.beginPath(); c.rect(150, 150, c.measureText(this.tari.w).width * tp, 200); c.clip();
    c.fillStyle = t < this.tari.end ? rgba('signal', 1) : rgba('bone', 0.95); c.fillText(this.tari.w, 150, 300); c.restore();
    label(c, this.tari.r, 156, 340, { size: 16, color: rgba('ash', 0.7), family: F.mono(400), spacing: 2 });
    c.restore();
    // the six 軽い
    this.karui.forEach((w, i) => {
      if (t < w.start - 0.15) return;
      const dt = t - w.start;
      const x = 560 + i * 230 + (hash(i, 9) - 0.5) * 60;
      const y0 = 800 - (i % 2) * 90;
      const y = y0 - 50 * prog(t, w.start - 0.15, w.start, ease.outCubic) - 0.5 * 1500 * Math.max(0, dt) ** 2 - 220 * Math.max(0, dt);
      const size = 150 - i * 8;
      const rot = (hash(i, 5) - 0.5) * 0.5 * Math.max(0, dt);
      const hot = t >= w.start && t < w.end + 0.1;
      c.save();
      c.translate(x, y); c.rotate(rot);
      c.font = font(F.sans(900), size);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.globalAlpha = smoothstep(w.start - 0.15, w.start, t);
      c.fillStyle = hot ? rgba('signal', 1) : rgba('bone', 0.92);
      c.fillText(w.w, 0, 0);
      c.font = font(F.mono(400), 18); c.fillStyle = rgba('ash', 0.8);
      c.fillText(w.r, 0, size * 0.62);
      // a thread under it, like a released balloon
      c.fillStyle = rgba('bone', 0.35);
      c.fillRect(-0.5, size * 0.8, 1, 120);
      c.restore();
    });
    // readout
    const mass = Math.max(0, 6 - released);
    label(c, '質量', W - 330, 180, { size: 16, family: F.dot(), color: rgba('ash', 0.8), spacing: 2 });
    c.save();
    c.font = font(F.mono(400), 56); c.fillStyle = rgba('bone', 0.92); c.textAlign = 'right';
    c.fillText(`${(mass / 6).toFixed(2)} g`, W - 150, 250);
    c.restore();
    label(c, 'EXHIBIT 5 · 軽い', W - 150, 290, { size: 13, color: rgba('ash', 0.5), align: 'right' });
    // karaoke line, bottom
    const st = { family: F.sans(900), size: 44, romajiSize: 14 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 1010, t, st);
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.09);
    return { bloom: 0.6, vignette: 0.4, zoom: 1 + kick * 0.01 };
  }
}
