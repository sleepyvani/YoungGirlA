// "Exhibit 10: chasing a far dream" (line 26: ああ 遠い 夢を 追いかけてさ). The rings of the echo
// plate again; 夢 detaches as a vermilion point and orbits the centre, and 追いかけてさ chases it
// around the orbit, always a quarter turn behind.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { F, font } from '../engine/type';
import { LIN, rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, keys, smoothstep, TAU } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH } from './_kit';
import { drawRings } from './echo';

const R = 300;

export default class Chase extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  lb = new LineBatch(20000, { screen2D: true, blend: 'add' });
  L!: Line;
  aa!: Word; tooi!: Word; yume!: Word; oi!: Word;
  onsets: number[] = [];
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[26]!;
    [this.aa, this.tooi, this.yume, this.oi] = this.L.words as [Word, Word, Word, Word];
    this.onsets = audio.events('vocal', this.ctx.start - 2, this.ctx.end + 1).map((e) => e[0]);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  private orbA(t: number) { return -Math.PI / 2 + Math.max(0, t - this.yume.start) * 1.9 + Math.max(0, t - this.oi.start) * 0.9; }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 0, t });
    const lb = this.lb; lb.clear();
    const n = drawRings(lb, this.onsets, t, 520);
    const orbitK = smoothstep(this.yume.start - 0.2, this.yume.start + 0.3, t);
    if (orbitK > 0) {
      for (let i = 0; i < 240; i++) {
        const a0 = (i / 240) * TAU, a1 = ((i + 1) / 240) * TAU;
        lb.seg2(960 + Math.cos(a0) * R, 540 + Math.sin(a0) * R, 960 + Math.cos(a1) * R, 540 + Math.sin(a1) * R, 1, [LIN.bone[0] * 0.3, LIN.bone[1] * 0.3, LIN.bone[2] * 0.3], orbitK);
      }
      for (let k = 0; k < 40; k++) {
        const a = this.orbA(t - k * 0.012), b = this.orbA(t - (k + 1) * 0.012);
        const s = 1 - k / 40;
        lb.seg2(960 + Math.cos(a) * R, 540 + Math.sin(a) * R, 960 + Math.cos(b) * R, 540 + Math.sin(b) * R, 3 * s + 1, [LIN.signal[0] * 3 * s, LIN.signal[1] * 3 * s, LIN.signal[2] * 3 * s], orbitK);
      }
    }
    lb.render(renderer, out);
    const L = this.layer; L.clear();
    const c = L.ctx;
    const zoom = keys(t, [[this.ctx.start, 1.15], [this.ctx.start + 0.6, 1.0, ease.outExpo], [this.yume.start, 1.0], [this.yume.start + 0.5, 0.92, ease.outCubic]]);
    c.save();
    c.translate(960, 540); c.scale(zoom, zoom); c.translate(-960, -540);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    // ああ 遠い in the centre before the orbit starts
    const pre = smoothstep(this.aa.start - 0.3, this.aa.start, t) * (1 - smoothstep(this.yume.start - 0.2, this.yume.start + 0.1, t));
    if (pre > 0) {
      c.globalAlpha = pre;
      c.font = font(F.mincho(700), 200);
      const cur = t < this.tooi.start - 0.05 ? this.aa : this.tooi;
      c.fillStyle = t < cur.end ? rgba('signal', 1) : rgba('bone', 0.9);
      c.fillText(cur.w, 960, 530);
    }
    if (orbitK > 0) {
      const a = this.orbA(t);
      c.globalAlpha = orbitK;
      c.font = font(F.mincho(700), 110);
      c.fillStyle = rgba('ember', 1);
      c.fillText('夢', 960 + Math.cos(a) * (R + 100), 540 + Math.sin(a) * (R + 100));
      const oA = smoothstep(this.oi.start - 0.2, this.oi.start + 0.1, t);
      const chars = Array.from(this.oi.w);
      chars.forEach((ch, i) => {
        const ca = a - Math.PI / 2 - (chars.length - 1 - i) * 0.15;
        const p = Lyrics.charProgress(this.oi, i, t);
        c.save();
        c.globalAlpha = orbitK * oA;
        c.translate(960 + Math.cos(ca) * (R + 80), 540 + Math.sin(ca) * (R + 80));
        c.rotate(ca + Math.PI / 2);
        c.font = font(F.sans(900), 64);
        c.fillStyle = p <= 0 ? rgba('bone', 0.25) : p < 1 ? rgba('signal', 1) : rgba('bone', 0.92);
        c.fillText(ch, 0, 0);
        c.restore();
      });
      label(c, 'Δθ = 90.0°  (追いつかない)', 960, 548, { size: 15, color: rgba('ash', 0.75 * oA), align: 'center', family: F.mono(400) });
    }
    c.restore();
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const st = { family: F.sans(900), size: 54, romajiSize: 16 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 1000, t, st);
    label(c, 'EXHIBIT 10 · 遠い夢', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    label(c, `${n} ECHOES`, W - 110, 96, { size: 13, color: rgba('ash', 0.5), align: 'right' });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.09);
    return { bloom: 0.8, vignette: 0.45, zoom: 1 + kick * 0.01 };
  }
}
