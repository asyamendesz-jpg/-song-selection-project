import { useEffect, useMemo, useState } from "react";
import { NOTE_OPTIONS, noteToMidi } from "./data/notes";
import {
  COPY,
  EXPERIENCE_OPTIONS,
  FOCUS_OPTIONS,
  GENRE_OPTIONS,
  LANGUAGE_OPTIONS,
  MOOD_OPTIONS,
  PURPOSE_OPTIONS,
  RANGE_MODE_OPTIONS,
  SHEET_FILTER_OPTIONS,
  SKILL_OPTIONS,
  TESSITURA_OPTIONS,
  VOICE_CHANGE_OPTIONS,
} from "./data/questions";
import { buildPlaylistDocx, playlistDocxFilename } from "./logic/exportDocx";
import { formatPlaylist, matchSongs, remainingSongCount, songsForScreen } from "./logic/matching";
import {
  GENRE_EXCLUSIVE,
  INITIAL_ANSWERS,
  LANGUAGE_EXCLUSIVE,
  parseAgeInput,
  SKILL_EXCLUSIVE,
  stepsFor,
} from "./logic/quizFlow";
import { toggleCapped, toggleExclusive } from "./logic/selection";
import { SHEET_MISSING, sheetCaption, sheetLinkLabel } from "./logic/sheetMusic";
import type { Answers, RankedSong, StepId } from "./types";

type Screen = "start" | "quiz" | "result";

function SheetLinks({ item }: { item: RankedSong }) {
  if (item.sheets.length === 0 && item.instrumentalSheets.length === 0) {
    return <p>{SHEET_MISSING}</p>;
  }
  return (
    <ul className="sheet-list">
      {item.sheets.length === 0 ? <li>{SHEET_MISSING}</li> : null}
      {item.sheets.map((source) => (
        <li key={source.url}>
          <a className="sheet-link" href={source.url} target="_blank" rel="noreferrer">
            {sheetLinkLabel(source)}
          </a>
          {" — "}
          {sheetCaption(source)}
        </li>
      ))}
      {item.instrumentalSheets.map((source) => (
        <li key={source.url}>
          <a className="sheet-link" href={source.url} target="_blank" rel="noreferrer">
            {sheetLinkLabel(source)}
          </a>
          {" — "}
          {sheetCaption(source)}. Не вокальные ноты для пения.
        </li>
      ))}
    </ul>
  );
}

function stepMeta(step: StepId): { title: string; hint: string } {
  switch (step) {
    case "age":
      return { title: "Сколько вам лет?", hint: "Один ответ. Возраст нужен как общий контекст, а не как оценка голоса." };
    case "voiceChange":
      return { title: "Замечаете ли вы сейчас изменения голоса?", hint: "Один ответ. По возрасту мутацию мы не определяем." };
    case "experience":
      return { title: "Как бы вы описали свой опыт?", hint: "Один вариант." };
    case "skills":
      return { title: "Что уже получается достаточно уверенно?", hint: "Несколько вариантов. «Пока затрудняюсь ответить» снимает остальные." };
    case "rangeMode":
      return { title: "Какие ноты вам удобно петь?", hint: "Один вариант." };
    case "notes":
      return {
        title: "Укажите удобные нижнюю и верхнюю ноты",
        hint: "Укажите ноты, которые получаются спокойно, без усилия. Не нужно проверять крайние ноты прямо сейчас.",
      };
    case "tessitura":
      return { title: "Какое звучание обычно удобнее?", hint: "Один вариант. Это предварительный ориентир, а не измерение диапазона." };
    case "genres":
      return { title: "Какие направления вам нравятся?", hint: "До трёх вариантов. «Хочу попробовать разное» исключает остальные." };
    case "languages":
      return {
        title: "На каком языке хотите петь?",
        hint: "Несколько вариантов. «Язык не принципиален» исключает остальные. Для «Другого» укажите язык целиком: французский, немецкий, корейский или румынский — короткие обрывки и неизвестные языки не подменяются.",
      };
    case "moods":
      return { title: "Какое настроение ищете?", hint: "До двух вариантов." };
    case "purpose":
      return { title: "Для чего подбираем песни?", hint: "Один вариант." };
    case "focuses":
      return { title: "Над чем хочется поработать?", hint: "До двух вариантов." };
    case "sheetFilter":
      return {
        title: "Какой нотный материал нужен?",
        hint: "Один вариант, по умолчанию — с вокальными нотами. Фортепианное соло без вокальной строки не считается нотами для пения. Режим без запроса не меняется.",
      };
  }
}

