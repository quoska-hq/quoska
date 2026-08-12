"use client";

import { DatePicker } from "@/components/date-picker";
import { GermanTimeInput } from "@/components/german-time-input";

interface GermanDateTimeFieldsProps {
  id: string;
  label: string;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

export function GermanDateTimeFields({
  id,
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
}: GermanDateTimeFieldsProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-3">
        <DatePicker
          id={`${id}-date`}
          value={date}
          onChange={onDateChange}
          label="Datum"
        />
        <GermanTimeInput
          id={`${id}-time`}
          value={time}
          onChange={onTimeChange}
          label="Uhrzeit"
        />
      </div>
    </fieldset>
  );
}
