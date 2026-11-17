import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "Произошла непредвиденная ошибка. Обновите страницу.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="atmosphere flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-bad" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Что-то пошло не так</h1>
      <p className="muted max-w-md text-sm break-words">{errorMessage(error)}</p>
    </main>
  );
}
