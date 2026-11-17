import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/components/use-session";
import { registerStudent } from "@/lib/exam.functions";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [fullName, setFullName] = useState("");
  const [studyGroup, setStudyGroup] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (session.status === "ready") void navigate({ to: "/dashboard" });
  }, [session.status, navigate]);

  return (
    <main className="atmosphere relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid-mask" />
      <form
        className="panel relative z-10 w-full max-w-md"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          if (!fullName.trim() || !studyGroup.trim()) {
            setError("Заполните имя и фамилию и учебную группу");
            return;
          }
          setPending(true);
          void registerStudent({ data: { fullName, studyGroup } })
            .then((result) => {
              if (!result.ok) {
                setError(result.message);
                setPending(false);
                return;
              }
              void navigate({ to: "/dashboard" });
            })
            .catch(() => {
              setError("Не удалось сохранить регистрацию. Попробуйте ещё раз.");
              setPending(false);
            });
        }}
      >
        <p className="kicker">Регистрация</p>
        <h1 className="mt-2 text-3xl">Как к вам обращаться?</h1>
        <p className="lede text-sm">Два поля — и можно начинать подготовку. Пароль не нужен.</p>
        <div className="mt-6 stack">
          <label className="field">
            <span>Имя и фамилия</span>
            <input
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Например, Алия Каримова"
              required
            />
          </label>
          <label className="field">
            <span>Учебная группа</span>
            <input
              name="studyGroup"
              value={studyGroup}
              onChange={(event) => setStudyGroup(event.target.value)}
              placeholder="Например, ИВТ-21"
              required
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
            {pending ? "Сохраняем…" : "ЗАРЕГИСТРИРОВАТЬСЯ"}
          </button>
          <p className="muted text-sm">
            Имя и учебная группа отправляются администратору через Telegram, чтобы преподаватель видел, кто готовится к контролю. Другие данные не запрашиваются.
          </p>
        </div>
      </form>
      <span className="absolute bottom-4 left-0 right-0 text-center text-xs muted">Created by Safarov Abdunosir</span>
    </main>
  );
}
