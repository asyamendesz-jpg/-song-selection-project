import { inflateRawSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOG } from "./data/catalog";
import { buildPlaylistDocxBuffer, playlistDocxFilename } from "./logic/exportDocx";
import { matchSongs } from "./logic/matching";
import { INITIAL_ANSWERS } from "./logic/quizFlow";
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

function zipEntry(buffer: Uint8Array, name: string): string {
  const view = Buffer.from(buffer);
  let offset = 0;
  while (offset + 30 < view.length) {
    if (view.readUInt32LE(offset) !== 0x04034b50) break;
    const method = view.readUInt16LE(offset + 8);
    const compressedSize = view.readUInt32LE(offset + 18);
    const nameLength = view.readUInt16LE(offset + 26);
    const extraLength = view.readUInt16LE(offset + 28);
    const fileName = view.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    const dataStart = offset + 30 + nameLength + extraLength;
    const data = view.subarray(dataStart, dataStart + compressedSize);
    if (fileName === name) {
      if (method === 0) return data.toString("utf8");
      if (method === 8) return inflateRawSync(data).toString("utf8");
      throw new Error(`unsupported zip method ${method}`);
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`zip entry not found: ${name}`);
}

describe("Word export", () => {
  it("names the file with the local calendar date", () => {
    expect(playlistDocxFilename(new Date(2026, 9, 30))).toBe("Подборка_песен_2026-10-30.docx");
  });

  it("builds a real OOXML document for a filled result, with Cyrillic and shown songs only", async () => {
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
      }),
    );
    const buffer = await buildPlaylistDocxBuffer(result, new Date(2026, 9, 30));
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    const types = zipEntry(buffer, "[Content_Types].xml");
    expect(types).toMatch(/application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document\.main\+xml/);
    const xml = zipEntry(buffer, "word/document.xml");
    expect(xml).toContain("Ваша подборка песен");
    expect(xml).toContain("Times New Roman");
    expect(xml).toContain("Соответствие песен вашему голосу не проверено");
    expect(xml).toContain("Вы указали возраст: 11 лет.");
    expect(xml).toContain("C4");
    expect(xml).toContain("не использовались для отбора");
    expect(xml).toContain(`В документ включено песен: ${result.matchedTotal}`);
    expect(xml).not.toContain("Показаны 5 из");
    expect(xml).not.toContain("Показано песен:");
    expect(xml).toContain("инди / акустика");
    expect(result.matchedTotal).toBeGreaterThan(5);
    expect(result.songs.length).toBe(result.matchedTotal);
    for (const item of result.songs) {
      expect(xml).toContain(item.song.title);
      expect(xml).toContain(item.song.artist);
      expect(xml).toContain(item.song.version);
    }
    expect(xml).not.toContain("Скачать всю подборку в Word");
    expect(xml).not.toContain("Скачать Word");
    expect(xml).not.toContain("Изменить ответы");
    mkdirSync("tmp", { recursive: true });
    writeFileSync("tmp/Подборка_песен_заполненная.docx", buffer);
  });

  it("builds a Word file for an empty result with the same answers and empty reasons", async () => {
    const result = matchSongs(
      base({
        languages: ["other"],
        otherLanguage: "японский",
        genres: ["explore"],
        moods: ["surprise"],
      }),
    );
    expect(result.songs).toHaveLength(0);
    const buffer = await buildPlaylistDocxBuffer(result, new Date(2026, 9, 30));
    const xml = zipEntry(buffer, "word/document.xml");
    expect(xml).toContain("Ваша подборка песен");
    expect(xml).toContain("Совпадений не нашлось");
    expect(xml).toContain("японский");
    expect(xml).toContain("В документ включено песен: 0");
    expect(xml).not.toContain("Показаны 5 из");
    expect(result.emptyReasons.every((line) => xml.includes(line))).toBe(true);
    mkdirSync("tmp", { recursive: true });
    writeFileSync("tmp/Подборка_песен_пустая.docx", buffer);
  });

  it("writes clickable sheet-music hyperlinks and the missing-notes line", async () => {
    const kids = matchSongs(
      base({
        age: "11",
        genres: ["children"],
        languages: ["ru"],
        moods: ["tender", "calm"],
        purpose: "lessons",
      }),
    );
    const dalekoResult = matchSongs(
      base({
        age: "30",
        genres: ["musical"],
        languages: ["ru"],
        moods: ["calm"],
        purpose: "lessons",
      }),
    );
    const oblaka = kids.songs.find((item) => item.song.id === "shainsky-oblaka");
    const daleko = dalekoResult.songs.find((item) => item.song.id === "krylatov-daleko");
    expect(oblaka?.song.sheetMusic).toHaveLength(2);
    expect(daleko?.song.sheetMusic).toHaveLength(2);
    const kidsBuffer = await buildPlaylistDocxBuffer(kids, new Date(2026, 9, 31));
    const dalekoBuffer = await buildPlaylistDocxBuffer(dalekoResult, new Date(2026, 9, 31));
    const kidsXml = zipEntry(kidsBuffer, "word/document.xml");
    const kidsRels = zipEntry(kidsBuffer, "word/_rels/document.xml.rels");
    const dalekoXml = zipEntry(dalekoBuffer, "word/document.xml");
    const dalekoRels = zipEntry(dalekoBuffer, "word/_rels/document.xml.rels");
    expect(kidsXml).toContain("w:hyperlink");
    expect(kidsRels).toContain("note-store.ru/notes/v-shainskiy/oblaka-belogrivye-loshadki/piano-vocal");
    expect(dalekoRels).toContain("note-store.ru/notes/evgeniy-krylatov/prekrasnoe-dalyeko/piano-vocal-easy");
    expect(dalekoXml).toContain("голос и фортепиано");
    expect(kidsXml).toContain("Купить ноты");
    expect(kidsXml).toContain("Купить сборник с этой песней");
    expect(kidsXml).toContain("note-store.ru");
    expect(kidsXml).toContain("Другая аранжировка");
    expect(kidsXml).not.toContain("Инструментальное переложение");

    const withoutSheets = matchSongs(
      base({
        age: "30",
        genres: ["indie"],
        languages: ["en"],
        moods: ["dramatic"],
        purpose: "pleasure",
        sheetFilter: "any",
      }),
    );
    const missing = withoutSheets.songs.find((item) => item.song.sheetMusic.length === 0);
    expect(missing).toBeDefined();
    const emptyXml = zipEntry(await buildPlaylistDocxBuffer(withoutSheets, new Date(2026, 9, 31)), "word/document.xml");
    expect(emptyXml).toContain("Ссылка на ноты пока не добавлена");
  });

  it("puts the full age-50 indie English energetic selection into Word", async () => {
    const result = matchSongs(
      base({
        age: "50",
        genres: ["indie"],
        languages: ["en"],
        moods: ["energetic"],
        purpose: "pleasure",
      }),
    );
    expect(result.matchedTotal).toBeGreaterThan(1);
    expect(result.songs.some((item) => item.song.editorialAge.lyricAge === "16plus")).toBe(true);
    const xml = zipEntry(await buildPlaylistDocxBuffer(result, new Date(2026, 9, 31)), "word/document.xml");
    expect(xml).toContain(`В документ включено песен: ${result.matchedTotal}`);
    expect(xml).toContain("Текст требует проверки");
    for (const item of result.songs) {
      expect(xml).toContain(item.song.title);
      expect(xml).toContain(item.song.artist);
    }
  });

  it("writes vocal-only Word links and empty sheet-filter reasons", async () => {
    const vocal = matchSongs(
      base({
        age: "11",
        genres: ["children"],
        languages: ["ru"],
        moods: ["tender", "calm"],
        sheetFilter: "vocal",
      }),
    );
    expect(vocal.songs.every((item) => item.sheets.length > 0)).toBe(true);
    const vocalXml = zipEntry(await buildPlaylistDocxBuffer(vocal, new Date(2026, 9, 31)), "word/document.xml");
    const vocalRels = zipEntry(await buildPlaylistDocxBuffer(vocal, new Date(2026, 9, 31)), "word/_rels/document.xml.rels");
    expect(vocalXml).toContain("w:hyperlink");
    expect(vocalXml).toContain("Купить ноты");
    expect(vocalXml).toContain("Купить сборник с этой песней");
    expect(vocalXml).toContain("note-store.ru");
    expect(vocalXml).toContain("classica21.ru");
    expect(vocalXml).not.toContain("Инструментальное переложение");
    expect(vocalRels).toContain("note-store.ru/notes/v-shainskiy/oblaka-belogrivye-loshadki/piano-vocal");
    expect(vocalRels).not.toContain("piano-solo");

    const empty = matchSongs(
      base({
        age: "11",
        genres: ["children"],
        languages: ["ru"],
        moods: ["joyful"],
        sheetFilter: "freeVocal",
      }),
    );
    expect(empty.songs).toHaveLength(0);
    const emptyXml = zipEntry(await buildPlaylistDocxBuffer(empty, new Date(2026, 9, 31)), "word/document.xml");
    expect(emptyXml).toContain("Совпадений не нашлось");
    expect(empty.emptyReasons.every((line) => emptyXml.includes(line))).toBe(true);
    expect(emptyXml).toContain("бесплатными вокальными нотами");
    expect(emptyXml).toContain("идеи репертуара");
    expect(emptyXml).toContain("автоматически не меняется");

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
    const adultXml = zipEntry(await buildPlaylistDocxBuffer(ruAdultFree, new Date(2026, 9, 31)), "word/document.xml");
    const adultRels = zipEntry(
      await buildPlaylistDocxBuffer(ruAdultFree, new Date(2026, 9, 31)),
      "word/_rels/document.xml.rels",
    );
    expect(adultXml).toContain("Открыть бесплатные ноты");
    expect(adultXml).toContain("Соловей");
    expect(adultRels).toContain("pbc.biaman.pl/Content/10241/PDF/");

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
    const folkXml = zipEntry(await buildPlaylistDocxBuffer(ruFolkFree, new Date(2026, 9, 31)), "word/document.xml");
    const folkRels = zipEntry(
      await buildPlaylistDocxBuffer(ruFolkFree, new Date(2026, 9, 31)),
      "word/_rels/document.xml.rels",
    );
    expect(folkXml).toContain("Открыть бесплатный сборник — страница 138 PDF, печатная 30");
    expect(folkRels).toContain("digitale-sammlungen.de/en/view/bsb11140706?page=138");
  });

  it("puts every matched song into Word for counts 1, 5 and 6", async () => {
    const openAnswers = base({
      age: "30",
      genres: ["explore"],
      moods: ["surprise"],
      languages: ["any"],
      sheetFilter: "any",
    });
    for (const count of [1, 5, 6]) {
      const result = matchSongs(openAnswers, CATALOG.slice(0, count));
      expect(result.songs).toHaveLength(count);
      const xml = zipEntry(await buildPlaylistDocxBuffer(result, new Date(2026, 9, 30)), "word/document.xml");
      expect(xml).toContain(`В документ включено песен: ${count}`);
      expect(xml).not.toContain("Показаны 5 из");
      for (const item of result.songs) {
        expect(xml).toContain(item.song.title);
      }
    }
  });
});
