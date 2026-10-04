"use client";
import { useState } from "react";
import type { PlanningShift } from "@/types/planning";
import type { PlanningBoardData } from "@/types/planning-client";
import {
  planningAddDays,
  planningIso,
  planningLocal,
  planningWallTime,
} from "@/config/client/planning-calendar";
import { formatDateFullDE } from "@/config/client/date-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GermanDateInput } from "@/components/german-date-input";
export function PlanningEditShift({
  shift,
  data,
  busy,
  onClose,
  onSave,
}: {
  shift: PlanningShift;
  data: PlanningBoardData;
  busy: boolean;
  onClose: () => void;
  onSave: (shift: PlanningShift, reason: string) => void;
}) {
  const [unlock, setUnlock] = useState(false);
  const [pin, setPin] = useState(false);
  const [employee, setEmployee] = useState(shift.employeeId ?? ""),
    [start, setStart] = useState(planningLocal(shift.start).time),
    [end, setEnd] = useState(planningLocal(shift.end).time),
    [nextDay, setNextDay] = useState(
      planningLocal(shift.end).date !== shift.date,
    );
  const [pauses, setPauses] = useState(
      shift.breaks.map((b) => ({
        time: planningLocal(b.start).time,
        minutes: (Date.parse(b.end) - Date.parse(b.start)) / 60000,
      })),
    ),
    [rest, setRest] = useState(shift.substituteDate ?? ""),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dienst am {formatDateFullDE(shift.date)}</DialogTitle>
        </DialogHeader>
        <label className="text-sm">
          Person
          <select
            className="block w-full rounded-md border p-2"
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          >
            <option value="">Unbesetzt</option>
            {data.context.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Beginn
            <Input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Ende
            <Input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={nextDay}
            onChange={(e) => setNextDay(e.target.checked)}
          />
          Ende am Folgetag
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Pausen</legend>
          {pauses.map((p, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <Input
                type="time"
                aria-label={`Pause ${i + 1} Beginn`}
                value={p.time}
                onChange={(e) =>
                  setPauses(
                    pauses.map((v, n) =>
                      n === i ? { ...v, time: e.target.value } : v,
                    ),
                  )
                }
              />
              <Input
                type="number"
                min={15}
                aria-label={`Pause ${i + 1} Minuten`}
                value={p.minutes}
                onChange={(e) =>
                  setPauses(
                    pauses.map((v, n) =>
                      n === i ? { ...v, minutes: Number(e.target.value) } : v,
                    ),
                  )
                }
              />
              <Button
                variant="ghost"
                onClick={() => setPauses(pauses.filter((_, n) => n !== i))}
              >
                Entfernen
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setPauses([...pauses, { time: "10:00", minutes: 30 }])
            }
          >
            Pause hinzufügen
          </Button>
        </fieldset>
        <label className="text-sm">
          Ersatzruhetag für Sonn- oder Feiertagsarbeit
          <GermanDateInput value={rest} onChange={setRest} />
        </label>
        {shift.locked && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unlock}
              onChange={(e) => setUnlock(e.target.checked)}
            />
            Diese Schicht zur automatischen Neubesetzung freigeben
          </label>
        )}
        {!shift.locked && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pin}
              disabled={!employee}
              onChange={(e) => setPin(e.target.checked)}
            />
            Diese Besetzung bei einer Neuberechnung beibehalten
          </label>
        )}
        {shift.locked && (
          <label className="text-sm">
            Begründung für die Änderung am verbindlichen Plan
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        )}
        <Button
          disabled={busy || (shift.locked && reason.trim().length < 10)}
          onClick={() => {
            try {
              onSave(
                {
                  ...shift,
                  employeeId: employee || null,
                  locked: shift.locked ? !unlock : Boolean(employee) && pin,
                  start: planningWallTime(shift.date, start),
                  end: planningWallTime(
                    nextDay ? planningAddDays(shift.date, 1) : shift.date,
                    end,
                  ),
                  substituteDate: rest || null,
                  breaks: pauses.map((p) => {
                    const a = planningWallTime(
                      nextDay && p.time < start
                        ? planningAddDays(shift.date, 1)
                        : shift.date,
                      p.time,
                    );
                    return {
                      start: a,
                      end: planningIso(Date.parse(a) + p.minutes * 60000),
                    };
                  }),
                },
                reason,
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "Ungültige Uhrzeit.");
            }
          }}
        >
          Änderung prüfen & speichern
        </Button>
      </DialogContent>
    </Dialog>
  );
}
