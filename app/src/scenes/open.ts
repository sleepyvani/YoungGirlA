// "The record" (intro, 0 → first line). The cover of her case file, built on the downbeats:
//   D0      a vermilion hairline snaps the file's border on the opening hit; a header types in the dark
//   D2      cut to bone paper: the form (事件番号 / 氏名 / 年齢 / 備考) with an empty photo box
//   D3      the fields type themselves; the name is a black bar
//   D4      the band enters: the photo fills with a mosaic of a silhouette (never a face), cells
//           refining on each downbeat, the camera pushing in
//   D7      the eye bar (目線) slams across the photo
//   D8/D9   the title 少女A and the credit type in
//   D10     the seal 少女A stamps the name field
//   D11     push into the seal; the page falls away into ink for the first line
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { rgba } from '../engine/palette';
import { clamp, ease, frameIdx, hash, keys, lerp, prog, pulse, smoothstep } from '../engine/util';
import { Ground, bar, beatsIn, label, sealCanvas, stamp } from './_kit';

// the page (logical px): form on the left, photo box on the right
const PHOTO = { x: 1210, y: 196, w: 480, h: 600 };
const SEAL = { x: 900, y: 318 }; // on the name field

export default class Open extends Scene {
  ground = new Ground();
  layer = new Layer2D();
  photo = new FSPass(/* glsl */ `
    uniform vec4 rect; uniform float cell; uniform float t; uniform vec3 cam; uniform float reveal; uniform float paper;
    // silhouette (head + shoulders), soft, in photo-local coords (0..1, y down)
    float shade(vec2 q) {
      vec2 h = (q - vec2(0.5, 0.40)) / vec2(0.19, 0.245);
      float head = 1.0 - smoothstep(0.85, 1.12, length(h));
      vec2 s = (q - vec2(0.5, 1.02)) / vec2(0.46, 0.36);
      float body = 1.0 - smoothstep(0.85, 1.1, length(s));
      float hair = 1.0 - smoothstep(0.8, 1.15, length((q - vec2(0.5, 0.36)) / vec2(0.24, 0.3)));
      float bg = 0.62 + 0.18 * q.y + 0.07 * snoise(q * 3.0 + 1.7);
      float v = mix(bg, 0.42 + 0.1 * snoise(q * 5.0), head);
      v = mix(v, 0.16 + 0.05 * snoise(q * 4.0 + 9.0), max(hair * (1.0 - smoothstep(0.30, 0.47, q.y) * 0.85), body));
      return v;
    }
    void main() {
      // page coords of this fragment (undo the camera: page = (screen - centre) / zoom + focus)
      vec2 scr = vec2(FRAG_PX.x, 1080.0 - FRAG_PX.y);
      vec2 page = (scr - vec2(960.0, 540.0)) / cam.z + cam.xy;
      vec2 q = (page - rect.xy) / rect.zw;
      if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) discard;
      vec2 cq = cell > 1.0 ? (floor(q * rect.zw / cell) + 0.5) * cell / rect.zw : q;
      float v = shade(cq);
      // mosaic blocks get a hairline seam, like a coarse screen capture
      vec2 f = fract(q * rect.zw / max(cell, 1.0));
      float seam = cell > 1.0 ? (1.0 - smoothstep(0.0, 0.06, min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y)))) * 0.06 : 0.0;
      vec3 col = mix(C_INK, C_BONE, v) * (1.0 - seam);
      col = mix(col, C_BONE * 0.94, 1.0 - reveal);
      fragColor = vec4(col, 1.0);
    }`, { rect: { value: new THREE.Vector4() }, cell: { value: 32 }, t: { value: 0 }, cam: { value: new THREE.Vector3(960, 540, 1) }, reveal: { value: 0 }, paper: { value: 1 } },
  { blending: THREE.NoBlending });
  seal!: HTMLCanvasElement;
  D: number[] = [];
  beats: number[] = [];

  override init() {
    const { audio } = this.ctx;
    this.D = audio.downbeats.filter((d) => d < this.ctx.end + 0.1);
    this.beats = beatsIn(audio, 0, this.ctx.end + 0.1);
    this.seal = sealCanvas(['少女', 'Ａ'], 220, 'square', 11);
  }

  private d(i: number) { return this.D[i] ?? i * 1.8373; }

