import { CATALOG } from "../data/catalog";
import { OTHER_LANGUAGE_LABEL, resolveOtherLanguageCode } from "../data/languages";
import { rangeSpanSemitones, userRangeCoversSong } from "../data/notes";
import {
  COPY,
  EXPERIENCE_OPTIONS,
  FOCUS_OPTIONS,
  SKILL_OPTIONS,
} from "../data/questions";
import {
  SHEET_MISSING,
  instrumentalSheets,
  resolvedSheetFilter,
  sheetCaption,
  sheetLinkLabel,
  sheetsForFilter,
  songHasRequiredSheets,
} from "./sheetMusic";
import type {
  Answers,
  Focus,
  Genre,
  LyricAge,
  MatchResult,
  Purpose,
  RankedSong,
  Song,
} from "../types";

const PURPOSE_LABEL: Record<Purpose, string> = {
  pleasure: "для удовольствия",
  lessons: "для занятий вокалом",
  karaoke: "для караоке",
  recording: "для записи или видео",
  performance: "для выступления",
};

const MOOD_LABEL: Record<NonNullable<Answers["moods"][number]>, string> = {
  tender: "нежное и лиричное",
  calm: "спокойное и задумчивое",
  joyful: "радостное и лёгкое",
  energetic: "энергичное и драйвовое",
  dramatic: "драматичное",
  surprise: "удивите меня",
};

const GENRE_LABEL: Record<Genre, string> = {
  pop: "поп",
  rock: "рок",
  indie: "инди / акустика",
  rnb: "R&B / соул",
  jazz: "джаз",
  classical: "классика / романсы",
  musical: "мюзиклы / песни из кино",
  rap: "рэп / хип-хоп",
  children: "детские песни",
  bard: "авторская песня",
  other: "другое",
  explore: "разные направления",
};

const FOCUS_TO_TASK: Record<Focus, string[]> = {
  intonation: ["интонация", "ритм", "ровн"],
  breath: ["дыхан", "фраз", "легато"],
  diction: ["дикц", "текст", "соглас", "артикул"],
  expression: ["выразит", "динамик", "эмоц", "подач"],
  stage: ["сцен", "движен", "артист"],
  comfort: [],
};

function parseAge(raw: string): number | null {
  const age = Number(raw);
  if (!Number.isInteger(age) || age < 5 || age > 99) return null;
  return age;
}

function allowedLyricAges(age: number): LyricAge[] {
  if (age < 12) return ["all"];
  if (age < 16) return ["all", "12plus"];
  if (age < 18) return ["all", "12plus", "16plus"];
  return ["all", "12plus", "16plus", "18plus"];
}

function hasVerifiedRange(song: Song): boolean {
  return (
    song.verification.status === "rangeChecked" &&
    song.rangeLow !== null &&
    song.rangeHigh !== null
  );
}

function languageOk(song: Song, answers: Answers): boolean {
  if (answers.languages.includes("any") || answers.languages.length === 0) {
    return true;
  }
  return answers.languages.some((choice) => {
    if (choice === "ru" || choice === "en") return song.language === choice;
    if (choice === "other") {
      const code = resolveOtherLanguageCode(answers.otherLanguage);
      if (!code) return false;
      return song.language === "other" && song.otherLanguage === code;
    }
    return false;
  });
}

function selectedGenres(answers: Answers): Exclude<Genre, "other" | "explore">[] {
  return answers.genres.filter((g): g is Exclude<Genre, "other" | "explore"> => g !== "explore" && g !== "other");
}

function wantsExplore(answers: Answers): boolean {
  return answers.genres.includes("explore") || answers.genres.length === 0;
}

function genreOverlap(song: Song, answers: Answers): number {
  if (wantsExplore(answers)) return 1;
  const selected = selectedGenres(answers);
  if (selected.length === 0 && answers.genres.includes("other")) return 1;
  return song.genres.filter((g) => selected.includes(g)).length;
}

function moodOverlap(song: Song, answers: Answers): number {
  if (answers.moods.includes("surprise") && answers.moods.length === 1) return 1;
  const selected = answers.moods.filter((m) => m !== "surprise");
  if (selected.length === 0) return 1;
  return song.moods.filter((m) => selected.includes(m)).length;
}

