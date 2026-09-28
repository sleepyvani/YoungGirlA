// "Exhibit 13: afraid" (lines 34–37).
//   ああ 夢を 夢を 見てたはずが — the grains of the dream come back, sparse and slow, rising; mincho, soft
//   怖い ×14          — 怖い scatters and shakes, and the mosaic takes the frame, coarser on each word
//   近づかないで       — set crisp on a black bar over the mosaic: keep away
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H, makeRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { F, font } from '../engine/type';
import { LIN, rgba } from '../engine/palette';
import { Lyrics, type Word } from '../engine/lyrics';
import { ease, frameIdx, hash, lerp, prog, smoothstep } from '../engine/util';
import { Ground, MosaicPass, beatsIn, drawRun, label, pulseAt, runH } from './_kit';

export default class Kowai extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  top = new Layer2D();
  lb = new LineBatch(1200, { screen2D: true, blend: 'add' });
  rt = makeRT();
  mosaic = new MosaicPass();
  dream: Word[] = []; kowai: Word[] = []; chika!: Word;
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.dream = lyrics.lines[34]!.words;
    const ws = [35, 36, 37].flatMap((i) => lyrics.lines[i]!.words);
    this.kowai = ws.filter((w) => w.w === '怖い');
    this.chika = ws.find((w) => w.w === '近づかないで')!;
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
    const d0 = this.dream[0]!.start;
    // grains rising (the dream), fading as fear comes in
    const lb = this.lb; lb.clear();
    const ga = smoothstep(d0 - 0.3, d0 + 1, t) * (1 - 0.6 * smoothstep(k0.start, k0.start + 1, t));
    for (let i = 0; i < 900; i++) {
      const sp = 20 + hash(i, 1) * 50;
      const x = hash(i, 2) * W + Math.sin(t * 0.4 + i) * 12;
      const y = H + 40 - ((hash(i, 3) * (H + 80) + (t - d0) * sp) % (H + 80));
      const s = (0.3 + 0.5 * hash(i, 4)) * ga;
      lb.seg2(x, y, x, y + 0.01, 2 + hash(i, 5) * 1.5, [LIN.bone[0] * s, LIN.bone[1] * s, LIN.bone[2] * s], 0.9);
    }
    lb.render(renderer, target);
    if (!mosaicOn) {
      const st = { family: F.mincho(700), size: 110, gap: 40, romajiSize: 20, ghost: 0.6 };
      const run = runH(this.dream, st);
      drawRun(c, run, 960 - run.width / 2, 560, t, st);
    } else {
      const fi = frameIdx(t);
      this.kowai.forEach((w, i) => {
        if (t < w.start - 0.05) return;
        const x = 240 + hash(i, 91) * 1440, y = 200 + hash(i, 92) * 640;
        const j = 12 + i * 3;
        c.save();
        c.translate(x + (hash(i, fi) - 0.5) * j, y + (hash(i, fi + 3) - 0.5) * j);
        c.rotate((hash(i, 9) - 0.5) * 0.5);
        c.font = font(F.sans(900), 90 + i * 12); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = t >= w.start && t < w.end + 0.05 ? rgba('signal', 1) : rgba('bone', 0.92);
        c.fillText(w.w, 0, 0);
        c.restore();
      });
    }
    label(c, 'EXHIBIT 13 · 夢 / 怖い', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    this.ctx.comp.draw(renderer, L.upload(), target);
    if (mosaicOn) {
      const n = this.kowai.filter((w) => w.start <= t).length;
      const cell = lerp(6, 42, Math.pow(n / this.kowai.length, 1.2)) * (1 + 0.3 * pulseAt(this.kowai.map((w) => w.start), t, 0.08));
      this.mosaic.render(renderer, this.rt.texture, out, { cell, jitter: 1, seed: frameIdx(t), amount: smoothstep(k0.start - 0.05, k0.start + 0.1, t) });
      // 近づかないで, crisp over the mosaic on a black bar; and the karaoke
      const T = this.top; T.clear();
      const tc = T.ctx;
      const bk = prog(t, this.chika.start - 0.12, this.chika.start, ease.inCubic);
      if (bk > 0) {
        tc.fillStyle = rgba('ink', 1);
        tc.fillRect(0, 450, W * bk, 180);
        const st = { family: F.sans(900), size: 120, romajiSize: 20, ghost: 0 };
        const run = runH([this.chika], st);
        drawRun(tc, run, 960 - run.width / 2, 585, t, st);
      }
      const line = this.ctx.lyrics.lines.slice(35, 38).filter((l) => l.words[0]!.start - 0.4 <= t).pop() ?? this.ctx.lyrics.lines[35]!;
      const st2 = { family: F.sans(900), size: 44, romajiSize: 14 };
      const run2 = runH(line.words, st2);
      tc.fillStyle = rgba('ink', 0.85); tc.fillRect(0, 950, W, 130);
      drawRun(tc, run2, 960 - run2.width / 2, 1010, t, st2);
      this.ctx.comp.draw(renderer, T.upload(), out);
    }
    const kick = pulseAt(this.beats, t, 0.08);
    void Lyrics;
    return { bloom: 0.6, vignette: 0.42, zoom: 1 + kick * 0.01, ca: mosaicOn ? 3 : 1.2 };
  }
}
