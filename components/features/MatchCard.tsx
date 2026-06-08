"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { Avatar, Card, ProgressRing } from "@/components/ui";
import { formatHostelPrefs, formatRoomTypePrefs } from "@/config/hostels";
import type { RankedMatch } from "@/hooks/useMatches";

export function MatchCard({
  match,
  index = 0,
}: {
  match: RankedMatch;
  index?: number;
}) {
  const { result, user } = match;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 300, damping: 28 }}
    >
      <Link href={`/profile/${user.uid}`}>
        <Card interactive className="flex items-center gap-4">
          <Avatar name={user.fullName} src={user.photoURL} size="lg" ring />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{user.fullName}</p>
            <p className="truncate text-sm text-muted">Year {user.year}</p>
            <p className="truncate text-xs text-faint">
              {formatHostelPrefs(user.hostelPrefs)} ·{" "}
              {formatRoomTypePrefs(user.roomTypePrefs)}
            </p>
            {result.dealbreakerFlags.length > 0 && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-medium text-danger">
                <TriangleAlert className="size-3" />{" "}
                {result.dealbreakerFlags.join(" · ")}
              </span>
            )}
          </div>
          <ProgressRing value={result.overall} size={64} stroke={7} sublabel="match" />
        </Card>
      </Link>
    </motion.div>
  );
}
