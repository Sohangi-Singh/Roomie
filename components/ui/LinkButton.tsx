"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./Button";

export interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function LinkButton({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
}: LinkButtonProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={fullWidth ? "w-full" : "inline-flex"}
    >
      <Link
        href={href}
        className={buttonClasses(variant, size, fullWidth, className)}
      >
        {children}
      </Link>
    </motion.div>
  );
}
