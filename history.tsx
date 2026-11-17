import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LoadingScreen, RequireStudent } from "@/components/shell";
import { getHistory } from "@/lib/exam.functions";
import { formatDate, formatTime } from "@/lib/format";

type Row = {
  lectureId: number;
  card: string;
  title: string;
  attempts: number;
  latest: {
    correct: number;
    incorrect: number;
    total: number;
    percent: number;
    createdAt: string;
    mode: string;
  } | null;
};

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  return (
    <RequireStudent>
      {() => <HistoryBody />}
    </RequireStudent>
  );
}

function HistoryBody() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void getHistory()
      .then((result) => {
        if (!live) return;
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setRows(result.lectures);
      })
      .catch(() => {
        if (live) setError("Не удалось загрузить результаты");
      });
    return () => {
      live = false;
    };
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!rows) return <LoadingScreen label="Загружаем результаты…" />;
  const done = rows.filter((row) => row.attempts > 0).length;

  return (
    <section>
      <p className="kicker">Мои результаты</p>
      <h1 className="display" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
        История попыток
      </h1>
      <p className="lede">Пройдено лекций: {done} из 8. Новая попытка не затирает предыдущие.</p>
      <div className="panel mt-6" style={{ padding: 0 }}>
        <div className="history-row muted hidden px-4 text-sm md:grid">
          <span>Лекция</span>
          <span>Попытки</span>
          <span>Последний результат</span>
          <span>Дата</span>
        </div>
        {rows.map((row) => (
          <article key={row.lectureId} className="history-row">
            <div>
              <strong>{row.card}</strong>
              <div className="muted text-sm">{row.title}</div>
            </div>
            <div>
              <span className="muted md:hidden">Попыток: </span>
              {row.attempts}
            </div>
            <div>
              {row.latest ? (
                <>
                  {row.latest.correct} верно · {row.latest.incorrect} ошибок · {row.latest.percent}%
                  <div className="muted text-sm">из {row.latest.total}</div>
                </>
              ) : (
                <span className="muted">Ещё не пройдена</span>
              )}
            </div>
            <div className="muted">
              {row.latest ? `${formatDate(row.latest.createdAt)}, ${formatTime(row.latest.createdAt)}` : "—"}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
