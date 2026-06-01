"use client";

import { motion } from "framer-motion";
import { Avatar, Card, ProgressRing } from "@/components/ui";

/** The floating sample-match card. Moved from the hero to a "preview" section
 *  lower on the landing page, so the hero leads with copy instead of a mock. */
export function MatchPreview() {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <Card className="flex items-center gap-4">
        <Avatar name="Aanya R" size="lg" ring />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Aanya, 2nd year</p>
          <p className="truncate text-sm text-muted">
            Early sleeper · tidy · quiet study
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
              Sleep 96%
            </span>
            <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700">
              Study 91%
            </span>
          </div>
        </div>
        <ProgressRing value={93} size={68} stroke={7} sublabel="match" />
      </Card>
    </motion.div>
  );
}
