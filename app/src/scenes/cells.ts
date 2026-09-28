// "Exhibit 6: the cell" (line 6). A microscope field of cells (a jittered Voronoi, membranes as
// hairlines, dark nuclei), all a function of t.
//   細胞の        — the field comes into focus
//   奥の          — the camera pushes deep into one nucleus
//   声が          — rings go out from it on every vocal onset (the voice inside)
//   追いつけない   — the nucleus drifts away and the camera chases it, always late
//   けどね でもね でもね — pull back; the cells divide on each word
//   僕が僕であるために — the cells whose nuclei fall inside 僕 turn vermilion: the field spells 僕
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { FSPass, Layer2D, W, H, SS_TAP, SS_TAP_GLSL } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { ease, keys, lerp, prog, smoothstep } from '../engine/util';
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
    this.L = lyrics.lines[6]!;
    for (const w of this.L.words) if (!this.w[w.w]) this.w[w.w] = w;
    this.beats = beatsIn(audio, this.ctx.start - 1, this.ctx.end + 1);
    this.vOn = audio.events('vocal', this.w['声が']!.start - 0.05, this.w['追いつけない']!.start + 6).map((e) => e[0]);
    // the glyph mask: 僕, huge, centred
    const c = this.mask.ctx;
    this.mask.clear();
    c.font = font(F.sans(900), 860);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#fff';
    c.fillText('僕', 960, 560);
    this.mask.upload();
  }

  /** The chased nucleus's path (world px). */
  private target(t: number) {
    const t0 = this.w['追いつけない']!.start;
    const u = Math.max(0, t - t0);
    return { x: 3000 + 900 * Math.sin(u * 0.9) + 260 * u, y: 2000 + 520 * Math.sin(u * 1.7 + 0.5) };
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t;
    const W_ = this.w;
    const tOku = W_['奥の']!.start, tKoe = W_['声が']!.start, tChase = W_['追いつけない']!.start, tKedo = W_['けどね']!.start;
    const demo = this.L.words.filter((w) => w.w === 'でもね');
    const tBoku = W_['僕が']!.start;
    // camera: zoom and position
    const zoom = keys(t, [[this.ctx.start, 0.45], [this.ctx.start + 1.2, 0.8, ease.outCubic], [tOku - 0.1, 0.9], [tOku + 0.6, 2.6, ease.inOutCubic], [tChase, 2.4], [tKedo - 0.2, 1.8], [tKedo + 0.5, 0.75, ease.outExpo], [tBoku, 0.8], [this.ctx.end, 0.86]]);
    const lagged = this.target(t - 0.45), exact = this.target(t);
    const chase = smoothstep(tChase - 0.2, tChase + 0.3, t) * (1 - smoothstep(tKedo - 0.2, tKedo + 0.5, t));
    const base = { x: 3000 - 118 * 0.3 + (t - this.ctx.start) * 6, y: 2000 };
    const cx = lerp(base.x, lagged.x, chase), cy = lerp(base.y, lagged.y, chase);
    const split = 1 + 0.45 * demo.filter((w) => w.start <= t).length * 1 + (t >= tBoku ? 0.9 : 0);
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
    // the chased nucleus: a crosshair that is always late
    if (chase > 0.01) {
      const sx = (exact.x - cx) * zoom + 960, sy = (exact.y - cy) * zoom + 540;
      c.save();
      c.globalAlpha = chase;
      c.strokeStyle = rgba('signal', 1); c.lineWidth = 1.5;
      c.beginPath(); c.arc(sx, sy, 40, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(sx - 60, sy); c.lineTo(sx - 46, sy); c.moveTo(sx + 46, sy); c.lineTo(sx + 60, sy); c.moveTo(sx, sy - 60); c.lineTo(sx, sy - 46); c.moveTo(sx, sy + 46); c.lineTo(sx, sy + 60); c.stroke();
      c.strokeStyle = rgba('bone', 0.6);
      c.strokeRect(960 - 70, 540 - 70, 140, 140);
      label(c, `LAG ${Math.hypot(sx - 960, sy - 540).toFixed(0)} px`, 960 + 80, 540 - 76, { size: 13, color: rgba('bone', 0.8) });
      c.restore();
    }
    // the current word, large, in the focused cell (words 1..6), mincho
    const cur = this.L.words.filter((w) => w.start - 0.1 <= t).pop();
    if (cur && t < tBoku && t >= tOku - 0.1) {
      const a = smoothstep(cur.start - 0.1, cur.start + 0.05, t);
      c.save();
      c.globalAlpha = a;
      c.font = font(F.mincho(700), 120);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const p = Lyrics.wordProgress(cur, t);
      c.fillStyle = p < 1 ? rgba('signal', 1) : rgba('bone', 0.95);
      c.fillText(cur.w, 960, 330);
      c.restore();
    }
    // karaoke line, bottom
    const fam = F.sans(900);
    const size = Math.min(52, fitRun(this.L.words, fam, 1640, 52));
    const st = { family: fam, size, romajiSize: 15 };
    const run = runH(this.L.words, st);
    drawRun(c, run, 960 - run.width / 2, 990, t, st);
    label(c, 'EXHIBIT 6 · 細胞', 110, 96, { size: 13, color: rgba('ash', 0.6) });
    label(c, `×${(zoom * 400).toFixed(0)}`, W - 110, 96, { size: 13, color: rgba('ash', 0.6), align: 'right', family: F.mono(400) });
    if (t >= tBoku) label(c, '同定  僕', W - 110, 124, { size: 16, family: F.dot(), color: rgba('signal', 1), align: 'right', spacing: 2 });
    this.ctx.comp.draw(renderer, L.upload(), out);
    const kick = pulseAt(this.beats, t, 0.09);
    return { bloom: 0.7, vignette: 0.2, zoom: 1 + kick * 0.008, ca: 1.8 };
  }
}
