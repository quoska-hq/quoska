"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ArrowRight, Check } from "lucide-react";
import { usePlanningModule } from "@/hooks/use-planning-module";
import { useSupabase } from "@/providers/supabase-provider";
import { planningModuleFetch } from "@/services/planningModuleClientService";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function PlanningModuleCard() {
  const status = usePlanningModule(),
    cache = useQueryClient(),
    router = useRouter();
  const { user } = useSupabase();
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => {
      if (!status.data) throw new Error("Bitte den Modulstatus erneut laden.");
      return planningModuleFetch({ enabled, version: status.data.version });
    },
    onSuccess: (data) => {
      cache.setQueryData(["planning-module", user?.id], data);
      void cache.invalidateQueries({ queryKey: ["planning"] });
      void cache.invalidateQueries({ queryKey: ["planning-mine"] });
      void cache.invalidateQueries({ queryKey: ["planning-swaps"] });
      setConfirm(false);
      if (data.enabled) router.push("/app/planning");
    },
    onError: () => {
      void status.refetch();
    },
  });
  const enabled = status.data?.enabled ?? false;
  return (
    <Card id="module" className="border-[#6658d3]/20">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">
          Module
        </p>
        <CardTitle className="flex items-center gap-3">
          <CalendarDays className="size-5 text-[#6658d3]" /> Dienstplanung
          {status.data && (
            <span
              className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
            >
              {enabled ? "Aktiv" : "Nicht aktiviert"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Plane Dienste für dein Team und deine Filialen. Die Dienstplanung
          verwendet eure vorhandenen Mitarbeitenden, Abwesenheiten und
          Zeitkonten.
        </p>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          {[
            "Schichten automatisch vorschlagen",
            "Arbeitszeitregeln prüfen",
            "Dienste veröffentlichen & tauschen",
          ].map((label) => (
            <p key={label} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-[#6658d3]" />
              {label}
            </p>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {enabled
            ? "Dienstplanung und Meine Dienste sind im Menü verfügbar."
            : "Aktiviere das Modul, wenn ihr Dienstpläne benötigt. Anschließend führen wir dich in vier Schritten durch die Einrichtung."}
        </p>
        {status.isPending && (
          <p role="status" className="text-sm">
            Modulstatus wird geladen …
          </p>
        )}
        {status.error && (
          <div role="alert" className="text-sm text-destructive">
            {status.error.message}{" "}
            <Button variant="outline" onClick={() => void status.refetch()}>
              Erneut laden
            </Button>
          </div>
        )}
        {mutation.error && (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {enabled ? (
            <>
              <Button render={<Link href="/app/planning" />}>
                Dienstplanung öffnen <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setConfirm(true)}
              >
                Modul deaktivieren
              </Button>
            </>
          ) : (
            <Button
              disabled={!status.data || mutation.isPending}
              onClick={() => mutation.mutate(true)}
            >
              {mutation.isPending
                ? "Wird aktiviert …"
                : "Dienstplanung aktivieren"}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!mutation.isPending) setConfirm(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dienstplanung deaktivieren?</DialogTitle>
            <DialogDescription>
              Die Planung und Meine Dienste werden ausgeblendet. Gespeicherte
              Pläne bleiben erhalten und sind nach erneuter Aktivierung wieder
              verfügbar. Laufende Rechenvorschläge werden verworfen.
            </DialogDescription>
          </DialogHeader>
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setConfirm(false)}
            >
              Abbrechen
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(false)}
            >
              {mutation.isPending
                ? "Wird deaktiviert …"
                : "Dienstplanung deaktivieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
