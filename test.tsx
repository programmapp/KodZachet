import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { catalogLecture } from "@/data/catalog";
import { checkAnswer, getTest, saveAttempt, type PublicQuestion } from "@/lib/exam.functions";
import { LoadingScreen, RequireStudent } from "@/components/shell";

type OptionKey = "А" | "Б" | "В" | "Г";
type Mode = "full" | "retry";

type Feedback = { correct: boolean; correctKey: OptionKey; correctText: string };
type Answer = { questionId: string; choice: OptionKey };

type Draft = {
  run: string;
  index: number;
  phase: "ask" | "reveal";
  picked: OptionKey | null;
  feedback: Feedback | null;
  answers: Answer[];
  correct: number;
  incorrect: number;
};

export const Route = createFileRoute("/test")({
  validateSearch: (search: Record<string, unknown>) => ({
    lecture: Number(search.lecture ?? 0),
    mode: (search.mode === "retry" ? "retry" : "full") as Mode,
    run: typeof search.run === "string" ? search.run : "",
    from: typeof search.from === "string" ? search.from : "",
  }),
  component: TestPage,
});

function storageKey(run: string) {
  return `kodzachet-run:${run}`;
}

function TestPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => {
    if (!search.run) {
      void navigate({
        to: "/test",
        search: {
          lecture: search.lecture,
          mode: search.mode,
          run: crypto.randomUUID(),
          from: search.from,
        },
        replace: true,
      });
    }
  }, [search.run, search.lecture, search.mode, search.from, navigate]);

  return (
    <RequireStudent>
      {() => (
        <TestRunner
          lectureId={search.lecture}
          mode={search.mode}
          run={search.run}
          sourceAttemptId={search.from}
        />
      )}
    </RequireStudent>
  );
}

