# 少女A (Young Girl A) — music video

A generative, code-rendered music video for 椎名もた (siinamota)'s 「少女A」, with word-synced karaoke
in Japanese and romaji. Every frame is a deterministic function of song time, so the live preview in
the browser and the offline 1080p60 (or 4K60) export are identical.

The concept: in Japanese news a minor is never named; she is 少女A, behind a mosaic and a black bar.
The video is her case file, exhibit by exhibit, until the mosaic over her photo resolves into 僕 and
the name field is corrected in red. See [`docs/TREATMENT.md`](docs/TREATMENT.md) for the treatment and
plate-by-plate breakdown, and [`docs/ENGINE.md`](docs/ENGINE.md) for the engine and scene API.

The engine (renderer core, post-processing, adaptive motion blur, offline renderer) is adapted from
[mexicat/pdoom-video](https://github.com/mexicat/pdoom-video) (MIT, see `LICENSE.pdoom-video`).

## Layout

- `audio/younggirla.mp3` — the song.
- `lyrics/lyrics.src.js` — line-level lyrics with approximate windows (as supplied).
- `analysis/` — Python tools that produced the timing data:
  - `separate.py` — vocal stem (UVR-MDX-NET-Voc_FT, ONNX, numpy re-implementation of MDX inference).
  - `ctc_emissions.py` — frame-wise CTC log-probs of the vocal stem (SenseVoice-Small, sherpa-onnx int8 export).
  - `words.py` — the karaoke word segmentation (Japanese word + romaji).
  - `align.py` — global constrained CTC Viterbi alignment (written and kana spellings as alternatives,
    "star" states for unlisted singing) → `data/lyrics.json` with per-character times.
  - `analyze.py` — beats (130.6 BPM), downbeats, sections, envelopes, onsets → `data/audio.json`.
  - `make_fonts.py` — subset static instances of Noto Sans JP / Noto Serif JP / DotGothic16.
- `app/` — the renderer (TypeScript + three.js, bun + Vite).
  - `src/engine/` — renderer core (from pdoom-video, adapted: Japanese fonts, romaji words, record HUD).
  - `src/scenes/` — one module per plate: `open`, `scales`, `mouth` (×2), `write`, `dream`, `karui`,
    `cells`, `torn`, `echo`, `hayai`, `kowai`, `kawaii`, `samui`, `boku`, `outro`, plus the shared `_kit`.
  - `src/timeline.ts` — the edit: scene windows anchored to lyric lines and snapped to the beat grid.
  - `scripts/render.ts` — offline renderer (headless Chrome → raw frames over WebSocket → ffmpeg).

## Requirements

[bun](https://bun.sh), Chrome/Chromium (driven headless through playwright-core; on Linux the
playwright Chromium is found automatically, or pass `--chrome <path>`) and ffmpeg with libx264.
The analysis tools need Python 3.12 with numpy, scipy, librosa, soundfile, onnxruntime,
kaldi-native-fbank and fonttools; the renderer doesn't.

## Preview

```sh
cd app
bun install
bunx vite
```

Open http://localhost:5173 (`?t=80` starts at a given time). Keys: space play/pause, ←/→ seek,
`,`/`.` step a frame, `[`/`]` previous/next scene, `l` loop the scene, `h` hide the UI.

## Render the video

```sh
cd app
bun scripts/render.ts video --samples auto --shutter 0.2 --out ../out/younggirla.mp4           # 1080p60
bun scripts/render.ts video --scale 2 --samples auto --shutter 0.2 --x264 aq-mode=3:rc-lookahead=30 --out ../out/younggirla-4k.mp4   # 4K60
bun scripts/render.ts video --fps 30 --samples 1 --preset veryfast --out ../out/draft.mp4        # quick draft
```

`--samples auto` averages 4–324 sub-frames per frame for motion blur; it wants a GPU (on a machine
without one, Chromium falls back to SwiftShader at ~0.3–0.8 s per sub-frame).

## Regenerate the timing data

The committed `data/*.json` are all the renderer needs. To regenerate them (models are not in the repo):

- `analysis/models/UVR-MDX-NET-Voc_FT.onnx` from https://github.com/TRvlvr/model_repo/releases (all_public_uvr_models)
- `analysis/models/sensevoice/` = `sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17` from
  https://github.com/k2-fsa/sherpa-onnx/releases (asr-models)

```sh
cd analysis
python separate.py && python ctc_emissions.py && python align.py --report && python analyze.py
```

To change the lyrics: edit `lyrics/lyrics.src.js` and the segmentation in `analysis/words.py`, then
rerun `align.py`, `analyze.py` and `make_fonts.py`.

**Note on the lyrics:** the supplied lyric sheet covers part of what is sung (the vocal runs almost
continuously from 22 s to 201 s). The aligner places each supplied line within its window and skips
unlisted singing; where the sheet differs from the recording, those words are placed approximately.

## Credits

- **Song:** 「少女A」 (Young Girl A) by 椎名もた (siinamota). The song and lyrics belong to their authors
  and are not covered by the code license.
- **Engine:** adapted from [pdoom-video](https://github.com/mexicat/pdoom-video) by mexicat (MIT).
- **Fonts:** Noto Sans JP, Noto Serif JP, DotGothic16, Archivo, IBM Plex Mono, Cormorant Garamond
  (SIL Open Font License); Hershey / EMS single-stroke fonts (OFL / public domain).
- **Models used for analysis:** UVR-MDX-NET-Voc_FT (Ultimate Vocal Remover), SenseVoice-Small (FunAudioLLM) via sherpa-onnx.

## License

Code: MIT (see `LICENSE`), including the parts from pdoom-video (`LICENSE.pdoom-video`). Fonts keep
their own licenses; the song, lyrics and derived timing data (`audio/`, `lyrics/`, `data/lyrics.json`)
belong to their authors.
