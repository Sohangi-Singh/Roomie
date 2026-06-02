"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type Tone =
  | "solid"
  | "outline"
  | "soft"
  | "sand"
  | "success"
  | "warning";
type Size = "sm" | "md" | "lg";

interface Tag {
  label: string;
  emoji: string;
  tone: Tone;
  size: Size;
  /** Position as % within the container. */
  left: number;
  top: number;
  /** Base tilt in degrees. */
  rotate: number;
  /** Drift amplitude in px. */
  dx: number;
  dy: number;
  /** Seconds for one drift loop. */
  duration: number;
  /** Stagger the loops so they don't pulse in sync. */
  delay: number;
}

const TAGS: Tag[] = [
  { label: "Sleeps at 11 sharp", emoji: "🌙", tone: "solid",   size: "md", left:  4, top:  3, rotate: -5, dx: 12, dy:  8, duration: 6.8, delay: 0.0 },
  { label: "Headphones, always", emoji: "🎧", tone: "outline", size: "sm", left: 58, top:  2, rotate:  4, dx: 10, dy: 12, duration: 7.4, delay: 0.4 },
  { label: "Library mole",       emoji: "📚", tone: "sand",    size: "lg", left: 10, top: 22, rotate: -3, dx: 14, dy:  6, duration: 6.2, delay: 0.8 },
  { label: "Bed always made",    emoji: "✨", tone: "success", size: "md", left: 60, top: 26, rotate:  6, dx:  8, dy: 10, duration: 7.0, delay: 1.2 },
  { label: "6 AM gym",           emoji: "🏋️", tone: "soft",    size: "sm", left:  2, top: 44, rotate:  5, dx: 12, dy:  8, duration: 6.6, delay: 0.6 },
  { label: "Plant parent",       emoji: "🪴", tone: "outline", size: "md", left: 48, top: 44, rotate: -4, dx: 10, dy: 12, duration: 7.6, delay: 1.5 },
  { label: "Splits 50 / 50",     emoji: "💸", tone: "solid",   size: "sm", left: 66, top: 58, rotate:  4, dx:  8, dy: 10, duration: 6.3, delay: 0.2 },
  { label: "Café over club",     emoji: "☕", tone: "soft",    size: "md", left: 12, top: 60, rotate: -6, dx: 12, dy:  6, duration: 7.2, delay: 1.0 },
  { label: "Cooks at 1 AM",      emoji: "🍜", tone: "warning", size: "sm", left: 56, top: 72, rotate:  3, dx: 10, dy: 12, duration: 6.8, delay: 0.5 },
  { label: "Night owl till 3",   emoji: "🦉", tone: "solid",   size: "md", left:  8, top: 78, rotate: -5, dx: 14, dy:  6, duration: 7.4, delay: 1.3 },
  { label: "Shares snacks",      emoji: "🍫", tone: "success", size: "sm", left: 60, top: 88, rotate:  5, dx: 10, dy: 10, duration: 6.6, delay: 0.7 },
];

const TONE_CLS: Record<Tone, string> = {
  solid:   "bg-accent-500 text-canvas shadow-card",
  outline: "bg-surface text-accent-800 shadow-soft ring-1 ring-line",
  soft:    "bg-accent-100 text-accent-800",
  sand:    "bg-sand text-accent-800 shadow-soft",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

const SIZE_CLS: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

export function FloatingTags() {
  return (
    <div className="relative h-[26rem] w-full">
      {TAGS.map((t, i) => (
        <motion.span
          key={t.label}
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{
            duration: 0.55,
            delay: 0.05 * i,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ left: `${t.left}%`, top: `${t.top}%` }}
          className="absolute inline-block"
        >
          <motion.span
            animate={{
              x: [0, t.dx, -t.dx * 0.6, 0],
              y: [0, -t.dy, t.dy * 0.6, 0],
              rotate: [t.rotate, t.rotate + 3, t.rotate - 2, t.rotate],
            }}
            transition={{
              duration: t.duration,
              delay: t.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={cn(
              "inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
              TONE_CLS[t.tone],
              SIZE_CLS[t.size],
            )}
          >
            <span aria-hidden>{t.emoji}</span>
            <span>{t.label}</span>
          </motion.span>
        </motion.span>
      ))}
    </div>
  );
}
