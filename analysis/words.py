"""Karaoke word segmentation of lyrics/lyrics.src.js.

Each lyric line is split into display words (bunsetsu: a content word with its particles), each a
(Japanese, romaji) pair. The karaoke highlights one word at a time; inside a word the wipe follows
the aligned character times. `load()` checks that the words rebuild the source line exactly.
"""
import json
import os
import re

import common

X = lambda jp, ro, n: [(jp, ro)] * n  # noqa: E731  (repeated words: 軽い軽い…)

WORDS = [
    [("僕の", "boku no"), ("命の", "inochi no"), ("価値だって", "kachi datte"), ("誰の", "dare no"), ("命の", "inochi no"),
     ("価値だって", "kachi datte"), ("時々さ", "tokidoki sa"), ("不公平に", "fukouhei ni"), ("裁かれる", "sabakareru"),
     ("もんなんでしょう", "mon nan deshou")],
    [("古くさい", "furukusai"), ("空に", "sora ni"), ("やってきた", "yattekita"), ("理屈を", "rikutsu wo"), ("連れて", "tsurete"),
     ("やってきた", "yattekita"), ("時々さ", "tokidoki sa"), ("天秤に", "tenbin ni"), ("頼り切りと", "tayorikiri to"), ("化しよう", "kashiyou")],
    [("口までの", "kuchi made no"), ("愛", "ai"), ("口までの", "kuchi made no"), ("愛", "ai"), ("飲み込む", "nomikomu"),
     ("気に", "ki ni"), ("簡単に", "kantan ni")],
    [("落として", "otoshite"), ("言葉を", "kotoba wo"), ("書く", "kaku"), ("曖昧に", "aimai ni"), ("言葉を", "kotoba wo"), ("書く", "kaku"),
     ("曖昧に", "aimai ni"), ("伝わり", "tsutawari"), ("きらないから", "kiranai kara"), ("君だけを", "kimi dake wo"), ("信じてさ", "shinjite sa")],
    [("連れてきた", "tsuretekita"), ("夢の", "yume no"), ("粒を", "tsubu wo"), ("ちょっと", "chotto"), ("間違えながら", "machigaenagara"),
     ("パラパッパッパラパ", "parappapparapa"), ("明日に", "asu ni"), ("架けるのさ", "kakeru no sa")],
    [("足りないね", "tarinai ne"), *X("軽い", "karui", 6)],
    [("細胞の", "saibou no"), ("奥の", "oku no"), ("声が", "koe ga"), ("追いつけない", "oitsukenai"), ("けどね", "kedo ne"),
     ("でもね", "demo ne"), ("でもね", "demo ne"), ("僕が", "boku ga"), ("僕で", "boku de"), ("あるために", "aru tame ni")],
    [("ちぎれ", "chigire"), ("集め", "atsume"), ("持ってきた", "mottekita"), ("ちぎれ", "chigire"), ("集め", "atsume"), ("持ってきた", "mottekita"),
     ("あの日の", "ano hi no"), ("間違いを", "machi gai wo"), ("飲み込むのが", "nomikomu no ga"), ("苦しくて", "kurushikute")],
    [("口までの", "kuchi made no"), ("愛", "ai"), ("口までの", "kuchi made no"), ("愛", "ai"), ("飲み込む", "nomikomu"),
     ("気に", "ki ni"), ("簡単に", "kantan ni"), ("言葉の", "kotoba no"), ("向きに", "muki ni"), ("変として", "hen to shite")],
    [("心も", "kokoro mo"), ("なく", "naku"), ("響かせたから", "hibikase ta kara"), ("愛を", "ai wo"), ("追いかけてた", "oikaketeta")],
    [("足りないね", "tarinai ne"), *X("早い", "hayai", 5), ("追いつけないよ", "oitsukenai yo"), ("素っ気なく", "sokkenaku"),
     ("残した", "nokoshita"), ("思いが", "omoi ga"), *X("憎い", "nikui", 3)],
    [*X("憎い", "nikui", 5), ("足りないの", "tarinai no"), ("明日も", "asu mo"), ("夢を", "yume wo"), ("見てたい", "mitetai"),
     *X("怖い", "kowai", 5)],
    [*X("可愛い", "kawaii", 8), ("嘘", "uso"), ("来ないで", "konaide"), ("手に", "te ni"), ("返すんだ", "kaesunda")],
    [*X("寒い", "samui", 11), ("だからね", "dakarane"), ("でもね", "demo ne"), ("でもね", "demo ne"), ("僕が", "boku ga"),
     ("僕で", "boku de"), ("あるために", "aru tame ni")],
]


def source_lines():
    """[(start, end, jp, romaji)] parsed from lyrics/lyrics.src.js."""
    src = open(os.path.join(common.ROOT, "lyrics", "lyrics.src.js"), encoding="utf8").read()
    out = []
    for m in re.finditer(r'\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*"(.*?)"\s*\]', src):
        s, e, txt = float(m.group(1)), float(m.group(2)), m.group(3)
        jp, ro = re.match(r"(.*?)\s*\((.*)\)\s*$", txt).groups()
        out.append((s, e, jp.strip(), ro.strip()))
    return out


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
