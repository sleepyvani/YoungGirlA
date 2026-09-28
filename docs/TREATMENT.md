# 少女A (Young Girl A) — treatment & style bible

## The idea in one paragraph

In Japanese news a minor is never named: she is **少女A**, "Girl A", her face behind a mosaic and a
black bar over the eyes. The video is **her record** (記録): a case file compiled by a machine out of
fragments of what she sings. Each plate is one exhibit, with its own instrument: a balance that weighs
lives, a mouth that swallows its words, a manuscript sheet written vaguely, grains of a dream, a cell
under a microscope, torn paper, echoes, and the chorus's adjectives (寒い 遠い 早い 憎い 怖い)
sped up, stamped, redacted, drowned in mosaic, frozen. She never gets a face. At the end, on
「僕が僕であるために」, the mosaic over the file photo resolves into one character, **僕** ("I"), and the
name field that read 少女A is corrected in red ink: the subject writes herself back into her own record.

## Tone

- Dynamic: something always moves, and big changes land **on the beat** (130.6 BPM; cuts on the beat
  before a line's first word, hits on kicks/snares). Strong eases (`outExpo`, `inOutCubic`, springs),
  holds, then snaps. No floaty screensaver motion.
- Impressive, not cute — except for the one deliberately cute moment (子供騙しの花, two sticker
  flowers), which is taken back (諦めた).
- Deadpan bureaucracy: mono labels, form fields, case numbers, stamps, tick bars. The machine describes
  her in DotGothic16; she answers in Noto Sans JP Black.
- Not slop: no anime girl, no face, no glowing particles for their own sake, no neon, no stock "sad
  girl" imagery. The girl exists only as text, the mosaic and the black bar.

## Palette (`app/src/engine/palette.ts`)

- **ink** `#0B0A0C` background, **ink2** `#161418` panels, **graphite** `#5B5658`, **ash** `#A19A9A`,
  **bone** `#F2EDE6` paper/type, **signal** `#F03A24` vermilion — the seal (朱肉), the red pen, the sung
  word — **ember** `#FF7A57` hot cores, **blood** `#9E1420` deep shadows of red.
- One rare accent owned by one moment: **pink** `#FF8FB8`, only in the two sticker flowers of 子供騙しの花.
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
| `scales` | 僕の命つったって … 頼りぎりだ どうしよう | An engraved balance: each word drops as a weight onto a pan (mine left, anyone's right), it tips on 公平に, 裁かれる stamps a seal; 暗い空 is hatched in, 雨 falls. |
| `mouth1`, `mouth2` | 朽ちるまでの愛憎を … 微笑む君 どうして | A mouth drawn as vermilion hairlines, opening with the voice; 愛憎 rises out of it and is swallowed. The reprise is made of redaction bars and the text turns its direction on どうして. |
| `write` | 言葉を書く 曖昧に … 君だけをさ信じて | A 原稿用紙 manuscript sheet, written vertically square by square; 曖昧に smudges, the tail fades out, 君 gets a red circle. |
| `dream` | 捨ててきた夢を集めて / ちょっと間違えたから | Grains lie thrown away, are gathered into 夢, and a few land wrong. |
| `trip` | ああ 時に 時に つまずいたって | A staircase in hairlines; 時に steps down; つまずいたって trips and tumbles. |
| `samui1`, `samui2` | 寒い ×14 … 寄らないで / お願いだから | Bone paper, frost: a grid of 寒い that shivers and loses weight; the thermometer keeps falling. |
| `echo` | ああ 君の君の君の声が / 遠い ×14 / 傷つけないで | Echo rings from each sung syllable; 君の rides out on them; each 遠い recedes into the distance. |
| `cells` | 何番目でも ×2 / 僕が僕であるために | A microscope field; a reticle numbers the cells on the beat (whichever number); the cells aggregate into 僕. |
| `torn` | ちぎり集め持ってきた … 苦しくて | Torn scraps assemble into a collage; the red pen marks 間違い; the collage is crumpled. |
| `hana` | 子供騙しの花 二つ / きっと きっと 諦めたから | The only pink: two sticker flowers pop open, wilt on each きっと, drain and fall. |
| `chase` | ああ 遠い夢を 追いかけてさ | 夢 orbits the centre; the words chase it, always a quarter turn behind. |
| `hayai` | 早い ×14 … 憎い ×14 許されないの | Speed: stretched type whips in; a curt statement is typed; seals 憎 pile up; a vermilion bar slams 許されないの; then the silent break. |
| `kowai` | ああ 夢を夢を見てたはずが / 怖い ×14 / 近づかないで | The dream's grains return softly; 怖い drowns the frame in mosaic; 近づかないで stays crisp on a black bar. |
| `loop` | 愛 言葉を 繰り返すだけ | A typewriter page filling with copies of the phrase, one per beat, drifting out of register. |
| `boku` | 何番目でも ×2 / 僕が僕であるために | The record again: the mosaic resolves into 僕; the name field 少女A is corrected in red. |
| `outro` | (instrumental) | The index of the exhibits types itself; the seal 記録終了; credits. |

## Technical conventions

See [`ENGINE.md`](ENGINE.md): every frame is a pure function of song time; scenes lay out in
1920×1080 logical px at every output scale; colours are linear HDR.
