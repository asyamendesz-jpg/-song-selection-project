export type Experience =
  | "beginner"
  | "practicing"
  | "confident"
  | "performing";

export type Skill =
  | "melody"
  | "rhythm"
  | "breath"
  | "registers"
  | "diction"
  | "expression"
  | "stage"
  | "unsure";

export type DevelopmentTrack =
  | "voiceBreath"
  | "intonationRegisters"
  | "dictionTone"
  | "musicality"
  | "stagecraft";

export type RangeMode = "known" | "unknown";

export type TessituraHint = "low" | "mid" | "high" | "unsure";

export type Genre =
  | "pop"
  | "rock"
  | "indie"
  | "rnb"
  | "jazz"
  | "classical"
  | "musical"
  | "rap"
  | "children"
  | "bard"
  | "other"
  | "explore";

export type LanguageChoice = "ru" | "en" | "other" | "any";

export type Mood =
  | "tender"
  | "calm"
  | "joyful"
  | "energetic"
  | "dramatic"
  | "surprise";

export type Purpose =
  | "pleasure"
  | "lessons"
  | "karaoke"
  | "recording"
  | "performance";

export type Focus =
  | "intonation"
  | "breath"
  | "diction"
  | "expression"
  | "stage"
  | "comfort";

export type VoiceChange = "yes" | "no" | "unsure";

export type LyricAge = "all" | "12plus" | "16plus" | "18plus";

export type LyricReview = "preliminary" | "needsCheck";

export type OtherLanguageCode = "de" | "fr" | "ko" | "ro";

export type VerificationStatus = "unverified" | "rangeChecked";

export type SongLanguage = "ru" | "en" | "other";

export interface Difficulty {
  intonation: number;
  rhythm: number;
  breath: number;
  diction: number;
  vocalTechniques: number;
}

export interface SongInfoSource {
  summary: string;
  urls: string[];
}

export type SheetAccess = "free" | "paid" | "registration";

export type SheetKind = "vocal" | "instrumental";

export type SheetFormat = "single" | "collection";

export type SheetFilter = "any" | "vocal" | "freeVocal";

export interface SheetMusicSource {
  url: string;
  publisher: string;
  versionNote: string;
  scoring: string;
  key: string | null;
  access: SheetAccess;
  kind: SheetKind;
  format: SheetFormat;
  registrationRequired: boolean;
  checkedAt: string;
  sameAsRecommended: boolean;
  /** Номер страницы в PDF или в цифровом просмотрщике сборника, только если проверен по файлу. */
  collectionPdfPage?: number;
  /** Печатный номер страницы, если он есть в издании и отличается от номера PDF. */
  collectionPrintPage?: number | string;
}

export interface EditorialAge {
  lyricAge: LyricAge;
  note: string;
  lyricReview: LyricReview;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  language: SongLanguage;
  otherLanguage?: OtherLanguageCode;
  genres: Exclude<Genre, "other" | "explore">[];
  moods: Exclude<Mood, "surprise">[];
  version: string;
  difficulty: Difficulty | null;
  rangeLow: string | null;
  rangeHigh: string | null;
  key: string | null;
  tessitura: "low" | "mid" | "high" | null;
  learningTasks: string[];
  infoSource: SongInfoSource;
  sheetMusic: SheetMusicSource[];
  editorialAge: EditorialAge;
  verification: {
    status: VerificationStatus;
    source: string;
  };
  purposes: Purpose[];
  notes?: string;
}

export interface Answers {
  age: string;
  voiceChange: VoiceChange | null;
  experience: Experience | null;
  skills: Skill[];
  rangeMode: RangeMode | null;
  lowNote: string;
  highNote: string;
  tessituraHint: TessituraHint | null;
  genres: Genre[];
  otherGenre: string;
  languages: LanguageChoice[];
  otherLanguage: string;
  moods: Mood[];
  purpose: Purpose | null;
  focuses: Focus[];
  sheetFilter: SheetFilter | null;
}

export interface MatchReason {
  text: string;
}

export interface RankedSong {
  song: Song;
  reasons: MatchReason[];
  practice: string[];
  statusLabel: "Предварительный вариант";
  sheets: SheetMusicSource[];
  instrumentalSheets: SheetMusicSource[];
}

export interface MatchResult {
  songs: RankedSong[];
  intro: string;
  warning: string;
  answers: string[];
  rangeNote: string | null;
  coverageNotes: string[];
  emptyReasons: string[];
  matchedTotal: number;
}

export type StepId =
  | "age"
  | "voiceChange"
  | "experience"
  | "skills"
  | "rangeMode"
  | "notes"
  | "tessitura"
  | "genres"
  | "languages"
  | "moods"
  | "purpose"
  | "focuses"
  | "sheetFilter";