function canProceed(step: StepId, answers: Answers): { ok: boolean; message: string } {
  switch (step) {
    case "age":
      return parseAgeInput(answers.age);
    case "voiceChange":
      return answers.voiceChange ? { ok: true, message: "" } : { ok: false, message: "Выберите один вариант." };
    case "experience":
      return answers.experience ? { ok: true, message: "" } : { ok: false, message: "Выберите один вариант." };
    case "skills":
      return answers.skills.length ? { ok: true, message: "" } : { ok: false, message: "Выберите хотя бы один вариант." };
    case "rangeMode":
      return answers.rangeMode ? { ok: true, message: "" } : { ok: false, message: "Выберите один вариант." };
    case "notes": {
      const low = noteToMidi(answers.lowNote);
      const high = noteToMidi(answers.highNote);
      if (low === null || high === null) return { ok: false, message: "Выберите обе ноты." };
      if (low > high) return { ok: false, message: "Нижняя нота не должна быть выше верхней." };
      return { ok: true, message: "" };
    }
    case "tessitura":
      return answers.tessituraHint ? { ok: true, message: "" } : { ok: false, message: "Выберите один вариант." };
    case "genres":
      if (!answers.genres.length) return { ok: false, message: "Выберите до трёх направлений." };
      if (answers.genres.includes("other") && !answers.otherGenre.trim()) {
        return { ok: false, message: "Кратко напишите, что входит в «Другое»." };
      }
      return { ok: true, message: "" };
    case "languages":
      if (!answers.languages.length) return { ok: false, message: "Выберите хотя бы один вариант." };
      if (answers.languages.includes("other") && !answers.otherLanguage.trim()) {
        return { ok: false, message: "Укажите язык в текстовом поле." };
      }
      return { ok: true, message: "" };
    case "moods":
      return answers.moods.length ? { ok: true, message: "" } : { ok: false, message: "Выберите до двух вариантов." };
    case "purpose":
      return answers.purpose ? { ok: true, message: "" } : { ok: false, message: "Выберите один вариант." };
    case "focuses":
      return answers.focuses.length ? { ok: true, message: "" } : { ok: false, message: "Выберите до двух вариантов." };
    case "sheetFilter":
      return answers.sheetFilter ? { ok: true, message: "" } : { ok: false, message: "Выберите один вариант." };
  }
}

