"""Word-level lyric alignment -> data/lyrics.json

Pipeline
  1. separate.py      : vocal stem (MDX-Net Voc_FT).
  2. ctc_emissions.py : frame-wise CTC log-probs of the vocal stem (SenseVoice-Small, 60 ms frames).
  3. this script      : one global constrained CTC Viterbi pass over the whole song.

The graph: every lyric word is a CTC token path with two alternative spellings (the written text,
tokenized greedily against the model's vocabulary, and its hiragana reading from the romaji), so a
kanji the model does not hear as written can still align by its sound. Between words an optional
"star" state (any speech, per-frame penalty) absorbs sung syllables that are not in the lyric; between
lines a cheaper "gap" state absorbs instrumentals and unlisted lyrics. Each line's words are confined
to the supplied line window (± a margin).

Timing: a token's time is its first frame in the path. Word starts snap to the nearest vocal-stem
onset within ±90 ms; ends run to the next word (when contiguous) or until the vocal envelope drops
(held notes), and per-character times (`syl`) interpolate the token times inside a word.

Run:  python align.py [--report]
"""
import argparse
import json
import os

import numpy as np

import common
import words as W

FRAME = 0.06
MARGIN = 4.0  # s of slack around each supplied line window
PEN_STAR = 1.2  # per frame: unlisted singing inside a line
PEN_GAP = 0.25  # per frame: between lines
NEG = -1e9


# ------------------------------------------------------------------ romaji -> hiragana
_KANA = {
    "a": "あ", "i": "い", "u": "う", "e": "え", "o": "お",
    "ka": "か", "ki": "き", "ku": "く", "ke": "け", "ko": "こ", "ga": "が", "gi": "ぎ", "gu": "ぐ", "ge": "げ", "go": "ご",
    "sa": "さ", "shi": "し", "si": "し", "su": "す", "se": "せ", "so": "そ", "za": "ざ", "ji": "じ", "zu": "ず", "ze": "ぜ", "zo": "ぞ",
    "ta": "た", "chi": "ち", "tsu": "つ", "te": "て", "to": "と", "da": "だ", "de": "で", "do": "ど",
    "na": "な", "ni": "に", "nu": "ぬ", "ne": "ね", "no": "の", "ha": "は", "hi": "ひ", "fu": "ふ", "he": "へ", "ho": "ほ",
    "ba": "ば", "bi": "び", "bu": "ぶ", "be": "べ", "bo": "ぼ", "pa": "ぱ", "pi": "ぴ", "pu": "ぷ", "pe": "ぺ", "po": "ぽ",
    "ma": "ま", "mi": "み", "mu": "む", "me": "め", "mo": "も", "ya": "や", "yu": "ゆ", "yo": "よ",
    "ra": "ら", "ri": "り", "ru": "る", "re": "れ", "ro": "ろ", "wa": "わ", "wo": "を",
    "sha": "しゃ", "shu": "しゅ", "sho": "しょ", "cha": "ちゃ", "chu": "ちゅ", "cho": "ちょ", "ja": "じゃ", "ju": "じゅ", "jo": "じょ",
    "kya": "きゃ", "kyu": "きゅ", "kyo": "きょ", "ryo": "りょ", "nya": "にゃ", "hyo": "ひょ",
}


def kana(ro):
    s = ro.lower().replace(" ", "")
    out, i = "", 0
    while i < len(s):
        if s[i] == "n" and (i + 1 == len(s) or s[i + 1] not in "aiueoy"):
            out += "ん"; i += 1; continue
        if i + 1 < len(s) and s[i] == s[i + 1] and s[i] not in "aiueon":
            out += "っ"; i += 1; continue
        for L in (3, 2, 1):
            if s[i:i + L] in _KANA:
                out += _KANA[s[i:i + L]]; i += L; break
        else:
            i += 1
    return out


# ------------------------------------------------------------------ tokenization
def load_vocab():
    toks = [l.rstrip("\n").rsplit(" ", 1)[0] for l in open(os.path.join(common.HERE, "models", "sensevoice", "tokens.txt"), encoding="utf8")]
    return toks, {t: i for i, t in enumerate(toks)}


def tokenize(text, vocab):
    """Greedy longest match; returns [(token_id, char_start, char_end)] (chars not in the vocab are skipped)."""
    out, i = [], 0
    while i < len(text):
        for L in range(min(6, len(text) - i), 0, -1):
            p = text[i:i + L]
            tid = vocab.get(p) if i > 0 or L > 0 else None
            if tid is None and i == 0:
                tid = vocab.get("▁" + p)
            if tid is not None:
                out.append((tid, i, i + L)); i += L; break
        else:
            i += 1
    return out