function purposeFit(song: Song, answers: Answers): boolean {
  if (!answers.purpose) return true;
  return song.purposes.includes(answers.purpose);
}

function focusMatchesTask(focus: Focus, task: string): boolean {
  const needles = FOCUS_TO_TASK[focus];
  return needles.some((n) => task.toLowerCase().includes(n));
}

function teachingRangeBonus(song: Song, answers: Answers): number {
  if (!hasVerifiedRange(song)) return 0;
  if (song.rangeLow === null || song.rangeHigh === null) return 0;
  const span = rangeSpanSemitones(song.rangeLow, song.rangeHigh);
  if (span === null) return 0;
  const beginnerStage =
    answers.experience === "beginner" || answers.voiceChange === "yes";
  const nextStage = answers.experience === "practicing";
  if (beginnerStage && span <= 12) return 2;
  if (nextStage && span <= 19) return 1;
  return 0;
}

function tessituraBonus(song: Song, answers: Answers): number {
  if (answers.rangeMode !== "unknown") return 0;
  if (!answers.tessituraHint || answers.tessituraHint === "unsure") return 0;
  if (!song.tessitura) return 0;
  return song.tessitura === answers.tessituraHint ? 2 : 0;
}

function skillGapPenalty(song: Song, answers: Answers): number {
  if (!song.difficulty) return 0;
  let penalty = 0;
  const skills = answers.skills;
  if (skills.includes("unsure") || skills.length === 0) return 0;
  if (!skills.includes("melody") && song.difficulty.intonation >= 4) penalty += 2;
  if (!skills.includes("rhythm") && song.difficulty.rhythm >= 4) penalty += 2;
  if (!skills.includes("breath") && song.difficulty.breath >= 4) penalty += 2;
  if (!skills.includes("diction") && song.difficulty.diction >= 4) penalty += 2;
  if (!skills.includes("registers") && song.difficulty.vocalTechniques >= 4) penalty += 2;
  return penalty;
}

function joinPhrases(items: string[]): string {
  return items.join(", ");
}

function optionText<T extends string>(options: { id: T; label: string }[], id: T): string {
  const label = options.find((option) => option.id === id)?.label ?? id;
  return label.replace(/\.$/, "");
}

function formatUserNote(note: string): string {
  return note.replace("#", "♯");
}

function languageAnswer(answers: Answers): string {
  if (answers.languages.includes("any") || answers.languages.length === 0) {
    return "язык не принципиален";
  }
  return joinPhrases(
    answers.languages.map((choice) => {
      if (choice === "ru") return "русский";
      if (choice === "en") return "английский";
      if (choice === "other") {
        const code = resolveOtherLanguageCode(answers.otherLanguage);
        if (code) return OTHER_LANGUAGE_LABEL[code];
        const typed = answers.otherLanguage.trim();
        return typed ? `другой («${typed}» — не распознан)` : "другой (не указан)";
      }
      return choice;
    }),
  );
}

function buildReasons(song: Song, answers: Answers): RankedSong["reasons"] {
  const reasons: RankedSong["reasons"] = [];
  const genres = selectedGenres(answers);
  const matchedGenres = song.genres.filter((g) => genres.includes(g));
  if (wantsExplore(answers)) {
    reasons.push({
      text: "Вы выбрали «хочу попробовать разное», поэтому направление не сужалось одним жанром.",
    });
  } else if (matchedGenres.length) {
    reasons.push({
      text: `Совпало направление: ${joinPhrases(matchedGenres.map((g) => GENRE_LABEL[g]))}.`,
    });
  }

  const moods = answers.moods.filter((m) => m !== "surprise");
  const matchedMoods = song.moods.filter((m) => moods.includes(m));
  if (matchedMoods.length) {
    reasons.push({
      text: `Совпало настроение: ${joinPhrases(matchedMoods.map((m) => MOOD_LABEL[m]))}.`,
    });
  } else if (answers.moods.includes("surprise")) {
    reasons.push({
      text: "Вы выбрали «удивите меня», поэтому настроение не сужалось.",
    });
  }

  if (answers.languages.includes("any") || answers.languages.length === 0) {
    reasons.push({ text: "Язык не ограничивал подбор: вы указали, что он не принципиален." });
  } else if (answers.languages.includes("ru") && song.language === "ru") {
    reasons.push({ text: "Язык версии — русский, как вы указали." });
  } else if (answers.languages.includes("en") && song.language === "en") {
    reasons.push({ text: "Язык версии — английский, как вы указали." });
  } else if (answers.languages.includes("other") && song.language === "other" && song.otherLanguage) {
    reasons.push({
      text: `Язык версии — ${OTHER_LANGUAGE_LABEL[song.otherLanguage]}, как вы указали.`,
    });
  }

  return reasons.slice(0, 3);
}

