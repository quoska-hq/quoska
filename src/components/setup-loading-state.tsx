"use client";

import { Button } from "@/components/ui/button";

export function SetupLoadingState({ failed }: { failed: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee]">
      {failed ? (
        <div className="max-w-md space-y-4 px-5 text-center">
          <p role="alert" className="text-sm text-slate-700">
            Die Einrichtung konnte nicht geladen werden. Bitte prüfe deine Verbindung
            und versuche es erneut. Bereits gespeicherte Angaben bleiben erhalten.
          </p>
          <Button onClick={() => window.location.reload()}>Erneut versuchen</Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Einrichtung wird geladen…</p>
      )}
    </div>
  );
}
