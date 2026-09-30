import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanningPreview } from "@/components/planning/planning-preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dienstplanung – Vorabversion",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PlanningPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <PlanningPreview />;
}
