"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface RangeBarProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  ticks?: string[];
  onChange: (value: number) => void;
  className?: string;
}

/** Discrete, labelled bar — e.g. fan-off → highest speed. */
export function RangeBar({
  value,
  min,
  max,
  step = 1,
  ticks,
  onChange,
  className,
}: RangeBarProps) {
  const steps: number[] = [];
  for (let v = min; v <= max; v += step) steps.push(v);

  return (
    <div className={cn("select-none", className)}>
      <div className="flex gap-1.5">
        {steps.map((v, i) => {
          const active = v <= value;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              aria-label={ticks?.[i] ?? String(v)}
              className="flex-1"
            >
              <motion.div
                whileTap={{ scaleY: 0.85 }}
                className={cn(
                  "h-9 rounded-xl transition-colors",
                  active ? "bg-accent-400" : "bg-accent-100",
                )}
                style={{
                  opacity: active ? 0.5 + 0.5 * ((i + 1) / steps.length) : 1,
                }}
              />
            </button>
          );
        })}
      </div>
      {ticks && (
        <div className="mt-1.5 flex justify-between text-[10px] text-muted">
          {ticks.map((t, i) => (
            <span key={i} className="flex-1 text-center">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
