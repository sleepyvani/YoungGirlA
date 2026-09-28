"""Karaoke word segmentation of lyrics/lyrics.src.js.

Each lyric line is split into display words (bunsetsu: a content word with its particles), each a
(Japanese, romaji) pair. The karaoke highlights one word at a time; inside a word the wipe follows
the aligned character times. `load()` checks that the words rebuild the source line exactly.
"""
import json
import os
import re

import common

X = lambda jp, ro, n: [(jp, ro)] * n  # noqa: E731  (repeated words: 寒い寒い…)
R5 = lambda jp, ro: X(jp, ro, 5)  # noqa: E731
BOKU = [("僕が", "boku ga"), ("僕で", "boku de"), ("あるために", "aru tame ni")]
KUCHIRU = [("朽ちるまでの", "kuchiru made no"), ("愛憎を", "aizou wo")] * 2
NOMIKOMU = [("飲み込む", "nomikomu"), ("君", "kimi"), ("簡単に", "kantan ni"), ("微笑む", "hohoemu"), ("君", "kimi"), ("どうして", "dou shite")]

WORDS = [
    # verse 1
    [("僕の", "boku no"), ("命", "inochi"), ("つったって", "tsuttatte"), ("誰の", "dare no"), ("命", "inochi"), ("つったって", "tsuttatte")],
    [("時々", "tokidoki"), ("どき", "doki"), ("公平に", "kouhei ni"), ("裁かれる", "sabakareru"), ("もんなんでしょ", "mon nan desho")],
    [("暗い", "kurai"), ("空に", "sora ni"), ("やってきた", "yattekita"), ("鬱を", "utsu wo"), ("連れて", "tsurete"), ("やってきた", "yattekita")],
    [("時々", "tokidoki"), ("雨", "ame"), ("そうけいに", "soukei ni"), ("頼りぎりだ", "tayorigiri da"), ("どうしよう", "dou shiyou")],
    KUCHIRU,
    NOMIKOMU,
    [("言葉を", "kotoba wo"), ("書く", "kaku"), ("曖昧に", "aimai ni")] * 2,
    [("伝わり", "tsutawari"), ("きらんないから", "kirannai kara"), ("君だけをさ", "kimi dake wo sa"), ("信じて", "shinjite")],
    # pre-chorus 1
    [("捨ててきた", "sutete kita"), ("夢を", "yume wo"), ("集めて", "atsumete")],
    [("ちょっと", "chotto"), ("ちょっと", "chotto"), ("間違えたから", "machigaeta kara")],
    # chorus 1
    [("ああ", "aa"), ("時に", "toki ni"), ("時に", "toki ni"), ("つまずいたって", "tsumazuita tte")],
    R5("寒い", "samui"), R5("寒い", "samui"), [*X("寒い", "samui", 4), ("いい", "ii"), ("寄らないで", "yoranaide")],
    [("ああ", "aa"), ("君の", "kimi no"), ("君の", "kimi no"), ("君の", "kimi no"), ("声が", "koe ga")],
    R5("遠い", "tooi"), R5("遠い", "tooi"), [*X("遠い", "tooi", 4), ("傷つけないで", "kizutsuke naide")],
    # post-chorus 1
    [("何番目でも", "nanbanme demo")] * 2,
    BOKU,
    # verse 2
    [("ちぎり", "chigiri"), ("集め", "atsume"), ("持ってきた", "mottekita"), ("ちぎり", "chigiri"), ("集め", "atsume"), ("持ってきた", "motte kita")],
    [("あの日の", "ano hi no"), ("間違いを", "machigai wo"), ("飲み込むのが", "nomikomu no ga"), ("苦しくて", "kuru shikute")],
    KUCHIRU,
    NOMIKOMU,
    # pre-chorus 2
    [("子供騙しの", "kodomo damashi no"), ("花", "hana"), ("二つ", "futatsu")],
    [("きっと", "kitto"), ("きっと", "kitto"), ("諦めたから", "akirameta kara")],
    # chorus 2
    [("ああ", "aa"), ("遠い", "tooi"), ("夢を", "yume wo"), ("追いかけてさ", "oikakete sa")],
    R5("早い", "hayai"), R5("早い", "hayai"), [*X("早い", "hayai", 4), ("追いつけないよ", "oitsukenai yo")],
    [("すてきれず", "sutekirezu"), ("残した", "nokoshita"), ("思いが", "omoi ga")],
    R5("憎い", "nikui"), R5("憎い", "nikui"), [*X("憎い", "nikui", 4), ("許されないの", "yurusare nai no")],
    # outro
    [("ああ", "aa"), ("夢を", "yume wo"), ("夢を", "yume wo"), ("見てたはずが", "miteta hazu ga")],
    R5("怖い", "kowai"), R5("怖い", "kowai"), [*X("怖い", "kowai", 4), ("近づかないで", "chikazuka nai de")],
    [("愛", "ai"), ("言葉を", "kotoba o"), ("繰り返すだけ", "kuri kaesu dake")],
    R5("寒い", "samui"), R5("寒い", "samui"), [*X("寒い", "samui", 4), ("お願いだから", "onegai dakara")],
    [("何番目でも", "nanbanme demo")] * 2,
    BOKU,
]


def source_lines():
    """[(start, end, jp, romaji)] from lyrics/lyrics.src.js (evaluated with node)."""
    import subprocess
    src = os.path.join(common.ROOT, "lyrics", "lyrics.src.js")
    out = subprocess.run(["node", "-e", f"console.log(JSON.stringify(require({json.dumps(src)}).LY))"], check=True, capture_output=True, text=True).stdout
    lines = []
    for s, e, txt in json.loads(out):
        jp, ro = re.match(r"(.*?)\s*\((.*)\)\s*$", txt).groups()
        lines.append((float(s), float(e), jp.strip(), ro.strip()))
    return lines


def load():
    lines = source_lines()
    assert len(lines) == len(WORDS), (len(lines), len(WORDS))
    for (s, e, jp, ro), ws in zip(lines, WORDS):
        assert "".join(w[0] for w in ws) == jp.replace(" ", ""), (jp, "".join(w[0] for w in ws))
        assert " ".join(w[1] for w in ws).lower() == ro.lower(), (ro, " ".join(w[1] for w in ws))
    return lines


if __name__ == "__main__":
    for (s, e, jp, ro), ws in zip(load(), WORDS):
        print(f"{s:6.1f}-{e:6.1f}  {len(ws):2d} words  {' / '.join(w[0] for w in ws)}")
    print(json.dumps(sum(len(w) for w in WORDS)), "words")
