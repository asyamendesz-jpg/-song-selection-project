import { describe, expect, it } from "vitest";
import { CATALOG } from "./data/catalog";
import { resolveOtherLanguageCode } from "./data/languages";
import { matchSongs, remainingSongCount, songsForScreen } from "./logic/matching";
import { sheetLinkLabel } from "./logic/sheetMusic";
import { INITIAL_ANSWERS, needsVoiceChange, parseAgeInput, stepsFor } from "./logic/quizFlow";
import { toggleCapped, toggleExclusive } from "./logic/selection";
import type { Answers } from "./types";

function base(partial: Partial<Answers>): Answers {
  return {
    ...INITIAL_ANSWERS,
    age: "28",
    experience: "practicing",
    skills: ["melody", "rhythm"],
    rangeMode: "unknown",
    tessituraHint: "mid",
    genres: ["pop"],
    languages: ["ru"],
    moods: ["tender"],
    purpose: "lessons",
    focuses: ["comfort"],
    ...partial,
  };
}

describe("exclusive choices", () => {
  it("clears other skills when the user is unsure", () => {
    expect(toggleExclusive(["melody", "rhythm"], "unsure", "unsure", 8)).toEqual(["unsure"]);
    expect(toggleExclusive(["unsure"], "melody", "unsure", 8)).toEqual(["melody"]);
  });

  it("does not exceed the mood limit", () => {
    expect(toggleCapped(["tender", "calm"], "joyful", 2)).toEqual(["tender", "calm"]);
  });

  it("rejects an empty or impossible age", () => {
    expect(parseAgeInput("").ok).toBe(false);
    expect(parseAgeInput("abc").ok).toBe(false);
    expect(parseAgeInput("15").ok).toBe(true);
  });
});

describe("quiz flow", () => {
  it("preselects vocal sheets as the default material mode", () => {
    expect(INITIAL_ANSWERS.sheetFilter).toBe("vocal");
    expect(stepsFor(base({ age: "28" }))).toContain("sheetFilter");
  });

  it("asks about voice change only for ages 10-22", () => {
    expect(needsVoiceChange(base({ age: "16" }))).toBe(true);
    expect(needsVoiceChange(base({ age: "28" }))).toBe(false);
    expect(stepsFor(base({ age: "16" }))).toContain("voiceChange");
    expect(stepsFor(base({ age: "28", rangeMode: "known" }))).toContain("notes");
    expect(stepsFor(base({ age: "28", rangeMode: "unknown" }))).toContain("tessitura");
    expect(stepsFor(base({ age: "28" }))).toContain("sheetFilter");
    expect(stepsFor(base({ age: "28" })).at(-1)).toBe("sheetFilter");
  });
});

