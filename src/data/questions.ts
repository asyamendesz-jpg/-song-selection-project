import type {
  Experience,
  Focus,
  Genre,
  LanguageChoice,
  Mood,
  Purpose,
  SheetFilter,
  Skill,
  TessituraHint,
  VoiceChange,
} from "../types";

export const COPY = {
  title: "Подборщик песен",
  lead: "Найдите песни, которые хочется петь и удобно разучивать. Расскажите немного о своём голосе, опыте и музыкальном вкусе",
  start: "Подобрать песни",
  hint: "Около 3 минут. Если не знаете свой диапазон — это нормально",
  resultTitle: "Ваши песни для следующей репетиции",
  resultIntro:
    "Песни выбраны по языку, предварительной возрастной уместности текста, жанру и настроению. Цель влияет на порядок рекомендаций, а не исключает песни.",
  resultWarning:
    "Это предварительная подборка по вашим предпочтениям. Соответствие песен вашему голосу не проверено. Удобную тональность и аранжировку лучше подобрать с педагогом.",
};

export const EXPERIENCE_OPTIONS: { id: Experience; label: string }[] = [
  { id: "beginner", label: "Только начинаю." },
  { id: "practicing", label: "Уже занимаюсь, но пока многое требует внимания." },
  { id: "confident", label: "Уверенно пою знакомые песни." },
  { id: "performing", label: "Есть опыт выступлений." },
];

export const SKILL_OPTIONS: { id: Skill; label: string }[] = [
  { id: "melody", label: "Петь простую мелодию и попадать в ноты." },
  { id: "rhythm", label: "Держать ритм." },
  { id: "breath", label: "Распределять дыхание на фразу." },
  { id: "registers", label: "Переходить между низкими и высокими звуками без заметного напряжения." },
  { id: "diction", label: "Чётко произносить текст." },
  { id: "expression", label: "Менять громкость и передавать эмоции." },
  { id: "stage", label: "Петь перед людьми или во время движения." },
  { id: "unsure", label: "Пока затрудняюсь ответить." },
];

export const VOICE_CHANGE_OPTIONS: { id: VoiceChange; label: string }[] = [
  { id: "yes", label: "Да, голос меняется или звучит нестабильно." },
  { id: "no", label: "Нет, заметных изменений нет." },
  { id: "unsure", label: "Не уверен(а)." },
];

export const RANGE_MODE_OPTIONS = [
  { id: "known" as const, label: "Знаю комфортные нижнюю и верхнюю ноты." },
  { id: "unknown" as const, label: "Не знаю диапазон." },
];

export const TESSITURA_OPTIONS: { id: TessituraHint; label: string }[] = [
  { id: "low", label: "Низкое." },
  { id: "mid", label: "Среднее." },
  { id: "high", label: "Высокое." },
  { id: "unsure", label: "Пока не понимаю." },
];

export const GENRE_OPTIONS: { id: Genre; label: string }[] = [
  { id: "pop", label: "Поп." },
  { id: "rock", label: "Рок." },
  { id: "indie", label: "Инди / акустика." },
  { id: "rnb", label: "R&B / соул." },
  { id: "jazz", label: "Джаз." },
  { id: "classical", label: "Классика / романсы." },
  { id: "musical", label: "Мюзиклы / песни из кино." },
  { id: "rap", label: "Рэп / хип-хоп." },
  { id: "children", label: "Детские песни." },
  { id: "bard", label: "Авторская песня." },
  { id: "other", label: "Другое." },
  { id: "explore", label: "Хочу попробовать разное." },
];

export const LANGUAGE_OPTIONS: { id: LanguageChoice; label: string }[] = [
  { id: "ru", label: "Русский." },
  { id: "en", label: "Английский." },
  { id: "other", label: "Другой." },
  { id: "any", label: "Язык не принципиален." },
];

export const MOOD_OPTIONS: { id: Mood; label: string }[] = [
  { id: "tender", label: "Нежное и лиричное." },
  { id: "calm", label: "Спокойное и задумчивое." },
  { id: "joyful", label: "Радостное и лёгкое." },
  { id: "energetic", label: "Энергичное и драйвовое." },
  { id: "dramatic", label: "Драматичное." },
  { id: "surprise", label: "Удивите меня." },
];

export const PURPOSE_OPTIONS: { id: Purpose; label: string }[] = [
  { id: "pleasure", label: "Для удовольствия." },
  { id: "lessons", label: "Для занятий вокалом." },
  { id: "karaoke", label: "Для караоке." },
  { id: "recording", label: "Для записи или видео." },
  { id: "performance", label: "Для выступления." },
];

export const FOCUS_OPTIONS: { id: Focus; label: string }[] = [
  { id: "intonation", label: "Интонация и ритм." },
  { id: "breath", label: "Дыхание и длинные фразы." },
  { id: "diction", label: "Дикция." },
  { id: "expression", label: "Выразительность." },
  { id: "stage", label: "Уверенность перед публикой." },
  { id: "comfort", label: "Просто найти удобные песни." },
];

export const SHEET_FILTER_OPTIONS: { id: SheetFilter; label: string }[] = [
  { id: "vocal", label: "С вокальными нотами — бесплатными или платными." },
  { id: "freeVocal", label: "Только с бесплатными вокальными нотами." },
  { id: "any", label: "Можно без нот — идеи репертуара." },
];
