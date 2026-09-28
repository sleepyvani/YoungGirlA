// "Exhibit 3: the manuscript" (lines 6–7). A 原稿用紙 sheet on bone paper, written vertically, one
// character per square at its aligned time, columns right to left, one phrase per column.
//   曖昧に           — written, then smudged (a stacked-copy blur and a sideways drift): vague
//   伝わりきらんないから — the tail is written faintly and fades out of its squares: not getting through
//   君だけをさ信じて  — the red pen circles 君
// The camera tracks the pen across the sheet with a slight tilt.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { clamp, ease, keys, lerp, prog, smoothstep } from '../engine/util';
import { Ground, beatsIn, label, penCircle, pulseAt } from './_kit';

const SQ = 70; // square size
const COLW = 104; // column pitch (square + ruby gap)
const ROWS = 11;
const TOP = 150;
const RIGHT = 1560; // centre x of the first column (page coords)

interface Cell { ch: string; w: Word; i: number; col: number; row: number }

export default class Write extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L!: Line;
  cells: Cell[] = [];
  beats: number[] = [];
  kimi!: Word;

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = { ...lyrics.lines[6]!, words: [...lyrics.lines[6]!.words, ...lyrics.lines[7]!.words] };
    // phrases → columns: break after each 曖昧に and after から
    let col = 0, row = 0;
    for (const w of this.L.words) {
      Array.from(w.w).forEach((ch, i) => { this.cells.push({ ch, w, i, col, row }); row++; });
      if (w.w === '曖昧に' || w.w === 'きらんないから') { col++; row = 0; }
    }
    this.kimi = this.L.words.find((w) => w.w.startsWith('君'))!;
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  private colX(col: number) { return RIGHT - col * COLW; }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 1, t });
    const L = this.layer; L.clear();
    const c = L.ctx;

    // pen position: the last written cell
    let cur = this.cells[0]!;
    for (const k of this.cells) if (Lyrics.charStart(k.w, k.i) <= t) cur = k;
    const nCols = Math.max(...this.cells.map((k) => k.col)) + 1;
    // camera: follows the column being written (eased), slight tilt, a slow push
    const colT = this.cells.filter((k) => k.row === 0).map((k) => [Lyrics.charStart(k.w, k.i), this.colX(k.col)] as [number, number]);
    const camX = keys(t, colT.map(([tt, x], i) => [tt + (i === 0 ? -1 : 0.05), x - 200 + (i === 0 ? 180 : 0), ease.inOutCubic] as [number, number, (u: number) => number]));
    const zoom = keys(t, [[this.ctx.start, 1.25], [this.ctx.start + 0.5, 1.1, ease.outExpo], [this.kimi.start, 1.12], [this.kimi.start + 0.4, 1.3, ease.outExpo], [this.ctx.end, 1.36]]);
    const camY = keys(t, [[this.kimi.start, 540], [this.kimi.start + 0.4, TOP + SQ * 3.5, ease.outExpo]]);
    const kimiCell = this.cells.find((k) => k.w === this.kimi && k.i === 0)!;
    const camX2 = lerp(camX, this.colX(kimiCell.col) - 60, prog(t, this.kimi.start, this.kimi.start + 0.4, ease.outExpo));
    c.save();
    c.translate(W / 2, H / 2); c.rotate(-0.035); c.scale(zoom, zoom); c.translate(-camX2, -camY);

    // ---- the sheet: columns of squares with ruby gaps (vermilion rules, as printed)
    c.strokeStyle = rgba('signal', 0.38); c.lineWidth = 1.2;
    for (let col = -3; col < nCols + 6; col++) {
      const x = this.colX(col);
      c.strokeRect(x - SQ / 2, TOP, SQ, SQ * ROWS);
      for (let r = 1; r < ROWS; r++) { c.beginPath(); c.moveTo(x - SQ / 2, TOP + r * SQ); c.lineTo(x + SQ / 2, TOP + r * SQ); c.stroke(); }
    }
    c.lineWidth = 2; c.strokeStyle = rgba('signal', 0.5);
    c.strokeRect(this.colX(nCols + 5) - SQ / 2 - 30, TOP - 30, this.colX(-3) - this.colX(nCols + 5) + SQ + 60, SQ * ROWS + 60);
    label(c, '二十字×二十行  No. 041', this.colX(-3) + SQ / 2 + 20, TOP + SQ * ROWS + 26, { size: 13, family: F.dot(), color: rgba('signal', 0.6), align: 'right', spacing: 1 });

    // ---- characters
    for (const k of this.cells) {
      const s0 = Lyrics.charStart(k.w, k.i);
      const ghost = smoothstep(k.w.start - 0.4, k.w.start - 0.28, t) * 0.13;
      const wk = prog(t, s0, s0 + 0.14, ease.outCubic);
      const x = this.colX(k.col), y = TOP + k.row * SQ + SQ / 2;
      const vague = k.w.w === '曖昧に';
      const fading = k.w.w === 'きらんないから';
      const sung = t >= k.w.start && t < k.w.end + 0.1;
      c.save();
      c.font = font(F.mincho(700), SQ * 0.74);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (ghost > 0 && wk < 1) { c.fillStyle = rgba('ink', ghost); c.fillText(k.ch, x, y + 2); }
      if (wk > 0) {
        let a = 0.93;
        let dx = 0;
        let blurR = 0;
        if (vague) {
          const v = smoothstep(s0 + 0.2, s0 + 0.9, t);
          blurR = v * 7;
          dx = v * 10;
          a *= 1 - 0.45 * v;
        }
        if (fading) a *= 0.55 * (1 - smoothstep(s0 + 0.35, s0 + 1.4, t)) + 0.05;
        // ink reveal: top-down wipe within the square
        if (wk < 1) { c.beginPath(); c.rect(x - SQ / 2, y - SQ / 2, SQ, SQ * wk); c.clip(); }
        if (blurR > 0.3) {
          // smudge: the glyph stacked around a ring (a cheap blur; the canvas blur filter costs ~100 ms a frame)
          c.fillStyle = sung ? rgba('signal', a / 3.2) : rgba('ink', a / 3.2);
          for (let q = 0; q < 8; q++) {
            const ang = (q / 8) * Math.PI * 2;
            c.fillText(k.ch, x + dx + Math.cos(ang) * blurR, y + 2 + Math.sin(ang) * blurR);
          }
        } else {
          c.fillStyle = sung ? rgba('signal', a) : rgba('ink', a);
          c.fillText(k.ch, x + dx, y + 2);
        }
        if (vague) { c.globalAlpha = 0.35; c.fillText(k.ch, x - dx * 0.6, y + 2 + dx * 0.3); }
      }
      c.restore();
    }
    // romaji in the ruby gap, one per word (rotated)
    for (const w of this.L.words) {
      const first = this.cells.find((k) => k.w === w)!;
      const a = smoothstep(w.start - 0.1, w.start + 0.1, t);
      if (a <= 0) continue;
      c.save();
      c.translate(this.colX(first.col) + SQ / 2 + 14, TOP + first.row * SQ + 6);
      c.rotate(Math.PI / 2);
      c.font = font(F.mono(400), 14); c.letterSpacing = '1.5px';
      c.fillStyle = t < w.end + 0.1 && t >= w.start ? rgba('signal', a) : rgba('ink', 0.5 * a);
      c.textBaseline = 'middle';
      c.fillText(w.r, 0, 0);
      c.restore();
    }
    // the pen: a small vermilion cursor under the square being written
    if (t < this.L.words[this.L.words.length - 1]!.end) {
      const x = this.colX(cur.col), y = TOP + (cur.row + 1) * SQ;
      c.fillStyle = rgba('signal', 0.9);
      c.fillRect(x - SQ / 2 + 8, y - 5, SQ - 16, 3);
    }
    // 君: red circle
    const kc = kimiCell;
    penCircle(c, this.colX(kc.col), TOP + kc.row * SQ + SQ / 2, SQ * 0.62, SQ * 0.6, prog(t, this.kimi.start + 0.05, this.kimi.start + 0.45, ease.outCubic), 5, { width: 4 });
    c.restore();

    label(c, 'EXHIBIT 3 · 原稿', 110, 1000, { size: 13, color: rgba('ink', 0.5) });
    const beat = pulseAt(this.beats, t, 0.1);
    this.ctx.comp.draw(renderer, L.upload(), out);
    void clamp;
    return { bloom: 0.25, vignette: 0.3, paper: 1, zoom: 1 + beat * 0.006 };
  }
}
