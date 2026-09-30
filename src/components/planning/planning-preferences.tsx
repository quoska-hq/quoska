"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planningFetch } from "@/services/planningClientService";
import { Button } from "@/components/ui/button";
export function PlanningPreferences({ initial }: { initial: number[] }) {
  const [days, setDays] = useState(initial),
    [message, setMessage] = useState("");
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => planningFetch("/mine", { preferredDays: days }),
    onSuccess: () => {
      setMessage("Deine Wünsche wurden gespeichert.");
      void cache.invalidateQueries({ queryKey: ["planning-mine"] });
    },
    onError: (e) => setMessage(e.message),
  });
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4 print:hidden">
      <h2 className="font-semibold">Meine Wunsch-Arbeitstage</h2>
      <p className="text-sm text-muted-foreground">
        Die Planung berücksichtigt deine Wünsche, soweit Besetzung und
        Arbeitszeitregeln es erlauben. Deine vereinbarte Verfügbarkeit bleibt
        davon getrennt.
      </p>
      <div className="flex flex-wrap gap-4">
        {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((day, index) => (
          <label key={day} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={days.includes(index)}
              onChange={(e) =>
                setDays(
                  e.target.checked
                    ? [...days, index]
                    : days.filter((d) => d !== index),
                )
              }
            />
            {day}
          </label>
        ))}
      </div>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <Button
        disabled={mutation.isPending}
        variant="outline"
        onClick={() => mutation.mutate()}
      >
        Wünsche speichern
      </Button>
    </section>
  );
}
