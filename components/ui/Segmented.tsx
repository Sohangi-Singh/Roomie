"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedProps {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export function Segmented({
  options,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedProps) {
  const id = useId();
  return (
    <div className={cn("flex gap-1 rounded-2xl bg-sand p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-1 rounded-xl font-medium transition-colors",
              size === "sm" ? "px-1.5 py-2 text-xs" : "px-3 py-2.5 text-sm",
              active ? "text-accent-900" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-xl bg-surface shadow-soft"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
