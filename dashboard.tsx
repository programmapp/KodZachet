import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireStudent } from "@/components/shell";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  return (
    <RequireStudent>
      {(student) => (
        <section>
          <p className="kicker">Панель студента</p>
          <h1 className="display" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>
            ПАНЕЛЬ СТУДЕНТА
          </h1>
          <p className="lede">
            {student.fullName} · группа {student.studyGroup}
          </p>
          <div className="panel mt-8">
            <h2 className="text-3xl sm:text-4xl">ПОДГОТОВКА К ПРОМЕЖУТОЧНОМУ КОНТРОЛЮ</h2>
            <p className="lede">Программирование — 8 лекций, 200 вопросов</p>
            <Link to="/lectures" className="btn btn-primary mt-6">
              НАЧАТЬ ТЕСТ ПО ПРОГРАММИРОВАНИЮ
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <article className="panel">
              <p className="kicker">Формат</p>
              <p className="mt-2 mb-0">25 вопросов в лекции, один верный ответ из четырёх.</p>
            </article>
            <article className="panel">
              <p className="kicker">Проверка</p>
              <p className="mt-2 mb-0">Ответ сразу подсвечивается: зелёный — верно, красный — ошибка.</p>
            </article>
            <article className="panel">
              <p className="kicker">Повтор</p>
              <p className="mt-2 mb-0">После теста можно пройти его заново или разобрать только ошибки.</p>
            </article>
          </div>
        </section>
      )}
    </RequireStudent>
  );
}
