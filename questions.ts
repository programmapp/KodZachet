import { lecturesA } from "./lectures-a";
import { lecturesB } from "./lectures-b";

export const OPTION_KEYS = ["А", "Б", "В", "Г"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export type Question = {
  id: string;
  lecture: number;
  number: number;
  text: string;
  options: { key: OptionKey; text: string }[];
  correct: OptionKey;
};

export type LectureMeta = {
  id: number;
  card: string;
  title: string;
  detail: string;
  count: number;
};

const packs = [...lecturesA, ...lecturesB];

function isKey(value: string): value is OptionKey {
  return (OPTION_KEYS as readonly string[]).includes(value);
}

export const QUESTIONS: Question[] = packs.flatMap((pack) => {
  const letters = [...pack.key];
  if (pack.questions.length !== 25 || letters.length !== 25) {
    throw new Error(`Лекция ${pack.id}: ожидалось 25 вопросов`);
  }
  return pack.questions.map((row, index) => {
    const correct = letters[index] ?? "";
    if (!isKey(correct)) throw new Error(`Лекция ${pack.id}, вопрос ${index + 1}: неверный ключ`);
    const [, a, b, c, d] = row;
    return {
      id: `L${pack.id}Q${index + 1}`,
      lecture: pack.id,
      number: index + 1,
      text: row[0],
      options: [
        { key: "А" as const, text: a },
        { key: "Б" as const, text: b },
        { key: "В" as const, text: c },
        { key: "Г" as const, text: d },
      ],
      correct,
    };
  });
});

export const LECTURES: LectureMeta[] = packs.map((pack) => ({
  id: pack.id,
  card: pack.card,
  title: pack.title,
  detail: pack.detail,
  count: 25,
}));

const byId = new Map(QUESTIONS.map((question) => [question.id, question]));

export function lectureById(id: number): LectureMeta | undefined {
  return LECTURES.find((lecture) => lecture.id === id);
}

export function questionsForLecture(lectureId: number): Question[] {
  return QUESTIONS.filter((question) => question.lecture === lectureId);
}

export function questionById(id: string): Question | undefined {
  return byId.get(id);
}

export function assertQuestionBank(): void {
  if (LECTURES.length !== 8) throw new Error("Должно быть 8 лекций");
  if (QUESTIONS.length !== 200) throw new Error("Должно быть 200 вопросов");
  for (const lecture of LECTURES) {
    const slice = questionsForLecture(lecture.id);
    if (slice.length !== 25) throw new Error(`Лекция ${lecture.id}: ${slice.length} вопросов`);
    slice.forEach((question, index) => {
      if (question.options.length !== 4) throw new Error(`${question.id}: нет 4 вариантов`);
      if (!question.options.some((option) => option.key === question.correct)) {
        throw new Error(`${question.id}: ключ вне вариантов`);
      }
      if (question.number !== index + 1) throw new Error(`${question.id}: сбилась нумерация`);
    });
  }
}

assertQuestionBank();
