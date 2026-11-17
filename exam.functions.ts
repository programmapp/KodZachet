import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestProtocol, setCookie } from "@tanstack/react-start/server";
import { getSql, type Sql } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";
import type { OptionKey, Question } from "@/data/questions";

const STUDENT_COOKIE = "kz_student";
const ADMIN_COOKIE = "kz_admin";
const STUDENT_MAX_AGE = 60 * 60 * 24 * 30;
const ADMIN_MAX_AGE = 60 * 60 * 12;

type Mode = "full" | "retry";

export type PublicQuestion = {
  id: string;
  number: number;
  text: string;
  options: { key: OptionKey; text: string }[];
};

export type StudentProfile = {
  id: string;
  fullName: string;
  studyGroup: string;
};

function clean(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function keyOf(value: string): string {
  return clean(value).toLocaleLowerCase("ru-RU");
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return new Date().toISOString();
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isOptionKey(value: string): value is OptionKey {
  return value === "А" || value === "Б" || value === "В" || value === "Г";
}

function cookieOptions(maxAge: number) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getRequestProtocol() === "https",
    maxAge,
  };
}

function writeCookie(name: string, value: string, maxAge: number) {
  setCookie(name, value, cookieOptions(maxAge));
}

function clearCookie(name: string) {
  setCookie(name, "", cookieOptions(0));
}

async function studentFromCookie(sql: Sql): Promise<StudentProfile | null> {
  const token = getCookie(STUDENT_COOKIE);
  if (!token) return null;
  const rows = await sql<{ id: string; full_name: string; study_group: string }>`
    select s.id, s.full_name, s.study_group
    from student_sessions ss
    join students s on s.id = ss.student_id
    where ss.token = ${token} and ss.expires_at > now()
  `;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, fullName: row.full_name, studyGroup: row.study_group };
}

async function adminAuthed(sql: Sql): Promise<boolean> {
  const token = getCookie(ADMIN_COOKIE);
  if (!token) return false;
  const rows = await sql<{ token: string }>`
    select token from admin_sessions where token = ${token} and expires_at > now()
  `;
  return rows.length > 0;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function envPassword(): string | undefined {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value ? value : undefined;
}

async function passwordConfigured(sql: Sql): Promise<boolean> {
  if (envPassword()) return true;
  const rows = await sql<{ id: number }>`select id from admin_credentials where id = 1`;
  return rows.length > 0;
}

async function passwordMatches(sql: Sql, password: string): Promise<boolean> {
  const fromEnv = envPassword();
  if (fromEnv) {
    const left = Buffer.from(password);
    const right = Buffer.from(fromEnv);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  }
  const rows = await sql<{ password_hash: string }>`
    select password_hash from admin_credentials where id = 1
  `;
  const hash = rows[0]?.password_hash;
  if (!hash) return false;
  return verifyPassword(password, hash);
}

function publishQuestion(question: Question): PublicQuestion {
  return {
    id: question.id,
    number: question.number,
    text: question.text,
    options: question.options.map((option) => ({ key: option.key, text: option.text })),
  };
}

async function latestWrongIds(sql: Sql, studentId: string, lectureId: number): Promise<string[] | null> {
  const latest = await sql<{ id: string }>`
    select id from attempts
    where student_id = ${studentId} and lecture_id = ${lectureId}
    order by created_at desc
    limit 1
  `;
  const attemptId = latest[0]?.id;
  if (!attemptId) return null;
  const wrong = await sql<{ question_id: string }>`
    select question_id from attempt_answers
    where attempt_id = ${attemptId} and correct = false
  `;
  return wrong.map((row) => row.question_id);
}

async function wrongIdsFor(
  sql: Sql,
  studentId: string,
  lectureId: number,
  sourceAttemptId: string,
): Promise<string[] | null> {
  if (sourceAttemptId) {
    const owned = await sql<{ id: string }>`
      select id from attempts
      where id = ${sourceAttemptId} and student_id = ${studentId} and lecture_id = ${lectureId}
    `;
    if (!owned[0]) return null;
    const wrong = await sql<{ question_id: string }>`
      select question_id from attempt_answers
      where attempt_id = ${sourceAttemptId} and correct = false
    `;
    return wrong.map((row) => row.question_id);
  }
  return latestWrongIds(sql, studentId, lectureId);
}

async function notifyTelegram(student: {
  fullName: string;
  studyGroup: string;
  createdAt: string;
}): Promise<boolean> {
  const token = process.env.BOT_TOKEN?.trim();
  const chatId = process.env.ADMIN_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.error("[telegram] BOT_TOKEN или ADMIN_CHAT_ID не заданы — уведомление пропущено");
    return false;
  }
  const text = [
    "🎓 Новый студент зарегистрировался!",
    `👤 Имя и фамилия: ${student.fullName}`,
    `👥 Учебная группа: ${student.studyGroup}`,
    `📅 Дата регистрации: ${formatDate(student.createdAt)}`,
    `🕒 Время регистрации: ${formatTime(student.createdAt)}`,
  ].join("\n");
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("[telegram] не удалось отправить уведомление", response.status, body.slice(0, 400));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[telegram] сервис недоступен", error);
    return false;
  }
}

