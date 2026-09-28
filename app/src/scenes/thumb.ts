// YouTube thumbnail (not in the edit: loaded with ?thumb, render.ts --thumb). The case file cover in the
// video's own idiom, composed to read at thumbnail size: the title 少女Ａ huge in ink on bone paper, the
// file photo as a coarse mosaic behind the black eye bar, the seal 少女Ａ stamped across its corner, the
// red pen circling the Ａ.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { noise2 } from '../engine/util';
import { Ground, label, penCircle, sealCanvas } from './_kit';

const PHOTO = { x: 1230, y: 150, w: 560, h: 720 };

/** The silhouette (head, hair, shoulders) as a 0..1 grey, in photo-local coords (as in open.ts). */
function shade(qx: number, qy: number) {
  const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const len = (x: number, y: number) => Math.hypot(x, y);
  const head = 1 - sm(0.85, 1.12, len((qx - 0.5) / 0.19, (qy - 0.4) / 0.245));
  const body = 1 - sm(0.85, 1.1, len((qx - 0.5) / 0.46, (qy - 1.02) / 0.36));
  const hair = 1 - sm(0.8, 1.15, len((qx - 0.5) / 0.24, (qy - 0.36) / 0.3));
  const bg = 0.62 + 0.18 * qy + 0.07 * noise2(qx * 3 + 1.7, qy * 3, 5);
  let v = bg + (0.42 + 0.1 * noise2(qx * 5, qy * 5, 6) - bg) * head;
  const dark = Math.max(hair * (1 - sm(0.3, 0.47, qy) * 0.85), body);
  v = v + (0.16 + 0.05 * noise2(qx * 4 + 9, qy * 4, 7) - v) * dark;
  return v;
}

export default class Thumb extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  seal!: HTMLCanvasElement;

  override init() { this.seal = sealCanvas(['少女', 'Ａ'], 300, 'square', 11); }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    this.ground.render(renderer, out, { paper: 1, t: f.t });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const ink = (a: number) => rgba('ink', a);
    // header
    c.font = font(F.dot(), 46); c.fillStyle = ink(0.9); c.textBaseline = 'alphabetic';
    c.fillText('少年事件記録', 110, 150);
    label(c, 'FILE 041 · 取扱注意', 480, 142, { size: 20, color: rgba('signal', 0.95), family: F.mono(500), spacing: 4 });
    c.fillStyle = ink(0.85); c.fillRect(110, 178, 1000, 3);
    // the photo: a coarse mosaic of the silhouette
    const cell = 56;
    for (let y = 0; y < PHOTO.h; y += cell) for (let x = 0; x < PHOTO.w; x += cell) {
      const v = shade((x + cell / 2) / PHOTO.w, (y + cell / 2) / PHOTO.h);
      const g = Math.round(20 + v * 222);
      c.fillStyle = `rgb(${g},${Math.round(g * 0.98)},${Math.round(g * 0.95)})`;
      c.fillRect(PHOTO.x + x, PHOTO.y + y, Math.min(cell, PHOTO.w - x), Math.min(cell, PHOTO.h - y));
    }
    c.strokeStyle = ink(0.8); c.lineWidth = 2; c.strokeRect(PHOTO.x - 1, PHOTO.y - 1, PHOTO.w + 2, PHOTO.h + 2);
    // the eye bar, overshooting the photo
    c.fillStyle = ink(1);
    c.fillRect(PHOTO.x - 70, PHOTO.y + PHOTO.h * 0.31, PHOTO.w + 140, 118);
    // title
    c.font = font(F.sans(900), 330); c.fillStyle = ink(0.95);
    c.fillText('少女', 80, 560);
    c.fillStyle = rgba('signal', 1);
    c.fillText('Ａ', 80 + c.measureText('少女').width - 10, 560);
    const ax = 80 + c.measureText('少女').width - 10 + c.measureText('Ａ').width / 2;
    penCircle(c, ax, 450, 200, 170, 1, 3, { width: 8, color: rgba('ink', 0.85) });
    // credit
    c.font = font(F.mincho(700), 84); c.fillStyle = ink(0.9);
    c.fillText('椎名もた', 110, 760);
    label(c, 'YOUNG GIRL A  ·  SIINAMOTA', 116, 820, { size: 26, color: ink(0.65), spacing: 8 });
    // the seal, across the photo corner
    c.save(); c.translate(PHOTO.x + 40, PHOTO.y + PHOTO.h - 60); c.rotate(-0.16); c.drawImage(this.seal, -170, -170, 340, 340); c.restore();
    // a line of the record at the bottom
    c.fillStyle = rgba('signal', 0.9); c.fillRect(110, 930, 1000, 5);
    label(c, 'MV · 僕が僕であるために', 110, 990, { size: 30, family: F.dot(), color: ink(0.7), spacing: 4 });
    this.ctx.comp.draw(renderer, L.upload(), out);
    return { bloom: 0.2, vignette: 0.35, paper: 1, frame: 1, grain: 0.06 };
  }
}
void W; void H;
