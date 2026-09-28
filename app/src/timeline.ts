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
  const last = ly.lines[ly.lines.length - 1]!;
  /** The first downbeat after the last sung word has ended. */
  const vocalOut = au.downbeats.find((d) => d >= last.words[last.words.length - 1]!.end) ?? last.end;

  const b = {
    scales: line(0),
    mouth1: line(4),
    write: line(6),
    dream: line(8),
    trip: line(10),
    samui1: line(11),
    echo: line(14),
    cells: line(18),
    torn: line(20),
    mouth2: line(22),
    hana: line(24),
    chase: line(26),
    hayai: line(27),
    kowai: line(34),
    loop: line(38),
    samui2: line(39),
    boku: line(42),
    outro: vocalOut,
    end: au.duration,
  };

  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });

  // the YouTube thumbnail (?thumb, render.ts --thumb): one still plate on its own
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('thumb')) return [E('thumb', 'thumb', 0, b.end)];

  return [
    E('open', 'open', 0, b.scales),
    E('scales', 'scales', b.scales, b.mouth1),
    E('mouth1', 'mouth', b.mouth1, b.write, { params: { n: 1, lines: [4, 5] } }),
    E('write', 'write', b.write, b.dream),
    E('dream', 'dream', b.dream, b.trip),
    E('trip', 'trip', b.trip, b.samui1),
    E('samui1', 'samui', b.samui1, b.echo, { params: { lines: [11, 12, 13] } }),
    E('echo', 'echo', b.echo, b.cells),
    E('cells', 'cells', b.cells, b.torn),
    E('torn', 'torn', b.torn, b.mouth2),
    E('mouth2', 'mouth', b.mouth2, b.hana, { params: { n: 2, lines: [22, 23] } }),
    E('hana', 'hana', b.hana, b.chase),
    E('chase', 'chase', b.chase, b.hayai),
    E('hayai', 'hayai', b.hayai, b.kowai),
    E('kowai', 'kowai', b.kowai, b.loop),
    E('loop', 'loop', b.loop, b.samui2),
    E('samui2', 'samui', b.samui2, b.boku, { params: { lines: [39, 40, 41] } }),
    E('boku', 'boku', b.boku, b.outro),
    E('outro', 'outro', b.outro, b.end),
  ];
}
