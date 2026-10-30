import type { Answers, SheetAccess, SheetFilter, SheetFormat, SheetMusicSource, Song } from "../types";

export const SHEET_MISSING = "Ссылка на ноты пока не добавлена";

export const SHEET_ACCESS_LABEL: Record<SheetAccess, string> = {
  free: "бесплатно",
  paid: "платно",
  registration: "нужна регистрация",
};

export const SHEET_FORMAT_LABEL: Record<SheetFormat, string> = {
  single: "отдельные ноты",
  collection: "сборник",
};

export function resolvedSheetFilter(filter: Answers["sheetFilter"]): SheetFilter {
  return filter ?? "vocal";
}

export function vocalSheets(song: Song): SheetMusicSource[] {
  return song.sheetMusic.filter((source) => source.kind === "vocal");
}

export function instrumentalSheets(song: Song): SheetMusicSource[] {
  return song.sheetMusic.filter((source) => source.kind === "instrumental");
}

export function sheetsForFilter(song: Song, filter: Answers["sheetFilter"]): SheetMusicSource[] {
  const vocal = vocalSheets(song);
  if (resolvedSheetFilter(filter) === "freeVocal") return vocal.filter((source) => source.access === "free");
  return vocal;
}

export function songHasRequiredSheets(song: Song, filter: Answers["sheetFilter"]): boolean {
  if (resolvedSheetFilter(filter) === "any") return true;
  return sheetsForFilter(song, filter).length > 0;
}

export function sheetSite(source: SheetMusicSource): string {
  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return source.publisher;
  }
}

export function sheetLinkLabel(source: SheetMusicSource): string {
  if (source.kind === "instrumental") return "Инструментальное переложение";
  if (source.access === "free") return "Открыть бесплатные ноты";
  if (source.format === "collection") return "Купить сборник с этой песней";
  return "Купить ноты";
}

export function sheetCaption(source: SheetMusicSource): string {
  const parts = [sheetSite(source), source.scoring];
  if (source.key) parts.push(`тональность ${source.key}`);
  if (source.registrationRequired) parts.push("нужна регистрация");
  const mismatch = source.sameAsRecommended
    ? ""
    : ". Другая аранжировка, не точное совпадение с рекомендованной записью";
  return `${parts.join("; ")}${mismatch}`;
}
