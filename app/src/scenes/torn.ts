// "Exhibit 7: scraps" (line 7). On bone paper, torn scraps fly in and are pinned into a collage.
//   ちぎれ           — a scrap arrives torn: its two halves drift apart
//   集め 持ってきた   — scraps converge on the beats (fragments of the earlier exhibits: manuscript
//                     squares, mosaic, a seal, the balance's dial) and settle
//   あの日の間違いを  — the red pen crosses out the scrap that says 間違い
//   飲み込むのが苦しくて — the collage is crumpled: everything pulls in to the centre and shudders
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, frameIdx, hash, lerp, mulberry32, prog, smoothstep } from '../engine/util';
import { Ground, beatsIn, drawRun, fitRun, label, penLine, pulseAt, runH, sealCanvas } from './_kit';

type Kind = 'word' | 'grid' | 'mosaic' | 'seal' | 'dial' | 'lines';
interface Scrap { kind: Kind; w?: Word; x: number; y: number; w_: number; h: number; rot: number; t0: number; from: { x: number; y: number }; poly: [number, number][]; dark: boolean; seed: number }

function tornPoly(w: number, h: number, seed: number): [number, number][] {
  const r = mulberry32(seed);
  const pts: [number, number][] = [];
  const edge = (ax: number, ay: number, bx: number, by: number, n: number, amp: number) => {
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1;
      const j = (r() - 0.5) * amp;
      pts.push([ax + (bx - ax) * u + (nx / L) * j, ay + (by - ay) * u + (ny / L) * j]);
    }
  };
  const tornTop = r() < 0.5;
  edge(-w / 2, -h / 2, w / 2, -h / 2, tornTop ? 26 : 2, tornTop ? 14 : 1);
  edge(w / 2, -h / 2, w / 2, h / 2, 18, 12);
  edge(w / 2, h / 2, -w / 2, h / 2, tornTop ? 2 : 26, tornTop ? 1 : 14);
  edge(-w / 2, h / 2, -w / 2, -h / 2, 18, 12);
  return pts;
}

