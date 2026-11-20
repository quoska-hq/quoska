import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmployeeLeaveFieldsProps {
  annualDays: string;
  carriedDays: string;
  disabled: boolean;
  onAnnualChange: (value: string) => void;
  onCarriedChange: (value: string) => void;
}

export function EmployeeLeaveFields({
  annualDays,
  carriedDays,
  disabled,
  onAnnualChange,
  onCarriedChange,
}: EmployeeLeaveFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="edit-annual-vacation-days">Urlaubstage pro Jahr</Label>
        <Input
          id="edit-annual-vacation-days"
          type="number"
          min="1"
          max="40"
          step="1"
          value={annualDays}
          onChange={(event) => onAnnualChange(event.target.value)}
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-carried-over-days">Übertragener Resturlaub</Label>
        <Input
          id="edit-carried-over-days"
          type="number"
          min="0"
          max="20"
          step="1"
          value={carriedDays}
          onChange={(event) => onCarriedChange(event.target.value)}
          disabled={disabled}
          required
        />
      </div>
    </div>
  );
}
