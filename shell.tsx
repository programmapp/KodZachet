import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, House, LineChart } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { logoutStudent, type StudentProfile } from "@/lib/exam.functions";
import { useSession } from "@/components/use-session";

const LINKS = [
  { to: "/dashboard", label: "Главная", icon: House },
  { to: "/lectures", label: "Тестирование", icon: BookOpen },
  { to: "/history", label: "Мои результаты", icon: LineChart },
] as const;

export function LoadingScreen({ label = "Загрузка…" }: { label?: string }) {
  return (
    <div className="atmosphere flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="spinner" role="status" aria-label={label} />
      <p className="muted">{label}</p>
    </div>
  );
}

export function StudentFrame({
  student,
  children,
}: {
  student: StudentProfile;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  return (
    <div className="atmosphere shell">
      <header className="topbar">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">К</span>
          <span>
            <span className="brand-name">КОДЗАЧЁТ</span>
            <span className="brand-sub block">Программирование</span>
          </span>
        </Link>
        <nav className="desk-nav" aria-label="Разделы">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="nav-link"
              data-active={pathname === link.to ? "true" : "false"}
            >
              <link.icon size={16} aria-hidden="true" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="who">
          <div className="who-name">
            <strong>{student.fullName}</strong>
            <span>{student.studyGroup}</span>
          </div>
          <button
            type="button"
            className="btn btn-line"
            style={{ minHeight: "2.6rem", padding: "0 0.9rem" }}
            onClick={() => {
              void logoutStudent().then(() => {
                void navigate({ to: "/" });
              });
            }}
          >
            Выйти
          </button>
        </div>
      </header>
      <main className="page">{children}</main>
      <footer className="mx-auto w-full max-w-6xl px-5 pb-24 pt-5 text-center text-xs muted sm:pb-6">Created by Safarov Abdunosir</footer>
      <nav className="tabbar" aria-label="Разделы">
        {LINKS.map((link) => (
          <Link key={link.to} to={link.to} data-active={pathname === link.to ? "true" : "false"}>
            <link.icon size={18} aria-hidden="true" />
            {link.label === "Мои результаты" ? "Результаты" : link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function RequireStudent({ children }: { children: (student: StudentProfile) => ReactNode }) {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.status === "guest") void navigate({ to: "/register" });
  }, [session.status, navigate]);
  if (session.status !== "ready") return <LoadingScreen label={session.status === "guest" ? "Переход к регистрации…" : "Загрузка…"} />;
  return <StudentFrame student={session.student}>{children(session.student)}</StudentFrame>;
}
