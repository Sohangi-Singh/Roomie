"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useThemeStore } from "@/stores/themeStore";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const [mounted, setMounted] = useState(false);

  // Avoid icon mismatch between SSR ("light") and the value the no-FOUC
  // script may have set. Render the icon only after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration flag
  useEffect(() => setMounted(true), []);

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full text-muted ring-1 ring-line transition-colors hover:bg-sand hover:text-ink",
        className,
      )}
    >
      {mounted &&
        (theme === "dark" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        ))}
    </motion.button>
  );
}