export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const student = await studentFromCookie(sql);
  return { student };
});

export const registerStudent = createServerFn({ method: "POST" })
  .validator((data: { fullName?: string; studyGroup?: string }) => ({
    fullName: typeof data?.fullName === "string" ? data.fullName : "",
    studyGroup: typeof data?.studyGroup === "string" ? data.studyGroup : "",
  }))
  .handler(async ({ data }) => {
    const fullName = clean(data.fullName);
    const studyGroup = clean(data.studyGroup);
    if (fullName.length < 3 || !fullName.includes(" ")) {
      return { ok: false as const, message: "Укажите имя и фамилию" };
    }
    if (fullName.length > 80) {
      return { ok: false as const, message: "Имя слишком длинное" };
    }
    if (!studyGroup) {
      return { ok: false as const, message: "Укажите учебную группу" };
    }
    if (studyGroup.length > 40) {
      return { ok: false as const, message: "Название группы слишком длинное" };
    }

    const sql = await getSql();
    const nameKey = keyOf(fullName);
    const groupKey = keyOf(studyGroup);
    const id = randomUUID();
    const inserted = await sql<{
      id: string;
      full_name: string;
      study_group: string;
      created_at: unknown;
      telegram_sent: boolean;
    }>`
      insert into students (id, full_name, study_group, name_key, group_key)
      values (${id}, ${fullName}, ${studyGroup}, ${nameKey}, ${groupKey})
      on conflict (name_key, group_key) do nothing
      returning id, full_name, study_group, created_at, telegram_sent
    `;

    const existing = inserted[0]
      ? inserted[0]
      : (
          await sql<{
            id: string;
            full_name: string;
            study_group: string;
            created_at: unknown;
            telegram_sent: boolean;
          }>`
            select id, full_name, study_group, created_at, telegram_sent
            from students
            where name_key = ${nameKey} and group_key = ${groupKey}
          `
        )[0];

    if (!existing) {
      return { ok: false as const, message: "Не удалось сохранить регистрацию" };
    }

    const createdAt = iso(existing.created_at);
    if (!existing.telegram_sent) {
      const claimed = await sql<{ id: string }>`
        update students set telegram_sent = true
        where id = ${existing.id} and telegram_sent = false
        returning id
      `;
      if (claimed.length > 0) {
        const sent = await notifyTelegram({
          fullName: existing.full_name,
          studyGroup: existing.study_group,
          createdAt,
        });
        if (!sent) {
          await sql`update students set telegram_sent = false where id = ${existing.id}`;
        }
      }
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + STUDENT_MAX_AGE * 1000).toISOString();
    await sql`
      insert into student_sessions (token, student_id, expires_at)
      values (${token}, ${existing.id}, ${expires})
    `;
    writeCookie(STUDENT_COOKIE, token, STUDENT_MAX_AGE);
    return {
      ok: true as const,
      student: {
        id: existing.id,
        fullName: existing.full_name,
        studyGroup: existing.study_group,
      },
    };
  });

export const logoutStudent = createServerFn({ method: "POST" }).handler(async () => {
  const sql = await getSql();
  const token = getCookie(STUDENT_COOKIE);
  if (token) await sql`delete from student_sessions where token = ${token}`;
  clearCookie(STUDENT_COOKIE);
  return { ok: true as const };
});

