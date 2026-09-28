// "Exhibit 11: 可愛い" (line 12). The one cute moment, staged as an attack and then taken back.
//   可愛い ×8 — pink stickers slap onto a pink-tinted page, one per word, with an overshoot (the only
//              pink in the video)
//   嘘        — everything freezes; the pink drains out; 嘘 in ink, huge
//   来ないで  — the stickers peel off and fall, one by one
//   手に返すんだ — a return slip (返却票) is filled in, and stamped 返却 on 返すんだ
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba, mixRGBA } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, hash, lerp, prog, pulse, smoothstep } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH, sealCanvas, stamp } from './_kit';

export default class Kawaii extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L!: Line;
  kw: Word[] = []; uso!: Word; konai!: Word; te!: Word; kaesu!: Word;
  seal!: HTMLCanvasElement;
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[12]!;
    const ws = this.L.words;
    this.kw = ws.filter((w) => w.w === '可愛い');
    this.uso = ws.find((w) => w.w === '嘘')!;
    this.konai = ws.find((w) => w.w === '来ないで')!;
    this.te = ws.find((w) => w.w === '手に')!;
    this.kaesu = ws.find((w) => w.w === '返すんだ')!;
    this.seal = sealCanvas(['返却'], 190, 'square', 51);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    const drain = smoothstep(this.uso.start - 0.02, this.uso.start + 0.35, t);
    const pinkT = smoothstep(this.kw[0]!.start - 0.1, this.kw[0]!.start + 0.05, t) * (1 - drain);
    this.ground.render(renderer, out, { paper: 1, t, tint: [1, lerp(1, 0.83, pinkT), lerp(1, 0.9, pinkT)] });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const slip = t >= this.te.start - 0.4;
    let impact = 0;
    if (!slip) {
      // stickers
      this.kw.forEach((w, i) => {
        if (t < w.start - 0.03) return;
        const pop = ease.outBack(prog(t, w.start - 0.03, w.start + 0.14), 2.6);
        const x = 280 + ((i * 431 + 190) % 1360) + (hash(i, 2) - 0.5) * 80;
        const y = 220 + ((i * 257) % 560) + (hash(i, 3) - 0.5) * 60;
        let rot = (hash(i, 4) - 0.5) * 0.6;
        // peel: from 来ないで, one sticker every ~0.28 s falls
        const pt = this.konai.start + i * 0.26;
        const fall = Math.max(0, t - pt);
        const yy = y + 0.5 * 2600 * fall * fall;
        rot += fall * (hash(i, 5) - 0.5) * 5;
        const sc = pop * (1 + 0.04 * pulse(t, w.start, 0.1));
        const pink = mixRGBA('pink', 'ash', drain);
        c.save();
        c.translate(x, yy); c.rotate(rot); c.scale(sc, sc);
        c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = 10; c.shadowOffsetY = 5;
        c.fillStyle = '#fff';
        c.beginPath(); c.roundRect(-190, -95, 380, 190, 95); c.fill();
        c.shadowColor = 'transparent';
        c.fillStyle = pink;
        c.beginPath(); c.roundRect(-178, -83, 356, 166, 83); c.fill();
        c.font = font(F.sans(900), 92); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = t >= w.start && t < w.end + 0.05 && drain < 0.5 ? rgba('signal', 1) : '#fff';
        c.fillText(w.w, 0, 4);
        // sparkles
        c.fillStyle = drain < 0.5 ? '#fff' : rgba('bone', 0.6);
        for (const [sx, sy, r] of [[150, -80, 20], [-165, 60, 14]] as const) {
          c.beginPath();
          for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, rr = k % 2 ? r * 0.25 : r; c.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
          c.fill();
        }
        c.restore();
      });
      // 嘘
      const ua = smoothstep(this.uso.start - 0.02, this.uso.start + 0.05, t) * (1 - smoothstep(this.te.start - 0.9, this.te.start - 0.4, t));
      if (ua > 0) {
        c.save();
        c.globalAlpha = ua;
        c.font = font(F.mincho(700), 520); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = rgba('ink', 0.94);
        c.fillText('嘘', 960, 500);
        label(c, 'uso — FALSE', 960, 830, { size: 18, color: rgba('ink', 0.6), align: 'center', family: F.mono(400), spacing: 6 });
        c.restore();
      }
      const n = this.kw.filter((w) => w.start <= t).length;
      label(c, `可愛い  ${n} / 8`, W - 110, 110, { size: 22, family: F.dot(), color: drain > 0.5 ? rgba('ink', 0.5) : rgba('signal', 1), align: 'right', spacing: 2 });
    } else {
      // the return slip
      const a = smoothstep(this.te.start - 0.4, this.te.start - 0.1, t);
      const x0 = 560, y0 = 250, w = 800, h = 520;
      c.save();
      c.globalAlpha = a;
      c.translate(0, (1 - a) * 60);
      c.shadowColor = 'rgba(0,0,0,0.2)'; c.shadowBlur = 16; c.shadowOffsetY = 6;
      c.fillStyle = 'rgba(250,247,242,1)'; c.fillRect(x0, y0, w, h);
      c.shadowColor = 'transparent';
      c.strokeStyle = rgba('ink', 0.7); c.lineWidth = 1.5; c.strokeRect(x0 + 20, y0 + 20, w - 40, h - 40);
      c.font = font(F.dot(), 44); c.fillStyle = rgba('ink', 0.9); c.fillText('返却票', x0 + 60, y0 + 100);
      label(c, 'RETURN SLIP  No. 041', x0 + w - 60, y0 + 92, { size: 14, color: rgba('ink', 0.5), align: 'right' });
      c.fillStyle = rgba('ink', 0.3);
      for (const yy of [y0 + 210, y0 + 330]) c.fillRect(x0 + 60, yy, w - 120, 1);
      label(c, '返却先', x0 + 60, y0 + 170, { size: 18, family: F.dot(), color: rgba('ink', 0.6), spacing: 2 });
      label(c, '品目', x0 + 60, y0 + 290, { size: 18, family: F.dot(), color: rgba('ink', 0.6), spacing: 2 });
      // written words
      const st = { family: F.sans(900), size: 64, romajiSize: 16, unsung: rgba('ink', 0.18), sung: rgba('ink', 0.9), romajiColor: rgba('ink', 0.5), ghost: 0.3 };
      drawRun(c, runH([this.te], st), x0 + 200, y0 + 200, t, st);
      drawRun(c, runH([this.kaesu], st), x0 + 200, y0 + 320, t, st);
      c.font = font(F.mono(400), 22); c.fillStyle = rgba('ink', 0.5);
      c.fillText('可愛い ×8 (使用済み)', x0 + 60, y0 + 430);
      impact = stamp(c, this.seal, x0 + w - 170, y0 + h - 150, 170, 0.15, t, this.kaesu.start + 0.3);
      c.restore();
    }
    // karaoke line
    const st = { family: F.sans(900), size: 40, romajiSize: 13, unsung: rgba('ink', 0.2), sung: rgba('ink', 0.9), romajiColor: rgba('ink', 0.5) };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 1010, t, st);
    label(c, 'EXHIBIT 11 · 可愛い', 110, 96, { size: 13, color: rgba('ink', 0.5) });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.08);
    return { bloom: 0.25, vignette: 0.25, paper: 1, zoom: 1 + kick * (drain > 0.5 ? 0.004 : 0.014), flash: impact * 0.05, shake: [Math.sin(t * 91) * impact * 8, 0] as [number, number] };
  }
}
void H;
