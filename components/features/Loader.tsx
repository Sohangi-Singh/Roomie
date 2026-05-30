"use client";

import { motion } from "framer-motion";
import { Brand } from "./Brand";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Brand size="lg" />
      </motion.div>
      <p className="text-sm text-muted">Setting things up…</p>
    </div>
  );
}