export const getTest = createServerFn({ method: "POST" })
  .validator((data: { lectureId?: number; mode?: string; sourceAttemptId?: string }) => ({
    lectureId: Number(data?.lectureId),
    mode: data?.mode === "retry" ? ("retry" as const) : ("full" as const),
    sourceAttemptId: typeof data?.sourceAttemptId === "string" ? data.sourceAttemptId : "",
  }))
  .handler(async ({ data }) => {
    const { lectureById, questionsForLecture } = await import("@/data/questions");
    const lecture = lectureById(data.lectureId);
    if (!lecture) return { ok: false as const, message: "Такой лекции нет" };
    const sql = await getSql();
    const student = await studentFromCookie(sql);
    if (!student) return { ok: false as const, message: "Сначала зарегистрируйтесь" };

    let questions = questionsForLecture(lecture.id);
    if (data.mode === "retry") {
      const wrongIds = await wrongIdsFor(sql, student.id, lecture.id, data.sourceAttemptId);
      if (!wrongIds) {
        return { ok: false as const, message: "Сначала пройдите полный тест по этой лекции" };
      }
      const wrong = new Set(wrongIds);
      questions = questions.filter((question) => wrong.has(question.id));
      if (questions.length === 0) {
        return {
          ok: true as const,
          empty: true as const,
          lectureId: lecture.id,
          mode: "retry" as const,
          questions: [] as PublicQuestion[],
        };
      }
    }

    return {
      ok: true as const,
      empty: false as const,
      lectureId: lecture.id,
      mode: data.mode,
      questions: questions.map(publishQuestion),
    };
  });

