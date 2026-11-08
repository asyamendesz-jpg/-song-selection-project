import { describe, expect, it } from "vitest";
import {
  NOTE_OPTIONS,
  formatNoteLabel,
  formatNoteRange,
  midiToNote,
  noteToMidi,
  parseNote,
} from "./data/notes";

describe("scientific pitch notation", () => {
  it("maps C4 to MIDI 60 as до первой октавы, without shifting the octave numbers", () => {
    expect(noteToMidi("C4")).toBe(60);
    expect(noteToMidi("C3")).toBe(48);
    expect(noteToMidi("C5")).toBe(72);
    expect(noteToMidi("A4")).toBe(69);
    expect(midiToNote(60)).toBe("C4");
    expect(midiToNote(48)).toBe("C3");
    expect(midiToNote(72)).toBe("C5");
  });

  it("keeps B as si and does not treat German B as si-flat", () => {
    expect(noteToMidi("B3")).toBe(59);
    expect(noteToMidi("C4")).toBe(60);
    expect(noteToMidi("B4")).toBe(71);
    expect(noteToMidi("C5")).toBe(72);
    expect(noteToMidi("Bb3")).toBe(58);
    expect(noteToMidi("H3")).toBeNull();
    expect(parseNote("H3")).toBeNull();
    expect(parseNote("B3")?.pitchClass).toBe(11);
    expect(parseNote("Bb3")?.pitchClass).toBe(10);
  });

  it("labels notes in Russian with international ids in parentheses", () => {
    expect(formatNoteLabel("C4")).toBe("До первой октавы (C4)");
    expect(formatNoteLabel("G3")).toBe("Соль малой октавы (G3)");
    expect(formatNoteLabel("C5")).toBe("До второй октавы (C5)");
    expect(formatNoteLabel("C#4")).toBe("До-диез первой октавы (C#4)");
    expect(formatNoteLabel("Bb3")).toBe("Си-бемоль малой октавы (Bb3)");
    expect(formatNoteRange("C4", "C5")).toBe("От до первой октавы до до второй октавы (C4–C5)");
    expect(NOTE_OPTIONS.find((note) => note.id === "C4")?.label).toBe("До первой октавы (C4)");
    expect(NOTE_OPTIONS.find((note) => note.id === "G3")?.label).toBe("Соль малой октавы (G3)");
    expect(NOTE_OPTIONS.find((note) => note.id === "B3")?.midi).toBe(59);
    const c4 = NOTE_OPTIONS.find((note) => note.id === "C4");
    const b3 = NOTE_OPTIONS.find((note) => note.id === "B3");
    expect(c4 && b3 && c4.midi - b3.midi).toBe(1);
  });
});