describe("catalog honesty", () => {
  it("contains 68 real songs, Adele, and no fictional studio acts", () => {
    expect(CATALOG).toHaveLength(68);
    expect(CATALOG.some((song) => song.id === "adele-someone")).toBe(true);
    expect(CATALOG.every((song) => song.artist !== "Учебная студия Подборщика")).toBe(true);
    expect(CATALOG.every((song) => song.artist !== "Song Picker Studio")).toBe(true);
    expect(CATALOG.every((song) => song.rangeLow === null && song.rangeHigh === null)).toBe(true);
    expect(CATALOG.every((song) => song.key === null && song.tessitura === null)).toBe(true);
    expect(CATALOG.every((song) => song.difficulty === null)).toBe(true);
    expect(CATALOG.every((song) => song.verification.status === "unverified")).toBe(true);
    expect(CATALOG.every((song) => Array.isArray(song.sheetMusic))).toBe(true);
    expect(CATALOG.every((song) => song.infoSource.urls.length > 0)).toBe(true);
    expect(CATALOG.every((song) => song.editorialAge.note.includes("редакторская"))).toBe(true);
    expect(CATALOG.every((song) => song.editorialAge.lyricReview === "preliminary" || song.editorialAge.lyricReview === "needsCheck")).toBe(
      true,
    );
  });

  it("does not treat lyricAge=all as the children's category", () => {
    const yellow = CATALOG.find((song) => song.id === "beatles-yellow-submarine");
    expect(yellow?.editorialAge.lyricAge).toBe("all");
    expect(yellow?.genres.includes("children")).toBe(false);
    expect(CATALOG.some((song) => song.genres.includes("children") && song.id === "shainsky-antoshka")).toBe(true);
  });

  it("credits Timofeevsky for Пусть бегут неуклюже", () => {
    const song = CATALOG.find((item) => item.id === "shainsky-neuklyuzhe");
    expect(song?.version).toMatch(/Тимофеевского/);
    expect(song?.version).not.toMatch(/Успенского/);
    expect(song?.infoSource.summary).toMatch(/Тимофеевского/);
  });

  it("records a source for ocean eyes", () => {
    const ocean = CATALOG.find((song) => song.id === "billie-ocean");
    expect(ocean?.infoSource.urls.some((url) => url.includes("Ocean_Eyes"))).toBe(true);
  });

  it("adds twelve sourced indie recordings without Molchat Doma or invented vocals", () => {
    const addedIds = [
      "national-fake-empire",
      "sufjan-mystery-of-love",
      "ironwine-naked",
      "gonzalez-heartbeats",
      "fleetfoxes-white-winter",
      "arcadefire-rebellion",
      "vampireweekend-oxford-comma",
      "bridgers-motion-sickness",
      "oqjav-kitay-gorod",
      "oqjav-cherdak",
      "sbpch-idealnoe-mesto",
      "sbpch-kolybelnaya",
    ];
    const ids = CATALOG.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of addedIds) {
      const song = CATALOG.find((item) => item.id === id);
      expect(song).toBeDefined();
      expect(song?.genres).toContain("indie");
      expect(song?.editorialAge.lyricReview).toBe("needsCheck");
      expect(song?.difficulty).toBeNull();
      expect(song?.rangeLow).toBeNull();
      expect(song?.rangeHigh).toBeNull();
      expect(song?.key).toBeNull();
      expect(song?.tessitura).toBeNull();
      expect(song?.verification.status).toBe("unverified");
    }
    expect(CATALOG.every((song) => !/молчат дома/i.test(song.artist))).toBe(true);
    expect(CATALOG.find((song) => song.id === "gonzalez-heartbeats")?.version).toMatch(/Veneer/);
    expect(CATALOG.find((song) => song.id === "gonzalez-heartbeats")?.version).toMatch(/не электронный оригинал/);
    expect(CATALOG.find((song) => song.id === "sufjan-mystery-of-love")?.version).toMatch(/Sufjan Stevens/);
  });

  it("stores verified sheet-music links separately from vocal verification", () => {
    const kids = ["shainsky-oblaka", "mamontenok", "krylatov-daleko", "shainsky-ulybka", "gladkov-solnyshke"];
    for (const id of kids) {
      const song = CATALOG.find((item) => item.id === id);
      expect(song?.sheetMusic.length).toBeGreaterThan(0);
      expect(song?.sheetMusic.every((item) => item.url.startsWith("https://"))).toBe(true);
      expect(song?.sheetMusic.every((item) => item.checkedAt === "2026-10-31")).toBe(true);
      expect(song?.verification.status).toBe("unverified");
      expect(song?.difficulty).toBeNull();
      expect(song?.key).toBeNull();
    }
    expect(CATALOG.find((song) => song.id === "krylatov-daleko")?.sheetMusic).toHaveLength(2);
    expect(CATALOG.find((song) => song.id === "shainsky-oblaka")?.sheetMusic).toHaveLength(2);
    expect(CATALOG.some((song) => song.sheetMusic.length === 0)).toBe(true);
    const schubertSheets = CATALOG.find((song) => song.id === "schubert-ave-maria")?.sheetMusic ?? [];
    expect(schubertSheets.every((source) => source.access === "free" && source.kind === "vocal")).toBe(true);
    expect(schubertSheets.some((source) => source.url.includes("mutopiaproject.org") && source.url.endsWith(".pdf"))).toBe(
      true,
    );
    expect(CATALOG.every((song) => song.sheetMusic.every((item) => !/google\.[^/]+\/search/i.test(item.url)))).toBe(
      true,
    );
    expect(CATALOG.every((song) => song.sheetMusic.every((item) => item.kind === "vocal" || item.kind === "instrumental"))).toBe(
      true,
    );
    const oblaka = CATALOG.find((song) => song.id === "shainsky-oblaka");
    expect(oblaka?.sheetMusic.some((item) => item.kind === "vocal")).toBe(true);
    expect(oblaka?.sheetMusic.some((item) => item.kind === "instrumental" && /piano-solo/.test(item.url))).toBe(true);
    expect(CATALOG.find((song) => song.id === "gladkov-solnyshke")?.sheetMusic[0]?.format).toBe("collection");
    expect(CATALOG.every((song) => song.sheetMusic.every((item) => item.registrationRequired === false))).toBe(true);
    const alyabyev = CATALOG.find((song) => song.id === "alyabyev-solovey");
    expect(alyabyev?.verification.status).toBe("unverified");
    expect(alyabyev?.rangeLow).toBeNull();
    expect(alyabyev?.sheetMusic).toHaveLength(1);
    expect(alyabyev?.sheetMusic[0]?.access).toBe("free");
    expect(alyabyev?.sheetMusic[0]?.kind).toBe("vocal");
    expect(alyabyev?.sheetMusic[0]?.format).toBe("single");
    expect(alyabyev?.sheetMusic[0]?.url).toBe("https://pbc.biaman.pl/Content/10241/PDF/s%C5%82owik.pdf");
    expect(sheetLinkLabel(alyabyev!.sheetMusic[0]!)).toBe("Открыть бесплатные ноты");
    const bereza = CATALOG.find((song) => song.id === "prach-vo-pole-bereza");
    expect(bereza?.editorialAge.lyricAge).toBe("12plus");
    expect(bereza?.genres).not.toContain("children");
    expect(bereza?.sheetMusic[0]?.format).toBe("collection");
    expect(bereza?.sheetMusic[0]?.collectionPdfPage).toBe(138);
    expect(bereza?.sheetMusic[0]?.collectionPrintPage).toBe(30);
    expect(sheetLinkLabel(bereza!.sheetMusic[0]!)).toBe(
      "Открыть бесплатный сборник — страница 138 PDF, печатная 30",
    );
    const freeVocal = CATALOG.filter((song) =>
      song.sheetMusic.some((item) => item.access === "free" && item.kind === "vocal"),
    );
    expect(freeVocal.map((song) => song.id).sort()).toEqual(
      ["alyabyev-solovey", "prach-vo-pole-bereza", "schubert-ave-maria"].sort(),
    );
  });
});

