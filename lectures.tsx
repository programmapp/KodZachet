import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CATALOG } from "@/data/catalog";
import { RequireStudent } from "@/components/shell";

export const Route = createFileRoute("/lectures")({ component: LecturesPage });

function LecturesPage() {
  const navigate = useNavigate();
  return (
    <RequireStudent>
      {() => (
        <section>
          <p className="kicker">Тестирование</p>
          <h1 className="display" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
            Выберите лекцию
          </h1>
          <p className="lede">В каждом тесте только вопросы этой лекции. Темы не смешиваются.</p>
          <div className="lecture-grid mt-8">
            {CATALOG.map((lecture) => (
              <button
                key={lecture.id}
                type="button"
                className="lecture-card"
                onClick={() => {
                  void navigate({
                    to: "/test",
                    search: {
                      lecture: lecture.id,
                      mode: "full",
                      run: crypto.randomUUID(),
                      from: "",
                    },
                  });
                }}
              >
                <span className="lecture-no">{String(lecture.id).padStart(2, "0")}</span>
                <h2>{lecture.card}</h2>
                <p>{lecture.detail}</p>
                <span className="count-pill">25 вопросов</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </RequireStudent>
  );
}