function answerLines(answers: Answers): string[] {
  const lines: string[] = [];
  const age = parseAge(answers.age);
  if (age !== null) {
    const mod10 = age % 10;
    const mod100 = age % 100;
    const yearWord =
      mod10 === 1 && mod100 !== 11 ? "год" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "года" : "лет";
    lines.push(`Вы указали возраст: ${age} ${yearWord}.`);
  }
  if (answers.voiceChange === "yes") {
    lines.push("Вы указали, что голос сейчас меняется или звучит нестабильно.");
  } else if (answers.voiceChange === "no") {
    lines.push("Вы указали, что заметных изменений голоса сейчас нет.");
  } else if (answers.voiceChange === "unsure") {
    lines.push("Вы указали, что не уверены, меняется ли голос сейчас.");
  }
  if (answers.experience) {
    lines.push(`Вы указали опыт: ${optionText(EXPERIENCE_OPTIONS, answers.experience)}.`);
  }
  if (answers.skills.includes("unsure")) {
    lines.push("Вы указали, что пока затрудняетесь ответить про навыки.");
  } else if (answers.skills.length) {
    lines.push(
      `Вы указали, что уже получается: ${joinPhrases(answers.skills.map((id) => optionText(SKILL_OPTIONS, id)))}.`,
    );
  }
  lines.push(`Вы указали язык: ${languageAnswer(answers)}.`);
  if (wantsExplore(answers)) {
    lines.push("Вы указали направления: хотите попробовать разное.");
  } else {
    const genres = selectedGenres(answers)
      .map((g) => GENRE_LABEL[g])
      .concat(answers.otherGenre.trim() ? [`другое: ${answers.otherGenre.trim()}`] : []);
    if (genres.length) {
      lines.push(`Вы указали направления: ${joinPhrases(genres)}.`);
    }
  }
  if (answers.moods.length) {
    lines.push(`Вы указали настроение: ${joinPhrases(answers.moods.map((m) => MOOD_LABEL[m]))}.`);
  }
  if (answers.purpose) {
    lines.push(`Вы указали цель: ${PURPOSE_LABEL[answers.purpose]}.`);
  }
  const focuses = answers.focuses.filter((f) => f !== "comfort");
  if (answers.focuses.includes("comfort") && focuses.length === 0) {
    lines.push("Вы указали, что хотите просто найти удобные песни.");
  } else if (focuses.length) {
    lines.push(
      `Вы указали, над чем хочется поработать: ${joinPhrases(focuses.map((id) => optionText(FOCUS_OPTIONS, id)))}.`,
    );
  }
  if (answers.sheetFilter === "any") {
    lines.push("Вы указали нотный материал: можно без нот — идеи репертуара.");
  } else if (answers.sheetFilter === "vocal") {
    lines.push("Вы указали нотный материал: с вокальными нотами — бесплатными или платными.");
  } else if (answers.sheetFilter === "freeVocal") {
    lines.push("Вы указали нотный материал: только с бесплатными вокальными нотами.");
  }
  return lines;
}

export const PREVIEW_LIMIT = 5;

export function songsForScreen(result: MatchResult, expanded: boolean): RankedSong[] {
  if (expanded || result.songs.length <= PREVIEW_LIMIT) return result.songs;
  return result.songs.slice(0, PREVIEW_LIMIT);
}

export function remainingSongCount(result: MatchResult): number {
  return Math.max(0, result.songs.length - PREVIEW_LIMIT);
}

