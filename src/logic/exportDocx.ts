import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { MatchResult, RankedSong } from "../types";
import { SHEET_MISSING, sheetCaption, sheetLinkLabel } from "./sheetMusic";

const FONT = "Times New Roman";

export function playlistDocxFilename(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `Подборка_песен_${year}-${month}-${day}.docx`;
}

function run(text: string, options: { bold?: boolean; italics?: boolean; size?: number } = {}): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: options.size ?? 24,
    bold: options.bold,
    italics: options.italics,
  });
}

function body(text: string, extras: { spacingAfter?: number; italics?: boolean } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: extras.spacingAfter ?? 160, line: 276 },
    children: [run(text, { italics: extras.italics })],
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], keepNext = false): Paragraph {
  const size = level === HeadingLevel.HEADING_1 ? 36 : level === HeadingLevel.HEADING_2 ? 28 : 26;
  return new Paragraph({
    heading: level,
    keepNext,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 0 : 240, after: 120 },
    children: [run(text, { bold: true, size })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    numbering: { reference: "answers", level: 0 },
    spacing: { after: 80, line: 276 },
    children: [run(text)],
  });
}

function songBlocks(item: RankedSong, index: number): Paragraph[] {
  const title = `${index + 1}. ${item.song.title} — ${item.song.artist}`;
  const blocks: Paragraph[] = [
    heading(title, HeadingLevel.HEADING_3, true),
    new Paragraph({
      keepLines: true,
      spacing: { after: 80, line: 276 },
      children: [run("Версия: ", { bold: true }), run(item.song.version)],
    }),
    new Paragraph({
      spacing: { after: 80, line: 276 },
      children: [run("Статус: ", { bold: true }), run(item.statusLabel)],
    }),
  ];
  if (item.song.editorialAge.lyricReview === "needsCheck") {
    blocks.push(body("Текст требует проверки.", { italics: true, spacingAfter: 80 }));
  }
  if (!item.sheets.length) {
    blocks.push(body(SHEET_MISSING, { spacingAfter: 80 }));
  }
  for (const source of item.sheets) {
    blocks.push(
      new Paragraph({
        spacing: { after: 80, line: 276 },
        children: [
          new ExternalHyperlink({
            link: source.url,
            children: [run(sheetLinkLabel(source), { bold: true })],
          }),
          run(` — ${sheetCaption(source)}. ${source.versionNote}`),
        ],
      }),
    );
  }
  for (const source of item.instrumentalSheets) {
    blocks.push(
      new Paragraph({
        spacing: { after: 80, line: 276 },
        children: [
          new ExternalHyperlink({
            link: source.url,
            children: [run(sheetLinkLabel(source), { bold: true })],
          }),
          run(` — ${sheetCaption(source)}. Не вокальные ноты для пения. ${source.versionNote}`),
        ],
      }),
    );
  }
  blocks.push(
    new Paragraph({
      spacing: { after: 60, line: 276 },
      children: [run("Почему в подборке", { bold: true })],
    }),
  );
  for (const reason of item.reasons) {
    blocks.push(
      new Paragraph({
        numbering: { reference: "reasons", level: 0 },
        spacing: { after: 60, line: 276 },
        children: [run(reason.text)],
      }),
    );
  }
  blocks.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  return blocks;
}

export function buildPlaylistDocument(result: MatchResult, now = new Date()): Document {
  const dateLabel = now.toLocaleDateString("ru-RU");
  const children: Paragraph[] = [
    heading("Ваша подборка песен", HeadingLevel.HEADING_1),
    new Paragraph({
      spacing: { after: 200, line: 276 },
      children: [run(`Дата: ${dateLabel}`, { italics: true })],
    }),
    body(result.warning, { italics: true, spacingAfter: 280 }),
    heading("Ваши ответы", HeadingLevel.HEADING_2),
  ];

  for (const line of result.answers) {
    children.push(bullet(line));
  }

  if (result.rangeNote) {
    children.push(body(result.rangeNote, { spacingAfter: 240 }));
  }

  if (result.songs.length === 0) {
    children.push(heading("Совпадений не нашлось", HeadingLevel.HEADING_2));
    for (const line of result.emptyReasons) {
      children.push(body(line));
    }
  } else {
    children.push(heading("Песни", HeadingLevel.HEADING_2));
    result.songs.forEach((item, index) => {
      children.push(...songBlocks(item, index));
    });
  }

  children.push(heading("Итог", HeadingLevel.HEADING_2));
  children.push(
    body(`В документ включено песен: ${result.songs.length}.`),
  );
  for (const line of result.coverageNotes) {
    if (line.startsWith("Показаны ")) continue;
    children.push(body(line));
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: 24,
          },
          paragraph: {
            spacing: { line: 276 },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "answers",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 180 } } },
            },
          ],
        },
        {
          reference: "reasons",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "–",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 420, hanging: 180 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 850, bottom: 850, left: 850, right: 850 },
          },
        },
        children,
      },
    ],
  });
}

export async function buildPlaylistDocx(result: MatchResult, now = new Date()): Promise<Blob> {
  const document = buildPlaylistDocument(result, now);
  return Packer.toBlob(document);
}

export async function buildPlaylistDocxBuffer(result: MatchResult, now = new Date()): Promise<Uint8Array> {
  const document = buildPlaylistDocument(result, now);
  return Packer.toBuffer(document);
}
