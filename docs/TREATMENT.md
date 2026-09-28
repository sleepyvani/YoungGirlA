# 少女A (Young Girl A) — treatment & style bible

## The idea in one paragraph

In Japanese news a minor is never named: she is **少女A**, "Girl A", her face behind a mosaic and a
black bar over the eyes. The video is **her record** (記録): a case file compiled by a machine out of
fragments of what she sings. Each plate is one exhibit, with its own instrument: a balance that weighs
lives, a mouth that swallows its words, a manuscript sheet written vaguely, grains of a dream, a cell
under a microscope, torn paper, echoes, and the chorus's adjectives (軽い 早い 憎い 怖い 可愛い 寒い)
stamped, sped up, redacted, stuck on, frozen. She never gets a face. At the end, on
「僕が僕であるために」, the mosaic over the file photo resolves into one character, **僕** ("I"), and the
name field that read 少女A is corrected in red ink: the subject writes herself back into her own record.

## Tone

- Dynamic: something always moves, and big changes land **on the beat** (130.6 BPM; cuts on the beat
  before a line's first word, hits on kicks/snares). Strong eases (`outExpo`, `inOutCubic`, springs),
  holds, then snaps. No floaty screensaver motion.
- Impressive, not cute — except for the one deliberately cute moment (可愛い), which is staged as a
  sticker attack and then taken back (嘘).
- Deadpan bureaucracy: mono labels, form fields, case numbers, stamps, tick bars. The machine describes
  her in DotGothic16; she answers in Noto Sans JP Black.
- Not slop: no anime girl, no face, no glowing particles for their own sake, no neon, no stock "sad
  girl" imagery. The girl exists only as text, the mosaic and the black bar.

## Palette (`app/src/engine/palette.ts`)

- **ink** `#0B0A0C` background, **ink2** `#161418` panels, **graphite** `#5B5658`, **ash** `#A19A9A`,
  **bone** `#F2EDE6` paper/type, **signal** `#F03A24` vermilion — the seal (朱肉), the red pen, the sung
  word — **ember** `#FF7A57` hot cores, **blood** `#9E1420` deep shadows of red.
- One rare accent owned by one moment: **pink** `#FF8FB8`, only in 可愛い (~3 s of stickers).
- Light plates are **bone paper with ink** (the record itself, the manuscript sheet, the cold); dark
  plates are the world she describes. Vermilion stays vermilion on both.
- Only signal/ember may exceed ~0.85 linear (glow). Bone type stays crisp.

## Typography

- **Noto Sans JP** (300–900): the lyric voice. Big, tight, confident; weight animates with pressure
  (寒い gets thinner as it gets colder).
- **Noto Serif JP** (明朝): the confessional register (心, 愛, 夢, the handwriting of the manuscript).
- **DotGothic16**: the machine's Japanese: the record, labels, the mosaic's own voice.
- **IBM Plex Mono**: numbers, romaji, case numbers, timecodes. **Archivo**: big Latin (romaji as display).
- Vertical writing (縦書き) where the plate is a manuscript; horizontal elsewhere.

## Karaoke rules (all plates)

- Every lyric line is readable and synced per word: a word appears (dim) up to ~0.4 s early, and each
  character lights exactly at its aligned time (`Lyrics.charProgress`, from `syl`). Highlighting never
  runs ahead of the voice.
- Default emphasis: unsung at ~30 % bone, sung bone, **the word being sung in vermilion**.
- Romaji rides under the Japanese (small, Plex Mono), lit with the same timing.
- Each plate integrates the lyric graphically and differently: weights on a scale, words swallowed,
  characters written into manuscript squares, grains that condense into kanji, text inside cells,
  stickers, frost. The words are part of the image, not subtitles.
- Keep lyric text inside the title-safe area (≥ 96 px from the edges).

## Motifs (`app/src/scenes/_kit.ts`)

1. **The mosaic** (モザイク): the news censor's pixelation; it hides, then learns to show.
2. **The black bar** (目線): an eye bar that is also the redaction bar over words.
3. **The seal** (朱印): a vermilion hanko reading 少女A; it stamps on downbeats.
4. **The red pen**: a vermilion hairline that underlines, circles and corrects (the teacher's 添削).

## Plates (scene modules)

| id | lyric | plate |
|---|---|---|
| `open` | intro | The record's cover: a form types itself on the beats, the photo box fills with mosaic, the eye bar slams, the seal 少女A lands on the downbeat. |
| `scales` | 僕の命の価値だって … 天秤に頼り切りと化しよう | An engraved balance: each word drops as a weight onto a pan (mine left, anyone's right), the beam tilts with a spring; the sky of 古くさい空 is hatched. |
| `mouth1`, `mouth2` | 口までの愛 … 飲み込む気に簡単に | A mouth drawn as two vermilion hairlines; 愛 travels to it and is swallowed. The reprise is made of redaction bars and the text turns its direction (言葉の向きに). |
| `write` | 落として言葉を書く … 君だけを信じてさ | A 原稿用紙 manuscript sheet, written vertically square by square; 曖昧に smudges into mosaic, 君 gets a red circle. |
| `dream` | 連れてきた夢の粒を … 明日に架けるのさ | Grains of a dream condense into the words, a few land wrong (間違えながら), パラパッパッパラパ marches on the beat, the grains build an arch (架ける). |
| `karui` | 足りないね 軽い×6 | The balance returns and flips: 軽い floats up, weightless, one per word. |
| `cells` | 細胞の奥の声が … 僕が僕であるために | A microscope field of cells (Voronoi membranes); words sit in nuclei, the camera fails to keep up (追いつけない), the cells aggregate into 僕. |
| `torn` | ちぎれ集め持ってきた … 飲み込むのが苦しくて | Torn scraps of earlier plates fly in and assemble; the red pen marks the mistake (間違い). |
| `echo` | 心もなく響かせたから 愛を追いかけてた | Echo rings expand from each sung syllable; 愛 runs, the text chases it. |
| `hayai` | 足りないね 早い×5 … 憎い×3 | Speed: stretched type, whips; then 憎い slams as redaction bars. |
| `kowai` | 憎い×5 足りないの 明日も夢を見てたい 怖い×5 | Stamps of 憎 pile up; the break is a void with one line; the dream returns softly; 怖い drowns in mosaic. |
| `kawaii` | 可愛い×8 嘘来ないで 手に返すんだ | Pink sticker attack (the only pink), then 嘘 drains it and the stickers peel. |
| `samui` | 寒い×11 | Bone paper, frost: a grid of 寒い that shivers and loses weight. |
| `boku` | だからねでもねでもね 僕が僕であるために | The record again: the mosaic resolves into 僕; the name field 少女A is corrected in red. |
| `outro` | (instrumental) | The file closes: the red line runs to the end of the record, the seal 記録終了, credits. |

## Technical conventions

See [`ENGINE.md`](ENGINE.md): every frame is a pure function of song time; scenes lay out in
1920×1080 logical px at every output scale; colours are linear HDR.
