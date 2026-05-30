"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type Variant = "surface" | "glass" | "sand";

const VARIANTS: Record<Variant, string> = {
  surface: "bg-surface shadow-card",
  glass: "glass shadow-card",
  sand: "bg-sand",
};

export interface CardProps extends HTMLMotionProps<"div"> {
  variant?: Variant;
  interactive?: boolean;
  children?: React.ReactNode;
}

export function Card({
  variant = "surface",
  interactive,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <motion.div
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "rounded-3xl p-5",
        VARIANTS[variant],
        interactive && "cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
