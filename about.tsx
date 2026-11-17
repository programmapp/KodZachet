import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireStudent } from "@/components/shell";
import { getPlatformStatus } from "@/lib/exam.functions";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  return (
    <RequireStudent>
      {() => <AboutBody />}
    </RequireStudent>
  );
}

function AboutBody() {
  const [telegram, setTelegram] = useState<boolean | null>(null);
  useEffect(() => {
    void getPlatformStatus()
      .then((status) => setTelegram(status.telegram))
      .catch(() => setTelegram(false));
  }, []);

  return (
    <section className="mx-auto max-w-3xl">
      <p className="kicker">О платформе</p>
      <h1 className="display" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
        КодЗачёт
      </h1>
      <p className="lede">
        Тренажёр к промежуточному контролю по программированию. Восемь лекций, ровно 200 вопросов, по 25 в каждой. Формулировки совпадают с учебным комплектом.
      </p>
      <div className="stack mt-6">
        <article className="panel">
          <h2 className="text-2xl">Как устроен тест</h2>
          <p className="muted">
            Выбираете лекцию и отвечаете по одному вопросу. После выбора вариант фиксируется: верный подсвечивается зелёным, неверный — красным, и сразу показывается правильный ответ. К следующему вопросу вы переходите сами.
          </p>
        </article>
        <article className="panel">
          <h2 className="text-2xl">Конфиденциальность</h2>
          <p className="muted">
            Платформа хранит только имя, фамилию и учебную группу. Эти сведения уходят администратору в Telegram, чтобы было видно, кто готовится к контролю. Телефон, почта и пароль студента не нужны.
          </p>
          <p className="mt-2">
            Уведомления Telegram: {telegram === null ? "проверяем…" : telegram ? "подключены" : "ещё не настроены"}. Если сервис временно недоступен, регистрация всё равно сохраняется.
          </p>
        </article>
        <article className="panel">
          <h2 className="text-2xl">Как подключить Telegram</h2>
          <ol className="muted mt-2 list-decimal space-y-2 pl-5">
            <li>В Telegram откройте @BotFather, отправьте /newbot и сохраните токен.</li>
            <li>Напишите своему боту любое сообщение.</li>
            <li>Узнайте идентификатор чата администратора и задайте на сервере переменные BOT_TOKEN и ADMIN_CHAT_ID.</li>
            <li>Токен хранится только на сервере и не попадает в страницу сайта.</li>
            <li>Повторное открытие сайта тем же студентом не создаёт второе уведомление.</li>
          </ol>
        </article>
        <Link to="/admin" className="btn btn-line">
          Кабинет преподавателя
        </Link>
      </div>
    </section>
  );
}
