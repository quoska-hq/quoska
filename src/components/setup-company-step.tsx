"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BUNDESLAENDER, BUNDESLAND_LABELS, getBundeslandLabel } from "@/types/tenant";
import { setupCompanySchema, type SetupCompanyInput } from "@/types/setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CompanyStepProps {
  initialData: SetupCompanyInput;
  onSubmit: (data: SetupCompanyInput) => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export function CompanyStep({ initialData, onSubmit, onBack, loading, error }: CompanyStepProps) {
  const [selectedBundesland, setSelectedBundesland] = useState(initialData.bundesland);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SetupCompanyInput>({
    resolver: zodResolver(setupCompanySchema),
    defaultValues: initialData,
  });

  function handleFormSubmit(data: SetupCompanyInput) {
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="companyName">Firmenname</Label>
        <Input
          id="companyName"
          {...register("companyName")}
          placeholder="Müller GmbH"
        />
        {errors.companyName && (
          <p className="text-xs text-destructive">
            {errors.companyName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bundesland">Bundesland</Label>
        <Select value={selectedBundesland} onValueChange={(v) => {
          setSelectedBundesland(v ?? "");
          setValue("bundesland", v ?? "", { shouldValidate: true });
        }}>
          <SelectTrigger id="bundesland" className="w-full">
            <SelectValue placeholder="Bitte wählen...">
              {getBundeslandLabel(selectedBundesland) || "Bitte wählen..."}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Bitte wählen...</SelectItem>
            {BUNDESLAENDER.map((bl) => (
              <SelectItem key={bl} value={bl}>
                {BUNDESLAND_LABELS[bl]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.bundesland && (
          <p className="text-xs text-destructive">
            {errors.bundesland.message}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Zurück
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Wird gespeichert..." : "Weiter"}
        </Button>
      </div>
    </form>
  );
}
