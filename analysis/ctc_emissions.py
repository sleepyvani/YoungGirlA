"""Frame-wise CTC log-probs of the vocal stem -> analysis/work/emissions.npz

Acoustic model: SenseVoice-Small (FunAudioLLM, CTC head, zh/en/ja/ko/yue), the sherpa-onnx int8
export (https://github.com/k2-fsa/sherpa-onnx/releases, asr-models). Features as in sherpa-onnx:
80-bin Kaldi fbank on int16-scaled 16 kHz audio, LFR (7 frames stacked, stride 6 → 60 ms per output
frame), CMVN from the model metadata. The model prepends 4 query frames (language, emotion, event,
ITN) that are dropped. The song is processed in overlapping 24 s windows; each output frame is taken
from the window where it sits furthest from an edge.

Run:  python ctc_emissions.py [--model-dir path/to/sherpa-onnx-sense-voice-...]
"""
import argparse
import os

import kaldi_native_fbank as knf
import numpy as np
import onnxruntime as ort

import common

SR = 16000
FRAME = 0.06  # s per LFR frame
WIN_S, HOP_S = 24.0, 18.0


def fbank(x):
    o = knf.FbankOptions()
    o.frame_opts.samp_freq = SR
    o.frame_opts.dither = 0
    o.frame_opts.snip_edges = False
    o.frame_opts.window_type = "hamming"
    o.mel_opts.num_bins = 80
    fb = knf.OnlineFbank(o)
    fb.accept_waveform(SR, (x * 32768).tolist())
    fb.input_finished()
    return np.stack([fb.get_frame(i) for i in range(fb.num_frames_ready)]).astype(np.float32)


def lfr(f, m=7, n=6):
    T = f.shape[0]
    f = np.concatenate([np.repeat(f[:1], (m - 1) // 2, 0), f], 0)
    Tl = int(np.ceil(T / n))
    need = (Tl - 1) * n + m
    if f.shape[0] < need:
        f = np.concatenate([f, np.repeat(f[-1:], need - f.shape[0], 0)], 0)
    return np.stack([f[i * n:i * n + m].reshape(-1) for i in range(Tl)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default=os.path.join(common.HERE, "models", "sensevoice"))
    ap.add_argument("--stem", default=os.path.join(common.STEMS, "vocals.wav"))
    a = ap.parse_args()
    sess = ort.InferenceSession(os.path.join(a.model_dir, "model.int8.onnx"), providers=["CPUExecutionProvider"])
    meta = sess.get_modelmeta().custom_metadata_map
    neg_mean = np.array([float(v) for v in meta["neg_mean"].split(",")], np.float32)
    inv_std = np.array([float(v) for v in meta["inv_stddev"].split(",")], np.float32)
    lang = int(meta["lang_ja"])
    x, _ = common.load_wav(a.stem, sr=SR)
    dur = len(x) / SR
    T = int(np.ceil(dur / FRAME))
    out = None
    best = np.full(T, -1.0)
    s = 0.0
    while s < dur:
        seg = x[int(s * SR):int((s + WIN_S) * SR)]
        feat = (lfr(fbank(seg)) + neg_mean) * inv_std
        lo = sess.run(None, {
            "x": feat[None], "x_length": np.array([feat.shape[0]], np.int32),
            "language": np.array([lang], np.int32), "text_norm": np.array([int(meta["without_itn"])], np.int32),
        })[0][0][4:]
        lo = lo - lo.max(-1, keepdims=True)
        lp = lo - np.log(np.exp(lo).sum(-1, keepdims=True))
        if out is None:
            out = np.full((T, lp.shape[1]), -1e4, np.float32)
        f0 = int(round(s / FRAME))
        n = len(lp)
        for i in range(n):
            g = f0 + i
            if g >= T:
                break
            centre = min(i, n - 1 - i)
            if centre > best[g]:
                best[g] = centre
                out[g] = lp[i]
        print(f"\r{s:.0f}/{dur:.0f}s", end="", flush=True)
        s += HOP_S
    os.makedirs(common.WORK, exist_ok=True)
    np.savez_compressed(os.path.join(common.WORK, "emissions.npz"), lp=out.astype(np.float16), frame=FRAME)
    print("\nwrote emissions", out.shape)


if __name__ == "__main__":
    main()
