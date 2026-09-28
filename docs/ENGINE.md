# Engine guide (for scene authors)

The engine comes from [mexicat/pdoom-video](https://github.com/mexicat/pdoom-video) (MIT) and is
adapted here for Japanese lyrics. The video is a web app (`app/`, TypeScript + three.js, run with
bun + Vite) that renders any song time `t` deterministically at 1920×1080 (or 3840×2160 with
`?scale=2`). The same code drives the live preview and the offline 60 fps export.

## Running things

- Dev server: `cd app && bunx vite` → http://localhost:5173/?t=37.5 (space = play/pause, ←/→ = ±1 s,
  shift = ±5 s, `,`/`.` = ±1 frame, `[`/`]` = previous/next timeline entry, `l` = loop the entry, `h` = hide the UI).
- Stills (the main way to check work): `bun scripts/render.ts stills --t 38.5,41.3 --only mouth1 --out ../out/wip/mouth`
- Contact sheet: `bun scripts/render.ts sheet --from 80 --to 104 --n 16 --only cells --out ../out/wip/cells.png`,
  or `--cuts` for 4 frames around every scene boundary.
- Short clip: `bun scripts/render.ts video --from 52 --to 60 --only dream --out ../out/wip/dream.mp4 --preset veryfast`
- `--only a,b` loads only those timeline entries (a missing entry renders dark red).
- Typecheck: `bunx tsc --noEmit -p tsconfig.json`.
- Browser: Chrome on macOS (Metal); elsewhere `--chrome <path>` / `$CHROME_PATH` or playwright's
  Chromium; on a machine without a GPU it runs on SwiftShader (0.3–0.8 s per frame at 1080p).

## Data

- `lyrics` (`src/engine/lyrics.ts`): `lines[]`, `words[]`. A word is a Japanese display word (a
  content word with its particles, e.g. 僕の) with `r` (romaji), `start`/`end` and `syl` (one
  `[start, end]` per character). `get(q)`, `findWords('軽い')`, `wordProgress(w, t)`,
  `charProgress(w, i, t)`, `charStart(w, i)`.
- `audio` (`src/engine/audio.ts`): `beats[]`, `downbeats[]`, `sections[]`, `beatAt(t)`, `barAt(t)`,
  `timeOfBeat(i)`, `events('kick'|'snare'|'hat'|'vocal', t0, t1)`, `env(name, t)` for
  `rms|low|mid|high|vocal|drums|bass|other` (0..1), `envPeak`, `hit(kind, t, halfLife)`.
- Every `Frame` carries `f.a` (the envelopes and hit pulses) and `f.beat, f.bar, f.beatPhase, f.barPhase`.

## Writing a scene

One file `app/src/scenes/<name>.ts`, default-exporting a class extending `Scene` (`src/engine/scene.ts`):

```ts
export default class MyScene extends Scene {
  ground = new Ground();          // ink or bone paper (scenes/_kit.ts)
  layer = new Layer2D();          // a 1920×1080 logical Canvas2D layer
  render(f: Frame, out: THREE.WebGLRenderTarget) {
    this.ground.render(this.ctx.renderer, out, { paper: 0, t: f.t });
    const c = this.layer.ctx; this.layer.clear();
    karaokeH(c, this.ctx.lyrics.lines[0]!.words, 960, 980, f.t, { family: F.sans(900), size: 56 });
    this.ctx.comp.draw(this.ctx.renderer, this.layer.upload(), out);
    return { bloom: 0.5 };        // post overrides (optional)
  }
}
```

Rules:

- **Deterministic**: output is a pure function of `f.t` (seeded randomness: `mulberry32`, `hash`).
  Never `Math.random()` or clocks. The export averages sub-frames in any order (motion blur).
  Per-frame jitter uses `frameIdx(t)`, not `Math.floor(t * 60)`.
- `render()` fully overwrites `out` (HalfFloat linear HDR). Colours are **linear**; only
  signal/ember should exceed ~0.85 (bloom). Palette: `C_INK`, `C_BONE`, `C_SIGNAL`… in GLSL,
  `LIN.signal` in TS, `rgba('signal', a)` in Canvas2D.
- `flash` is added after the tone curve: on a dark plate keep it ≤ 0.02 (0.05 linear is already a grey veil).
- Post overrides: `exposure, bloom, bloomThreshold, bloomKnee, bloomRadius, halation, ca, grain,
  vignette, hud, frame, rec, paper, fade, flash, shake:[x,y], zoom, invert` (`src/engine/post.ts`).
- Cuts are hard cuts on the beat before a line's first word (`src/timeline.ts`).

## Kit (`app/src/scenes/_kit.ts`)

- Beats: `beatsIn`, `cutBeat`, `lastAt`, `idxAt`, `pulseAt`.
- Karaoke: `runH` / `runV` (horizontal / vertical 縦書き layout), `drawRun` (per-character wipe:
  unsung dim, the word being sung in vermilion, sung bone; romaji under/beside), `karaokeH`,
  `fitRun`, `wrapWords`.
- Motifs: `sealCanvas` + `stamp` (the hanko), `bar` (eye bar / redaction), `MosaicPass` and
  `GLSL_MOSAIC` (the censor mosaic), `penCircle` / `penLine` (the red pen), `Ground` (ink / paper), `label`.
- Fonts (`src/engine/type.ts`): `F.sans(w)` Noto Sans JP, `F.mincho(w)` Noto Serif JP, `F.dot()`
  DotGothic16, `F.mono(w)` IBM Plex Mono, `F.archivo(width, w)`. The Japanese fonts are subsets:
  after adding Japanese text to a scene, rerun `analysis/make_fonts.py`.

## Output scale (4K)

`?scale=2` (`--scale 2`) renders a true 3840×2160 frame. Scenes keep laying out in logical
1920×1080 px; `Layer2D`, `LineBatch`, `makeRT` and post handle the physical resolution. In GLSL use
`FRAG_PX` (logical px) instead of `gl_FragCoord.xy`, and `pxLine` for hairlines.

## Motion blur

`--samples auto` averages 4…324 sub-frames per frame over `--shutter × 1/fps`, stopping when more
would not change the image by more than `--tol` levels; `--samples N` takes a fixed N. Shaders that
supersample take `ssTap: SS_TAP` and loop `ssK0()..ssK1()` over `rgss(k)` (see `scenes/cells.ts`).