describe("matching", () => {
  it("does not claim a verified range or voice match when vocal data are unknown", () => {
    const result = matchSongs(
      base({
        rangeMode: "known",
        lowNote: "C4",
        highNote: "C5",
        tessituraHint: "mid",
        genres: ["pop"],
        moods: ["tender"],
      }),
    );
    expect(result.songs.length).toBeGreaterThan(0);
    expect(result.songs.every((item) => item.statusLabel === "Предварительный вариант")).toBe(true);
    expect(result.songs.every((item) => item.song.id !== "demo-rain")).toBe(true);
    expect(result.songs.every((item) => !item.reasons.some((reason) => /проверенный диапазон/i.test(reason.text)))).toBe(
      true,
    );
    expect(result.songs.every((item) => !item.reasons.some((reason) => /тесситур|удобнее низкое|удобнее среднее/i.test(reason.text)))).toBe(
      true,
    );
    expect(result.songs.every((item) => !item.reasons.some((reason) => /подходит для занятий|подходит вашему голосу|песня удобна/i.test(reason.text)))).toBe(
      true,
    );
    expect(result.warning).toMatch(/соответствие песен вашему голосу не проверено/i);
    expect(result.rangeNote).toMatch(/Вы указали удобные ноты: C4–C5/);
    expect(result.rangeNote).toMatch(/не использовались для отбора/);
    expect(result.answers.every((line) => !/свободнее выглядят|неравномерно/i.test(line))).toBe(true);
  });

  it("shows bard songs for Авторская песня and not as generic rock", () => {
    const withBard = matchSongs(
      base({
        genres: ["bard"],
        moods: ["dramatic"],
        languages: ["ru"],
        age: "28",
      }),
    );
    expect(withBard.songs.some((item) => item.song.id === "vysotsky-koni")).toBe(true);

    const withRock = matchSongs(
      base({
        genres: ["rock"],
        moods: ["dramatic"],
        languages: ["ru"],
        age: "28",
      }),
    );
    expect(withRock.songs.some((item) => item.song.id === "vysotsky-koni")).toBe(false);
  });

  it("does not invent songs for a free-text genre that the catalog does not tag", () => {
    const result = matchSongs(
      base({
        genres: ["other"],
        otherGenre: "шансон",
        moods: ["tender"],
      }),
    );
    expect(result.songs).toHaveLength(0);
    expect(result.emptyReasons.join(" ")).toMatch(/нет песен|каталоге/i);
  });

  it("does not invent a match for an unsupported language", () => {
    const result = matchSongs(
      base({
        languages: ["other"],
        otherLanguage: "японский",
        genres: ["explore"],
        moods: ["surprise"],
      }),
    );
    expect(result.songs).toHaveLength(0);
    expect(result.emptyReasons.join(" ")).toMatch(/язык/i);
    expect(result.emptyReasons.join(" ")).toMatch(/не распознан|не подставляет/i);
  });

  it("matches additional languages only by exact code after synonyms", () => {
    expect(resolveOtherLanguageCode("французский")).toBe("fr");
    expect(resolveOtherLanguageCode("French")).toBe("fr");
    expect(resolveOtherLanguageCode("японский")).toBeNull();
    expect(resolveOtherLanguageCode("")).toBeNull();
    expect(resolveOtherLanguageCode("фр")).toBeNull();

    const french = matchSongs(
      base({
        age: "30",
        languages: ["other"],
        otherLanguage: "французский",
        genres: ["pop"],
        moods: ["energetic"],
        sheetFilter: "any",
      }),
    );
    expect(french.songs.some((item) => item.song.id === "stromae-alors")).toBe(true);
    expect(french.songs.every((item) => item.song.otherLanguage === "fr")).toBe(true);

    const emptyOther = matchSongs(
      base({
        languages: ["other"],
        otherLanguage: "",
        genres: ["explore"],
        moods: ["surprise"],
      }),
    );
    expect(emptyOther.songs).toHaveLength(0);
  });

  it("filters lyrics by editorial age", () => {
    const child = matchSongs(
      base({
        age: "11",
        genres: ["explore"],
        moods: ["joyful"],
        languages: ["ru"],
      }),
    );
    expect(child.songs.some((item) => item.song.id === "leningrad-eksponat")).toBe(false);
    expect(child.songs.some((item) => item.song.id === "zemfira-hochesh")).toBe(false);
    expect(child.songs.some((item) => item.song.editorialAge.lyricAge === "all")).toBe(true);

    const adult = matchSongs(
      base({
        age: "30",
        genres: ["rock", "pop"],
        moods: ["energetic", "joyful"],
        languages: ["ru"],
        purpose: "karaoke",
        sheetFilter: "any",
      }),
    );
    expect(adult.songs.some((item) => item.song.id === "leningrad-eksponat")).toBe(true);
  });

  it("still returns a caution when the voice feels unstable, without claiming verified difficulty", () => {
    const result = matchSongs(
      base({
        age: "14",
        voiceChange: "yes",
        experience: "beginner",
        genres: ["explore"],
        moods: ["tender", "calm"],
        rangeMode: "unknown",
        tessituraHint: "unsure",
      }),
    );
    expect(result.answers.some((line) => /голос сейчас меняется/i.test(line))).toBe(true);
    expect(result.songs.length).toBeGreaterThan(0);
    expect(result.songs.every((item) => item.song.difficulty === null)).toBe(true);
    expect(result.songs.every((item) => item.practice.length === 0)).toBe(true);
  });

  it("covers child, teen and adult paths without mixing age floors", () => {
    const child = matchSongs(
      base({
        age: "10",
        genres: ["children"],
        moods: ["joyful"],
        languages: ["ru"],
        purpose: "pleasure",
      }),
    );
    expect(child.songs.length).toBeGreaterThan(0);
    expect(child.songs.every((item) => item.song.genres.includes("children"))).toBe(true);
    expect(child.songs.every((item) => item.song.editorialAge.lyricAge === "all")).toBe(true);
    expect(child.songs.every((item) => item.song.id !== "beatles-yellow-submarine")).toBe(true);
    expect(child.songs.every((item) => item.song.id !== "leningrad-eksponat")).toBe(true);

    const teen = matchSongs(
      base({
        age: "14",
        genres: ["pop"],
        moods: ["joyful"],
        languages: ["en"],
      }),
    );
    expect(teen.songs.length).toBeGreaterThan(0);
    expect(teen.songs.every((item) => item.song.editorialAge.lyricAge !== "16plus")).toBe(true);
    expect(teen.songs.every((item) => item.song.editorialAge.lyricAge !== "18plus")).toBe(true);

    const adult = matchSongs(
      base({
        age: "30",
        genres: ["rock", "pop"],
        moods: ["energetic", "joyful"],
        languages: ["ru"],
        purpose: "karaoke",
        sheetFilter: "any",
      }),
    );
    expect(adult.songs.some((item) => item.song.id === "leningrad-eksponat")).toBe(true);
  });

  it("explains the 11-year-old indie + musical + children query without claiming a voice fit", () => {
    const result = matchSongs(
      base({
        age: "11",
        rangeMode: "known",
        lowNote: "C4",
        highNote: "C5",
        genres: ["indie", "musical", "children"],
        languages: ["ru"],
        moods: ["tender", "calm"],
        purpose: "lessons",
        focuses: ["comfort"],
      }),
    );
    expect(result.songs.length).toBe(result.matchedTotal);
    expect(result.matchedTotal).toBeGreaterThan(5);
    expect(songsForScreen(result, false)).toHaveLength(5);
    expect(songsForScreen(result, true)).toHaveLength(result.matchedTotal);
    expect(remainingSongCount(result)).toBe(result.matchedTotal - 5);
    expect(result.songs.every((item) => item.song.language === "ru")).toBe(true);
    expect(result.songs.every((item) => item.song.editorialAge.lyricAge === "all")).toBe(true);
    expect(result.songs.every((item) => item.song.genres.some((g) => g === "indie" || g === "musical" || g === "children"))).toBe(
      true,
    );
    expect(result.coverageNotes.some((line) => /инди \/ акустика/.test(line) && /совпадений нет/.test(line))).toBe(true);
    expect(result.coverageNotes.every((line) => !/инди \/ акустика/.test(line) || !/не вошли в показанные пять/.test(line))).toBe(
      true,
    );
    expect(result.rangeNote).toBe(
      "Вы указали удобные ноты: C4–C5. Они не использовались для отбора: в каталоге пока нет проверенных диапазонов.",
    );
    expect(result.intro).toMatch(/цель влияет на порядок/i);
    expect(result.warning).toBe(
      "Это предварительная подборка по вашим предпочтениям. Соответствие песен вашему голосу не проверено. Удобную тональность и аранжировку лучше подобрать с педагогом.",
    );
    expect(result.answers.some((line) => line === "Вы указали возраст: 11 лет.")).toBe(true);
    expect(result.songs.every((item) => item.reasons.length >= 2 && item.reasons.length <= 3)).toBe(true);
    expect(result.songs.every((item) => item.practice.length === 0)).toBe(true);
  });

  it("keeps age 50 from excluding 12plus indie lyrics and leaves the ru dramatic gap empty", () => {
    const moods = ["tender", "calm", "joyful", "energetic", "dramatic"] as const;
    const byLang: Record<"ru" | "en", Record<(typeof moods)[number], string[]>> = {
      ru: { tender: [], calm: [], joyful: [], energetic: [], dramatic: [] },
      en: { tender: [], calm: [], joyful: [], energetic: [], dramatic: [] },
    };
    for (const language of ["ru", "en"] as const) {
      for (const mood of moods) {
        const result = matchSongs(
          base({
            age: "50",
            genres: ["indie"],
            languages: [language],
            moods: [mood],
            purpose: "pleasure",
            sheetFilter: "any",
          }),
        );
        expect(result.songs.every((item) => item.song.language === language)).toBe(true);
        expect(result.songs.every((item) => item.song.genres.includes("indie"))).toBe(true);
        expect(result.songs.every((item) => item.song.moods.includes(mood))).toBe(true);
        expect(
          result.songs.every((item) =>
            ["all", "12plus", "16plus", "18plus"].includes(item.song.editorialAge.lyricAge),
          ),
        ).toBe(true);
        byLang[language][mood] = result.songs.map((item) => item.song.id);
      }
    }
    expect(byLang.ru.tender).toEqual(expect.arrayContaining(["sbpch-kolybelnaya", "oqjav-cherdak"]));
    expect(byLang.ru.calm).toEqual(expect.arrayContaining(["sbpch-kolybelnaya", "oqjav-cherdak"]));
    expect(byLang.ru.joyful).toContain("sbpch-idealnoe-mesto");
    expect(byLang.ru.energetic).toEqual(expect.arrayContaining(["mumiy-vladivostok", "oqjav-kitay-gorod"]));
    expect(byLang.ru.dramatic).toEqual([]);
    expect(byLang.en.tender.length).toBeGreaterThan(0);
    expect(byLang.en.calm.length).toBeGreaterThan(0);
    expect(byLang.en.joyful.length).toBeGreaterThan(0);
    expect(byLang.en.energetic.length).toBeGreaterThan(0);
    expect(byLang.en.dramatic.length).toBeGreaterThan(0);
    expect(byLang.en.energetic).toEqual(
      expect.arrayContaining(["arcadefire-rebellion", "vampireweekend-oxford-comma", "bridgers-motion-sickness"]),
    );
  });

  it("keeps all matches internally and previews only the first five", () => {
    const catalogSlice = (count: number) => CATALOG.slice(0, count);
    const openAnswers = base({
      age: "30",
      genres: ["explore"],
      moods: ["surprise"],
      languages: ["any"],
      sheetFilter: "any",
    });

    const none = matchSongs(openAnswers, []);
    expect(none.songs).toHaveLength(0);
    expect(none.matchedTotal).toBe(0);
    expect(songsForScreen(none, false)).toHaveLength(0);
    expect(remainingSongCount(none)).toBe(0);

    const one = matchSongs(openAnswers, catalogSlice(1));
    expect(one.songs).toHaveLength(1);
    expect(songsForScreen(one, false)).toHaveLength(1);
    expect(remainingSongCount(one)).toBe(0);

    const five = matchSongs(openAnswers, catalogSlice(5));
    expect(five.songs).toHaveLength(5);
    expect(songsForScreen(five, false)).toHaveLength(5);
    expect(remainingSongCount(five)).toBe(0);

    const six = matchSongs(openAnswers, catalogSlice(6));
    expect(six.songs).toHaveLength(6);
    expect(songsForScreen(six, false)).toHaveLength(5);
    expect(songsForScreen(six, true).map((item) => item.song.id)).toEqual(six.songs.map((item) => item.song.id));
    expect(remainingSongCount(six)).toBe(1);

    const many = matchSongs(openAnswers);
    expect(many.matchedTotal).toBeGreaterThan(6);
    expect(songsForScreen(many, false)).toHaveLength(5);
    expect(remainingSongCount(many)).toBe(many.matchedTotal - 5);
  });

  it("keeps any-sheet mode unchanged and does not treat piano solo as singing notes", () => {
    const anyMode = matchSongs(
      base({
        age: "11",
        genres: ["children"],
        languages: ["ru"],
        moods: ["tender", "calm"],
        sheetFilter: "any",
      }),
    );
    const oblaka = anyMode.songs.find((item) => item.song.id === "shainsky-oblaka");
    expect(oblaka).toBeDefined();
    expect(oblaka?.sheets.every((source) => source.kind === "vocal")).toBe(true);
    expect(oblaka?.instrumentalSheets.some((source) => /piano-solo/.test(source.url))).toBe(true);

    const vocalOnly = matchSongs(
      base({
        age: "11",
        genres: ["children"],
        languages: ["ru"],
        moods: ["tender", "calm"],
        sheetFilter: "vocal",
      }),
    );
    expect(vocalOnly.songs.length).toBeGreaterThan(0);
    expect(vocalOnly.songs.every((item) => item.sheets.some((source) => source.kind === "vocal"))).toBe(true);
    expect(vocalOnly.songs.every((item) => item.instrumentalSheets.length === 0)).toBe(true);
    expect(vocalOnly.songs.every((item) => item.song.verification.status === "unverified")).toBe(true);
    expect(vocalOnly.answers.some((line) => /бесплатными или платными/.test(line))).toBe(true);
    expect(INITIAL_ANSWERS.sheetFilter).toBe("vocal");
  });

  it("shows only songs with verified vocal sheets and explains an empty sheet result", () => {
    const defaultVocal = matchSongs(
      base({
        age: "30",
        genres: ["rap"],
        languages: ["ru"],
        moods: ["energetic"],
      }),
    );
    expect(defaultVocal.songs.some((item) => item.song.id === "korzh-zhit")).toBe(true);
    expect(defaultVocal.songs.every((item) => item.sheets.length > 0)).toBe(true);
    expect(defaultVocal.songs.some((item) => item.sheets.some((source) => source.url.includes("piano-vocal")))).toBe(
      true,
    );

    const vocalRap = matchSongs(
      base({
        age: "30",
        genres: ["bard"],
        languages: ["ru"],
        moods: ["calm"],
        sheetFilter: "vocal",
      }),
    );
    expect(vocalRap.songs).toHaveLength(0);
    expect(vocalRap.emptyReasons.join(" ")).toMatch(/не найдены песни с вокальными нотами/i);
    expect(vocalRap.emptyReasons.join(" ")).toMatch(/идеи репертуара/i);
    expect(vocalRap.emptyReasons.join(" ")).toMatch(/автоматически не меняется/i);

    const freeChildren = matchSongs(
      base({
        age: "11",
        genres: ["children"],
        languages: ["ru"],
        moods: ["joyful"],
        sheetFilter: "freeVocal",
      }),
    );
    expect(freeChildren.songs).toHaveLength(0);
    expect(freeChildren.emptyReasons.join(" ")).toMatch(/бесплатн/i);
    expect(freeChildren.emptyReasons.join(" ")).toMatch(/идеи репертуара/i);

    const freeAny = matchSongs(
      base({
        age: "30",
        genres: ["explore"],
        languages: ["any"],
        moods: ["surprise"],
        sheetFilter: "freeVocal",
      }),
    );
    expect(freeAny.songs.map((item) => item.song.id)).toEqual([
      "schubert-ave-maria",
      "alyabyev-solovey",
      "prach-vo-pole-bereza",
    ]);
    expect(freeAny.songs[0]?.sheets.every((source) => source.access === "free" && source.kind === "vocal")).toBe(true);
    expect(freeAny.songs[0]?.sheets[0]?.url).toContain("mutopiaproject.org");
    expect(sheetLinkLabel(freeAny.songs[0]!.sheets[0]!)).toBe("Открыть бесплатные ноты");
    expect(freeAny.answers.some((line) => /бесплатными вокальными нотами/.test(line))).toBe(true);

    const germanRomance = matchSongs(
      base({
        age: "28",
        genres: ["classical"],
        languages: ["other"],
        otherLanguage: "немецкий",
        moods: ["tender"],
        sheetFilter: "freeVocal",
      }),
    );
    expect(germanRomance.songs.map((item) => item.song.id)).toEqual(["schubert-ave-maria"]);

    const ruRomanceFree = matchSongs(
      base({
        age: "28",
        genres: ["classical"],
        languages: ["ru"],
        moods: ["dramatic"],
        sheetFilter: "freeVocal",
      }),
    );
    expect(ruRomanceFree.songs).toHaveLength(0);

    const ruAdultFree = matchSongs(
      base({
        age: "35",
        genres: ["classical"],
        languages: ["ru"],
        moods: ["tender"],
        purpose: "lessons",
        sheetFilter: "freeVocal",
      }),
    );
    expect(ruAdultFree.songs.map((item) => item.song.id)).toEqual(["alyabyev-solovey"]);
    expect(sheetLinkLabel(ruAdultFree.songs[0]!.sheets[0]!)).toBe("Открыть бесплатные ноты");

    const ruFolkFree = matchSongs(
      base({
        age: "35",
        genres: ["classical"],
        languages: ["ru"],
        moods: ["joyful"],
        purpose: "lessons",
        sheetFilter: "freeVocal",
      }),
    );
    expect(ruFolkFree.songs.map((item) => item.song.id)).toEqual(["prach-vo-pole-bereza"]);
    expect(sheetLinkLabel(ruFolkFree.songs[0]!.sheets[0]!)).toBe(
      "Открыть бесплатный сборник — страница 138 PDF, печатная 30",
    );
  });
});