export default class Torn extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L!: Line;
  scraps: Scrap[] = [];
  beats: number[] = [];
  seal!: HTMLCanvasElement;
  machi!: Word; nomi!: Word; kuru!: Word; chigire!: Word[];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[7]!;
    const ws = this.L.words;
    this.machi = ws.find((w) => w.w === '間違いを')!;
    this.nomi = ws.find((w) => w.w === '飲み込むのが')!;
    this.kuru = ws.find((w) => w.w === '苦しくて')!;
    this.chigire = ws.filter((w) => w.w === 'ちぎれ');
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
    this.seal = sealCanvas(['少女', 'Ａ'], 160, 'square', 31);
    const r = mulberry32(99);
    // word scraps, one per word, laid out on a loose grid
    const slots = [[520, 300], [900, 250], [1330, 320], [600, 560], [1040, 520], [1420, 600], [440, 800], [860, 790], [1260, 820], [1580, 420]];
    ws.forEach((w, i) => {
      const [x, y] = slots[i % slots.length]!;
      const a = r() * Math.PI * 2;
      this.scraps.push({
        kind: 'word', w, x: x + (r() - 0.5) * 60, y: y + (r() - 0.5) * 40, w_: 120 + Array.from(w.w).length * 64, h: 150, rot: (r() - 0.5) * 0.25,
        t0: w.start - 0.18, from: { x: 960 + Math.cos(a) * 1500, y: 540 + Math.sin(a) * 1100 }, poly: [], dark: i % 3 === 1, seed: 100 + i,
      });
    });
    // decorative fragments of the earlier exhibits, on the beats in between
    const kinds: Kind[] = ['grid', 'mosaic', 'seal', 'dial', 'lines', 'mosaic', 'grid', 'lines'];
    const fillB = this.beats.filter((b) => b > this.ctx.start && b < this.machi.start);
    kinds.forEach((k, i) => {
      const a = r() * Math.PI * 2;
      this.scraps.unshift({
        kind: k, x: 200 + r() * 1520, y: 180 + r() * 720, w_: 220 + r() * 200, h: 180 + r() * 160, rot: (r() - 0.5) * 0.5,
        t0: fillB[i * 2] ?? this.ctx.start + i * 0.4, from: { x: 960 + Math.cos(a) * 1600, y: 540 + Math.sin(a) * 1200 }, poly: [], dark: k === 'mosaic', seed: 200 + i,
      });
    });
    for (const s of this.scraps) s.poly = tornPoly(s.w_, s.h, s.seed);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 1, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const crumple = prog(t, this.nomi.start, this.kuru.start + 0.3, ease.inOutCubic);
    const shudder = smoothstep(this.kuru.start - 0.1, this.kuru.start + 0.1, t);
    const fi = frameIdx(t);
    c.save();
    c.translate(960, 540);
    c.scale(1 - 0.28 * crumple, 1 - 0.28 * crumple);
    c.translate(-960, -540);
    for (const s of this.scraps) {
      if (t < s.t0 - 0.35) continue;
      const k = prog(t, s.t0 - 0.35, s.t0, ease.outCubic);
      let x = lerp(s.from.x, s.x, k), y = lerp(s.from.y, s.y, k);
      let rot = s.rot + (1 - k) * (hash(s.seed) - 0.5) * 2;
      // crumple: pull to the centre, rotate, jitter per frame
      x = lerp(x, 960 + (s.x - 960) * 0.35, crumple); y = lerp(y, 540 + (s.y - 540) * 0.35, crumple);
      rot += crumple * (hash(s.seed, 2) - 0.5) * 1.2;
      x += (hash(s.seed, fi) - 0.5) * 10 * shudder; y += (hash(s.seed, fi + 7) - 0.5) * 10 * shudder;
      // ちぎれ: the scrap is in two halves that separate
      const tearW = s.w && s.w.w === 'ちぎれ' ? prog(t, s.w.start, s.w.start + 0.4, ease.outExpo) : 0;
      this.drawScrap(c, s, x, y, rot, t, tearW);
    }
    // the red pen on 間違い
    const ms = this.scraps.find((s) => s.w === this.machi)!;
    const pk = prog(t, this.machi.start + 0.1, this.machi.start + 0.45, ease.outCubic);
    const pk2 = prog(t, this.machi.start + 0.45, this.machi.start + 0.75, ease.outCubic);
    const mx = lerp(ms.x, 960 + (ms.x - 960) * 0.35, crumple), my = lerp(ms.y, 540 + (ms.y - 540) * 0.35, crumple);
    penLine(c, mx - ms.w_ / 2, my - 50, mx + ms.w_ / 2, my + 50, pk, { width: 7 });
    penLine(c, mx + ms.w_ / 2, my - 50, mx - ms.w_ / 2, my + 50, pk2, { width: 7 });
    c.restore();
    // karaoke line, bottom band on ink
    c.fillStyle = rgba('ink', 0.92);
    c.fillRect(0, 940, W, 140);
    const fam = F.sans(900);
    const size = Math.min(50, fitRun(this.L.words, fam, 1680, 50));
    const st = { family: fam, size, romajiSize: 14 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 1008, t, st);
    label(c, 'EXHIBIT 7 · 断片', 110, 96, { size: 13, color: rgba('ink', 0.55) });
    label(c, `${this.scraps.filter((s) => s.t0 <= t).length} / ${this.scraps.length} PIECES`, W - 110, 96, { size: 13, color: rgba('ink', 0.55), align: 'right' });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.08);
    return { bloom: 0.3, vignette: 0.3, paper: 1, zoom: 1 + kick * 0.008, shake: [0, 0] as [number, number] };
  }

  private drawScrap(c: CanvasRenderingContext2D, s: Scrap, x: number, y: number, rot: number, t: number, tear: number) {
    const halves = tear > 0 ? [-1, 1] : [0];
    for (const hs of halves) {
      c.save();
      c.translate(x + hs * tear * 40, y + hs * tear * 14);
      c.rotate(rot + hs * tear * 0.12);
      c.beginPath();
      s.poly.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.closePath();
      if (hs !== 0) {
        // clip to one half along a jagged vertical tear
        c.save();
        c.beginPath();
        const r = mulberry32(s.seed + 5);
        c.moveTo(0, -s.h);
        for (let i = 0; i <= 12; i++) c.lineTo((r() - 0.5) * 18, -s.h / 2 + (s.h * i) / 12);
        c.lineTo(0, s.h); c.lineTo(hs * s.w_, s.h); c.lineTo(hs * s.w_, -s.h); c.closePath();
        c.clip();
        c.beginPath();
        s.poly.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
        c.closePath();
      }
      c.shadowColor = 'rgba(0,0,0,0.28)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
      c.fillStyle = s.dark ? rgba('ink2', 1) : 'rgba(250,247,242,1)';
      c.fill();
      c.shadowColor = 'transparent';
      c.clip();
      this.content(c, s, t);
      if (hs !== 0) c.restore();
      c.restore();
    }
  }

  private content(c: CanvasRenderingContext2D, s: Scrap, t: number) {
    const fg = s.dark ? rgba('bone', 0.92) : rgba('ink', 0.9);
    if (s.kind === 'word' && s.w) {
      const w = s.w;
      const p = Lyrics.wordProgress(w, t);
      const hot = t >= w.start && t < w.end + 0.1;
      c.font = font(F.sans(900), 76);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = hot ? rgba('signal', 1) : p > 0 ? fg : s.dark ? rgba('bone', 0.35) : rgba('ink', 0.3);
      c.fillText(w.w, 0, -8);
      c.font = font(F.mono(400), 16); c.fillStyle = s.dark ? rgba('ash', 0.8) : rgba('ink', 0.5);
      c.fillText(w.r, 0, 50);
    } else if (s.kind === 'grid') {
      c.strokeStyle = rgba('signal', 0.45); c.lineWidth = 1.2;
      for (let x = -s.w_; x < s.w_; x += 60) c.strokeRect(x, -s.h, 44, s.h * 2);
      for (let y = -s.h; y < s.h; y += 44) { c.beginPath(); c.moveTo(-s.w_, y); c.lineTo(s.w_, y); c.stroke(); }
      c.font = font(F.mincho(700), 34); c.fillStyle = rgba('ink', 0.85); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('書', -s.w_ / 2 + 22 + 60 * Math.floor(s.w_ / 120), 22);
    } else if (s.kind === 'mosaic') {
      const cs = 28;
      for (let yy = -s.h / 2; yy < s.h / 2; yy += cs) for (let xx = -s.w_ / 2; xx < s.w_ / 2; xx += cs) {
        const v = 0.2 + 0.6 * hash(Math.floor(xx / cs), Math.floor(yy / cs), s.seed);
        c.fillStyle = `rgba(${Math.round(242 * v)},${Math.round(237 * v)},${Math.round(230 * v)},1)`;
        c.fillRect(xx, yy, cs - 1, cs - 1);
      }
      c.fillStyle = rgba('ink', 1); c.fillRect(-s.w_ / 2, -18, s.w_, 36);
    } else if (s.kind === 'seal') {
      c.drawImage(this.seal, -80, -80, 160, 160);
    } else if (s.kind === 'dial') {
      c.strokeStyle = rgba('ink', 0.7); c.lineWidth = 1.2;
      c.beginPath(); c.arc(0, 60, 120, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); c.stroke();
      for (let i = -12; i <= 12; i++) { const a = -Math.PI / 2 + i * 0.05; c.beginPath(); c.moveTo(Math.cos(a) * 108, 60 + Math.sin(a) * 108); c.lineTo(Math.cos(a) * 120, 60 + Math.sin(a) * 120); c.stroke(); }
      c.strokeStyle = rgba('signal', 1); c.lineWidth = 2; c.beginPath(); c.moveTo(0, 60); c.lineTo(Math.cos(-1.2) * 128, 60 + Math.sin(-1.2) * 128); c.stroke();
      c.font = font(F.dot(), 18); c.fillStyle = rgba('signal', 1); c.fillText('不公平', -30, 40);
    } else {
      c.fillStyle = rgba('ink', 0.5);
      for (let y = -s.h / 2 + 20; y < s.h / 2; y += 18) c.fillRect(-s.w_ / 2 + 20, y, (s.w_ - 40) * (0.4 + 0.6 * hash(y, s.seed)), 3);
    }
  }
}
