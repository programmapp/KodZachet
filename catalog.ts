export type LectureCard = {
  id: number;
  card: string;
  title: string;
  detail: string;
  count: number;
};

export const CATALOG: LectureCard[] = [
  {
    id: 1,
    card: "Тест по первой лекции",
    title: "Введение. Алгоритмы и псевдокод",
    detail: "Структура программы на C++, компилятор и интерпретатор",
    count: 25,
  },
  {
    id: 2,
    card: "Тест по второй лекции",
    title: "Типы данных, переменные и операторы",
    detail: "Арифметика, преобразования и форматированный вывод",
    count: 25,
  },
  {
    id: 3,
    card: "Тест по третьей лекции",
    title: "Сравнения, логика и ветвления",
    detail: "if, else if, switch-case и тернарный оператор",
    count: 25,
  },
  {
    id: 4,
    card: "Тест по четвёртой лекции",
    title: "Операторы цикла",
    detail: "while, do while, for и передача управления",
    count: 25,
  },
  {
    id: 5,
    card: "Тест по пятой лекции",
    title: "Встроенные и пользовательские функции",
    detail: "Математика, символы, случайные числа и свои функции",
    count: 25,
  },
  {
    id: 6,
    card: "Тест по шестой лекции",
    title: "Передача аргументов",
    detail: "По значению и по ссылке, параметры по умолчанию, static",
    count: 25,
  },
  {
    id: 7,
    card: "Тест по седьмой лекции",
    title: "Одномерные массивы",
    detail: "Объявление, обход, поиск и обработка элементов",
    count: 25,
  },
  {
    id: 8,
    card: "Тест по восьмой лекции",
    title: "Многомерные массивы и сортировка",
    detail: "Поиск элементов, сортировки и O-нотация",
    count: 25,
  },
];

export function catalogLecture(id: number): LectureCard | undefined {
  return CATALOG.find((lecture) => lecture.id === id);
}
