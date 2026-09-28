import { hexToLinear } from './util';

// The whole video lives in a restrained palette: ink, bone (the paper of the record), and one signal
// colour, the vermilion of a seal (朱肉). One rare accent (pink, the 可愛い stickers) — see docs/TREATMENT.md.
export const HEX = {
  ink: '#0B0A0C', // background black (slightly cool)
  ink2: '#161418', // raised black (panels, paper-in-the-dark)
  graphite: '#5B5658', // dim lines, secondary text
  ash: '#A19A9A', // mid grey
  bone: '#F2EDE6', // paper white, primary text
  signal: '#F03A24', // vermilion (朱): the seal, the red pen, the sung word
  ember: '#FF7A57', // hotter, lighter vermilion for cores/highlights
  blood: '#9E1420', // deep red for shadows of signal
  pink: '#FF8FB8', // accent: only for the 可愛い stickers
} as const;

export type PaletteKey = keyof typeof HEX;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Mix two palette colours for Canvas2D (k = 0 → a, 1 → b), in sRGB. */
export function mixRGBA(a: PaletteKey | string, b: PaletteKey | string, k: number, alpha = 1): string {
  const pa = rgba(a).match(/\d+/g)!.map(Number), pb = rgba(b).match(/\d+/g)!.map(Number);
  return `rgba(${[0, 1, 2].map((i) => Math.round(pa[i]! + (pb[i]! - pa[i]!) * k)).join(',')},${alpha})`;
}