function coverageNotes(
  answers: Answers,
  ranked: Song[],
  preview: Song[],
): string[] {
  const notes: string[] = [];
  if (wantsExplore(answers)) return notes;
  const shownIds = new Set(preview.map((song) => song.id));
  for (const genre of selectedGenres(answers)) {
    const inCatalog = ranked.filter((song) => song.genres.includes(genre));
    const inShown = inCatalog.filter((song) => shownIds.has(song.id));
    const label = GENRE_LABEL[genre];
    if (inCatalog.length === 0) {
      notes.push(
        `По направлению «${label}» в подходящем каталоге совпадений нет: при выбранном языке, возрастной уместности текста и настроении таких песен нет.`,
      );
    } else if (inShown.length === 0) {
      notes.push(
        `По направлению «${label}» совпадения в подходящем каталоге есть, но они не вошли в показанные пять.`,
      );
    }
  }
  return notes;
}

function emptyReasons(answers: Answers, rejected: Record<string, number>): string[] {
  const reasons: string[] = [];
  if (rejected.language) {
    const extra = answers.languages.includes("other")
      ? resolveOtherLanguageCode(answers.otherLanguage)
        ? ` Запрос «${answers.otherLanguage.trim()}» не совпал ни с одним кодом языка в каталоге.`
        : " Указанный дополнительный язык не распознан или поле пустое: подборщик не подставляет другой язык вместо него."
      : "";
    reasons.push(`По выбранному языку в подходящем каталоге совпадений нет.${extra}`);
  }
  if (rejected.lyrics) {
    reasons.push("Часть песен скрыта из‑за предварительной возрастной уместности текста.");
  }
  if (rejected.range) {
    reasons.push("Для указанных удобных нот не нашлось версий с проверенным диапазоном конкретной аранжировки.");
  }
  if (rejected.genreMood && !rejected.language && !rejected.range) {
    reasons.push(
      "В подходящем каталоге нет песен, которые одновременно совпадают с выбранными направлениями и настроением.",
    );
  }
  if (rejected.sheets) {
    if (answers.sheetFilter === "freeVocal") {
      reasons.push(
        "Не найдены песни с бесплатными вокальными нотами под выбранные условия. Измените язык, направление или настроение либо явно выберите «Можно без нот — идеи репертуара». Режим автоматически не меняется.",
      );
    } else {
      reasons.push(
        "Не найдены песни с вокальными нотами под выбранные условия. Измените язык, направление или настроение либо явно выберите «Можно без нот — идеи репертуара». Режим автоматически не меняется.",
      );
    }
  }
  if (reasons.length === 0) {
    reasons.push("В подходящем каталоге нет песен, которые одновременно удовлетворяют выбранным ограничениям.");
  }
  return reasons;
}