  override render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer } = this.ctx;
    const t = f.t, D = (i: number) => this.d(i);
    const paperOn = t >= D(2);
    const endK = prog(t, D(11), this.ctx.end, ease.inExpo);

    // camera over the page: focus point + zoom (page px)
    const zoom = paperOn ? keys(t, [[D(2), 1.0], [D(4), 1.0], [D(7), 1.18, ease.inOutCubic], [D(8), 0.94, ease.outExpo], [D(10), 1.0, ease.inOutCubic], [D(11), 1.06], [this.ctx.end, 6.5, ease.inExpo]]) : 1;
    const fx = paperOn ? keys(t, [[D(4), 960], [D(7), 1250, ease.inOutCubic], [D(8), 960, ease.outExpo], [D(10), 960], [D(11), 930], [this.ctx.end, SEAL.x, ease.inExpo]]) : 960;
    const fy = paperOn ? keys(t, [[D(4), 540], [D(7), 520, ease.inOutCubic], [D(8), 540, ease.outExpo], [D(11), 500], [this.ctx.end, SEAL.y, ease.inExpo]]) : 540;

    this.ground.render(renderer, out, { paper: paperOn ? 1 : 0, t });

    // ---- photo (under the form layer)
    if (paperOn) {
      const u = this.photo.u;
      (u.rect!.value as THREE.Vector4).set(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
      // cells refine on each downbeat from D4 (64 → 40 → 26 → 18), then coarsen again under the bar
      const steps = [64, 40, 26, 18, 18, 24, 32];
      const k = Math.max(0, Math.min(steps.length - 1, this.D.filter((d) => d <= t).length - 1 - 4));
      u.cell!.value = steps[k]!;
      u.reveal!.value = smoothstep(D(4) - 0.05, D(4) + 0.02, t);
      (u.cam!.value as THREE.Vector3).set(fx, fy, zoom);
      this.photo.render(renderer, out);
    }

    // ---- the form / header layer
    const L = this.layer; L.clear();
    const c = L.ctx;
    c.save();
    c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.translate(-fx, -fy);
    let impact = 0;
    if (!paperOn) this.drawDark(c, t);
    else impact = this.drawForm(c, t);
    c.restore();
    this.ctx.comp.draw(renderer, L.upload(), out);

    const hit0 = pulse(t, D(0), 0.12) + pulse(t, D(2), 0.1) * 0.6 + pulse(t, D(4), 0.12) * 0.5;
    return {
      bloom: 0.5, vignette: paperOn ? 0.22 : 0.4, paper: paperOn ? 1 : 0, frame: paperOn ? 1 - endK : 0,
      flash: impact * 0.1 + hit0 * 0.04, shake: [Math.sin(t * 91) * impact * 7, Math.cos(t * 77) * impact * 5] as [number, number],
      fade: 0, grain: paperOn ? 0.05 : 0.06, rec: 0,
    };
  }

  // 0 → D2: the dark prelude: the border draws, the header types
  private drawDark(c: CanvasRenderingContext2D, t: number) {
    const D = (i: number) => this.d(i);
    const k = prog(t, D(0), D(0) + 0.35, ease.outExpo);
    const k2 = prog(t, D(1), D(2) - 0.1, ease.inOutCubic);
    const m = 96, w = W - 2 * m, h = H - 2 * m;
    c.strokeStyle = rgba('signal', 0.9);
    c.lineWidth = 1.5;
    // top and left edges on the hit, the rest on the slow bar
    c.beginPath();
    c.moveTo(m, m + h * (1 - k)); c.lineTo(m, m); c.lineTo(m + w * k, m);
    c.stroke();
    if (k2 > 0) {
      c.beginPath();
      c.moveTo(m + w, m); c.lineTo(m + w, m + h * Math.min(1, k2 * 2));
      if (k2 > 0.5) c.lineTo(m + w - w * (k2 - 0.5) * 2, m + h);
      c.stroke();
    }
    // header types on beats between D0 and D2
    const head = '少年事件記録';
    const bts = this.beats.filter((b) => b >= D(0) + 0.2 && b < D(2));
    const n = bts.filter((b) => b <= t).length;
    c.font = font(F.dot(), 44);
    c.fillStyle = rgba('bone', 0.92);
    c.textBaseline = 'alphabetic';
    const shown = Array.from(head).slice(0, n).join('');
    c.fillText(shown, m + 48, m + 92);
    if (n < head.length && frameIdx(t) % 30 < 18) { const x = m + 48 + c.measureText(shown).width + 4; c.fillStyle = rgba('signal', 1); c.fillRect(x, m + 56, 22, 42); }
    label(c, 'JUVENILE CASE RECORD  ·  FILE 000', m + 50, m + 130, { size: 14, color: rgba('ash', 0.7 * k) });
    label(c, `${this.ctx.audio.bpm.toFixed(1)} BPM`, W - m - 48, H - m - 36, { size: 13, color: rgba('ash', 0.5 * k2), align: 'right' });
  }

  // D2 → end: the form on paper. Returns an impact pulse (stamps).
  private drawForm(c: CanvasRenderingContext2D, t: number) {
    const D = (i: number) => this.d(i);
    const ink = (a: number) => rgba('ink', a);
    const x0 = 212, y0 = 196, colW = 860;
    // header
    c.font = font(F.dot(), 40); c.fillStyle = ink(0.92); c.textBaseline = 'alphabetic';
    c.fillText('少年事件記録', x0, y0 - 64);
    label(c, 'JUVENILE CASE RECORD', x0 + 300, y0 - 70, { size: 14, color: ink(0.5) });
    label(c, '取扱注意 · CONFIDENTIAL', x0 + colW, y0 - 70, { size: 13, color: rgba('signal', 0.9), align: 'right', family: F.dot(), spacing: 2 });
    c.fillStyle = ink(0.85); c.fillRect(x0, y0 - 40, colW, 2);
    // rows
    const rows: [string, string, string][] = [
      ['事件番号', 'CASE NO.', '第 041 号'],
      ['氏名', 'NAME', ''],
      ['年齢', 'AGE', '十■歳'],
      ['性別', 'SEX', '女'],
      ['事件', 'MATTER', '命の価値について'],
      ['備考', 'NOTES', '本人の顔写真は処理済み'],
    ];
    const rowH = 82;
    const typeBeats = this.beats.filter((b) => b >= D(3) && b < D(4) + 0.1);
    rows.forEach(([jp, en, val], i) => {
      const y = y0 + i * rowH;
      const a = smoothstep(D(2) + i * 0.05, D(2) + i * 0.05 + 0.1, t);
      c.globalAlpha = a;
      c.fillStyle = ink(0.28); c.fillRect(x0, y + rowH, colW, 1);
      c.fillRect(x0 + 230, y + 16, 1, rowH - 32);
      c.font = font(F.dot(), 24); c.fillStyle = ink(0.8); c.fillText(jp, x0 + 8, y + 46);
      label(c, en, x0 + 8, y + 68, { size: 11, color: ink(0.45), spacing: 2.5 });
      // values type on the beats of D3..D4 (one row per beat)
      const tb = typeBeats[i] ?? D(4);
      const chars = Array.from(val);
      const n = Math.floor(chars.length * prog(t, tb, tb + 0.28));
      c.font = font(i === 0 ? F.mono(500) : F.sans(700), i === 0 ? 34 : 36);
      c.fillStyle = ink(0.9);
      c.fillText(chars.slice(0, n).join(''), x0 + 262, y + 54);
      c.globalAlpha = 1;
      if (i === 1) {
        // the name: a black bar, then the seal
        bar(c, x0 + 258, y + 18, 330, 48, t, tb + 0.12, { from: -1, dur: 0.14 });
      }
    });
    c.globalAlpha = 1;
    // photo box frame + label
    const pa = smoothstep(D(2), D(2) + 0.12, t);
    c.globalAlpha = pa;
    c.strokeStyle = ink(0.75); c.lineWidth = 1.5;
    c.strokeRect(PHOTO.x - 0.5, PHOTO.y - 0.5, PHOTO.w + 1, PHOTO.h + 1);
    label(c, '写真  PHOTO', PHOTO.x, PHOTO.y - 18, { size: 13, color: ink(0.55), family: F.dot(), spacing: 2 });
    label(c, 'MOSAIC APPLIED', PHOTO.x + PHOTO.w, PHOTO.y + PHOTO.h + 30, { size: 12, color: ink(0.45 * smoothstep(D(4), D(4) + 0.3, t)), align: 'right' });
    c.globalAlpha = 1;
    // the eye bar (目線) on D7
    bar(c, PHOTO.x - 36, PHOTO.y + PHOTO.h * 0.33, PHOTO.w + 72, 78, t, D(7), { from: 1, dur: 0.1 });
    let impact = pulse(t, D(7), 0.07);
    // title & credit (D8, D9): typed large over the lower form
    const tk = prog(t, D(8), D(8) + 0.5);
    const title = '少女Ａ';
    const nt = Math.ceil(Array.from(title).length * tk);
    c.font = font(F.sans(900), 176);
    c.fillStyle = ink(0.95);
    c.fillText(Array.from(title).slice(0, nt).join(''), x0 - 8, 936);
    if (t >= D(8)) {
      label(c, 'YOUNG GIRL A', x0 + 4, 992, { size: 22, color: ink(0.7 * smoothstep(D(8) + 0.3, D(8) + 0.6, t)), spacing: 9 });
    }
    const ck = smoothstep(D(9), D(9) + 0.25, t);
    if (ck > 0) {
      c.globalAlpha = ck;
      c.font = font(F.mincho(700), 44); c.fillStyle = ink(0.9);
      c.fillText('椎名もた', x0 + 600, 900);
      label(c, 'SIINAMOTA', x0 + 604, 936, { size: 15, color: ink(0.6), spacing: 6 });
      c.globalAlpha = 1;
    }
    // the seal on the name at D10
    impact = Math.max(impact, stamp(c, this.seal, SEAL.x, SEAL.y, 150, -0.12, t, D(10)));
    // a second, smaller seal on the photo corner on the last beat of the bar
    const b11 = this.beats.find((b) => b > D(10) + 1.0) ?? D(11) - 0.46;
    impact = Math.max(impact, stamp(c, this.seal, PHOTO.x + PHOTO.w - 40, PHOTO.y + PHOTO.h - 40, 96, 0.2, t, b11) * 0.6);
    // a faint running record line in the margin (hash ticks = beats so far)
    const nb = this.beats.filter((b) => b <= t).length;
    c.fillStyle = rgba('signal', 0.85);
    for (let i = 0; i < nb; i++) c.fillRect(PHOTO.x + i * 5.4, 846, 2, 10 + (i % 4 === 0 ? 8 : 0));
    void hash; void clamp; void lerp;
    return impact;
  }
}
