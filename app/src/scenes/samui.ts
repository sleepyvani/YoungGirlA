// "Exhibit 12: cold" (line 13, first half). Bone paper; eleven 寒い fill a grid one per word, every
// one shivering (per-frame jitter that grows), each lighter in weight than the one before: the type
// loses its body as it gets colder. Frost creeps in from the corners in hairlines; a thermometer reads down.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import type { Line, Word } from '../engine/lyrics';
import { frameIdx, hash, lerp, prog, smoothstep } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH } from './_kit';

export default class Samui extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L!: Line;
  sw: Word[] = [];
  beats: number[] = [];
  frost: { x: number; y: number; a: number; len: number; t0: number }[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[13]!;
    this.sw = this.L.words.filter((w) => w.w === '寒い');
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
    // frost: branching hairlines from the four corners, each appearing at a time through the plate
    const T0 = this.sw[0]!.start, T1 = this.sw[this.sw.length - 1]!.end;
    for (let i = 0; i < 260; i++) {
      const corner = i % 4;
      const cx = corner % 2 ? W : 0, cy = corner < 2 ? 0 : H;
      const d = Math.pow(hash(i, 1), 0.7) * 520;
      const base = Math.atan2(H / 2 - cy, W / 2 - cx) + (hash(i, 2) - 0.5) * 1.6;
      this.frost.push({ x: cx + Math.cos(base) * d, y: cy + Math.sin(base) * d, a: base + (hash(i, 3) - 0.5) * 1.8, len: 20 + hash(i, 4) * 70, t0: lerp(T0, T1, d / 520) });
    }
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 1, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const fi = frameIdx(t);
    // frost
    c.strokeStyle = rgba('graphite', 0.45); c.lineWidth = 1;
    for (const fr of this.frost) {
      const k = prog(t, fr.t0, fr.t0 + 0.4);
      if (k <= 0) continue;
      c.beginPath();
      c.moveTo(fr.x, fr.y);
      const ex = fr.x + Math.cos(fr.a) * fr.len * k, ey = fr.y + Math.sin(fr.a) * fr.len * k;
      c.lineTo(ex, ey);
      c.moveTo(fr.x + (ex - fr.x) * 0.5, fr.y + (ey - fr.y) * 0.5);
      c.lineTo(fr.x + (ex - fr.x) * 0.5 + Math.cos(fr.a + 0.7) * fr.len * 0.35 * k, fr.y + (ey - fr.y) * 0.5 + Math.sin(fr.a + 0.7) * fr.len * 0.35 * k);
      c.stroke();
    }
    // the grid of 寒い: 4 × 3, the eleventh in the centre of the last row... the last one is big
    const n = this.sw.length;
    const weights = [900, 900, 900, 700, 700, 700, 500, 500, 500, 300, 300];
    this.sw.forEach((w, i) => {
      if (t < w.start - 0.04) return;
      const last = i === n - 1;
      const col = i % 4, row = Math.floor(i / 4);
      const x = last ? 960 : 330 + col * 420, y = last ? 560 : 300 + row * 270;
      const colder = this.sw.filter((x) => x.start <= t).length / n;
      const j = (3 + 16 * colder) * (last ? 1.4 : 1);
      const jx = (hash(i, fi) - 0.5) * j, jy = (hash(i, fi + 11) - 0.5) * j * 0.6;
      const a = smoothstep(w.start - 0.04, w.start + 0.02, t) * (last ? 1 : 1 - 0.55 * smoothstep(this.sw[n - 1]!.start - 0.1, this.sw[n - 1]!.start + 0.2, t));
      c.save();
      c.globalAlpha = a;
      c.font = font(F.sans(weights[i] ?? 300), last ? 330 : 170);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const hot = t >= w.start && t < w.end;
      c.fillStyle = hot ? rgba('signal', 1) : rgba('ink', 0.88);
      c.fillText(w.w, x + jx, y + jy);
      c.restore();
    });
    // thermometer
    const k = this.sw.filter((x) => x.start <= t).length;
    const temp = -k * 1.0 - 0.1 * Math.sin(t * 7);
    label(c, '気温', W - 150, 72, { size: 16, family: F.dot(), color: rgba('ink', 0.55), align: 'right', spacing: 2 });
    c.save();
    c.font = font(F.mono(400), 48); c.fillStyle = rgba('ink', 0.88); c.textAlign = 'right';
    c.fillText(`${temp < 0 ? '−' : ''}${Math.abs(temp).toFixed(1)}°C`, W - 150, 128);
    c.restore();
    label(c, 'EXHIBIT 12 · 寒い', 110, 96, { size: 13, color: rgba('ink', 0.5) });
    const st = { family: F.sans(900), size: 40, romajiSize: 13, unsung: rgba('ink', 0.2), sung: rgba('ink', 0.9), romajiColor: rgba('ink', 0.5) };
    const run = runH(this.sw, st);
    drawRun(c, run, 960 - run.width / 2, 1010, t, st);
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.08);
    return { bloom: 0.2, vignette: 0.3, paper: 1, zoom: 1 + kick * 0.008, grain: 0.07 };
  }
}
