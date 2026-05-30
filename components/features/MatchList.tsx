"use client";

import { useEffect, useRef, useState } from "react";
import { MatchCard } from "./MatchCard";
import type { RankedMatch } from "@/hooks/useMatches";

const PAGE = 15;

/** Renders matches incrementally — only what's near the viewport — so long
 *  lists stay smooth without a virtualization dependency. */
export function MatchList({ matches }: { matches: RankedMatch[] }) {
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisible((v) => Math.min(v + PAGE, matches.length));
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [matches.length]);

  return (
    <div className="space-y-3">
      {matches.slice(0, visible).map((m, i) => (
        <MatchCard key={m.user.uid} match={m} index={Math.min(i, 8)} />
      ))}
      {visible < matches.length && <div ref={sentinel} className="h-8" />}
    </div>
  );
}
