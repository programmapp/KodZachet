import { useEffect, useState } from "react";
import { getMe, type StudentProfile } from "@/lib/exam.functions";

export type SessionState =
  | { status: "loading"; student: null }
  | { status: "guest"; student: null }
  | { status: "ready"; student: StudentProfile };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading", student: null });
  useEffect(() => {
    let live = true;
    getMe()
      .then((result) => {
        if (!live) return;
        if (result.student) setState({ status: "ready", student: result.student });
        else setState({ status: "guest", student: null });
      })
      .catch(() => {
        if (live) setState({ status: "guest", student: null });
      });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
