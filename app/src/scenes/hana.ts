// "Exhibit 11: two flowers, to fool a child" (lines 24–25). The one pink moment in the video.
//   子供騙しの    — a pink-tinted page; the words are set like a children's sticker label
//   花 二つ       — two paper-sticker flowers pop open, one on each word (the only pink)
//   きっと ×2     — the flowers wilt a little on each: petals droop, the stems bend
//   諦めたから    — the pink drains out; the flowers peel off the page and fall
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba, mixRGBA } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, hash, lerp, prog, smoothstep } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH } from './_kit';

export default class Hana extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  words: Word[] = [];
  kodomo!: Word; hana!: Word; futatsu!: Word; kitto: Word[] = []; akira!: Word;
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.words = [...lyrics.lines[24]!.words, ...lyrics.lines[25]!.words];
    [this.kodomo, this.hana, this.futatsu] = this.words as [Word, Word, Word];
    this.kitto = this.words.filter((w) => w.w === 'きっと');
    this.akira = this.words.find((w) => w.w === '諦めたから')!;
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  private flower(c: CanvasRenderingContext2D, x: number, y: number, R: number, open: number, wilt: number, drain: number, t: number, seed: number) {
    const pink = mixRGBA('pink', 'ash', drain);
    // stem
    c.save();
    c.strokeStyle = mixRGBA('signal', 'graphite', 0.4 + 0.6 * drain); c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y + R * 0.4);
    c.quadraticCurveTo(x + wilt * 120, y + R * 1.6, x + wilt * 40, y + R * 2.6); c.stroke();
    c.translate(x, y);
    c.rotate(wilt * 0.6 + Math.sin(t * 1.3 + seed) * 0.04);
    c.scale(open, open);
    c.shadowColor = 'rgba(0,0,0,0.22)'; c.shadowBlur = 10; c.shadowOffsetY = 5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const droop = wilt * 0.5 * (Math.sin(a) + 1);
      c.save();
      c.rotate(a);
      c.translate(R * 0.55, droop * R * 0.3);
      c.fillStyle = '#fff';
      c.beginPath(); c.ellipse(0, 0, R * 0.58, R * 0.36 * (1 - wilt * 0.3), 0, 0, Math.PI * 2); c.fill();
      c.shadowColor = 'transparent';
      c.fillStyle = pink;
      c.beginPath(); c.ellipse(0, 0, R * 0.5, R * 0.29 * (1 - wilt * 0.3), 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    c.fillStyle = mixRGBA('signal', 'graphite', drain);
    c.beginPath(); c.arc(0, 0, R * 0.22, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    const drain = smoothstep(this.akira.start - 0.05, this.akira.start + 0.6, t);
    const pinkT = smoothstep(this.kodomo.start - 0.3, this.kodomo.start, t) * (1 - drain);
    this.ground.render(renderer, out, { paper: 1, t, tint: [1, lerp(1, 0.86, pinkT), lerp(1, 0.92, pinkT)] });
    const L = this.layer; L.clear();
    const c = L.ctx;
    // 子供騙しの: a sticker label
    const kA = smoothstep(this.kodomo.start - 0.3, this.kodomo.start + 0.1, t);
    c.save();
    c.globalAlpha = kA;
    c.translate(420, 200); c.rotate(-0.06);
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(-250, -70, 500, 140, 70); c.fill();
    c.fillStyle = mixRGBA('pink', 'ash', drain); c.beginPath(); c.roundRect(-238, -58, 476, 116, 58); c.fill();
    c.font = font(F.sans(900), 64); c.textAlign = 'center'; c.textBaseline = 'middle';
    const kp = Lyrics.wordProgress(this.kodomo, t);
    c.fillStyle = kp > 0 && kp < 1 ? rgba('signal', 1) : '#fff';
    c.fillText(this.kodomo.w, 0, 4);
    c.restore();
    // the two flowers
    const wiltOf = () => this.kitto.reduce((a, w) => a + 0.35 * prog(t, w.start, w.start + 0.5, ease.outCubic), 0);
    const wilt = wiltOf();
    [[this.hana, 760, 520, 190], [this.futatsu, 1260, 470, 160]].forEach(([w, x, y, R], i) => {
      const word = w as Word;
      const open = ease.outBack(prog(t, word.start - 0.05, word.start + 0.3), 2.2);
      if (open <= 0) return;
      const pt = this.akira.start + 0.8 + i * 0.35;
      const fall = Math.max(0, t - pt);
      this.flower(c, (x as number) + fall * 60 * (i ? 1 : -1), (y as number) + 0.5 * 2600 * fall * fall, R as number, open, wilt, drain, t, i * 3);
      // label under each
      label(c, i === 0 ? '花  №1' : '花  №2', x as number, (y as number) + (R as number) * 2.9, { size: 16, family: F.dot(), color: rgba('ink', 0.55 * (1 - drain)), align: 'center', spacing: 2 });
    });
    // きっと / 諦めた readout
    label(c, `開花率 ${(100 * Math.max(0, 1 - wilt - drain)).toFixed(0)}%`, W - 110, 110, { size: 20, family: F.dot(), color: drain > 0.5 ? rgba('ink', 0.5) : rgba('signal', 1), align: 'right', spacing: 2 });
    // karaoke: the current line
    const line = t < this.kitto[0]!.start - 0.4 ? this.words.slice(0, 3) : this.words.slice(3);
    const st = { family: F.sans(900), size: 60, romajiSize: 16, unsung: rgba('ink', 0.2), sung: rgba('ink', 0.9), romajiColor: rgba('ink', 0.5) };
    const run = runH(line, st);
    drawRun(c, run, 960 - run.width / 2, 990, t, st);
    label(c, 'EXHIBIT 11 · 花', 110, 96, { size: 13, color: rgba('ink', 0.5) });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.08);
    void hash; void H;
    return { bloom: 0.25, vignette: 0.25, paper: 1, zoom: 1 + kick * (drain > 0.5 ? 0.004 : 0.01) };
  }
}
