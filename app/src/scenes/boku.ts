// "The record, corrected" (line 13, second half: だからね でもね でもね 僕が僕であるために).
// The case file from the opening, again on bone paper:
//   だからね          — typed into the notes row (備考)
//   でもね            — the eye bar slides off the photo
//   でもね            — the photo's mosaic starts to refine… but there is no face under it: the
//                      picture is the character 僕
//   僕が              — the red pen strikes the seal 少女A in the name field
//   僕で              — and writes 僕 beside it, in vermilion
//   あるために         — the mosaic is gone: 僕, sharp. The record holds her own word for herself.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H, makeRT } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, keys, lerp, prog, smoothstep } from '../engine/util';
import { Ground, MosaicPass, bar, beatsIn, drawRun, label, penLine, pulseAt, runH, sealCanvas } from './_kit';

const PHOTO = { x: 1210, y: 196, w: 480, h: 600 };
const SEAL = { x: 900, y: 318 };

export default class Boku extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  rt = makeRT();
  mosaic = new MosaicPass();
  L!: Line;
  words: Word[] = [];
  dakara!: Word; demo: Word[] = []; ga!: Word; de!: Word; aru!: Word;
  seal!: HTMLCanvasElement;
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[13]!;
    const ws = this.L.words;
    const i0 = ws.findIndex((w) => w.w === 'だからね');
    this.words = ws.slice(i0);
    this.dakara = ws[i0]!;
    this.demo = this.words.filter((w) => w.w === 'でもね');
    this.ga = this.words.find((w) => w.w === '僕が')!;
    this.de = this.words.find((w) => w.w === '僕で')!;
    this.aru = this.words.find((w) => w.w === 'あるために')!;
    this.seal = sealCanvas(['少女', 'Ａ'], 220, 'square', 11);
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, this.rt, { paper: 1, t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const ink = (a: number) => rgba('ink', a);
    const zoom = keys(t, [[this.ctx.start, 1.4], [this.ctx.start + 0.5, 1.0, ease.outExpo], [this.aru.start, 1.0], [this.aru.end + 0.3, 1.12, ease.inOutCubic]]);
    const fx = keys(t, [[this.aru.start, 960], [this.aru.end + 0.3, 1100, ease.inOutCubic]]);
    c.save();
    c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.translate(-fx, -540);
    // the form (as in the opening)
    const x0 = 212, y0 = 196, colW = 860, rowH = 82;
    c.font = font(F.dot(), 40); c.fillStyle = ink(0.92); c.textBaseline = 'alphabetic';
    c.fillText('少年事件記録', x0, y0 - 64);
    label(c, 'JUVENILE CASE RECORD — 訂正 CORRECTED', x0 + 300, y0 - 70, { size: 14, color: ink(0.5) });
    c.fillStyle = ink(0.85); c.fillRect(x0, y0 - 40, colW, 2);
    const rows: [string, string, string][] = [['事件番号', 'CASE NO.', '第 041 号'], ['氏名', 'NAME', ''], ['年齢', 'AGE', '十■歳'], ['性別', 'SEX', '女'], ['事件', 'MATTER', '命の価値について'], ['備考', 'NOTES', '']];
    rows.forEach(([jp, en, val], i) => {
      const y = y0 + i * rowH;
      c.fillStyle = ink(0.28); c.fillRect(x0, y + rowH, colW, 1); c.fillRect(x0 + 230, y + 16, 1, rowH - 32);
      c.font = font(F.dot(), 24); c.fillStyle = ink(0.8); c.fillText(jp, x0 + 8, y + 46);
      label(c, en, x0 + 8, y + 68, { size: 11, color: ink(0.45), spacing: 2.5 });
      c.font = font(i === 0 ? F.mono(500) : F.sans(700), i === 0 ? 34 : 36); c.fillStyle = ink(0.9);
      c.fillText(val, x0 + 262, y + 54);
    });
    // name: the bar and the seal (in place from the opening), struck on 僕が, 僕 written on 僕で
    bar(c, x0 + 258, y0 + rowH + 18, 330, 48, t, -1);
    c.save(); c.translate(SEAL.x, SEAL.y); c.rotate(-0.12); c.drawImage(this.seal, -82, -82, 164, 164); c.restore();
    const sk = prog(t, this.ga.start + 0.05, this.ga.start + 0.3, ease.outCubic);
    penLine(c, SEAL.x - 110, SEAL.y + 40, SEAL.x + 110, SEAL.y - 40, sk, { width: 6 });
    penLine(c, x0 + 250, y0 + rowH + 44, x0 + 600, y0 + rowH + 40, prog(t, this.ga.start + 0.25, this.ga.start + 0.5, ease.outCubic), { width: 5 });
    const bk = prog(t, this.de.start, this.de.start + 0.3, ease.outCubic);
    if (bk > 0) {
      c.save();
      c.beginPath(); c.rect(SEAL.x + 110, y0 + rowH - 10, 200 * bk, 110); c.clip();
      c.font = font(F.mincho(700), 92); c.fillStyle = rgba('signal', 1); c.textBaseline = 'middle';
      c.fillText('僕', SEAL.x + 120, y0 + rowH + 42);
      c.restore();
    }
    // notes: the words typed in (だからね でもね でもね …)
    const st = { family: F.sans(700), size: 34, gap: 14, romaji: false, unsung: ink(0.15), sung: ink(0.9), ghost: 0.2 };
    drawRun(c, runH(this.words.slice(0, 3), st), x0 + 262, y0 + 5 * rowH + 54, t, st);
    // photo: content (僕, or the silhouette before でもね#2), drawn plain; the mosaic is applied after
    c.fillStyle = 'rgb(222,216,207)'; c.fillRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    const g = smoothstep(this.demo[1]!.start - 0.2, this.demo[1]!.start + 0.2, t);
    c.save();
    c.beginPath(); c.rect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h); c.clip();
    if (g < 1) {
      c.globalAlpha = 1 - g;
      c.fillStyle = 'rgb(110,104,100)'; c.beginPath(); c.ellipse(PHOTO.x + 240, PHOTO.y + 240, 92, 148, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgb(50,46,46)'; c.beginPath(); c.ellipse(PHOTO.x + 240, PHOTO.y + 620, 220, 220, 0, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = g;
    c.font = font(F.mincho(700), 420); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = t >= this.ga.start ? rgba('signal', 1) : ink(0.9);
    c.fillText('僕', PHOTO.x + PHOTO.w / 2, PHOTO.y + PHOTO.h / 2);
    c.restore();
    c.strokeStyle = ink(0.75); c.lineWidth = 1.5; c.strokeRect(PHOTO.x - 0.5, PHOTO.y - 0.5, PHOTO.w + 1, PHOTO.h + 1);
    label(c, '写真  PHOTO', PHOTO.x, PHOTO.y - 18, { size: 13, color: ink(0.55), family: F.dot(), spacing: 2 });
    // the eye bar slides off on the first でもね
    const off = prog(t, this.demo[0]!.start, this.demo[0]!.start + 0.35, ease.inCubic);
    c.fillStyle = ink(1);
    c.fillRect(PHOTO.x - 36 + off * 900, PHOTO.y + PHOTO.h * 0.33, PHOTO.w + 72, 78);
    const mk = 1 - prog(t, this.demo[1]!.start, this.aru.start + 0.2, ease.inOutCubic);
    label(c, mk > 0.02 ? `MOSAIC ${(mk * 100).toFixed(0)}%` : 'MOSAIC REMOVED', PHOTO.x + PHOTO.w, PHOTO.y + PHOTO.h + 30, { size: 12, color: mk > 0.02 ? ink(0.45) : rgba('signal', 1), align: 'right' });
    c.restore();
    // the lyric, large, bottom-left: 僕が僕であるために
    const st2 = { family: F.sans(900), size: 96, gap: 18, romajiSize: 18, unsung: ink(0.14), sung: ink(0.92), romajiColor: ink(0.5), ghost: 0.35 };
    drawRun(c, runH(this.words.slice(3), st2), 212, 960, t, st2);
    this.ctx.comp.draw(renderer, L.upload(), this.rt);
    // mosaic only inside the photo (screen rect under the camera)
    const sx = (x: number) => (x - fx) * zoom + W / 2, sy = (y: number) => (y - 540) * zoom + H / 2;
    const cell = lerp(1, 56, mk) * zoom;
    this.mosaic.render(renderer, this.rt.texture, out, { cell, rect: [sx(PHOTO.x), sy(PHOTO.y), sx(PHOTO.x + PHOTO.w), sy(PHOTO.y + PHOTO.h)] });
    const kick = pulseAt(this.beats, t, 0.08);
    void Lyrics;
    return { bloom: 0.25, vignette: 0.25, paper: 1, frame: 1, zoom: 1 + kick * 0.006 };
  }
}
