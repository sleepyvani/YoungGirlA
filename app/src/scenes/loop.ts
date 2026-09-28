// "Exhibit 14: only repeating" (line 38: 愛 言葉を 繰り返すだけ). A typewriter sheet on bone paper:
// the phrase is sung on the top row while copies type themselves below, one per beat, faster each time,
// until the page is filled with it; the copies drift out of register (each row a little offset and
// fainter). The sung pass is the one lit in vermilion. 愛 is set larger, in mincho, at the head.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, W } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Line } from '../engine/lyrics';
import { ease, hash, keys, lerp, prog } from '../engine/util';
import { Ground, beatsIn, drawRun, label, pulseAt, runH } from './_kit';

const ROWS = 11;

export default class Loop extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  L!: Line;
  beats: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = lyrics.lines[38]!;
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    this.ground.render(renderer, out, { paper: 1, t, grid: [-64, 0.25], gridOrigin: [0, 40] });
    const L = this.layer; L.clear();
    const c = L.ctx;
    const text = this.L.words.map((w) => w.w).join(' ');
    const chars = Array.from(text);
    // the loop: while it is sung, one more row per beat, typed faster each time
    const bts = this.beats.filter((b) => b >= this.L.words[0]!.start + 0.3);
    const zoom = keys(t, [[this.ctx.start, 1.0], [this.ctx.end, 1.12, ease.inCubic]]);
    c.save();
    c.translate(960, 540); c.scale(zoom, zoom); c.translate(-960, -540);
    // row 0: the sung pass (karaoke)
    const st = { family: F.mincho(700), size: 64, gap: 26, romajiSize: 16, unsung: rgba('ink', 0.14), sung: rgba('ink', 0.9), romajiColor: rgba('ink', 0.5), ghost: 0.4 };
    drawRun(c, runH(this.L.words, st), 240, 170, t, st);
    for (let r = 1; r < ROWS; r++) {
      const t0 = bts[r - 1];
      if (t0 === undefined || t < t0) break;
      const dur = Math.max(0.12, 0.8 / r);
      const n = Math.floor(chars.length * prog(t, t0, t0 + dur));
      const y = 170 + r * 76;
      const dx = (hash(r, 3) - 0.5) * 30 * r * 0.4, rot = (hash(r, 4) - 0.5) * 0.02 * r;
      c.save();
      c.translate(240 + dx, y); c.rotate(rot);
      c.font = font(F.mincho(700), 64);
      c.fillStyle = rgba('ink', lerp(0.85, 0.3, r / ROWS));
      c.fillText(chars.slice(0, n).join(''), 0, 0);
      c.restore();
    }
    c.restore();
    const reps = 1 + bts.filter((b) => b <= t).length;
    label(c, `反復  ×${Math.min(reps, ROWS)}`, W - 110, 110, { size: 22, family: F.dot(), color: rgba('signal', 1), align: 'right', spacing: 2 });
    label(c, 'EXHIBIT 14 · 繰り返す', 110, 96, { size: 13, color: rgba('ink', 0.5) });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.08);
    void Lyrics;
    return { bloom: 0.25, vignette: 0.25, paper: 1, zoom: 1 + kick * 0.006 };
  }
}