export const checkAnswer = createServerFn({ method: "POST" })
  .validator((data: { questionId?: string; choice?: string }) => ({
    questionId: typeof data?.questionId === "string" ? data.questionId : "",
    choice: typeof data?.choice === "string" ? data.choice : "",
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const student = await studentFromCookie(sql);
    if (!student) return { ok: false as const, message: "Сначала зарегистрируйтесь" };
    if (!isOptionKey(data.choice)) {
      return { ok: false as const, message: "Выберите один из вариантов" };
    }
    const { questionById } = await import("@/data/questions");
    const question = questionById(data.questionId);
    if (!question) return { ok: false as const, message: "Вопрос не найден" };
    const correctOption = question.options.find((option) => option.key === question.correct);
    return {
      ok: true as const,
      correct: question.correct === data.choice,
      correctKey: question.correct,
      correctText: correctOption?.text ?? "",
    };
  });

export const saveAttempt = createServerFn({ method: "POST" })
  .validator((data: {
    lectureId?: number;
    mode?: string;
    sourceAttemptId?: string;
    choices?: { questionId: string; choice: string }[];
  }) => ({
    lectureId: Number(data?.lectureId),
    mode: data?.mode === "retry" ? ("retry" as Mode) : ("full" as Mode),
    sourceAttemptId: typeof data?.sourceAttemptId === "string" ? data.sourceAttemptId : "",
    choices: Array.isArray(data?.choices) ? data.choices : [],
  }))
  .handler(async ({ data }) => {
    const { lectureById, questionsForLecture } = await import("@/data/questions");
    const lecture = lectureById(data.lectureId);
    if (!lecture) return { ok: false as const, message: "Такой лекции нет" };
    const sql = await getSql();
    const student = await studentFromCookie(sql);
    if (!student) return { ok: false as const, message: "Сначала зарегистрируйтесь" };

    let expected = questionsForLecture(lecture.id);
    if (data.mode === "retry") {
      const wrongIds = await wrongIdsFor(sql, student.id, lecture.id, data.sourceAttemptId);
      if (!wrongIds || wrongIds.length === 0) {
        return { ok: false as const, empty: true as const, message: "Поздравляем! У тебя нет ошибок для повторения! 🎉" };
      }
      const wrong = new Set(wrongIds);
      expected = expected.filter((question) => wrong.has(question.id));
    }

    const choiceMap = new Map<string, OptionKey>();
    for (const item of data.choices) {
      if (!item || typeof item.questionId !== "string" || typeof item.choice !== "string") continue;
      if (!isOptionKey(item.choice)) continue;
      choiceMap.set(item.questionId, item.choice);
    }
    if (expected.some((question) => !choiceMap.has(question.id))) {
      return { ok: false as const, message: "Ответьте на все вопросы теста" };
    }

    let correct = 0;
    const graded = expected.map((question) => {
      const choice = choiceMap.get(question.id) ?? "А";
      const isCorrect = choice === question.correct;
      if (isCorrect) correct += 1;
      return { questionId: question.id, choice, correct: isCorrect };
    });
    const total = expected.length;
    const incorrect = total - correct;
    const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
    const attemptId = randomUUID();

    await sql`
      insert into attempts (id, student_id, lecture_id, mode, total, correct, incorrect, percent)
      values (${attemptId}, ${student.id}, ${lecture.id}, ${data.mode}, ${total}, ${correct}, ${incorrect}, ${percent})
    `;
    for (const row of graded) {
      await sql`
        insert into attempt_answers (attempt_id, question_id, choice, correct)
        values (${attemptId}, ${row.questionId}, ${row.choice}, ${row.correct})
      `;
    }

    return {
      ok: true as const,
      attempt: {
        id: attemptId,
        lectureId: lecture.id,
        lectureCard: lecture.card,
        mode: data.mode,
        total,
        correct,
        incorrect,
        percent,
        createdAt: new Date().toISOString(),
      },
    };
  });

export const getAttempt = createServerFn({ method: "POST" })
  .validator((data: { attemptId?: string }) => ({
    attemptId: typeof data?.attemptId === "string" ? data.attemptId : "",
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const student = await studentFromCookie(sql);
    if (!student) return { ok: false as const, message: "Сначала зарегистрируйтесь" };
    const { lectureById } = await import("@/data/questions");
    const rows = data.attemptId
      ? await sql<{
          id: string;
          lecture_id: number;
          mode: Mode;
          total: number;
          correct: number;
          incorrect: number;
          percent: number;
          created_at: unknown;
        }>`
          select id, lecture_id, mode, total, correct, incorrect, percent, created_at
          from attempts
          where id = ${data.attemptId} and student_id = ${student.id}
        `
      : await sql<{
          id: string;
          lecture_id: number;
          mode: Mode;
          total: number;
          correct: number;
          incorrect: number;
          percent: number;
          created_at: unknown;
        }>`
          select id, lecture_id, mode, total, correct, incorrect, percent, created_at
          from attempts
          where student_id = ${student.id}
          order by created_at desc
          limit 1
        `;
    const row = rows[0];
    if (!row) return { ok: false as const, message: "Результат не найден" };
    const lecture = lectureById(row.lecture_id);
    return {
      ok: true as const,
      attempt: {
        id: row.id,
        lectureId: row.lecture_id,
        lectureCard: lecture?.card ?? `Лекция ${row.lecture_id}`,
        mode: row.mode,
        total: asNumber(row.total),
        correct: asNumber(row.correct),
        incorrect: asNumber(row.incorrect),
        percent: asNumber(row.percent),
        createdAt: iso(row.created_at),
      },
    };
  });

export const getHistory = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const student = await studentFromCookie(sql);
  if (!student) return { ok: false as const, message: "Сначала зарегистрируйтесь" };
  const { LECTURES } = await import("@/data/questions");
  const counts = await sql<{ lecture_id: number; attempts: number }>`
    select lecture_id, count(*) as attempts
    from attempts
    where student_id = ${student.id}
    group by lecture_id
  `;
  const latest = await sql<{
    lecture_id: number;
    correct: number;
    incorrect: number;
    total: number;
    percent: number;
    created_at: unknown;
    mode: string;
  }>`
    select distinct on (lecture_id)
      lecture_id, correct, incorrect, total, percent, created_at, mode
    from attempts
    where student_id = ${student.id}
    order by lecture_id, created_at desc
  `;
  const countMap = new Map(counts.map((row) => [row.lecture_id, asNumber(row.attempts)]));
  const latestMap = new Map(latest.map((row) => [row.lecture_id, row]));
  return {
    ok: true as const,
    student,
    lectures: LECTURES.map((lecture) => {
      const last = latestMap.get(lecture.id);
      return {
        lectureId: lecture.id,
        card: lecture.card,
        title: lecture.title,
        attempts: countMap.get(lecture.id) ?? 0,
        latest: last
          ? {
              correct: asNumber(last.correct),
              incorrect: asNumber(last.incorrect),
              total: asNumber(last.total),
              percent: asNumber(last.percent),
              createdAt: iso(last.created_at),
              mode: last.mode,
            }
          : null,
      };
    }),
  };
});

