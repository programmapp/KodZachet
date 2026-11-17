const ZONE = "Asia/Tashkent";

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function commentForScore(correct: number, total: number): string {
  const scaled = total === 25 || total <= 0 ? correct : Math.round((correct / total) * 25);
  if (scaled >= 21) {
    return "Великолепно! 🔥 Похоже, программирование уже начинает бояться тебя! Так держать!";
  }
  if (scaled >= 16) {
    return "Очень хорошо! 😎 Ты на правильном пути. Ещё немного практики — и будешь настоящим мастером!";
  }
  if (scaled >= 11) {
    return "Неплохо! 🙂 Но есть куда расти. Не сдавайся, программистом становятся через практику!";
  }
  if (scaled >= 6) {
    return "Кажется, некоторые лекции решили спрятаться от тебя! 😂 Пора повторить материал и попробовать снова!";
  }
  return "Ого! 😂 Похоже, тест сегодня оказался сильнее. Не переживай, даже великие программисты когда-то начинали с нуля. Попробуй ещё раз!";
}
