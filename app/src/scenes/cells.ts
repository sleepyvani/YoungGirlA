// "Exhibit 8: which number" (lines 18–19). A microscope field of cells (a jittered Voronoi, membranes
// as hairlines, dark nuclei), all a function of t.
//   何番目でも ×2      — a reticle jumps from cell to cell on the beats, giving each a number
//                       (whichever number); the cells divide on each 何番目でも
//   僕が僕であるために — the cells whose nuclei fall inside 僕 turn vermilion: the field spells 僕
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { FSPass, Layer2D, W, H, SS_TAP, SS_TAP_GLSL } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, hash, keys, lerp, prog, smoothstep } from '../engine/util';
import { beatsIn, drawRun, fitRun, label, pulseAt, runH } from './_kit';

export default class Cells extends Scene {
  layer = new Layer2D();
  mask = new Layer2D(W, H, 1);
  pass = new FSPass(/* glsl */ `
    uniform float t, zoom, split, glyphK, ringT0, ringT1, ringT2, focusR;
    uniform vec2 cam; uniform sampler2D glyph;
    ${SS_TAP_GLSL}
    vec2 seedOf(vec2 cell) {
      vec2 h = hash22(cell * 1.37 + 3.1);
      return cell + 0.5 + 0.38 * vec2(sin(t * 0.55 + 6.2831 * h.x), cos(t * 0.47 + 6.2831 * h.y));
    }
    vec3 shade(vec2 scr) {
      vec2 world = (scr - vec2(960.0, 540.0)) / zoom + cam;
      float S = 118.0 / split;
      vec2 p = world / S, ip = floor(p);
      float d1 = 1e9, d2 = 1e9; vec2 s1 = vec2(0.0);
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 s = seedOf(ip + vec2(i, j));
        float d = length(p - s);
        if (d < d1) { d2 = d1; d1 = d; s1 = s; } else if (d < d2) d2 = d;
      }
      float pxPerUnit = S * zoom;
      float edge = (d2 - d1) * 0.5 * pxPerUnit;           // px to the membrane
      float mem = 1.0 - smoothstep(0.6, 1.9, edge);
      float mem2 = 1.0 - smoothstep(4.0, 14.0, edge);     // soft inner rim
      float nd = d1 * pxPerUnit;                           // px to the nucleus centre
      float nucR = 0.17 * pxPerUnit;
      float nuc = 1.0 - smoothstep(nucR - 1.0, nucR + 1.0, nd);
      float nucRim = 1.0 - smoothstep(0.5, 1.6, abs(nd - nucR));
      // is this cell's nucleus inside the glyph? (sampled at the nucleus's screen position)
      vec2 sScr = (s1 * S - cam) * zoom + vec2(960.0, 540.0);
      float g = texture(glyph, vec2(sScr.x / 1920.0, 1.0 - sScr.y / 1080.0)).a * glyphK;
      vec3 cyto = mix(C_INK2 * 1.2, C_GRAPHITE * 0.35, smoothstep(0.1, 0.7, d1));
      vec3 col = mix(cyto, C_BLOOD * 0.9 + C_SIGNAL * 0.2, g);
      col += C_BONE * 0.035 * mem2;
      col = mix(col, mix(C_BONE * 0.42, C_EMBER * 1.4, g), mem);
      col = mix(col, mix(C_INK, C_SIGNAL * 1.6, g), nuc);
      col = mix(col, C_BONE * 0.8, nucRim * (1.0 - g));
      // voice rings around the screen centre (the focused nucleus)
      float r = length(scr - vec2(960.0, 540.0));
      float rings = 0.0;
      for (int k = 0; k < 3; k++) {
        float t0 = k == 0 ? ringT0 : k == 1 ? ringT1 : ringT2;
        float age = t - t0;
        if (age > 0.0 && age < 1.6) rings += (1.0 - smoothstep(0.0, 1.6, age)) * (1.0 - smoothstep(0.5, 2.2, abs(r - (focusR + age * 520.0))));
      }
      col += C_SIGNAL * 1.4 * rings;
      // microscope vignette: a round field
      float field = smoothstep(980.0, 620.0, length((scr - vec2(960.0, 540.0)) * vec2(0.82, 1.0)));
      return col * mix(0.25, 1.0, field);
    }
    void main() {
      vec2 scr0 = vec2(FRAG_PX.x, 1080.0 - FRAG_PX.y);
      vec3 col = vec3(0.0);
      for (int k = ssK0(); k < ssK1(); k++) col += shade(scr0 + rgss(k) / PX_SCALE);
      fragColor = vec4(col * ssWeight(), 1.0);
    }`, {
    t: { value: 0 }, zoom: { value: 1 }, split: { value: 1 }, glyphK: { value: 0 }, cam: { value: new THREE.Vector2() },
    glyph: { value: null }, ringT0: { value: -9 }, ringT1: { value: -9 }, ringT2: { value: -9 }, focusR: { value: 30 }, ssTap: SS_TAP,
  });
  L!: Line;
  w: Record<string, Word> = {};
  beats: number[] = [];
  vOn: number[] = [];