export const getPlatformStatus = createServerFn({ method: "GET" }).handler(async () => {
  return {
    telegram: Boolean(process.env.BOT_TOKEN?.trim() && process.env.ADMIN_CHAT_ID?.trim()),
  };
});

export const getAdminGate = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const configured = await passwordConfigured(sql);
  const authed = configured ? await adminAuthed(sql) : false;
  return {
    configured,
    authed,
    telegram: Boolean(process.env.BOT_TOKEN?.trim() && process.env.ADMIN_CHAT_ID?.trim()),
    envPassword: Boolean(envPassword()),
  };
});

export const setupAdmin = createServerFn({ method: "POST" })
  .validator((data: { password?: string; confirm?: string }) => ({
    password: typeof data?.password === "string" ? data.password : "",
    confirm: typeof data?.confirm === "string" ? data.confirm : "",
  }))
  .handler(async ({ data }) => {
    if (envPassword()) {
      return { ok: false as const, message: "Пароль администратора уже задан на сервере" };
    }
    if (data.password.length < 8) {
      return { ok: false as const, message: "Пароль должен быть не короче 8 символов" };
    }
    if (data.password !== data.confirm) {
      return { ok: false as const, message: "Пароли не совпадают" };
    }
    const sql = await getSql();
    if (await passwordConfigured(sql)) {
      return { ok: false as const, message: "Пароль администратора уже создан" };
    }
    await sql`
      insert into admin_credentials (id, password_hash)
      values (1, ${hashPassword(data.password)})
    `;
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + ADMIN_MAX_AGE * 1000).toISOString();
    await sql`insert into admin_sessions (token, expires_at) values (${token}, ${expires})`;
    writeCookie(ADMIN_COOKIE, token, ADMIN_MAX_AGE);
    return { ok: true as const };
  });

export const loginAdmin = createServerFn({ method: "POST" })
  .validator((data: { password?: string }) => ({
    password: typeof data?.password === "string" ? data.password : "",
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (!(await passwordConfigured(sql))) {
      return { ok: false as const, message: "Сначала задайте пароль администратора" };
    }
    if (!(await passwordMatches(sql, data.password))) {
      return { ok: false as const, message: "Неверный пароль" };
    }
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + ADMIN_MAX_AGE * 1000).toISOString();
    await sql`insert into admin_sessions (token, expires_at) values (${token}, ${expires})`;
    writeCookie(ADMIN_COOKIE, token, ADMIN_MAX_AGE);
    return { ok: true as const };
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const sql = await getSql();
  const token = getCookie(ADMIN_COOKIE);
  if (token) await sql`delete from admin_sessions where token = ${token}`;
  clearCookie(ADMIN_COOKIE);
  return { ok: true as const };
});

export const getAdminOverview = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  if (!(await adminAuthed(sql))) {
    return { ok: false as const, message: "Нужен вход администратора" };
  }
  const students = await sql<{
    id: string;
    full_name: string;
    study_group: string;
    created_at: unknown;
    attempt_count: number;
  }>`
    select s.id, s.full_name, s.study_group, s.created_at,
      (select count(*) from attempts a where a.student_id = s.id) as attempt_count
    from students s
    order by s.created_at desc
  `;
  const latest = await sql<{
    student_id: string;
    lecture_id: number;
    percent: number;
    correct: number;
    total: number;
    created_at: unknown;
  }>`
    select distinct on (student_id)
      student_id, lecture_id, percent, correct, total, created_at
    from attempts
    order by student_id, created_at desc
  `;
  const latestMap = new Map(latest.map((row) => [row.student_id, row]));
  const testCount = students.reduce((sum, row) => sum + asNumber(row.attempt_count), 0);
  return {
    ok: true as const,
    totals: {
      students: students.length,
      tests: testCount,
      groups: new Set(students.map((row) => row.study_group)).size,
    },
    students: students.map((row) => {
      const last = latestMap.get(row.id);
      return {
        id: row.id,
        fullName: row.full_name,
        studyGroup: row.study_group,
        createdAt: iso(row.created_at),
        attemptCount: asNumber(row.attempt_count),
        latest: last
          ? {
              lectureId: last.lecture_id,
              percent: asNumber(last.percent),
              correct: asNumber(last.correct),
              total: asNumber(last.total),
              createdAt: iso(last.created_at),
            }
          : null,
      };
    }),
  };
});