function OptionList<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { id: T; label: string }[];
  selected: T[];
  onToggle: (id: T) => void;
  multiple?: boolean;
}) {
  return (
    <div className="options" role="group">
      {options.map((option) => {
        const pressed = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            className={pressed ? "option is-selected" : "option"}
            aria-pressed={pressed}
            onClick={() => onToggle(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadedName, setDownloadedName] = useState("");
  const [expandedResults, setExpandedResults] = useState(false);

  const steps = useMemo(() => stepsFor(answers), [answers]);
  useEffect(() => {
    if (index > steps.length - 1) setIndex(Math.max(0, steps.length - 1));
  }, [index, steps.length]);
  const step = steps[Math.min(index, steps.length - 1)];
  const result = useMemo(() => (screen === "result" ? matchSongs(answers) : null), [screen, answers]);

  const patch = (partial: Partial<Answers>) => {
    setAnswers((prev) => ({ ...prev, ...partial }));
    setError("");
  };

  const startQuiz = () => {
    setScreen("quiz");
    setIndex(0);
    setError("");
    setCopied(false);
    setDownloaded(false);
    setDownloadedName("");
    setExpandedResults(false);
  };

  const restart = () => {
    setAnswers(INITIAL_ANSWERS);
    setIndex(0);
    setScreen("start");
    setError("");
    setCopied(false);
    setDownloaded(false);
    setDownloadedName("");
    setExpandedResults(false);
  };

  const goNext = () => {
    const check = canProceed(step, answers);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    if (index >= steps.length - 1) {
      setExpandedResults(false);
      setScreen("result");
      return;
    }
    setIndex((value) => value + 1);
    setError("");
  };

  const goBack = () => {
    setError("");
    if (index === 0) {
      setScreen("start");
      return;
    }
    setIndex((value) => value - 1);
  };

  const editAnswers = () => {
    setScreen("quiz");
    setIndex(0);
    setCopied(false);
    setDownloaded(false);
    setDownloadedName("");
    setExpandedResults(false);
  };

  const downloadPlaylist = async () => {
    if (!result) return;
    try {
      const blob = await buildPlaylistDocx(result);
      const filename = playlistDocxFilename();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setDownloadedName(filename);
      setError("");
    } catch {
      setError("Не удалось подготовить файл Word.");
    }
  };

  if (screen === "start") {
    return (
      <main className="app">
        <section className="card">
          <p className="eyebrow">Вокальный репертуар</p>
          <h1>{COPY.title}</h1>
          <p className="lead">{COPY.lead}</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={startQuiz}>
              {COPY.start}
            </button>
            <p className="muted">{COPY.hint}</p>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "result" && result) {
    const visibleSongs = songsForScreen(result, expandedResults);
    const extraCount = remainingSongCount(result);
    return (
      <main className="app">
        <section className="card">
          <p className="eyebrow">Результат</p>
          <h2>{COPY.resultTitle}</h2>
          <p className="lead">{result.intro}</p>
          <p className="banner">{result.warning}</p>
          <ul className="summary">
            {result.answers.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {result.rangeNote ? <p className="banner">{result.rangeNote}</p> : null}
          {result.songs.length === 0 ? (
            <div className="empty">
              <h3>Совпадений не нашлось</h3>
              {result.emptyReasons.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {result.coverageNotes.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : (
            <div className="song-list">
              {result.matchedTotal > 5 && !expandedResults ? (
                <p className="banner">Показаны 5 из {result.matchedTotal} подходящих песен.</p>
              ) : null}
              {visibleSongs.map((item) => (
                <article key={item.song.id} className="song-card">
                  <h3>
                    {item.song.title} — {item.song.artist}
                  </h3>
                  <p>{item.song.version}</p>
                  <span className="status">{item.statusLabel}</span>
                  {item.song.editorialAge.lyricReview === "needsCheck" ? (
                    <p>Текст требует проверки.</p>
                  ) : null}
                  <SheetLinks item={item} />
                  <h4>Почему в подборке</h4>
                  <ul className="reason-list">
                    {item.reasons.map((reason) => (
                      <li key={reason.text}>{reason.text}</li>
                    ))}
                  </ul>
                  {item.practice.length > 0 ? (
                    <>
                      <h4>Идея для занятия</h4>
                      <ul className="reason-list">
                        {item.practice.map((idea) => (
                          <li key={idea}>{idea}</li>
                        ))}
                      </ul>
                      <p className="muted">Эту идею нужно обсудить с педагогом. Это не проверенная учебная задача версии.</p>
                    </>
                  ) : null}
                </article>
              ))}
              {extraCount > 0 && !expandedResults ? (
                <button type="button" className="btn btn-ghost" onClick={() => setExpandedResults(true)}>
                  Показать остальные ({extraCount})
                </button>
              ) : null}
            </div>
          )}
          {result.songs.length > 0 && result.coverageNotes.length > 0 ? (
            <ul className="summary">
              {result.coverageNotes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={editAnswers}>
              Изменить ответы
            </button>
            <button type="button" className="btn btn-ghost" onClick={restart}>
              Пройти заново
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                const text = formatPlaylist(result);
                try {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                } catch {
                  setError("Не удалось скопировать автоматически. Выделите текст подборки вручную.");
                }
              }}
            >
              Скопировать подборку
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void downloadPlaylist()}>
              Скачать всю подборку в Word
            </button>
          </div>
          {copied ? <p className="copy-ok">Подборка скопирована.</p> : null}
          {downloaded ? <p className="copy-ok">Файл сохранён: {downloadedName}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>
      </main>
    );
  }

  const meta = stepMeta(step);
  const progress = ((index + 1) / steps.length) * 100;

  return (
    <main className="app">
      <section className="card">
        <div className="progress" role="status">
          <div className="progress-top">
            <span>
              Шаг {index + 1} из {steps.length}
            </span>
            <span>{COPY.title}</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={index + 1}
            aria-label="Прогресс квиза"
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <h2>{meta.title}</h2>
        <p className="choice-hint">{meta.hint}</p>

        {step === "age" ? (
          <div className="field">
            <label htmlFor="age">Возраст</label>
            <input
              id="age"
              inputMode="numeric"
              autoComplete="off"
              value={answers.age}
              onChange={(event) => patch({ age: event.target.value, voiceChange: null })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  goNext();
                }
              }}
            />
          </div>
        ) : null}

        {step === "voiceChange" ? (
          <OptionList
            options={VOICE_CHANGE_OPTIONS}
            selected={answers.voiceChange ? [answers.voiceChange] : []}
            multiple={false}
            onToggle={(id) => patch({ voiceChange: id })}
          />
        ) : null}

        {step === "experience" ? (
          <OptionList
            options={EXPERIENCE_OPTIONS}
            selected={answers.experience ? [answers.experience] : []}
            multiple={false}
            onToggle={(id) => patch({ experience: id })}
          />
        ) : null}

        {step === "skills" ? (
          <OptionList
            options={SKILL_OPTIONS}
            selected={answers.skills}
            multiple
            onToggle={(id) => patch({ skills: toggleExclusive(answers.skills, id, SKILL_EXCLUSIVE, 8) })}
          />
        ) : null}

        {step === "rangeMode" ? (
          <OptionList
            options={RANGE_MODE_OPTIONS}
            selected={answers.rangeMode ? [answers.rangeMode] : []}
            multiple={false}
            onToggle={(id) => patch({ rangeMode: id })}
          />
        ) : null}

        {step === "notes" ? (
          <div className="note-grid">
            <div className="field">
              <label htmlFor="lowNote">Нижняя удобная нота</label>
              <select id="lowNote" value={answers.lowNote} onChange={(event) => patch({ lowNote: event.target.value })}>
                {NOTE_OPTIONS.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="highNote">Верхняя удобная нота</label>
              <select id="highNote" value={answers.highNote} onChange={(event) => patch({ highNote: event.target.value })}>
                {NOTE_OPTIONS.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {step === "tessitura" ? (
          <OptionList
            options={TESSITURA_OPTIONS}
            selected={answers.tessituraHint ? [answers.tessituraHint] : []}
            multiple={false}
            onToggle={(id) => patch({ tessituraHint: id })}
          />
        ) : null}

        {step === "genres" ? (
          <>
            <OptionList
              options={GENRE_OPTIONS}
              selected={answers.genres}
              multiple
              onToggle={(id) => patch({ genres: toggleExclusive(answers.genres, id, GENRE_EXCLUSIVE, 3) })}
            />
            {answers.genres.includes("other") ? (
              <div className="field">
                <label htmlFor="otherGenre">Какое направление добавить</label>
                <input
                  id="otherGenre"
                  value={answers.otherGenre}
                  onChange={(event) => patch({ otherGenre: event.target.value })}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {step === "languages" ? (
          <>
            <OptionList
              options={LANGUAGE_OPTIONS}
              selected={answers.languages}
              multiple
              onToggle={(id) =>
                patch({ languages: toggleExclusive(answers.languages, id, LANGUAGE_EXCLUSIVE, 3) })
              }
            />
            {answers.languages.includes("other") ? (
              <div className="field">
                <label htmlFor="otherLanguage">Язык</label>
                <input
                  id="otherLanguage"
                  value={answers.otherLanguage}
                  onChange={(event) => patch({ otherLanguage: event.target.value })}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {step === "moods" ? (
          <OptionList
            options={MOOD_OPTIONS}
            selected={answers.moods}
            multiple
            onToggle={(id) => patch({ moods: toggleCapped(answers.moods, id, 2) })}
          />
        ) : null}

        {step === "purpose" ? (
          <OptionList
            options={PURPOSE_OPTIONS}
            selected={answers.purpose ? [answers.purpose] : []}
            multiple={false}
            onToggle={(id) => patch({ purpose: id })}
          />
        ) : null}

        {step === "focuses" ? (
          <OptionList
            options={FOCUS_OPTIONS}
            selected={answers.focuses}
            multiple
            onToggle={(id) => patch({ focuses: toggleCapped(answers.focuses, id, 2) })}
          />
        ) : null}

        {step === "sheetFilter" ? (
          <OptionList
            options={SHEET_FILTER_OPTIONS}
            selected={answers.sheetFilter ? [answers.sheetFilter] : []}
            multiple={false}
            onToggle={(id) => patch({ sheetFilter: id })}
          />
        ) : null}

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={goBack}>
            Назад
          </button>
          <button type="button" className="btn btn-primary" onClick={goNext}>
            {index >= steps.length - 1 ? "Показать песни" : "Далее"}
          </button>
        </div>
      </section>
    </main>
  );
}
