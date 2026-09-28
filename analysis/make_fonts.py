"""Japanese fonts for the renderer -> app/public/fonts/jp/

Static weight instances of the variable Noto Sans JP / Noto Serif JP, plus DotGothic16, subset to the
characters the video uses: every non-ASCII character in data/lyrics.json and app/src/**/*.ts, the
full kana, ASCII and common Japanese punctuation. Rerun after adding Japanese text to a scene.

Sources (SIL OFL 1.1), from https://github.com/google/fonts (ofl/notosansjp, ofl/notoserifjp,
ofl/dotgothic16), into analysis/fonts/:
  NotoSansJP[wght].ttf  NotoSerifJP[wght].ttf  DotGothic16-Regular.ttf

Run:  python make_fonts.py
"""
import glob
import json
import os

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

import common

SRC = os.path.join(common.HERE, "fonts")
OUT = os.path.join(common.ROOT, "app", "public", "fonts", "jp")
SANS = [300, 500, 700, 900]
SERIF = [400, 700]


def charset():
    cs = set(chr(c) for c in range(0x20, 0x7F))
    cs |= set(chr(c) for c in range(0x3040, 0x30FF + 1))  # kana
    cs |= set("、。「」『』・ー〜…‥！？（）［］【】〈〉《》〇々〆×÷±→←↑↓■□●○◆◇▲△▼▽★☆※〒℃％＃＆＠：；／＼｜－＋＝　")
    cs |= set("０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ")
    ly = json.load(open(os.path.join(common.DATA, "lyrics.json"), encoding="utf8"))
    for l in ly["lines"]:
        cs |= set(l["text"])
    for f in glob.glob(os.path.join(common.ROOT, "app", "src", "**", "*.ts"), recursive=True):
        cs |= set(ch for ch in open(f, encoding="utf8").read() if ord(ch) > 0x7F)
    return "".join(sorted(cs))


def sub(font, text, out):
    o = subset.Options()
    o.layout_features = ["*"]
    o.name_IDs = ["*"]
    o.notdef_outline = True
    o.hinting = False
    s = subset.Subsetter(o)
    s.populate(text=text)
    s.subset(font)
    font.save(out)
    print(f"{os.path.basename(out)}  {os.path.getsize(out) // 1024} KB")


def main():
    os.makedirs(OUT, exist_ok=True)
    text = charset()
    print(len(text), "characters")
    for wt in SANS:
        f = instancer.instantiateVariableFont(TTFont(os.path.join(SRC, "NotoSansJP[wght].ttf")), {"wght": wt})
        sub(f, text, os.path.join(OUT, f"NotoSansJP-{wt}.ttf"))
    for wt in SERIF:
        f = instancer.instantiateVariableFont(TTFont(os.path.join(SRC, "NotoSerifJP[wght].ttf")), {"wght": wt})
        sub(f, text, os.path.join(OUT, f"NotoSerifJP-{wt}.ttf"))
    sub(TTFont(os.path.join(SRC, "DotGothic16-Regular.ttf")), text, os.path.join(OUT, "DotGothic16.ttf"))


if __name__ == "__main__":
    main()
