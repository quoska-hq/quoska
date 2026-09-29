"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function EarlyBreakDialog({ open, onOpenChange, onConfirm, pending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Pause vorzeitig beenden?</DialogTitle>
          <DialogDescription>Diese Unterbrechung ist kürzer als 15 Minuten und zählt nicht zur gesetzlichen Mindestpause.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Weiter pausieren</Button>
          <Button disabled={pending} onClick={onConfirm}>Pause beenden</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
