const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface NoteOption {
  id: string;
  label: string;
  midi: number;
}

export function noteToMidi(note: string): number | null {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return null;
  const name = match[1];
  const octave = Number(match[2]);
  const index = NAMES.indexOf(name);
  if (index < 0) return null;
  return (octave + 1) * 12 + index;
}

export function midiToNote(midi: number): string {
  const index = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NAMES[index]}${octave}`;
}

export function buildNoteOptions(from = "C2", to = "C6"): NoteOption[] {
  const start = noteToMidi(from);
  const end = noteToMidi(to);
  if (start === null || end === null) return [];
  const options: NoteOption[] = [];
  for (let midi = start; midi <= end; midi += 1) {
    const id = midiToNote(midi);
    options.push({ id, label: id.replace("#", "♯"), midi });
  }
  return options;
}

export const NOTE_OPTIONS = buildNoteOptions();

export function rangeSpanSemitones(low: string, high: string): number | null {
  const a = noteToMidi(low);
  const b = noteToMidi(high);
  if (a === null || b === null) return null;
  return b - a;
}

export function userRangeCoversSong(
  userLow: string,
  userHigh: string,
  songLow: string,
  songHigh: string,
): boolean {
  const ul = noteToMidi(userLow);
  const uh = noteToMidi(userHigh);
  const sl = noteToMidi(songLow);
  const sh = noteToMidi(songHigh);
  if (ul === null || uh === null || sl === null || sh === null) return false;
  return sl >= ul && sh <= uh;
}
