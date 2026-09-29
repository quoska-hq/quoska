import type { BreakSession } from "@/types/database";
import { formatTimeLocal } from "@/config/client/date-utils";
import { formatStopwatch } from "@/components/use-live-clock";

export function ShortInterruptions({ sessions }: { sessions: BreakSession[] }) {
  if (!sessions.length) return null;
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      {sessions.map((session) => (
        <p key={session.id}>
          Kurze Unterbrechung: {formatTimeLocal(session.break_start)}–{formatTimeLocal(session.break_end!)}
          {" "}({formatStopwatch((Date.parse(session.break_end!) - Date.parse(session.break_start)) / 1000)})
          {" · "}kein Pausenabzug
        </p>
      ))}
    </div>
  );
}
