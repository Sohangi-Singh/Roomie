"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const LINES = [
  "Your roommate shapes your sleep.",
  "Your roommate shapes your social life.",
  "Your roommate shapes your habits.",
  "Choose wisely.",
];

const INTERVAL = 2800;

export function RotatingStat() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % LINES.length), INTERVAL);
    return () => clearInterval(t);
  }, []);

  const isFinal = i === LINES.length - 1;

  return (
    <div className="relative flex flex-col items-center text-center">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
        Did you know?
      </p>
      <div className="relative h-14 w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={
              isFinal
                ? "absolute inset-0 flex items-center justify-center font-display text-2xl font-semibold italic text-accent-700"
                : "absolute inset-0 flex items-center justify-center font-display text-xl italic text-ink"
            }
          >
            {LINES[i]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
