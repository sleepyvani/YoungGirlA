// "Exhibit 2: love, up to the mouth" (line 2; reprise on line 8, params.n = 2).
// A mouth the width of the frame, drawn in vermilion hairlines; it opens with the vocal envelope.
//   口までの 愛   — 愛 rises out of the mouth, huge, and stops there (love only as far as the mouth)
//   飲み込む      — it is swallowed back: sucked down behind the lower lip, the mouth snaps shut
//   気に簡単に    — as easily as that
// The reprise (n = 2) is on bone paper, the lips built from black redaction bars, and on
//   言葉の向きに変として — the whole lyric turns its direction: the line rotates into a vertical column.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import type { Line, Word } from '../engine/lyrics';
import { clamp, ease, hash, keys, lerp, prog, pulse, smoothstep } from '../engine/util';
import { Ground, beatsIn, drawRun, fitRun, label, pulseAt, runH, runV } from './_kit';

const MX = 960, MY = 600, MW = 430; // mouth centre and half-width

export default class Mouth extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L!: Line;
  ai: Word[] = [];
  nomu!: Word;
  beats: number[] = [];
  paper = false;
  turn: Word | null = null;

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[this.ctx.params.line ?? 2]!;
    this.ai = this.L.words.filter((w) => w.w === '愛');
    this.nomu = this.L.words.find((w) => w.w === '飲み込む')!;
    this.turn = this.L.words.find((w) => w.w === '向きに') ?? null;
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
    this.paper = this.ctx.params.n === 2;
  }

  /** Mouth opening (px of half-gap) from the vocal envelope, shut hard after the swallow. */
  private open(t: number) {
    const v = this.ctx.audio.envPeak('vocal', t, 0.05);
    const gulp = this.nomu.start + 0.28;
    const shut = t > gulp ? 1 - smoothstep(gulp, gulp + 0.05, t) * (1 - smoothstep(gulp + 0.5, gulp + 0.9, t)) : 1;
    const base = 6 + 70 * Math.pow(clamp(v), 1.3);
    // wide open while 愛 comes out / goes in
    let wide = 0;
    for (const a of this.ai) wide = Math.max(wide, smoothstep(a.start - 0.25, a.start, t) * (1 - smoothstep(a.start + 0.55, a.start + 0.8, t)));
    wide = Math.max(wide, smoothstep(this.nomu.start - 0.1, this.nomu.start + 0.05, t) * (1 - smoothstep(gulp - 0.05, gulp, t)));
    return lerp(base, 120, wide) * shut + 3;
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: this.paper ? 1 : 0, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const op = this.open(t);
    const gulp = this.nomu.start + 0.28;
    const gk = pulse(t, gulp, 0.1);
    const zoom = keys(t, [[this.ctx.start, 1.12], [this.ctx.start + 0.45, 1.0, ease.outExpo], [this.nomu.start, 1.02], [gulp, 1.12, ease.inCubic], [gulp + 0.6, 1.0, ease.outCubic]]);
    // the reprise turns: the whole plate rotates a quarter turn on 向きに
    const turnK = this.turn ? prog(t, this.turn.start - 0.05, this.turn.start + 0.3, ease.inOutCubic) : 0;
    c.save();
    c.translate(W / 2 + Math.sin(t * 90) * gk * 10, H / 2);
    c.scale(zoom, zoom);
    c.rotate(-turnK * Math.PI / 2 * 0.0);
    c.translate(-W / 2, -H / 2);
    this.drawMouth(c, t, op);
    this.drawAi(c, t, op);
    c.restore();
    this.drawLyric(c, t, turnK);
    const beat = pulseAt(this.beats, t, 0.1);
    this.ctx.comp.draw(renderer, L.upload(), out);
    return { bloom: this.paper ? 0.35 : 0.6, vignette: this.paper ? 0.25 : 0.45, paper: this.paper ? 1 : 0, zoom: 1 + beat * 0.008, flash: gk * (this.paper ? 0.04 : 0.012) };
  }

  private lipY(x: number, op: number) {
    // x in -1..1: the four curves of the mouth (y offsets from MY)
    const e = Math.max(0, 1 - x * x);
    const bow = 1 - 0.34 * Math.exp(-((x / 0.11) ** 2));
    const peak = 1 + 0.22 * Math.exp(-(((Math.abs(x) - 0.22) / 0.14) ** 2));
    return {
      upOut: -op * 0.6 * Math.pow(e, 0.7) - 118 * Math.pow(e, 0.75) * bow * peak,
      upIn: -op * Math.pow(e, 0.8) + 10 * Math.pow(e, 2) * Math.exp(-((x / 0.2) ** 2)),
      loIn: op * Math.pow(e, 0.8) * 0.9,
      loOut: op * 0.5 * Math.pow(e, 0.7) + 150 * Math.pow(e, 0.9),
    };
  }

  private path(c: CanvasRenderingContext2D, op: number, key: 'upOut' | 'upIn' | 'loIn' | 'loOut', rev = false, move = true) {
    const n = 90;
    for (let i = 0; i <= n; i++) {
      const u = rev ? 1 - i / n : i / n;
      const x = -1 + 2 * u;
      const px = MX + x * MW, py = MY + this.lipY(x, op)[key];
      if (i === 0 && move) c.moveTo(px, py); else c.lineTo(px, py);
    }
  }

  private drawMouth(c: CanvasRenderingContext2D, t: number, op: number) {
    const a = smoothstep(this.ctx.start, this.ctx.start + 0.25, t);
    c.save();
    c.globalAlpha = a;
    // the opening: a void
    c.beginPath(); this.path(c, op, 'upIn'); this.path(c, op, 'loIn', true, false); c.closePath();
    c.fillStyle = this.paper ? rgba('ink', 1) : rgba('ink', 1);
    c.fill();
    if (!this.paper) {
      // lips: hairline outlines + engraved hatch across them, vermilion
      c.strokeStyle = rgba('signal', 1); c.lineWidth = 2;
      for (const k of ['upOut', 'upIn', 'loIn', 'loOut'] as const) { c.beginPath(); this.path(c, op, k); c.stroke(); }
      c.lineWidth = 1;
      c.strokeStyle = rgba('signal', 0.5);
      for (let i = -44; i <= 44; i++) {
        const x = i / 46;
        const y = this.lipY(x, op);
        const px = MX + x * MW;
        const tilt = x * 10;
        c.beginPath(); c.moveTo(px, MY + y.upOut + 3); c.lineTo(px + tilt, MY + y.upIn - 3); c.stroke();
        c.beginPath(); c.moveTo(px, MY + y.loIn + 3); c.lineTo(px - tilt, MY + y.loOut - 3); c.stroke();
      }
    } else {
      // the reprise: lips made of redaction bars (horizontal black bars following the lip shape)
      c.fillStyle = rgba('ink', 0.96);
      const top = MY + this.lipY(0.22, op).upOut - 6, bot = MY + this.lipY(0, op).loOut + 6;
      let row = 0;
      for (let y = top; y < bot; y += 13, row++) {
        let seg: number | null = null;
        for (let i = -120; i <= 121; i++) {
          const x = Math.min(1, i / 120), L = this.lipY(x, op), yy = y - MY;
          const inside = i <= 120 && ((yy >= L.upOut && yy <= L.upIn) || (yy >= L.loIn && yy <= L.loOut));
          if (inside && seg === null) seg = x;
          if (!inside && seg !== null) {
            const jitter = (hash(row, Math.floor(t * 4)) - 0.5) * 24;
            c.fillRect(MX + seg * MW + jitter, y, (x - seg) * MW, 9);
            seg = null;
          }
        }
      }
      c.strokeStyle = rgba('signal', 0.9); c.lineWidth = 1.5;
      c.beginPath(); this.path(c, op, 'upIn'); c.stroke();
      c.beginPath(); this.path(c, op, 'loIn'); c.stroke();
    }
    // corner ticks + labels
    label(c, 'EXHIBIT 2 · 口', MX - MW, MY + 190, { size: 13, color: this.paper ? rgba('ink', 0.5) : rgba('ash', 0.6) });
    label(c, `開口 ${(op * 0.1).toFixed(1)} mm`, MX + MW, MY + 190, { size: 13, color: this.paper ? rgba('ink', 0.5) : rgba('ash', 0.6), align: 'right', family: F.mono(400) });
    c.restore();
  }

  /** 愛: rises out of the mouth on each 愛, and is swallowed on 飲み込む (hidden behind the lower lip). */
  private drawAi(c: CanvasRenderingContext2D, t: number, op: number) {
    const a0 = this.ai[0], a1 = this.ai[1] ?? this.ai[0];
    if (!a0 || t < a0.start - 0.25) return;
    const cur = t < a1!.start - 0.25 ? a0 : a1!;
    const rise = prog(t, cur.start - 0.25, cur.start + 0.35, ease.outExpo);
    const swallow = prog(t, this.nomu.start - 0.05, this.nomu.start + 0.3, ease.inCubic);
    // position/scale: from inside the mouth to above it
    let y = lerp(MY + 140, MY - 250, rise);
    let s = lerp(0.5, 1, rise);
    if (cur === a1 && t < a1.start) { y = MY - 250; s = 1; }
    y = lerp(y, MY + 40, swallow);
    s = lerp(s, 0.18, swallow);
    const sung = t >= a0.start;
    c.save();
    // clip: everything above the lower inner lip (the lower lip occludes)
    c.beginPath();
    c.moveTo(0, -2000); c.lineTo(W, -2000); c.lineTo(W, MY);
    this.path(c, op, 'loIn', true, false);
    c.lineTo(0, MY); c.closePath();
    c.clip();
    c.translate(MX, y);
    c.scale(s, s);
    c.font = font(F.mincho(700), 360);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const hot = t >= cur.start && t < cur.end + 0.5;
    c.fillStyle = this.paper ? (hot ? rgba('signal', 1) : rgba('ink', 0.92)) : hot ? rgba('ember', 1) : rgba('bone', sung ? 0.95 : 0.4);
    c.fillText('愛', 0, 0);
    c.restore();
  }

  private drawLyric(c: CanvasRenderingContext2D, t: number, turnK: number) {
    const fam = F.sans(900);
    const size = Math.min(58, fitRun(this.L.words, fam, 1700, 58));
    const st = { family: fam, size, romajiSize: 16, unsung: this.paper ? rgba('ink', 0.22) : rgba('bone', 0.26), sung: this.paper ? rgba('ink', 0.92) : rgba('bone', 0.95), romajiColor: this.paper ? rgba('ink', 0.55) : rgba('ash', 0.75) };
    if (turnK <= 0) {
      const run = runH(this.L.words, st);
      drawRun(c, run, W / 2 - run.width / 2, 940, t, st);
      return;
    }
    // 言葉の向きに: the horizontal line swings a quarter turn and goes; the last words stand as a column
    const hk = ease.inOutCubic(turnK);
    const run = runH(this.L.words, st);
    c.save();
    c.globalAlpha = 1 - hk;
    c.translate(W / 2, 940); c.rotate(hk * Math.PI / 2); c.translate(-W / 2, -940);
    drawRun(c, run, W / 2 - run.width / 2, 940, t, st);
    c.restore();
    const tail = this.L.words.slice(this.L.words.findIndex((w) => w.w === '言葉の'));
    const vst = { ...st, size: 88, gap: 22, romajiSize: 18 };
    const vrun = runV(tail, vst);
    c.save();
    c.globalAlpha = hk;
    drawRun(c, vrun, 1640, lerp(1100, 540 - vrun.width / 2, hk), t, vst, true);
    c.restore();
    // 変: mirror the plate's lyric for a beat
    void hash;
  }
}
