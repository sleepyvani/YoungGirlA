// "Exhibit 10: 憎い / 夢 / 怖い" (line 11).
//   憎い ×5          — vermilion seals 憎 stamp across the frame, each bigger, on each word
//   足りないの        — the stamps are gone: a void, one hairline and the words, through the break
//   明日も夢を見てたい — the grains of the dream come back, sparse and slow, rising; mincho, soft
//   怖い ×5          — 怖い scatters and shakes, and the mosaic takes the frame, coarser on each word
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H, makeRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { F, font } from '../engine/type';
import { LIN, rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, frameIdx, hash, lerp, prog, smoothstep } from '../engine/util';
import { Ground, MosaicPass, beatsIn, drawRun, label, pulseAt, runH, sealCanvas, stamp } from './_kit';

export default class Kowai extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  lb = new LineBatch(1200, { screen2D: true, blend: 'add' });
  rt = makeRT();
  mosaic = new MosaicPass();
  L!: Line;
  nikui: Word[] = []; tari!: Word; dream: Word[] = []; kowai: Word[] = [];
  seal!: HTMLCanvasElement;
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[11]!;
    const ws = this.L.words;
    this.nikui = ws.filter((w) => w.w === '憎い');
    this.tari = ws.find((w) => w.w === '足りないの')!;
    this.dream = [ws.find((w) => w.w === '明日も')!, ws.find((w) => w.w === '夢を')!, ws.find((w) => w.w === '見てたい')!];
    this.kowai = ws.filter((w) => w.w === '怖い');
    this.seal = sealCanvas(['憎'], 200, 'round', 41);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    const k0 = this.kowai[0]!;
    const mosaicOn = t >= k0.start - 0.05;
    const target = mosaicOn ? this.rt : out;
    this.ground.render(renderer, target, { paper: 0, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    let impact = 0;
    const phase = t < this.tari.start - 0.15 ? 'nikui' : t < this.dream[0]!.start - 0.3 ? 'void' : t < k0.start - 0.05 ? 'dream' : 'kowai';

    if (phase === 'nikui') {
      this.nikui.forEach((w, i) => {
        const x = [520, 1380, 820, 1500, 960][i]!, y = [360, 300, 700, 740, 520][i]!;
        const s = 200 + i * 70;
        impact = Math.max(impact, stamp(c, this.seal, x, y, s, (hash(i, 3) - 0.5) * 0.7, t, w.start));
      });
      // the word itself, bottom-left, big
      const cur = this.nikui.filter((w) => w.start <= t).length;
      label(c, `憎  ×${cur}`, 150, 170, { size: 40, family: F.dot(), color: rgba('bone', 0.9), spacing: 6 });
    } else if (phase === 'void') {
      const a = smoothstep(this.tari.start - 0.15, this.tari.start + 0.2, t);
      c.fillStyle = rgba('bone', 0.5 * a);
      c.fillRect(960 - 500 * a, 540, 1000 * a, 1);
      c.globalAlpha = a;
      c.font = font(F.mincho(400), 64); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const p = Lyrics.wordProgress(this.tari, t);
      c.fillStyle = p < 1 ? rgba('signal', 1) : rgba('bone', 0.85);
      c.fillText(this.tari.w, 960, 500);
      c.globalAlpha = 1;
      label(c, '— 無音 —', 960, 600, { size: 14, family: F.dot(), color: rgba('ash', 0.5 * a), align: 'center', spacing: 4 });
    } else if (phase === 'dream') {
      // sparse grains rising
      const lb = this.lb; lb.clear();
      const d0 = this.dream[0]!.start;
      const ga = smoothstep(d0 - 0.3, d0 + 1, t);
      for (let i = 0; i < 900; i++) {
        const sp = 20 + hash(i, 1) * 50;
        const x = hash(i, 2) * W + Math.sin(t * 0.4 + i) * 12;
        const y = H + 40 - ((hash(i, 3) * (H + 80) + (t - d0) * sp) % (H + 80));
        const s = (0.3 + 0.5 * hash(i, 4)) * ga;
        lb.seg2(x, y, x, y + 0.01, 2 + hash(i, 5) * 1.5, [LIN.bone[0] * s, LIN.bone[1] * s, LIN.bone[2] * s], 0.9);
      }
      lb.render(renderer, target);
      const st = { family: F.mincho(700), size: 110, gap: 40, romajiSize: 20, ghost: 0.6 };
      const run = runH(this.dream, st);
      drawRun(c, run, 960 - run.width / 2, 560, t, st);
    } else {
      // 怖い: scattered, shaking per frame
      const fi = frameIdx(t);
      this.kowai.forEach((w, i) => {
        if (t < w.start - 0.05) return;
        const x = [960, 520, 1400, 700, 1250][i]!, y = [520, 330, 360, 760, 730][i]!;
        const j = 14 + i * 6;
        c.save();
        c.translate(x + (hash(i, fi) - 0.5) * j, y + (hash(i, fi + 3) - 0.5) * j);
        c.rotate((hash(i, 9) - 0.5) * 0.4);
        c.font = font(F.sans(900), 220 - i * 16); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = t >= w.start && t < w.end + 0.05 ? rgba('signal', 1) : rgba('bone', 0.92);
        c.fillText(w.w, 0, 0);
        c.restore();
      });
    }
    // karaoke line
    const st = { family: F.sans(900), size: 44, romajiSize: 14 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 1010, t, st);
    label(c, 'EXHIBIT 10 · 憎 / 夢 / 怖', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    this.ctx.comp.draw(renderer, L.upload(), target);
    if (mosaicOn) {
      const n = this.kowai.filter((w) => w.start <= t).length;
      const cell = lerp(6, 34, Math.pow(n / 5, 1.3)) * (1 + 0.3 * pulseAt(this.kowai.map((w) => w.start), t, 0.08));
      this.mosaic.render(renderer, this.rt.texture, out, { cell, jitter: 1, seed: frameIdx(t), amount: smoothstep(k0.start - 0.05, k0.start + 0.1, t) });
    }
    const kick = pulseAt(this.beats, t, 0.08);
    return { bloom: 0.6, vignette: 0.42, zoom: 1 + kick * 0.01, flash: impact * 0.008, shake: [Math.sin(t * 97) * impact * 12, Math.cos(t * 71) * impact * 8] as [number, number], ca: phase === 'kowai' ? 3 : 1.2 };
  }
}
void ease; void prog;
