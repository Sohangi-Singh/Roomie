import { create } from "zustand";
import { fetchMatches } from "@/lib/api/matches";
import type { ApiMatch } from "@/lib/api/types";

/** How long a fetched match list stays fresh before a re-fetch is allowed. */
const TTL = 3 * 60 * 1000;

type Status = "idle" | "loading" | "ready" | "error";

interface MatchesState {
  uid: string | null;
  matches: ApiMatch[];
  fetchedAt: number;
  status: Status;
  error: string | null;
  /** Fetch (or reuse cached) matches for `uid`. */
  load: (uid: string, force?: boolean) => Promise<void>;
  reset: () => void;
}

export const useMatchesStore = create<MatchesState>((set, get) => ({
  uid: null,
  matches: [],
  fetchedAt: 0,
  status: "idle",
  error: null,
  load: async (uid, force = false) => {
    const s = get();
    const fresh =
      s.uid === uid && s.status === "ready" && Date.now() - s.fetchedAt < TTL;
    if (!force && fresh) return;
    if (s.status === "loading" && s.uid === uid) return;
    set({
      status: "loading",
      error: null,
      uid,
      matches: s.uid === uid ? s.matches : [],
    });
    try {
      const matches = await fetchMatches();
      set({ matches, fetchedAt: Date.now(), status: "ready", uid });
    } catch {
      set({ status: "error", error: "Couldn't load matches." });
    }
  },
  reset: () =>
    set({ uid: null, matches: [], fetchedAt: 0, status: "idle", error: null }),
}));
