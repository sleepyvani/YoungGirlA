// The edit: which scene plays when. Boundaries are anchored to lyric lines and snapped to the beat
// grid, so they follow the aligned data (data/lyrics.json, data/audio.json).
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';

// Scene modules are discovered lazily so a missing/broken scene never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

export function makeTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  /** Cut on the last beat at/before a time (never after the word it precedes). */
  const onBeat = (t: number, tol = 0.02) => au.timeOfBeat(Math.floor(au.beatAt(t + tol)));
  /** Cut before the first word of line i. */
  const line = (i: number) => onBeat(ly.lines[i]!.words[0]!.start);
  /** Cut before the first word `w` of line i. */
  const word = (i: number, w: string) => onBeat(ly.lines[i]!.words.find((x) => x.w === w)!.start);
  const last = ly.lines[ly.lines.length - 1]!;
  /** The first downbeat after the last sung word has ended. */
  const vocalOut = au.downbeats.find((d) => d >= last.words[last.words.length - 1]!.end) ?? last.end;

  const b = {
    scales: line(0),
    mouth1: line(2),
    write: line(3),
    dream: line(4),
    karui: line(5),
    cells: line(6),
    torn: line(7),
    mouth2: line(8),
    echo: line(9),
    hayai: line(10),
    kowai: line(11),
    kawaii: line(12),
    samui: line(13),
    boku: word(13, 'だからね'),
    outro: vocalOut,
    end: au.duration,
  };

  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });

  return [
    E('open', 'open', 0, b.scales),
    E('scales', 'scales', b.scales, b.mouth1),
    E('mouth1', 'mouth', b.mouth1, b.write, { params: { n: 1, line: 2 } }),
    E('write', 'write', b.write, b.dream),
    E('dream', 'dream', b.dream, b.karui),
    E('karui', 'karui', b.karui, b.cells),
    E('cells', 'cells', b.cells, b.torn),
    E('torn', 'torn', b.torn, b.mouth2),
    E('mouth2', 'mouth', b.mouth2, b.echo, { params: { n: 2, line: 8 } }),
    E('echo', 'echo', b.echo, b.hayai),
    E('hayai', 'hayai', b.hayai, b.kowai),
    E('kowai', 'kowai', b.kowai, b.kawaii),
    E('kawaii', 'kawaii', b.kawaii, b.samui),
    E('samui', 'samui', b.samui, b.boku),
    E('boku', 'boku', b.boku, b.outro),
    E('outro', 'outro', b.outro, b.end),
  ];
}
