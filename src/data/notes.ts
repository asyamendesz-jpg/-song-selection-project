/** Научная нотация (SPN): C4 = MIDI 60 = до первой октавы. Немецкое H/B не используется. */

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const PITCH_CLASS: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const LETTER_RU: Record<string, string> = {
  C: "до",
  D: "ре",
  E: "ми",
  F: "фа",
  G: "соль",
  A: "ля",
  B: "си",
};

const OCTAVE_GENITIVE: Record<number, string> = {
  0: "субконтроктавы",
  1: "контроктавы",
  2: "большой октавы",
  3: "малой октавы",
  4: "первой октавы",
  5: "второй октавы",
  6: "третьей октавы",
  7: "четвёртой октавы",
  8: "пятой октавы",
};

export interface ParsedNote {
  letter: "C" | "D" | "E" | "F" | "G" | "A" | "B";
  accidental: "" | "#" | "b";
  octave: number;
  pitchClass: number;
}

export interface NoteOption {
  id: string;
  label: string;
  midi: number;
}

function capitalizeRu(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function parseNote(note: string): ParsedNote | null {
  const match = note.trim().match(/^([A-G])(#|b)?(\d)$/);
  if (!match) return null;
  const letter = match[1] as ParsedNote["letter"];
  const accidental = (match[2] ?? "") as ParsedNote["accidental"];
  const octave = Number(match[3]);
  const token = `${letter}${accidental}`;
  const pitchClass = PITCH_CLASS[token];
  if (pitchClass === undefined) return null;
  return { letter, accidental, octave, pitchClass };
}

export function noteToMidi(note: string): number | null {
  const parsed = parseNote(note);
  if (!parsed) return null;
  return (parsed.octave + 1) * 12 + parsed.pitchClass;
}

export function midiToNote(midi: number): string {
  const index = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[index]}${octave}`;
}

export function scientificNoteId(note: string): string | null {
  const parsed = parseNote(note);
  if (!parsed) return null;
  return `${parsed.letter}${parsed.accidental}${parsed.octave}`;
}

export function formatNoteWords(note: string, capitalized = false): string | null {
  const parsed = parseNote(note);
  if (!parsed) return null;
  const octaveName = OCTAVE_GENITIVE[parsed.octave];
  if (!octaveName) return null;
  let pitch = LETTER_RU[parsed.letter];
  if (parsed.accidental === "#") pitch = `${pitch}-диез`;
  if (parsed.accidental === "b") pitch = `${pitch}-бемоль`;
  const words = `${pitch} ${octaveName}`;
  return capitalized ? capitalizeRu(words) : words;
}

export function formatNoteLabel(note: string): string {
  const words = formatNoteWords(note, true);
  const id = scientificNoteId(note);
  if (!words || !id) return note;
  return `${words} (${id})`;
}

export function formatNoteRange(low: string, high: string): string | null {
  const lowWords = formatNoteWords(low, false);
  const highWords = formatNoteWords(high, false);
  const lowId = scientificNoteId(low);
  const highId = scientificNoteId(high);
  if (!lowWords || !highWords || !lowId || !highId) return null;
  return `От ${lowWords} до ${highWords} (${lowId}–${highId})`;
}

export function buildNoteOptions(from = "C2", to = "C6"): NoteOption[] {
  const start = noteToMidi(from);
  const end = noteToMidi(to);
  if (start === null || end === null) return [];
  const options: NoteOption[] = [];
  for (let midi = start; midi <= end; midi += 1) {
    const id = midiToNote(midi);
    options.push({ id, label: formatNoteLabel(id), midi });
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
