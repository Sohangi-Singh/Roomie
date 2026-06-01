"use client";

import { motion } from "framer-motion";

interface Tag {
  label: string;
  emoji: string;
  /** position as % within the container */
  left: number;
  top: number;
  /** drift amplitude in px */
  dx: number;
  dy: number;
  /** seconds */
  duration: number;
  delay: number;
}

const TAGS: Tag[] = [
  { label: "Night owl", emoji: "🌙", left: 8, top: 12, dx: 10, dy: 8, duration: 6, delay: 0 },
  { label: "Quiet study", emoji: "📖", left: 56, top: 8, dx: 8, dy: 10, duration: 7, delay: 0.4 },
  { label: "Clean room", emoji: "✨", left: 18, top: 42, dx: 12, dy: 6, duration: 6.5, delay: 0.8 },
  { label: "Guests ok", emoji: "👋", left: 62, top: 38, dx: 10, dy: 8, duration: 5.5, delay: 1.2 },
  { label: "Gym", emoji: "🏋️", left: 6, top: 70, dx: 8, dy: 10, duration: 7, delay: 0.6 },
  { label: "Room decor", emoji: "🪴", left: 44, top: 66, dx: 10, dy: 6, duration: 6.2, delay: 1 },
  { label: "Shared snacks", emoji: "🍫", left: 70, top: 74, dx: 8, dy: 10, duration: 6.8, delay: 0.2 },
];

export function FloatingTags() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-3xl bg-sand">
      {/* soft inner glow to set the stage */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_50%,var(--color-accent-100),transparent_70%)]"
      />
      {TAGS.map((t, i) => (
        <motion.span
          key={t.label}
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
          style={{ left: `${t.left}%`, top: `${t.top}%` }}
          className="absolute inline-block"
        >
          <motion.span
            animate={{
              x: [0, t.dx, -t.dx * 0.6, 0],
              y: [0, -t.dy, t.dy * 0.6, 0],
            }}
            transition={{
              duration: t.duration,
              delay: t.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-accent-800 shadow-soft ring-1 ring-line"
          >
            <span aria-hidden>{t.emoji}</span>
            <span>{t.label}</span>
          </motion.span>
        </motion.span>
      ))}
    </div>
  );
}
