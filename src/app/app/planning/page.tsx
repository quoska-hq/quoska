import { notFound } from "next/navigation";
import { PlanningPreview } from "@/components/planning/planning-preview";

export default function PlanningPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PlanningPreview standalone={false} />;
}
