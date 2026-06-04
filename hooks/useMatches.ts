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
    // Stale-while-revalidate: show any cached list instantly, but always kick a
    // background refresh on mount so the ranked list stays in sync with the
    // always-fresh per-profile /api/match scores. Otherwise the list could show
    // a stale % that disagrees with the score on the profile page. The realtime
    // meta/matches listener handles live edits; this covers ticks it can't see
    // (e.g. the /meta Firestore rule not yet published, or out-of-band edits).
    if (me && myQ) void load(me.uid, true);
  }, [me, myQ, load]);

  const loading =
    matches.length === 0 && (status === "idle" || status === "loading");

  return {
    loading,
    matches,
    // Only surface an error when there's nothing to show — a failed background
    // revalidation must not replace a perfectly good cached list with an error.
    error: status === "error" && matches.length === 0 ? error : null,
    refreshing: status === "loading",
    refresh: () => {
      if (me) void load(me.uid, true);
    },
  };
}
