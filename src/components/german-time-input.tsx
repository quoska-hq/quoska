"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isGermanTime } from "@/config/client/date-utils";

interface GermanTimeInputProps extends Omit<
  ComponentProps<typeof Input>, "type" | "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function GermanTimeInput({
  value,
  onChange,
  label,
  id,
  className,
  ...props
}: GermanTimeInputProps) {
  const invalid = Boolean(value && !isGermanTime(value));

  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        {...props}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        lang="de-DE"
        value={value}
        maxLength={5}
        placeholder="HH:MM"
        aria-invalid={invalid}
        className={cn("font-mono tabular-nums", className)}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9:]/g, ""))}
        onBlur={() => {
          const normalized = normalizeTime(value);
          if (normalized) onChange(normalized);
        }}
      />
    </div>
  );
}

function normalizeTime(value: string): string | null {
  if (isGermanTime(value)) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 1 || digits.length > 4) return null;
  const hours = Number(digits.length <= 2 ? digits : digits.slice(0, -2));
  const minutes = Number(digits.length <= 2 ? "0" : digits.slice(-2));
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
