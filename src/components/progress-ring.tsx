/**
 * ProgressRing — circular progress indicator for the clock view.
 */

"use client";

export interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  celebrating: boolean;
  isDeficit: boolean;
}

export function ProgressRing({ progress, size, strokeWidth, celebrating }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const offset = circumference * (1 - clampedProgress);

  const color = clampedProgress >= 1 ? "#10b981" : "#6658d3";

  const glowColor = celebrating ? "#fbbf24" : color;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={celebrating ? "ring-celebrate" : ""}
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#e7e3da"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="progress-ring-fill"
        style={{
          transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.8s ease",
          filter: celebrating ? `drop-shadow(0 0 8px ${glowColor}40)` : "none",
        }}
      />
    </svg>
  );
}
