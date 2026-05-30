"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useMatchesStore } from "@/stores/matchesStore";
import type { ApiMatch } from "@/lib/api/types";

export type RankedMatch = ApiMatch;

/**
 * Shared, cached matches for the signed-in user. /matches and /explore both
 * read from one cache (TTL'd), so navigating between them doesn't re-fetch.
 */
export function useMatches() {
  const me = useAuthStore((s) => s.user);
  const myQ = useAuthStore((s) => s.questionnaire);
  const matches = useMatchesStore((s) => s.matches);
  const status = useMatchesStore((s) => s.status);
  const error = useMatchesStore((s) => s.error);
  const load = useMatchesStore((s) => s.load);

  useEffect(() => {
    if (me && myQ) void load(me.uid);
  }, [me, myQ, load]);

  const loading =
    matches.length === 0 && (status === "idle" || status === "loading");

  return {
    loading,
    matches,
    error: status === "error" ? error : null,
    refreshing: status === "loading",
    refresh: () => {
      if (me) void load(me.uid, true);
    },
  };
}
