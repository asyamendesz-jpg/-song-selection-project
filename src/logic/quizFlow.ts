import type { Answers, StepId } from "../types";

export const INITIAL_ANSWERS: Answers = {
  age: "",
  voiceChange: null,
  experience: null,
  skills: [],
  rangeMode: null,
  lowNote: "C4",
  highNote: "C5",
  tessituraHint: null,
  genres: [],
  otherGenre: "",
  languages: [],
  otherLanguage: "",
  moods: [],
  purpose: null,
  focuses: [],
  sheetFilter: "vocal",
};

export function needsVoiceChange(answers: Answers): boolean {
  const age = Number(answers.age);
  return Number.isInteger(age) && age >= 10 && age <= 22;
}

export function stepsFor(answers: Answers): StepId[] {
  const steps: StepId[] = ["age"];
  if (needsVoiceChange(answers)) steps.push("voiceChange");
  steps.push("experience", "skills", "rangeMode");
  if (answers.rangeMode === "known") steps.push("notes");
  if (answers.rangeMode === "unknown") steps.push("tessitura");
  steps.push("genres", "languages", "moods", "purpose", "focuses", "sheetFilter");
  return steps;
}

export function parseAgeInput(value: string): { ok: boolean; message: string } {
  if (value.trim() === "") {
    return { ok: false, message: "Укажите возраст цифрами." };
  }
  if (!/^\d+$/.test(value.trim())) {
    return { ok: false, message: "Возраст должен быть целым числом." };
  }
  const age = Number(value);
  if (age < 5 || age > 99) {
    return { ok: false, message: "Укажите возраст от 5 до 99 лет." };
  }
  return { ok: true, message: "" };
}

export const SKILL_EXCLUSIVE = "unsure";
export const GENRE_EXCLUSIVE = "explore";
export const LANGUAGE_EXCLUSIVE = "any";
