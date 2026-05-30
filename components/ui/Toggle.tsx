"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  className?: string;
}

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("inline-flex items-center gap-3", className)}
    >
      <span
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors",
          checked ? "bg-accent-500" : "bg-accent-200",
        )}
      >
        <motion.span
          className="absolute left-1 top-1 size-5 rounded-full bg-canvas shadow-soft"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </span>
      {label && <span className="text-sm text-ink">{label}</span>}
    </button>
  );
}
