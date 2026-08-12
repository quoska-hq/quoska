/**
 * Clock button configuration — computes the main stamp-button's label,
 * color, shadow and icon based on the current clock state and the
 * optimistic action (what the user just pressed).
 */

"use client";

import type { TimeEntry, BreakSession } from "@/types/database";

export type OptimisticAction = "clock-in" | "clock-out" | "pause" | "resume" | null;

export interface ClockButtonConfig {
  label: string;
  bgClass: string;
  hoverClass: string;
  shadowColor: string;
  iconSvg: React.ReactNode;
}

export function getButtonConfig(
  activeEntry: TimeEntry | null,
  activeBreak: BreakSession | null,
  optimisticAction: OptimisticAction,
): ClockButtonConfig {
  // Optimistic states
  if (optimisticAction === "clock-in") {
    return {
      label: "Ausstempeln",
      bgClass: "bg-[#a6535b]",
      hoverClass: "",
      shadowColor: "rgba(114,52,60,0.2)",
      iconSvg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </svg>
      ),
    };
  }
  if (optimisticAction === "clock-out") {
    return {
      label: "Stempeln",
      bgClass: "bg-[#5548ba]",
      hoverClass: "",
      shadowColor: "rgba(81,69,173,0.2)",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.14-6.86a1 1 0 0 0 0-1.72L9.5 4.28a1 1 0 0 0-1.5.86z" />
        </svg>
      ),
    };
  }
  if (optimisticAction === "pause") {
    return {
      label: "Pause beenden",
      bgClass: "bg-[#a96f2d]",
      hoverClass: "",
      shadowColor: "rgba(125,78,24,0.2)",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.14-6.86a1 1 0 0 0 0-1.72L9.5 4.28a1 1 0 0 0-1.5.86z" />
        </svg>
      ),
    };
  }
  if (optimisticAction === "resume") {
    return {
      label: "Ausstempeln",
      bgClass: "bg-[#a6535b]",
      hoverClass: "",
      shadowColor: "rgba(114,52,60,0.2)",
      iconSvg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </svg>
      ),
    };
  }

  // Real states (no optimistic override)
  if (activeBreak) {
    return {
      label: "Pause beenden",
      bgClass: "bg-[#a96f2d]",
      hoverClass: "hover:bg-[#996326]",
      shadowColor: "rgba(125,78,24,0.2)",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.14-6.86a1 1 0 0 0 0-1.72L9.5 4.28a1 1 0 0 0-1.5.86z" />
        </svg>
      ),
    };
  }
  if (activeEntry?.status === "running") {
    return {
      label: "Ausstempeln",
      bgClass: "bg-[#a6535b]",
      hoverClass: "hover:bg-[#98474f]",
      shadowColor: "rgba(114,52,60,0.2)",
      iconSvg: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </svg>
      ),
    };
  }
  return {
    label: "Stempeln",
    bgClass: "bg-[#5548ba]",
    hoverClass: "hover:bg-[#493da7]",
    shadowColor: "rgba(81,69,173,0.2)",
    iconSvg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.14-6.86a1 1 0 0 0 0-1.72L9.5 4.28a1 1 0 0 0-1.5.86z" />
      </svg>
    ),
  };
}
