import { createFileRoute, Link } from "@tanstack/react-router";
import { useSession } from "@/components/use-session";

export const Route = createFileRoute("/")({ component: Welcome });

function Welcome() {
  const session = useSession();
  const next = session.status === "ready" ? "/dashboard" : "/register";
  return (
    <main className="atmosphere relative flex min-h-screen flex-col overflow-hidden">
      <div className="grid-mask" />
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <div className="brand">
          <span className="brand-mark">К</span>
          <span>
            <span className="brand-name">КОДЗАЧЁТ</span>
            <span className="brand-sub block">Промежуточный контроль</span>
          </span>
        </div>
        <span className="muted hidden text-sm sm:block">8 лекций · 200 вопросов</span>
      </header>
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 text-center">
        <p className="kicker">Программирование на C++</p>
        <h1 className="display mt-4 max-w-4xl">Добро пожаловать, студент!</h1>
        <p className="lede mx-auto">
          Проверь свои знания по программированию и подготовься к промежуточному контролю!
        </p>
        <Link to={next} className="btn btn-primary cta-pulse mt-8 px-8 text-base">
          НАЧАТЬ ТЕСТИРОВАНИЕ
        </Link>
        <div className="hero-index" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index}>{String(index + 1).padStart(2, "0")}</span>
          ))}
        </div>
      </section>
      <footer className="relative z-10 pb-5 text-center text-xs muted">Created by Safarov Abdunosir</footer>
    </main>
  );
}
