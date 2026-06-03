"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getConnectionsFor, getMessagesTo } from "@/lib/firebase/db";

const KEY = "roomie-inbox-seen";
const CHAT_KEY = (peerUid: string) => `roomie-chat-seen-${peerUid}`;
const SEEN_EVENT = "roomie-inbox-seen";

function loadLastSeen(): number {
  try {
    const v = localStorage.getItem(KEY);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

function loadChatLastSeen(peerUid: string): number {
  try {
    const v = localStorage.getItem(CHAT_KEY(peerUid));
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Call when the user views the DMs list — clears the request badge. */
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

/** Call when the user is viewing a specific chat — clears its unread tally. */
export function markChatSeen(peerUid: string): void {
  try {
    localStorage.setItem(CHAT_KEY(peerUid), String(Date.now()));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SEEN_EVENT));
  }
}

/**
 * Total inbox badge — counts both:
 *   • pending requests addressed to the user, created after their last
 *     visit to the DMs list, plus
 *   • messages addressed to the user, newer than their last visit to the
 *     specific chat with that sender.
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
        const [conns, msgs] = await Promise.all([
          getConnectionsFor(uid),
          getMessagesTo(uid),
        ]);
        const lastInbox = loadLastSeen();
        const unseenRequests = conns.filter(
          (c) =>
            c.status === "pending" && c.to === uid && c.createdAt > lastInbox,
        ).length;
        const unseenMessages = msgs.filter(
          (m) => m.createdAt > loadChatLastSeen(m.from),
        ).length;
        if (!signal.cancelled) setCount(unseenRequests + unseenMessages);
      } catch {
        if (!signal.cancelled) setCount(0);
      }
    },
    [uid],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void Promise.resolve().then(() => recompute(signal));

    const onSeen = () => {
      void recompute(signal);
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
