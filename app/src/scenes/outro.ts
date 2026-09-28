// "Index of the record" (instrumental outro). The file closes itself in the machine's voice: an index
// of the exhibits types one entry per half bar, each with its timecode and its word; then the seal
// 記録終了 lands, the record line runs to its end, and the page goes to ink for the credits.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { formatRec } from '../engine/hud';
import { ease, frameIdx, keys, prog, smoothstep } from '../engine/util';
import { Ground, beatsIn, label, pulseAt, sealCanvas, stamp } from './_kit';

const ENTRIES: [string, string, string][] = [
  ['01', '天秤', '僕の命'], ['02', '口', '朽ちるまでの愛憎'], ['03', '原稿', '言葉を書く'], ['04', '夢の粒', '夢を集めて'],
  ['05', 'つまずき', 'つまずいたって'], ['06', '寒い', '寄らないで'], ['07', '声 / 遠い', '傷つけないで'], ['08', '細胞', '何番目でも'],
  ['09', '断片', 'ちぎり集め'], ['10', '遠い夢', '追いかけてさ'], ['11', '花', '諦めたから'], ['12', '早い / 憎い', '許されないの'],
  ['13', '夢 / 怖い', '近づかないで'], ['14', '繰り返す', '愛 言葉を'], ['15', '僕', '僕であるために'],
];

export default class Outro extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  seal!: HTMLCanvasElement;
  D: number[] = [];
  beats: number[] = [];
  times: number[] = [];

  override init() {
    const { audio, lyrics } = this.ctx;
    this.D = audio.downbeats.filter((d) => d >= this.ctx.start - 0.05);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
    this.seal = sealCanvas(['記録', '終了'], 240, 'square', 61);
    // each exhibit's first lyric time, for the index
    const firsts = [0, 4, 6, 8, 10, 11, 14, 18, 20, 26, 24, 27, 34, 38, 43].map((i) => lyrics.lines[i]!.start);
    this.times = firsts;
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    const D = (i: number) => this.D[i] ?? this.ctx.start + i * 1.837;
    // timing: one entry per half bar; the seal after the last; ink from there
    const bt = this.beats.filter((b) => b >= this.ctx.start - 0.05);
    const entryT = (i: number) => bt[i * 2] ?? D(i);
    const sealT = bt[ENTRIES.length * 2 + 4] ?? D(ENTRIES.length);
    const inkT = sealT + 3.0;
    const endFade = smoothstep(this.ctx.end - 5, this.ctx.end - 0.5, t);
    const paper = 1 - smoothstep(inkT - 0.1, inkT + 0.6, t);
    this.ground.render(renderer, out, { paper, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const inkC = (a: number) => rgba('ink', a);
    if (paper > 0.01) {
      c.globalAlpha = paper;
      c.font = font(F.dot(), 40); c.fillStyle = inkC(0.92); c.textBaseline = 'alphabetic';
      c.fillText('記録索引', 212, 150);
      label(c, 'INDEX OF EXHIBITS · FILE 041', 440, 144, { size: 14, color: inkC(0.5) });
      c.fillStyle = inkC(0.85); c.fillRect(212, 176, 1496, 2);
      ENTRIES.forEach(([n, name, word], i) => {
        const te = entryT(i);
        if (t < te) return;
        const k = prog(t, te, te + 0.35);
        const y = 232 + i * 46;
        c.font = font(F.mono(500), 22); c.fillStyle = inkC(0.6);
        c.fillText(`EXHIBIT ${n}`, 212, y);
        c.font = font(F.dot(), 28); c.fillStyle = inkC(0.9);
        c.fillText(Array.from(name).slice(0, Math.ceil(Array.from(name).length * k)).join(''), 400, y);
        // leader dots
        c.fillStyle = inkC(0.3);
        for (let x = 700; x < 1150 * 1 && x < 700 + 450 * k; x += 12) c.fillRect(x, y - 6, 2, 2);
        c.font = font(F.sans(700), 28); c.fillStyle = i === ENTRIES.length - 1 ? rgba('signal', 1) : inkC(0.85);
        if (k > 0.5) c.fillText(word, 1170, y);
        c.font = font(F.mono(400), 20); c.fillStyle = inkC(0.5); c.textAlign = 'right';
        if (k > 0.8) c.fillText(formatRec(this.times[i]!), 1708, y);
        c.textAlign = 'left';
      });
      // record line: runs to its end over the index
      const rl = prog(t, this.ctx.start, sealT, ease.linear);
      c.fillStyle = rgba('signal', 0.9); c.fillRect(212, 960, 1496 * rl, 3);
      label(c, formatRec(t), 1708, 990, { size: 14, color: inkC(0.55), align: 'right', family: F.mono(400) });
      stamp(c, this.seal, 1500, 820, 220, -0.1, t, sealT);
      c.globalAlpha = 1;
    }
    // credits on ink
    const ca = smoothstep(inkT + 0.4, inkT + 1.2, t) * (1 - endFade);
    if (ca > 0) {
      c.globalAlpha = ca;
      c.textAlign = 'center';
      c.font = font(F.sans(900), 120); c.fillStyle = rgba('bone', 0.95); c.textBaseline = 'alphabetic';
      c.fillText('少女Ａ', 960, 500);
      c.font = font(F.mincho(700), 44); c.fillStyle = rgba('bone', 0.85);
      c.fillText('椎名もた', 960, 590);
      label(c, 'YOUNG GIRL A · SIINAMOTA', 960, 640, { size: 15, color: rgba('ash', 0.7), align: 'center', spacing: 6 });
      const k2 = smoothstep(inkT + 2.5, inkT + 3.3, t);
      c.globalAlpha = ca * k2;
      label(c, 'A GENERATIVE MUSIC VIDEO, RENDERED IN CODE', 960, 780, { size: 13, color: rgba('ash', 0.6), align: 'center', spacing: 4 });
      label(c, 'every frame a function of song time · engine after pdoom-video (MIT)', 960, 810, { size: 13, color: rgba('ash', 0.45), align: 'center', spacing: 1, family: F.mono(400) });
      if (frameIdx(t) % 60 < 36) { c.fillStyle = rgba('signal', 1); c.beginPath(); c.arc(960, 700, 6, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1; c.textAlign = 'left';
    }
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.08);
    return { bloom: 0.3, vignette: 0.3, paper: paper > 0.5 ? 1 : 0, frame: paper, zoom: 1 + kick * 0.004 * paper, fade: endFade, rec: 0 };
  }
}
void keys; void W; void H;
