"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getConnectionsFor } from "@/lib/firebase/db";

const KEY = "roomie-inbox-seen";
const SEEN_EVENT = "roomie-inbox-seen";

function loadLastSeen(): number {
  try {
    const v = localStorage.getItem(KEY);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Call when the user views their DMs/inbox — clears the badge. */
export function markInboxSeen(): void {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* private mode / quota — ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SEEN_EVENT));
  }
}

/**
 * Returns the number of unseen pending requests addressed to the current user.
 * "Unseen" = created after the user last visited the inbox.
 */
export function useInboxBadge(): number {
  const uid = useAuthStore((s) => s.fbUser?.uid ?? null);
  const [count, setCount] = useState(0);

  const recompute = useCallback(
    async (signal: { cancelled: boolean }) => {
      if (!uid) {
        if (!signal.cancelled) setCount(0);
        return;
      }
      try {
        const conns = await getConnectionsFor(uid);
        const lastSeen = loadLastSeen();
        const unseen = conns.filter(
          (c) =>
            c.status === "pending" && c.to === uid && c.createdAt > lastSeen,
        ).length;
        if (!signal.cancelled) setCount(unseen);
      } catch {
        if (!signal.cancelled) setCount(0);
      }
    },
    [uid],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    // Deferred via microtask so the initial setState isn't called
    // synchronously from inside the effect body.
    void Promise.resolve().then(() => recompute(signal));

    const onSeen = () => {
      if (!signal.cancelled) setCount(0);
    };
    if (typeof window !== "undefined") {
      window.addEventListener(SEEN_EVENT, onSeen);
    }
    return () => {
      signal.cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(SEEN_EVENT, onSeen);
      }
    };
  }, [recompute]);

  return count;
}
