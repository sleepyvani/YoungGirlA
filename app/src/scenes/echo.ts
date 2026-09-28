// "Exhibit 8: echo" (line 9). Hairline rings go out from the centre on every vocal onset (a reverb
// you can see); the text lives on the rings.
//   心も          — a huge 心 in mincho, with fading echo copies expanding behind it
//   なく          — the 心 is hollowed: only its outline remains (without heart)
//   響かせたから   — the rings multiply; the word is written around them
//   愛を          — 愛 detaches as a vermilion point and orbits the centre
//   追いかけてた   — the words chase it around the orbit, always a quarter turn behind
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { F, font } from '../engine/type';
import { LIN, rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, keys, lerp, prog, smoothstep, TAU } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH } from './_kit';

export default class Echo extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  lb = new LineBatch(20000, { screen2D: true, blend: 'add' });
  L!: Line;
  w: Word[] = [];
  onsets: number[] = [];
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[9]!;
    this.w = this.L.words;
    this.onsets = audio.events('vocal', this.ctx.start - 2, this.ctx.end + 1).map((e) => e[0]);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    const [kokoro, naku, hibi, ai, oi] = this.w as [Word, Word, Word, Word, Word];
    this.ground.render(renderer, out, { paper: 0, t });
    // rings: one per vocal onset in the last 2.4 s (more and faster after 響かせた)
    const lb = this.lb; lb.clear();
    const dense = smoothstep(hibi.start - 0.2, hibi.start + 0.3, t);
    const speed = lerp(380, 620, dense);
    const recent = this.onsets.filter((o) => o <= t && t - o < 2.6);
    for (const o of recent) {
      const age = t - o, r = 60 + age * speed;
      const a = Math.pow(1 - age / 2.6, 1.6);
      const hot = age < 0.25 ? 1 - age / 0.25 : 0;
      const col: [number, number, number] = [lerp(LIN.bone[0] * 0.5, LIN.signal[0] * 2, hot), lerp(LIN.bone[1] * 0.5, LIN.signal[1] * 2, hot), lerp(LIN.bone[2] * 0.5, LIN.signal[2] * 2, hot)];
      const n = 180;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
        lb.seg2(960 + Math.cos(a0) * r, 540 + Math.sin(a0) * r * 0.92, 960 + Math.cos(a1) * r, 540 + Math.sin(a1) * r * 0.92, 1.3, col, a);
      }
    }
    // the orbit (from 愛を)
    const orbitK = smoothstep(ai.start - 0.2, ai.start + 0.3, t);
    const R = 300;
    const orbA = (tt: number) => -Math.PI / 2 + Math.max(0, tt - ai.start) * 1.9 + Math.max(0, tt - oi.start) * 0.9;
    if (orbitK > 0) {
      const n = 240;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
        lb.seg2(960 + Math.cos(a0) * R, 540 + Math.sin(a0) * R, 960 + Math.cos(a1) * R, 540 + Math.sin(a1) * R, 1, [LIN.bone[0] * 0.3, LIN.bone[1] * 0.3, LIN.bone[2] * 0.3], orbitK);
      }
      // 愛's trail
      for (let k = 0; k < 40; k++) {
        const a = orbA(t - k * 0.012), b = orbA(t - (k + 1) * 0.012);
        const s = 1 - k / 40;
        lb.seg2(960 + Math.cos(a) * R, 540 + Math.sin(a) * R, 960 + Math.cos(b) * R, 540 + Math.sin(b) * R, 3 * s + 1, [LIN.signal[0] * 3 * s, LIN.signal[1] * 3 * s, LIN.signal[2] * 3 * s], orbitK);
      }
    }
    lb.render(renderer, out);

    const L = this.layer; L.clear();
    const c = L.ctx;
    const zoom = keys(t, [[this.ctx.start, 1.15], [this.ctx.start + 0.6, 1.0, ease.outExpo], [ai.start, 1.0], [ai.start + 0.5, 0.92, ease.outCubic]]);
    c.save();
    c.translate(960, 540); c.scale(zoom, zoom); c.translate(-960, -540);
    // 心: echo copies + hollowing
    const kA = smoothstep(kokoro.start - 0.3, kokoro.start, t) * (1 - smoothstep(ai.start - 0.4, ai.start, t));
    if (kA > 0) {
      c.font = font(F.mincho(700), 420);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const hollow = smoothstep(naku.start, naku.start + 0.35, t);
      // echo copies: scaled-up, fading, one per recent onset
      for (const o of recent.slice(-3)) {
        const age = t - o;
        const s = 1 + age * 0.35;
        c.save();
        c.globalAlpha = kA * 0.12 * Math.max(0, 1 - age / 2);
        c.translate(960, 520); c.scale(s, s);
        c.strokeStyle = rgba('bone', 1); c.lineWidth = 1.2 / s;
        c.strokeText('心', 0, 0);
        c.restore();
      }
      c.globalAlpha = kA;
      const hot = t >= kokoro.start && t < Math.min(kokoro.end, kokoro.start + 1.2);
      if (hollow < 1) { c.globalAlpha = kA * (1 - hollow); c.fillStyle = hot ? rgba('signal', 1) : rgba('bone', 0.95); c.fillText('心', 960, 520); }
      c.globalAlpha = kA * hollow;
      c.strokeStyle = rgba('signal', 1); c.lineWidth = 2.5;
      c.strokeText('心', 960, 520);
      c.globalAlpha = 1;
      // 心も / なく in small mono under it
      label(c, hollow > 0.5 ? '心 — なく' : '心', 960, 800, { size: 18, family: F.dot(), color: rgba('ash', 0.8 * kA), align: 'center', spacing: 4 });
    }
    // 響かせたから: written around a ring (radius follows the latest onset)
    const hA = smoothstep(hibi.start - 0.3, hibi.start, t) * (1 - smoothstep(ai.start - 0.4, ai.start, t));
    if (hA > 0) {
      const chars = Array.from(hibi.w);
      const reps = 4;
      const rot = (t - hibi.start) * 0.25;
      c.font = font(F.sans(900), 64);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let r = 0; r < reps; r++) {
        chars.forEach((ch, i) => {
          const a = rot + (r / reps) * TAU + (i - chars.length / 2) * 0.12;
          const p = Lyrics.charProgress(hibi, i, t);
          c.save();
          c.translate(960 + Math.cos(a) * 300, 540 + Math.sin(a) * 280);
          c.rotate(a + Math.PI / 2);
          c.globalAlpha = hA * (r === 0 ? 1 : 0.35);
          c.fillStyle = p <= 0 ? rgba('bone', 0.25) : p < 1 || (t < hibi.end + 0.2 && r === 0) ? rgba('signal', 1) : rgba('bone', 0.9);
          c.fillText(ch, 0, 0);
          c.restore();
        });
      }
      c.globalAlpha = 1;
    }
    // 愛 on the orbit, and 追いかけてた chasing it a quarter turn behind
    if (orbitK > 0) {
      const a = orbA(t);
      c.save();
      c.globalAlpha = orbitK;
      c.font = font(F.mincho(700), 96);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = rgba('ember', 1);
      c.fillText('愛', 960 + Math.cos(a) * (R + 90), 540 + Math.sin(a) * (R + 90));
      const oA = smoothstep(oi.start - 0.2, oi.start + 0.1, t);
      const chars = Array.from(oi.w);
      chars.forEach((ch, i) => {
        const ca = a - Math.PI / 2 - (chars.length - 1 - i) * 0.13;
        const p = Lyrics.charProgress(oi, i, t);
        c.save();
        c.globalAlpha = orbitK * oA;
        c.translate(960 + Math.cos(ca) * (R + 70), 540 + Math.sin(ca) * (R + 70));
        c.rotate(ca + Math.PI / 2);
        c.font = font(F.sans(900), 60);
        c.fillStyle = p <= 0 ? rgba('bone', 0.25) : p < 1 ? rgba('signal', 1) : rgba('bone', 0.92);
        c.fillText(ch, 0, 0);
        c.restore();
      });
      // the gap readout
      label(c, `Δθ = 90.0°  (追いつかない)`, 960, 548, { size: 15, color: rgba('ash', 0.75 * oA), align: 'center', family: F.mono(400) });
      c.restore();
    }
    c.restore();
    // karaoke line, bottom
    const st = { family: F.sans(900), size: 54, romajiSize: 16 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 1000, t, st);
    label(c, 'EXHIBIT 8 · 響', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    label(c, `${recent.length} ECHOES`, W - 110, 96, { size: 13, color: rgba('ash', 0.5), align: 'right' });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.09);
    return { bloom: 0.8, vignette: 0.45, zoom: 1 + kick * 0.01 };
  }
}
void H;
