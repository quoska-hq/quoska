"use client";

import { useState } from "react";
import { WorkScheduleEditor } from "@/components/work-schedule-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { totalScheduleMinutes, type WorkSchedule } from "@/types/work-schedule";

interface SetupScheduleStepProps {
  schedule: WorkSchedule;
  setSchedule: (schedule: WorkSchedule) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export function SetupScheduleStep({
  schedule,
  setSchedule,
  onSubmit,
  onBack,
  loading,
  error,
}: SetupScheduleStepProps) {
  const total = totalScheduleMinutes(schedule);
  const [editorValid, setEditorValid] = useState(true);
  const valid = editorValid && total > 0 && total <= 48 * 60;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Deine Arbeitswoche</h2>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <WorkScheduleEditor value={schedule} onChange={setSchedule} onValidityChange={setEditorValid} />

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Zurück</Button>
        <Button className="flex-1" onClick={() => void onSubmit()} disabled={loading || !valid}>
          {loading ? "Wird gespeichert…" : "Weiter"}
        </Button>
      </div>
    </div>
  );
}
