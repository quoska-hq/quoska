import { Check } from "lucide-react";

const STEPS = [
  { key: "profile", label: "Profil", number: 1 },
  { key: "company", label: "Firma", number: 2 },
  { key: "schedule", label: "Arbeitszeit", number: 3 },
  { key: "invite", label: "Team", number: 4 },
  { key: "review", label: "Prüfen", number: 5 },
] as const;

export function SetupProgress({ currentStep }: { currentStep: string }) {
  const currentStepIndex = currentStep === "done" || currentStep === "verify"
    ? STEPS.length
    : STEPS.findIndex((item) => item.key === currentStep);

  return (
    <div className="mb-8 flex items-start justify-center">
      {STEPS.map((item, index) => (
        <div key={item.key} className="flex items-start">
          <div className="flex w-14 flex-col items-center gap-1 sm:w-20">
            <div className={`flex h-8 w-8 items-center justify-center text-sm font-medium ${
              currentStep === item.key
                ? "bg-[#6658d3] text-white"
                : currentStepIndex > index
                  ? "bg-success text-white"
                  : "bg-[#e3dfd5] text-muted-foreground"
            }`}>
              {currentStepIndex > index ? <Check className="size-4" /> : item.number}
            </div>
            <span className="hidden text-[11px] text-muted-foreground sm:block">{item.label}</span>
          </div>
          {index < STEPS.length - 1 && <div className="mt-4 h-px w-2 bg-border sm:w-5" />}
        </div>
      ))}
    </div>
  );
}
