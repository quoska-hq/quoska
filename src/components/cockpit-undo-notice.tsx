"use client";

import { Button } from "@/components/ui/button";
import type { useCockpitDismissal } from "@/hooks/use-cockpit-dismissal";

export function CockpitUndoNotice({ undo, undoItems }: Pick<ReturnType<typeof useCockpitDismissal>, "undo" | "undoItems">) {
  return (
    <div className="space-y-2" aria-live="polite">
      {undoItems.map((item) => (
        <div key={item.token} className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-slate-900/15 bg-white px-4 py-3 text-sm" data-testid="cockpit-undo-notice">
          <span>{item.count === 1 ? "Hinweis ausgeblendet." : `${item.count} Hinweise ausgeblendet.`}</span>
          <Button variant="outline" size="sm" disabled={undo.isPending} onClick={() => undo.mutate(item.token)}>
            Rückgängig
          </Button>
        </div>
      ))}
      {undo.error && <p role="alert" className="mb-3 text-sm text-red-700">{undo.error.message}</p>}
    </div>
  );
}
