import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LoadingScreen } from "@/components/shell";
import {
  getAdminGate,
  getAdminOverview,
  loginAdmin,
  logoutAdmin,
  setupAdmin,
} from "@/lib/exam.functions";
import { formatDate, formatTime } from "@/lib/format";

type StudentRow = {
  id: string;
  fullName: string;
  studyGroup: string;
  createdAt: string;
  attemptCount: number;
  latest: { lectureId: number; percent: number; correct: number; total: number; createdAt: string } | null;
};

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const [gate, setGate] = useState<"loading" | "setup" | "login" | "ready">("loading");
  const [telegram, setTelegram] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [totals, setTotals] = useState({ students: 0, tests: 0, groups: 0 });
  const [group, setGroup] = useState("все");

  function refreshGate() {
    setGate("loading");
    void getAdminGate()
      .then((state) => {
        setTelegram(state.telegram);
        if (!state.configured) setGate("setup");
        else if (!state.authed) setGate("login");
        else setGate("ready");
      })
      .catch(() => {
        setError("Не удалось открыть кабинет");
        setGate("login");
      });
  }

  useEffect(() => {
    refreshGate();
  }, []);

  useEffect(() => {
    if (gate !== "ready") return;
    void getAdminOverview().then((result) => {
      if (!result.ok) {
        setError(result.message);
        setGate("login");
        return;
      }
      setRows(result.students);
      setTotals(result.totals);
    });
  }, [gate]);

  const groups = useMemo(() => ["все", ...Array.from(new Set(rows.map((row) => row.studyGroup)))], [rows]);
  const visible = group === "все" ? rows : rows.filter((row) => row.studyGroup === group);

  return (
    <main className="atmosphere min-h-screen">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">К</span>
          <span>
            <span className="brand-name">КОДЗАЧЁТ</span>
            <span className="brand-sub block">Кабинет преподавателя</span>
          </span>
        </Link>
        {gate === "ready" ? (
          <button
            className="btn btn-line"
            type="button"
            style={{ minHeight: "2.6rem" }}
            onClick={() => {
              void logoutAdmin().then(() => setGate("login"));
            }}
          >
            Выйти
          </button>
        ) : null}
      </header>
      <div className="page">
        {gate === "loading" ? <LoadingScreen label="Проверяем доступ…" /> : null}
        {gate === "setup" ? (
          <form
            className="panel mx-auto max-w-md"
            onSubmit={(event) => {
              event.preventDefault();
              setPending(true);
              setError("");
              void setupAdmin({ data: { password, confirm } })
                .then((result) => {
                  setPending(false);
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  setPassword("");
                  setConfirm("");
                  setGate("ready");
                })
                .catch(() => {
                  setPending(false);
                  setError("Не удалось сохранить пароль");
                });
            }}
          >
            <p className="kicker">Первый запуск</p>
            <h1 className="mt-2 text-3xl">Задайте пароль администратора</h1>
            <p className="muted">Пароль хранится на сервере в виде хеша и не попадает в код страницы. Либо задайте ADMIN_PASSWORD в окружении сервера.</p>
            <div className="mt-5 stack">
              <label className="field">
                <span>Пароль</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              <label className="field">
                <span>Повтор пароля</span>
                <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
              </label>
              {error ? <p className="error-text">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={pending}>Создать доступ</button>
            </div>
          </form>
        ) : null}
        {gate === "login" ? (
          <form
            className="panel mx-auto max-w-md"
            onSubmit={(event) => {
              event.preventDefault();
              setPending(true);
              setError("");
              void loginAdmin({ data: { password } })
                .then((result) => {
                  setPending(false);
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  setPassword("");
                  setGate("ready");
                })
                .catch(() => {
                  setPending(false);
                  setError("Не удалось войти");
                });
            }}
          >
            <p className="kicker">Закрытый раздел</p>
            <h1 className="mt-2 text-3xl">Вход для преподавателя</h1>
            <div className="mt-5 stack">
              <label className="field">
                <span>Пароль</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              {error ? <p className="error-text">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={pending}>Войти</button>
            </div>
          </form>
        ) : null}
        {gate === "ready" ? (
          <section>
            <p className="kicker">Администратор</p>
            <h1 className="display" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>Кто готовится к контролю</h1>
            <p className="muted mt-2">Telegram: {telegram ? "подключён" : "не настроен — регистрация при этом работает"}.</p>
            <div className="stats mt-6">
              <div className="stat"><b>{totals.students}</b><span>Студентов</span></div>
              <div className="stat"><b>{totals.groups}</b><span>Групп</span></div>
              <div className="stat"><b>{totals.tests}</b><span>Завершённых тестов</span></div>
              <div className="stat"><b>{visible.length}</b><span>В текущем фильтре</span></div>
            </div>
            <label className="field mt-5 max-w-xs">
              <span>Фильтр по группе</span>
              <select value={group} onChange={(event) => setGroup(event.target.value)}>
                {groups.map((item) => (
                  <option key={item} value={item}>{item === "все" ? "Все группы" : item}</option>
                ))}
              </select>
            </label>
            <div className="panel mt-4" style={{ padding: 0 }}>
              {visible.length === 0 ? <p className="muted p-4">Пока никто не зарегистрировался.</p> : null}
              {visible.map((row) => (
                <article key={row.id} className="admin-row">
                  <div>
                    <strong>{row.fullName}</strong>
                    <div className="muted text-sm">{formatDate(row.createdAt)}, {formatTime(row.createdAt)}</div>
                  </div>
                  <div>{row.studyGroup}</div>
                  <div>Тестов: {row.attemptCount}</div>
                  <div className="muted text-sm md:hidden">Последний результат</div>
                  <div>
                    {row.latest
                      ? `Лекция ${row.latest.lectureId}: ${row.latest.percent}% (${row.latest.correct}/${row.latest.total})`
                      : "Нет попыток"}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <footer className="pb-5 text-center text-xs muted">Created by Safarov Abdunosir</footer>
    </main>
  );
}
