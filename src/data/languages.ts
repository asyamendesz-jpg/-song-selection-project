import type { OtherLanguageCode } from "../types";

export const OTHER_LANGUAGE_LABEL: Record<OtherLanguageCode, string> = {
  de: "немецкий",
  fr: "французский",
  ko: "корейский",
  ro: "румынский",
};

const OTHER_LANGUAGE_ALIASES: Record<string, OtherLanguageCode> = {
  de: "de",
  german: "de",
  deutsch: "de",
  немецкий: "de",
  немецком: "de",
  немецки: "de",
  "немецкий язык": "de",
  "на немецком": "de",
  fr: "fr",
  french: "fr",
  français: "fr",
  francais: "fr",
  французский: "fr",
  французском: "fr",
  французски: "fr",
  "французский язык": "fr",
  "на французском": "fr",
  ko: "ko",
  korean: "ko",
  한국어: "ko",
  корейский: "ko",
  корейском: "ko",
  корейски: "ko",
  "корейский язык": "ko",
  "на корейском": "ko",
  ro: "ro",
  romanian: "ro",
  română: "ro",
  romana: "ro",
  румынский: "ro",
  румынском: "ro",
  румынски: "ro",
  "румынский язык": "ro",
  "на румынском": "ro",
};

function normalizeLanguageQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveOtherLanguageCode(raw: string): OtherLanguageCode | null {
  const key = normalizeLanguageQuery(raw);
  if (!key) return null;
  return OTHER_LANGUAGE_ALIASES[key] ?? null;
}
