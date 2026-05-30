"use client";

import { motion } from "framer-motion";
import { scoreColor } from "@/config/tokens";
import { cn } from "@/lib/utils/cn";

export interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  label,
  sublabel,
  color,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;
  const col = color ?? scoreColor(clamped);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent-100)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display text-xl font-semibold leading-none"
          style={{ color: col }}
        >
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel && (
          <span className="mt-0.5 text-[10px] font-medium text-muted">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