# ------------------------------------------------------------------ graph
class Graph:
    def __init__(self):
        self.emit = []  # token id, or -1 blank, -2 star, -3 gap
        self.preds = []  # list of lists of node ids (-1 = start)
        self.win = []  # (f0, f1) allowed frames
        self.tag = []  # (line, word, alt, token index) for token nodes, else None
        self.frontier = [-1]

    def node(self, e, preds, win, tag=None):
        self.emit.append(e); self.preds.append(preds); self.win.append(win); self.tag.append(tag)
        return len(self.emit) - 1

    def tokens(self, toks, win, tagf, frontier):
        """A CTC path through `toks` entered from `frontier`; returns its exit nodes."""
        fr = list(frontier)
        prev_tok = None
        for k, tid in enumerate(toks):
            b = self.node(-1, [], win)
            self.preds[b] = fr + [b]
            n = self.node(tid, [], win, tagf(k))
            direct = [p for p in fr if not (prev_tok is not None and p == prev_tok[0] and prev_tok[1] == tid)]
            self.preds[n] = direct + [b, n]
            prev_tok = (n, tid)
            fr = [n]
        return fr

    def optional(self, kind, win):
        s = self.node(kind, [], win)
        self.preds[s] = self.frontier + [s]
        self.frontier = self.frontier + [s]


def viterbi(g, lp):
    T = lp.shape[0]
    S = len(g.emit)
    K = max(len(p) for p in g.preds)
    P = np.full((S, K), -1, np.int64)
    for j, p in enumerate(g.preds):
        P[j, :len(p)] = p
    valid = P >= 0
    start = np.array([-1 in p for p in g.preds])
    P[~valid] = 0
    emit_idx = np.array(g.emit)
    blank = lp[:, 0]
    nb = np.log(np.clip(1 - np.exp(blank), 1e-6, 1))
    E = np.empty((T, S), np.float32)
    tokcols = emit_idx >= 0
    E[:, tokcols] = lp[:, emit_idx[tokcols]]
    E[:, emit_idx == -1] = blank[:, None]
    E[:, emit_idx == -2] = (nb - PEN_STAR)[:, None]
    E[:, emit_idx == -3] = (np.maximum(nb, blank) - PEN_GAP)[:, None]
    for j, (f0, f1) in enumerate(g.win):
        E[:max(0, f0), j] = NEG
        E[max(0, f1):, j] = NEG
    dp = np.where(start, E[0], NEG).astype(np.float32)
    bp = np.zeros((T, S), np.int32)
    for t in range(1, T):
        cand = np.where(valid, dp[P], NEG)
        # (start nodes may also begin late: the song opens with a long instrumental)
        k = cand.argmax(1)
        best = cand[np.arange(S), k]
        bp[t] = P[np.arange(S), k]
        dp = best + E[t]
    ends = g.frontier
    j = max(ends, key=lambda e: dp[e])
    path = np.empty(T, np.int64)
    for t in range(T - 1, -1, -1):
        path[t] = j
        j = bp[t, j]
    return path, float(dp[ends].max())


