"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Chip({
  selected,
  onClick,
  disabled,
  className,
  children,
}: ChipProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? "bg-accent-500 text-canvas shadow-soft"
          : "bg-surface text-ink ring-1 ring-line hover:bg-surface-2",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