  override init() {
    const { lyrics, audio } = this.ctx;
    this.L = { ...lyrics.lines[18]!, words: [...lyrics.lines[18]!.words, ...lyrics.lines[19]!.words] };
    for (const w of this.L.words) if (!this.w[w.w]) this.w[w.w] = w;
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
    this.vOn = audio.events('vocal', this.ctx.start - 0.05, this.w['僕が']!.start).map((e) => e[0]);
    // the glyph mask: 僕, huge, centred
    const c = this.mask.ctx;
    this.mask.clear();
    c.font = font(F.sans(900), 860);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#fff';
    c.fillText('僕', 960, 560);
    this.mask.upload();
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    const nan = this.L.words.filter((w) => w.w === '何番目でも');
    const tBoku = this.w['僕が']!.start;
    const zoom = keys(t, [[this.ctx.start, 2.2], [this.ctx.start + 0.5, 1.5, ease.outExpo], [tBoku - 0.1, 1.2], [tBoku + 0.5, 0.8, ease.outExpo], [this.ctx.end, 0.86]]);
    const cx = 3000 + (t - this.ctx.start) * 14, cy = 2000;
    const demo = nan;
    const split = 1 + 0.45 * demo.filter((w) => w.start <= t).length + (t >= tBoku ? 0.9 : 0);
    const splitK = demo.length ? Math.max(...demo.map((w) => prog(t, w.start, w.start + 0.25, ease.outBack))) : 0;
    const u = this.pass.u;
    u.t!.value = t; u.zoom!.value = zoom;
    u.split!.value = lerp(1, split, 1) - (1 - splitK) * (demo.some((w) => t >= w.start && t < w.start + 0.25) ? 0.45 : 0);
    (u.cam!.value as THREE.Vector2).set(cx, cy);
    u.glyph!.value = this.mask.texture;
    u.glyphK!.value = smoothstep(tBoku - 0.05, tBoku + 0.5, t);
    const rs = this.vOn.filter((x) => x <= t).slice(-3);
    while (rs.length < 3) rs.unshift(-9);
    u.ringT0!.value = rs[0]!; u.ringT1!.value = rs[1]!; u.ringT2!.value = rs[2]!;
    u.focusR!.value = 0.17 * 118 * zoom;
    this.pass.render(renderer, out);

    const L = this.layer; L.clear();
    const c = L.ctx;
    // 何番目でも: a reticle jumps on each beat, numbering the cells
    const bIdx = this.beats.filter((b) => b <= t).length;
    if (t < tBoku - 0.05) {
      const rx = 360 + hash(bIdx, 71) * 1200, ry = 220 + hash(bIdx, 72) * 560;
      const num = String(1 + Math.floor(hash(bIdx, 73) * 9998)).padStart(4, '0');
      c.save();
      c.strokeStyle = rgba('signal', 1); c.lineWidth = 1.5;
      c.beginPath(); c.arc(rx, ry, 44, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(rx - 64, ry); c.lineTo(rx - 50, ry); c.moveTo(rx + 50, ry); c.lineTo(rx + 64, ry); c.moveTo(rx, ry - 64); c.lineTo(rx, ry - 50); c.moveTo(rx, ry + 50); c.lineTo(rx, ry + 64); c.stroke();
      label(c, `No. ${num}`, rx + 56, ry - 52, { size: 18, color: rgba('bone', 0.95), family: F.mono(500) });
      c.restore();
      // the word, large, centre-top
      const cur = nan.filter((w) => w.start - 0.1 <= t).pop();
      if (cur) {
        c.save();
        c.font = font(F.mincho(700), 110); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = t < cur.end ? rgba('signal', 1) : rgba('bone', 0.95);
        c.fillText('何番目でも', 960, 170);
        c.restore();
      }
      label(c, `${bIdx.toString().padStart(4, '0')} / ????`, W - 110, 124, { size: 16, family: F.mono(400), color: rgba('bone', 0.8), align: 'right' });
    }
    // karaoke line, bottom
    const fam = F.sans(900);
    const size = Math.min(52, fitRun(this.L.words, fam, 1640, 52));
    const st = { family: fam, size, romajiSize: 15 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 990, t, st);
    label(c, 'EXHIBIT 8 · 細胞', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    label(c, `×${(zoom * 400).toFixed(0)}`, W - 110, 96, { size: 13, color: rgba('ash', 0.6), align: 'right', family: F.mono(400) });
    if (t >= tBoku) label(c, '同定  僕', W - 110, 124, { size: 16, family: F.dot(), color: rgba('signal', 1), align: 'right', spacing: 2 });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.09);
    return { bloom: 0.7, vignette: 0.2, zoom: 1 + kick * 0.008, ca: 1.8 };
  }
}