def onset_times(x, sr):
    import librosa
    env = librosa.onset.onset_strength(y=x, sr=sr, hop_length=160)
    on = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=160, backtrack=False, delta=0.05)
    return librosa.frames_to_time(on, sr=sr, hop_length=160), env


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    a = ap.parse_args()
    lines = W.load()
    toks, vocab = load_vocab()
    d = np.load(os.path.join(common.WORK, "emissions.npz"))
    lp = d["lp"].astype(np.float32)
    T = lp.shape[0]

    g = Graph()
    # a leading gap (the intro) that is also the first inter-line gap
    g.optional(-3, (0, T))
    alts = {}
    for li, ((ls, le, jp, ro), ws) in enumerate(zip(lines, W.WORDS)):
        win = (int((ls - MARGIN) / FRAME), int((le + MARGIN) / FRAME))
        for wi, (wj, wr) in enumerate(ws):
            if wi > 0:
                g.optional(-2, win)
            exits = []
            for ai, text in enumerate((wj, kana(wr))):
                tt = tokenize(text, vocab)
                alts[(li, wi, ai)] = (text, tt)
                exits += g.tokens([x[0] for x in tt], win, lambda k, li=li, wi=wi, ai=ai: (li, wi, ai, k), g.frontier)
            g.frontier = exits
        g.optional(-3, (0, T))
    b = g.node(-1, [], (0, T))
    g.preds[b] = g.frontier + [b]
    g.frontier = g.frontier + [b]
    print(f"graph: {len(g.emit)} nodes, {T} frames")
    path, score = viterbi(g, lp)
    print(f"score {score:.1f}")

    # first frame of every token node on the path
    first = {}
    for t, j in enumerate(path):
        tg = g.tag[j]
        if tg is not None and tg not in first:
            first[tg] = t

    vx, sr = common.load_wav(os.path.join(common.STEMS, "vocals.wav"), sr=16000)
    ons, _ = onset_times(vx, sr)
    hop = 160
    rms = np.sqrt(np.convolve(vx ** 2, np.ones(400) / 400, "same")[::hop])
    thr = 0.25 * np.percentile(rms[rms > 1e-3], 90)

    def snap(t):
        if len(ons) == 0:
            return t
        k = np.argmin(np.abs(ons - t))
        return float(ons[k]) if abs(ons[k] - t) < 0.09 else t

    out_lines = []
    for li, ((ls, le, jp, ro), ws) in enumerate(zip(lines, W.WORDS)):
        wlist = []
        for wi, (wj, wr) in enumerate(ws):
            ai = next(ai for ai in (0, 1) if (li, wi, ai, 0) in first)
            text, tt = alts[(li, wi, ai)]
            tt_times = [first[(li, wi, ai, k)] * FRAME for k in range(len(tt))]
            wlist.append({"w": wj, "r": wr, "alt": ai, "tok": [(text[c0:c1], t) for (_, c0, c1), t in zip(tt, tt_times)]})
        out_lines.append((li, ls, le, jp, ro, wlist))

    # word times: start = first token (snapped), end = next start or vocal-envelope release
    flat = [w for l in out_lines for w in l[5]]
    for k, w in enumerate(flat):
        w["start"] = snap(w["tok"][0][1] - 0.02)
    for k, w in enumerate(flat):
        nxt = flat[k + 1]["start"] if k + 1 < len(flat) else w["start"] + 2
        last = w["tok"][-1][1]
        # release: vocal envelope stays up after the last token (held note), at most 1.6 s
        f = int(last / (hop / 16000))
        e = last + 0.18
        while f < len(rms) and rms[f] > thr and (f * hop / 16000) < last + 1.6:
            f += 1
            e = f * hop / 16000
        w["end"] = round(min(nxt, max(e, w["start"] + 0.12)), 3)
        if nxt - w["end"] < 0.12:
            w["end"] = round(nxt, 3)

    res = {"lines": []}
    for (li, ls, le, jp, ro, wlist) in out_lines:
        wout = []
        for w in wlist:
            # per display-character times: kanji path maps chars 1:1; the kana path spreads the tokens over the word
            n = len(w["w"])
            tt = [t for _, t in w["tok"]]
            if w["alt"] == 0:
                cs = []
                for (piece, t), nxt_t in zip(w["tok"], tt[1:] + [w["end"]]):
                    L = len(piece)
                    cs += [t + (nxt_t - t) * i / L for i in range(L)]
                cs = cs[:n] + [cs[-1] if cs else w["start"]] * (n - len(cs))
            else:
                cs = [float(np.interp(i / max(1, n), np.linspace(0, 1, len(tt), endpoint=False), tt)) for i in range(n)]
            cs[0] = w["start"]
            cs = list(np.maximum.accumulate(np.array(cs)))
            syl = [[round(cs[i], 3), round(cs[i + 1] if i + 1 < n else w["end"], 3)] for i in range(n)]
            wout.append({"w": w["w"], "r": w["r"], "start": round(w["start"], 3), "end": w["end"], "syl": syl})
        res["lines"].append({"i": li, "text": jp, "romaji": ro, "start": wout[0]["start"], "end": wout[-1]["end"], "words": wout})
    with open(os.path.join(common.DATA, "lyrics.json"), "w", encoding="utf8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print("wrote data/lyrics.json")
    if a.report:
        for l in res["lines"]:
            print(f"\n[{l['i']}] {l['start']:.2f}-{l['end']:.2f}")
            print("  " + "  ".join(f"{w['w']}@{w['start']:.2f}" for w in l["words"]))


if __name__ == "__main__":
    main()