export function matchSongs(answers: Answers, catalog: Song[] = CATALOG): MatchResult {
  const age = parseAge(answers.age) ?? 18;
  const lyricAllowed = allowedLyricAges(age);
  const knownRange =
    answers.rangeMode === "known" && Boolean(answers.lowNote) && Boolean(answers.highNote);

  const rejected = { language: 0, lyrics: 0, range: 0, genreMood: 0, sheets: 0 };
  const ranked: { song: Song; score: number; usedRange: boolean }[] = [];
  const catalogHasVerifiedRange = catalog.some(hasVerifiedRange);

  for (const song of catalog) {
    if (!languageOk(song, answers)) {
      rejected.language += 1;
      continue;
    }
    if (!lyricAllowed.includes(song.editorialAge.lyricAge)) {
      rejected.lyrics += 1;
      continue;
    }

    const verified = hasVerifiedRange(song);
    let usedRange = false;
    if (knownRange && verified) {
      if (!userRangeCoversSong(answers.lowNote, answers.highNote, song.rangeLow!, song.rangeHigh!)) {
        rejected.range += 1;
        continue;
      }
      usedRange = true;
    }

    const g = genreOverlap(song, answers);
    const m = moodOverlap(song, answers);
    const otherGenreOnly =
      answers.genres.includes("other") && selectedGenres(answers).length === 0 && !wantsExplore(answers);

    if (otherGenreOnly) {
      rejected.genreMood += 1;
      continue;
    }
    if (g === 0 && !wantsExplore(answers)) {
      rejected.genreMood += 1;
      continue;
    }
    if (m === 0 && !answers.moods.includes("surprise")) {
      rejected.genreMood += 1;
      continue;
    }
    if (!songHasRequiredSheets(song, answers.sheetFilter)) {
      rejected.sheets += 1;
      continue;
    }

    let score = 0;
    score += g * 4;
    score += m * 4;
    if (purposeFit(song, answers)) score += 3;
    if (verified) {
      score += teachingRangeBonus(song, answers);
      score += tessituraBonus(song, answers);
      score -= skillGapPenalty(song, answers);
      score += 1;
    }
    const focuses = answers.focuses.filter((f) => f !== "comfort");
    if (focuses.some((focus) => song.learningTasks.some((task) => focusMatchesTask(focus, task)))) {
      score += 3;
    }

    ranked.push({ song, score, usedRange });
  }

  ranked.sort((a, b) => b.score - a.score);
  const all = ranked.map(({ song }): RankedSong => ({
    song,
    reasons: buildReasons(song, answers),
    practice: [],
    statusLabel: "Предварительный вариант",
    sheets: sheetsForFilter(song, answers.sheetFilter),
    instrumentalSheets: resolvedSheetFilter(answers.sheetFilter) === "any" ? instrumentalSheets(song) : [],
  }));
  const previewSongs = all.slice(0, PREVIEW_LIMIT).map((item) => item.song);

  const rangeNote =
    knownRange && !catalogHasVerifiedRange
      ? `Вы указали удобные ноты: ${formatUserNote(answers.lowNote)}–${formatUserNote(answers.highNote)}. Они не использовались для отбора: в каталоге пока нет проверенных диапазонов.`
      : null;

  return {
    songs: all,
    intro: COPY.resultIntro,
    warning: COPY.resultWarning,
    answers: answerLines(answers),
    rangeNote,
    coverageNotes: coverageNotes(
      answers,
      ranked.map((item) => item.song),
      previewSongs,
    ),
    emptyReasons: all.length ? [] : emptyReasons(answers, rejected),
    matchedTotal: ranked.length,
  };
}

export function formatPlaylist(result: MatchResult): string {
  const lines = ["Подборщик песен — подборка для репетиции", "", result.intro, result.warning, ""];
  result.answers.forEach((s) => lines.push(`• ${s}`));
  if (result.rangeNote) {
    lines.push(`• ${result.rangeNote}`);
  }
  lines.push("");
  if (!result.songs.length) {
    result.emptyReasons.forEach((s) => lines.push(s));
    result.coverageNotes.forEach((s) => lines.push(s));
    return lines.join("\n");
  }
  result.songs.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.song.title} — ${item.song.artist}`);
    lines.push(`   Версия: ${item.song.version}`);
    lines.push(`   Статус: ${item.statusLabel}`);
    if (item.song.editorialAge.lyricReview === "needsCheck") {
      lines.push("   Текст требует проверки.");
    }
    if (!item.sheets.length) {
      lines.push(`   ${SHEET_MISSING}`);
    } else {
      item.sheets.forEach((source) => {
        lines.push(`   ${sheetLinkLabel(source)}: ${source.url}`);
        lines.push(`   ${sheetCaption(source)}`);
        lines.push(`   ${source.versionNote}`);
      });
    }
    item.instrumentalSheets.forEach((source) => {
      lines.push(`   ${sheetLinkLabel(source)}: ${source.url}`);
      lines.push(`   ${sheetCaption(source)}. Не вокальные ноты для пения.`);
      lines.push(`   ${source.versionNote}`);
    });
    lines.push("   Почему в подборке:");
    item.reasons.forEach((r) => lines.push(`   — ${r.text}`));
    if (item.practice.length) {
      lines.push("   Идея для занятия (обсудите с педагогом):");
      item.practice.forEach((idea) => lines.push(`   — ${idea}`));
    }
    lines.push("");
  });
  result.coverageNotes.forEach((n) => lines.push(n));
  return lines.join("\n");
}
