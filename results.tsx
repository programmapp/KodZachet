import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScoreRing } from "@/components/score-ring";
import { LoadingScreen, RequireStudent } from "@/components/shell";
import { getAttempt } from "@/lib/exam.functions";
import { commentForScore, formatDate, formatTime } from "@/lib/format";

type AttemptView = {
  id: string;
  lectureId: number;
  lectureCard: string;
  mode: "full" | "retry";
  total: number;
  correct: number;
  incorrect: number;
  percent: number;
  createdAt: string;
};

export const Route = createFileRoute("/results")({
  validateSearch: (search: Record<string, unknown>) => ({
    attempt: typeof search.attempt === "string" ? search.attempt : "",
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { attempt } = Route.useSearch();
  return (
    <RequireStudent>
      {() => <ResultsBody attemptId={attempt} />}
    </RequireStudent>
  );
}

function ResultsBody({ attemptId }: { attemptId: string }) {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [error, setError] = useState("");
  const [praise, setPraise] = useState(false);

  useEffect(() => {
    let live = true;
    void getAttempt({ data: { attemptId } })
      .then((result) => {
        if (!live) return;
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setAttempt(result.attempt);
      })
      .catch(() => {
        if (live) setError("Не удалось открыть результат");
      });
    return () => {
      live = false;
    };
  }, [attemptId]);

  if (error) {
    return (
      <section className="panel">
        <h1 className="text-3xl">Результат недоступен</h1>
        <p className="error-text mt-3">{error}</p>
        <button className="btn btn-primary mt-5" type="button" onClick={() => void navigate({ to: "/dashboard" })}>
          ВЕРНУТЬСЯ В ГЛАВНОЕ МЕНЮ
        </button>
      </section>
    );
  }
  if (!attempt) return <LoadingScreen label="Считаем результат…" />;

  return (
    <section className="mx-auto max-w-2xl">
      <p className="kicker">{attempt.lectureCard}</p>
      <h1 className="display" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
        ТЕСТ ЗАВЕРШЁН!
      </h1>
      <p className="muted mt-2">
        {attempt.mode === "retry" ? "Повтор ошибочных вопросов" : "Полный тест лекции"} · {formatDate(attempt.createdAt)} {formatTime(attempt.createdAt)}
      </p>
      <div className="panel mt-6">
        <ScoreRing percent={attempt.percent} />
        <div className="stats">
          <div className="stat">
            <b>{attempt.total}</b>
            <span>Всего вопросов</span>
          </div>
          <div className="stat">
            <b>{attempt.correct}</b>
            <span>Правильных ответов</span>
          </div>
          <div className="stat">
            <b>{attempt.incorrect}</b>
            <span>Неправильных ответов</span>
          </div>
          <div className="stat">
            <b>{attempt.percent}%</b>
            <span>Результат</span>
          </div>
        </div>
        <p className="comment">{commentForScore(attempt.correct, attempt.total)}</p>
      </div>
      <div className="stack mt-4">
        <button
          className="btn btn-primary btn-block"
          type="button"
          onClick={() => {
            void navigate({
              to: "/test",
              search: { lecture: attempt.lectureId, mode: "full", run: crypto.randomUUID(), from: "" },
            });
          }}
        >
          ПРОЙТИ ТЕСТ ЗАНОВО
        </button>
        <button
          className="btn btn-paper btn-block"
          type="button"
          onClick={() => {
            if (attempt.incorrect === 0) {
              setPraise(true);
              return;
            }
            void navigate({
              to: "/test",
              search: {
                lecture: attempt.lectureId,
                mode: "retry",
                run: crypto.randomUUID(),
                from: attempt.id,
              },
            });
          }}
        >
          ПОВТОРИТЬ ОШИБОЧНЫЕ ВОПРОСЫ
        </button>
        {praise ? <p className="comment">Поздравляем! У тебя нет ошибок для повторения! 🎉</p> : null}
        <button className="btn btn-line btn-block" type="button" onClick={() => void navigate({ to: "/dashboard" })}>
          ВЕРНУТЬСЯ В ГЛАВНОЕ МЕНЮ
        </button>
      </div>
    </section>
  );
}
