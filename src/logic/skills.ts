import type { DevelopmentTrack, Skill } from "../types";

export const TRACK_LABELS: Record<DevelopmentTrack, string> = {
  voiceBreath: "знакомство с голосом, дыхание и базовая координация",
  intonationRegisters: "интонация, ритм и соединение регистров",
  dictionTone: "дикция, артикуляция и качество звучания",
  musicality: "музыкальность, динамика и выразительность",
  stagecraft: "сценическое движение и артистизм",
};

const SKILL_TO_TRACK: Record<Exclude<Skill, "unsure">, DevelopmentTrack> = {
  melody: "intonationRegisters",
  rhythm: "intonationRegisters",
  breath: "voiceBreath",
  registers: "intonationRegisters",
  diction: "dictionTone",
  expression: "musicality",
  stage: "stagecraft",
};

export function tracksFromSkills(skills: Skill[]): DevelopmentTrack[] {
  if (skills.includes("unsure") || skills.length === 0) {
    return [];
  }
  return [...new Set(skills.filter((s): s is Exclude<Skill, "unsure"> => s !== "unsure").map((s) => SKILL_TO_TRACK[s]))];
}

export function missingTracks(skills: Skill[]): DevelopmentTrack[] {
  if (skills.includes("unsure") || skills.length === 0) {
    return [
      "voiceBreath",
      "intonationRegisters",
      "dictionTone",
      "musicality",
      "stagecraft",
    ];
  }
  const present = new Set(tracksFromSkills(skills));
  return (Object.keys(TRACK_LABELS) as DevelopmentTrack[]).filter((t) => !present.has(t));
}
