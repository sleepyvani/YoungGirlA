// "Exhibit 1: the balance" (lines 0–3). An engraved balance weighs lives.
//   僕の命つったって — each sung word drops as a weight onto the left pan (mine)
//   誰の命つったって — …and the same onto the right pan (anyone's): the beam comes back level
//   時々 どき 公平に — with nothing added, it tips anyway (so much for 公平)
//   裁かれる         — a seal 裁 slams on the beam: it swings hard the other way
//   暗い空に…        — the sky above is hatched in, line by line (engraving)
//   鬱を連れて…      — deadpan measurements attach to the instrument
//   時々 雨 …        — rain: hairlines fall through the frame
//   頼りぎりだ どうしよう — the camera pushes into the fulcrum; the beam swings to its limits
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import type { Line, Word } from '../engine/lyrics';
import { clamp, ease, frameIdx, hash, keys, lerp, prog, pulse, smoothstep, springStep } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH, sealCanvas, stamp, wrapWords, fitRun } from './_kit';

const PIV = { x: 960, y: 520 };
const ARM = 500;
const CHAIN = 250;

interface Weight { w: Word; side: -1 | 1; slot: number }

export default class Scales extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L0!: Line; L1!: Line; L2!: Line; L3!: Line;
  weights: Weight[] = [];
  tilts: [number, number][] = []; // [time, delta angle]
  beats: number[] = [];
  seal!: HTMLCanvasElement;
  tSabaku = 0;

  override init() {
    const { lyrics, audio } = this.ctx;
    [this.L0, this.L1, this.L2, this.L3] = [0, 1, 2, 3].map((i) => lyrics.lines[i]!) as [Line, Line, Line, Line];
    const w0 = this.L0.words;
    // 僕の命の価値だって → left, 誰の命の価値だって → right
    w0.slice(0, 3).forEach((w, i) => this.weights.push({ w, side: -1, slot: i }));
    w0.slice(3, 6).forEach((w, i) => this.weights.push({ w, side: 1, slot: i }));
    for (const x of this.weights) this.tilts.push([x.w.start + 0.02, x.side * 0.075]);
    const at = (l: Line, i: number) => l.words[i]!.start;
    this.tSabaku = at(this.L1, 3);
    this.tilts.push([at(this.L1, 0), 0.03], [at(this.L1, 1), -0.05], [at(this.L1, 2), -0.2], [this.tSabaku, 0.46], [at(this.L1, 4), -0.14]);
    this.tilts.push([at(this.L2, 0), -0.05], [at(this.L2, 3), 0.06], [at(this.L3, 0), -0.05], [at(this.L3, 2), -0.2], [at(this.L3, 3), 0.4], [at(this.L3, 4), -0.3]);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
    this.seal = sealCanvas(['裁'], 180, 'round', 23);
  }

  private angle(t: number) {
    let a = 0;
    for (const [t0, d] of this.tilts) if (t >= t0) a += d * springStep(t - t0, 1.6, 0.28);
    // the beat nudges it a little (the instrument is alive)
    a += 0.008 * Math.sin(t * Math.PI * 2 * (this.ctx.audio.bpm / 60) / 2);
    return clamp(a, -0.42, 0.42);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    const l1s = this.L2.words[0]!.start;
    const tPush = this.L3.words[3]!.start;
    this.ground.render(renderer, out, { paper: 0, t });

    const L = this.layer; L.clear();
    const c = L.ctx;
    const zoom = keys(t, [[this.ctx.start, 1.08], [this.ctx.start + 0.5, 1.0, ease.outExpo], [tPush - 0.05, 1.02], [tPush + 0.4, 1.28, ease.outExpo], [this.ctx.end, 1.4]]);
    const fy = keys(t, [[tPush, 540], [tPush + 0.4, 560, ease.outExpo]]);
    const hit = stampHit(t, this.tSabaku);
    c.save();
    c.translate(W / 2 + Math.sin(t * 97) * hit * 9, H / 2 + Math.cos(t * 83) * hit * 7);
    c.scale(zoom, zoom); c.translate(-960, -fy);

    // ---- the sky of 古くさい空 (hatch lines fill from the top on the beats of line 1)
    const skyK = prog(t, l1s - 0.1, this.L2.words[2]!.start, ease.outCubic);
    if (skyK > 0) {
      c.fillStyle = rgba('graphite', 0.55);
      const nLines = Math.floor(46 * skyK);
      for (let i = 0; i < nLines; i++) {
        const y = 30 + i * 9.5;
        const wob = Math.sin(i * 1.7 + t * 0.6) * 20;
        const len = 1500 - i * 18 + wob;
        c.fillRect(960 - len / 2, y, len, i % 5 === 0 ? 1.4 : 0.9);
      }
    }

    // 雨: rain hairlines from 雨 onward
    const tAme = this.L3.words[1]!.start;
    if (t >= tAme - 0.1) {
      const rk = smoothstep(tAme - 0.1, tAme + 0.3, t);
      c.fillStyle = rgba('ash', 0.35 * rk);
      for (let i = 0; i < 90; i++) {
        const x = hash(i, 51) * 2200 - 140;
        const y = ((hash(i, 52) * 1300 + (t - tAme) * (900 + hash(i, 53) * 500)) % 1300) - 120;
        c.fillRect(x - (y + 120) * 0.08, y, 1, 30 + hash(i, 54) * 40);
      }
    }

    const a = this.angle(t);
    const ca = Math.cos(a), sa = Math.sin(a);
    const endL = { x: PIV.x - ARM * ca, y: PIV.y - ARM * sa };
    const endR = { x: PIV.x + ARM * ca, y: PIV.y + ARM * sa };
    this.drawInstrument(c, t, a, endL, endR);

    // ---- weights on the pans
    for (const wt of this.weights) {
      const end = wt.side < 0 ? endL : endR;
      const panTop = end.y + CHAIN - 8;
      const tl = wt.w.start;
      if (t < tl - 0.42) continue;
      const k = prog(t, tl - 0.42, tl, ease.inQuad);
      const y1 = panTop - 30 - wt.slot * 58;
      const y = t < tl ? lerp(-140, y1, k) : y1 - 10 * Math.exp(-(t - tl) * 14) * Math.abs(Math.sin((t - tl) * 30));
      const x = end.x + (hash(wt.w.gi, 3) - 0.5) * 30;
      const land = t >= tl ? Math.pow(0.5, (t - tl) / 0.18) : 0;
      c.save();
      c.font = font(F.sans(900), 34);
      const tw = c.measureText(wt.w.w).width;
      const bw = tw + 40;
      c.fillStyle = rgba('ink2', 1);
      c.fillRect(x - bw / 2, y - 26, bw, 52);
      c.strokeStyle = land > 0.02 ? rgba('signal', 0.4 + 0.6 * land) : rgba('bone', 0.55);
      c.lineWidth = 1.5;
      c.strokeRect(x - bw / 2 + 0.5, y - 26 + 0.5, bw - 1, 51);
      c.fillStyle = t >= tl && t < wt.w.end ? rgba('signal', 1) : rgba('bone', 0.92);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(wt.w.w, x, y + 1);
      c.restore();
    }

    // ---- the seal 裁 on the beam
    const sk = stamp(c, this.seal, PIV.x, PIV.y - 6, 150, -0.2 + a, t, this.tSabaku);
    void sk;
    c.restore();

    // ---- the lyric (screen space, top)
    this.drawLyric(c, t);
    this.ctx.comp.draw(renderer, L.upload(), out);
    const beat = pulseAt(this.beats, t, 0.1);
    return { bloom: 0.55, vignette: 0.45, flash: hit * 0.06, zoom: 1 + beat * 0.006, ca: 1.2 };
  }

  private drawInstrument(c: CanvasRenderingContext2D, t: number, a: number, endL: { x: number; y: number }, endR: { x: number; y: number }) {
    const bone = (al: number) => rgba('bone', al);
    const draw = smoothstep(this.ctx.start, this.ctx.start + 0.35, t);
    c.save();
    c.globalAlpha = draw;
    // pillar + base (engraved: parallel hairlines)
    c.fillStyle = bone(0.8);
    for (let i = -3; i <= 3; i++) c.fillRect(PIV.x + i * 6 - 0.6, PIV.y + 10, 1.2, 420);
    c.fillRect(PIV.x - 190, PIV.y + 430, 380, 2);
    for (let i = 0; i < 12; i++) c.fillRect(PIV.x - 190 + i * 3, PIV.y + 434 + i * 4, 380 - i * 6, 1);
    // fulcrum
    c.strokeStyle = bone(0.9); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(PIV.x - 26, PIV.y + 30); c.lineTo(PIV.x, PIV.y - 4); c.lineTo(PIV.x + 26, PIV.y + 30); c.closePath(); c.stroke();
    // needle + dial
    c.beginPath(); c.arc(PIV.x, PIV.y, 120, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); c.strokeStyle = bone(0.35); c.stroke();
    for (let i = -10; i <= 10; i++) {
      const ang = -Math.PI / 2 + i * 0.05;
      const r0 = i % 5 === 0 ? 106 : 112;
      c.beginPath(); c.moveTo(PIV.x + Math.cos(ang) * r0, PIV.y + Math.sin(ang) * r0); c.lineTo(PIV.x + Math.cos(ang) * 120, PIV.y + Math.sin(ang) * 120); c.stroke();
    }
    c.strokeStyle = rgba('signal', 1); c.lineWidth = 2;
    const na = -Math.PI / 2 + a;
    c.beginPath(); c.moveTo(PIV.x, PIV.y); c.lineTo(PIV.x + Math.cos(na) * 128, PIV.y + Math.sin(na) * 128); c.stroke();
    // beam: two hairlines + hatch
    c.save();
    c.translate(PIV.x, PIV.y); c.rotate(a);
    c.fillStyle = bone(0.92);
    c.fillRect(-ARM, -9, ARM * 2, 1.5); c.fillRect(-ARM, 8, ARM * 2, 1.5);
    for (let x = -ARM; x < ARM; x += 7) c.fillRect(x, -8, 0.8, 16);
    // graduations (理屈)
    const th = prog(t, this.L2.words[3]!.start, this.L2.words[3]!.start + 0.6);
    c.fillStyle = bone(0.6 * th);
    for (let i = -10; i <= 10; i++) c.fillRect(i * 48 - 0.5, 12, 1, i % 5 === 0 ? 16 : 8);
    c.restore();
    // chains and pans
    for (const e of [endL, endR]) {
      c.strokeStyle = bone(0.7); c.lineWidth = 1;
      c.beginPath();
      c.moveTo(e.x, e.y); c.lineTo(e.x - 150, e.y + CHAIN);
      c.moveTo(e.x, e.y); c.lineTo(e.x + 150, e.y + CHAIN);
      c.stroke();
      c.beginPath(); c.arc(e.x, e.y, 6, 0, Math.PI * 2); c.stroke();
      // pan: a shallow bowl, hatched
      c.beginPath(); c.ellipse(e.x, e.y + CHAIN, 170, 26, 0, 0, Math.PI); c.strokeStyle = bone(0.95); c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.moveTo(e.x - 170, e.y + CHAIN); c.lineTo(e.x + 170, e.y + CHAIN); c.stroke();
      c.fillStyle = bone(0.35);
      for (let i = 1; i < 6; i++) { const w = 170 * Math.sqrt(1 - (i / 6) ** 2); c.fillRect(e.x - w, e.y + CHAIN + i * 4.3, w * 2, 0.8); }
    }
    // labels under the pans
    label(c, '僕', endL.x, endL.y + CHAIN + 70, { size: 22, family: F.dot(), color: rgba('ash', 0.8), align: 'center', spacing: 0 });
    label(c, '誰', endR.x, endR.y + CHAIN + 70, { size: 22, family: F.dot(), color: rgba('ash', 0.8), align: 'center', spacing: 0 });
    // readouts (理屈を連れて: they switch on at 理屈を)
    const rk = smoothstep(this.L2.words[3]!.start, this.L2.words[3]!.start + 0.2, t);
    if (rk > 0) {
      const deg = (a * 180) / Math.PI;
      c.globalAlpha = draw * rk;
      label(c, `θ = ${deg >= 0 ? '+' : '−'}${Math.abs(deg).toFixed(2)}°`, PIV.x + 150, PIV.y - 90, { size: 16, color: rgba('bone', 0.8) });
      label(c, `m(僕) = m(誰)`, PIV.x + 150, PIV.y - 64, { size: 14, color: rgba('ash', 0.7), family: F.mono(400) });
      const unfair = Math.abs(deg) > 3;
      label(c, unfair ? '判定  不公平' : '判定  —', PIV.x + 150, PIV.y - 38, { size: 16, family: F.dot(), color: unfair ? rgba('signal', 1) : rgba('ash', 0.6), spacing: 2 });
      label(c, `EXHIBIT 1 · 天秤`, PIV.x - 150, PIV.y - 90, { size: 13, color: rgba('ash', 0.6), align: 'right' });
      label(c, `n = ${frameIdx(t)}`, PIV.x - 150, PIV.y - 66, { size: 13, color: rgba('ash', 0.45), align: 'right' });
    }
    c.restore();
  }

  private drawLyric(c: CanvasRenderingContext2D, t: number) {
    const pair = t < this.L2.words[0]!.start - 0.35 ? [this.L0, this.L1] : [this.L2, this.L3];
    const fam = F.sans(900);
    const size = 64;
    const rows = pair.map((l) => l.words);
    const st = { family: fam, size, romajiSize: 16 };
    rows.forEach((row, i) => {
      const run = runH(row, st);
      const y = 150 + i * (size + 54);
      drawRun(c, run, 960 - run.width / 2, y, t, st);
    });
  }
}

function stampHit(t: number, t0: number) {
  return t >= t0 ? pulse(t, t0, 0.08) : 0;
}
