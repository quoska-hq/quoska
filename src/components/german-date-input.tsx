"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { formatDateFullDE, parseGermanDate } from "@/config/client/date-utils";
import { cn } from "@/lib/utils";

interface GermanDateInputProps extends Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange" | "min" | "max"> {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

export function GermanDateInput({ value, onChange, min, max, className, ...props }: GermanDateInputProps) {
  const [draft, setDraft] = useState(() => formatDateFullDE(value));
  const [previousValue, setPreviousValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  if (value !== previousValue) {
    setPreviousValue(value);
    setDraft(formatDateFullDE(value));
  }
  const parsed = parseGermanDate(draft);
  const error = !draft ? "" : !parsed ? "Bitte ein gültiges Datum als TT.MM.JJJJ eingeben."
    : min && parsed < min ? `Bitte ein Datum ab ${formatDateFullDE(min)} wählen.`
      : max && parsed > max ? `Bitte ein Datum bis ${formatDateFullDE(max)} wählen.` : "";
  useEffect(() => { inputRef.current?.setCustomValidity(error); }, [error]);

  function updateDraft(text: string) {
    setDraft(text);
    const next = parseGermanDate(text) ?? "";
    setPreviousValue(next);
    onChange(next);
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Input {...props} ref={inputRef} type="text" inputMode="numeric" lang="de-DE"
        autoComplete="off" placeholder="TT.MM.JJJJ" maxLength={10}
        value={draft} aria-invalid={Boolean(error)} className="font-mono tabular-nums"
        onChange={(event) => updateDraft(event.target.value.replace(/[^0-9.]/g, ""))}
        onBlur={(event) => {
          if (parsed) setDraft(formatDateFullDE(parsed));
          props.onBlur?.(event);
        }} />
      <DatePicker iconOnly value={value} disabled={props.disabled} minDate={min} maxDate={max}
        onChange={(next) => {
          setPreviousValue(next);
          setDraft(formatDateFullDE(next));
          onChange(next);
        }} />
    </div>
  );
}