function TestRunner({
  lectureId,
  mode,
  run,
  sourceAttemptId,
}: {
  lectureId: number;
  mode: Mode;
  run: string;
  sourceAttemptId: string;
}) {
  const navigate = useNavigate();
  const lecture = catalogLecture(lectureId);
  const lock = useRef(false);
  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [empty, setEmpty] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!run || !lecture) return;
    let live = true;
    setLoadError("");
    setError("");
    setQuestions(null);
    setEmpty(false);
    void getTest({ data: { lectureId, mode, sourceAttemptId } })
      .then((result) => {
        if (!live) return;
        if (!result.ok) {
          setLoadError(result.message);
          setQuestions([]);
          return;
        }
        if (result.empty) {
          setEmpty(true);
          setQuestions([]);
          return;
        }
        const saved = sessionStorage.getItem(storageKey(run));
        let next: Draft = {
          run,
          index: 0,
          phase: "ask",
          picked: null,
          feedback: null,
          answers: [],
          correct: 0,
          incorrect: 0,
        };
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Draft;
            if (parsed.run === run && parsed.index < result.questions.length) next = parsed;
          } catch {
            /* новый проход */
          }
        }
        setDraft(next);
        setQuestions(result.questions);
      })
      .catch(() => {
        if (live) {
          setLoadError("Не удалось загрузить вопросы. Попробуйте ещё раз.");
          setQuestions([]);
        }
      });
    return () => {
      live = false;
    };
  }, [lectureId, mode, run, lecture, sourceAttemptId]);

  useEffect(() => {
    if (!draft || !run) return;
    sessionStorage.setItem(storageKey(run), JSON.stringify(draft));
  }, [draft, run]);

  if (!lecture) {
    return (
      <section className="panel">
        <h1 className="text-3xl">Лекция не найдена</h1>
        <button className="btn btn-primary mt-4" type="button" onClick={() => void navigate({ to: "/lectures" })}>
          К списку лекций
        </button>
      </section>
    );
  }

  if (!run || questions === null) return <LoadingScreen label="Готовим вопросы…" />;

  if (empty) {
    return (
      <section className="panel">
        <p className="kicker">Лекция {lectureId}</p>
        <h1 className="text-3xl">Поздравляем! У тебя нет ошибок для повторения! 🎉</h1>
        <button className="btn btn-primary mt-6" type="button" onClick={() => void navigate({ to: "/dashboard" })}>
          ВЕРНУТЬСЯ В ГЛАВНОЕ МЕНЮ
        </button>
      </section>
    );
  }

  if (loadError || !draft || questions.length === 0) {
    return (
      <section className="panel">
        <h1 className="text-3xl">Не получилось открыть тест</h1>
        <p className="error-text mt-3">{loadError || "Вопросы не загрузились"}</p>
        <button className="btn btn-primary mt-5" type="button" onClick={() => void navigate({ to: "/lectures" })}>
          К списку лекций
        </button>
      </section>
    );
  }

  const question = questions[draft.index];
  if (!question) return <LoadingScreen />;
  const total = questions.length;
  const progress = Math.round((draft.answers.length / total) * 100);

  function choose(choice: OptionKey) {
    if (!draft || draft.phase !== "ask" || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    void checkAnswer({ data: { questionId: question.id, choice } })
      .then((result) => {
        if (!result.ok) {
          setError(result.message);
          lock.current = false;
          setBusy(false);
          return;
        }
        setDraft({
          ...draft,
          phase: "reveal",
          picked: choice,
          feedback: {
            correct: result.correct,
            correctKey: result.correctKey,
            correctText: result.correctText,
          },
          answers: [...draft.answers, { questionId: question.id, choice }],
          correct: draft.correct + (result.correct ? 1 : 0),
          incorrect: draft.incorrect + (result.correct ? 0 : 1),
        });
        lock.current = false;
        setBusy(false);
      })
      .catch(() => {
        setError("Не удалось проверить ответ. Попробуйте ещё раз.");
        lock.current = false;
        setBusy(false);
      });
  }

  function next() {
    if (!draft || draft.phase !== "reveal" || lock.current) return;
    if (draft.index + 1 < total) {
      setDraft({ ...draft, index: draft.index + 1, phase: "ask", picked: null, feedback: null });
      return;
    }
    lock.current = true;
    setBusy(true);
    void saveAttempt({
      data: { lectureId, mode, sourceAttemptId, choices: draft.answers },
    })
      .then((result) => {
        if (!result.ok) {
          setError(result.message);
          lock.current = false;
          setBusy(false);
          return;
        }
        sessionStorage.removeItem(storageKey(run));
        void navigate({ to: "/results", search: { attempt: result.attempt.id } });
      })
      .catch(() => {
        setError("Не удалось сохранить результат. Попробуйте ещё раз.");
        lock.current = false;
        setBusy(false);
      });
  }

  return (
    <section>
      <h1 className="mt-1 mb-4 text-3xl sm:text-4xl">Лекция {lectureId} — Тестирование</h1>
      <p className="muted mb-4">{lecture.card}</p>
      <div className="paper">
        <div className="q-meta">
          <span>
            Вопрос {draft.index + 1} из {total}
          </span>
          <span>
            Верно {draft.correct} · Ошибки {draft.incorrect}
          </span>
        </div>
        <div className="progress-track mt-3" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <h2 className="question mt-5">{question.text}</h2>
        <div className="options" role="radiogroup" aria-label="Варианты ответа">
          {question.options.map((option) => {
            const revealed = draft.phase === "reveal" && draft.feedback;
            const isPicked = draft.picked === option.key;
            const isCorrect = revealed && draft.feedback?.correctKey === option.key;
            const isWrongPick = revealed && isPicked && !draft.feedback?.correct;
            const tone = isCorrect ? "good" : isWrongPick ? "bad" : "";
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={isPicked}
                className={`option ${tone}`}
                disabled={draft.phase === "reveal" || busy}
                onClick={() => choose(option.key)}
              >
                <span className="mark">{option.key}</span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
        {draft.phase === "reveal" && draft.feedback ? (
          <div className={`feedback ${draft.feedback.correct ? "good" : "bad"}`}>
            {draft.feedback.correct
              ? "Правильно! Отличная работа!"
              : `Неправильно! Правильный ответ: ${draft.feedback.correctKey}) ${draft.feedback.correctText}`}
          </div>
        ) : null}
        {error ? <p className="error-text mt-3">{error}</p> : null}
        {draft.phase === "reveal" ? (
          <button className="btn btn-good btn-block mt-4" type="button" onClick={next} disabled={busy}>
            {busy ? "Сохраняем…" : "СЛЕДУЮЩИЙ ВОПРОС"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
