"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToInbox } from "@/lib/firebase/db";
import type { Connection, Message } from "@/types";

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
  // Latest snapshot data, so a "seen" event can recount without refetching.
  const dataRef = useRef<{ connections: Connection[]; messages: Message[] }>({
    connections: [],
    messages: [],
  });

  useEffect(() => {
    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on sign-out
      setCount(0);
      return;
    }
    const recount = () => {
      const { connections, messages } = dataRef.current;
      const lastInbox = loadLastSeen();
      const unseenRequests = connections.filter(
        (c) =>
          c.status === "pending" && c.to === uid && c.createdAt > lastInbox,
      ).length;
      const unseenMessages = messages.filter(
        (m) => m.to === uid && m.createdAt > loadChatLastSeen(m.from),
      ).length;
      setCount(unseenRequests + unseenMessages);
    };

    const unsubscribe = subscribeToInbox(
      uid,
      (data) => {
        dataRef.current = data;
        recount();
      },
      () => setCount(0),
    );
    window.addEventListener(SEEN_EVENT, recount);
    return () => {
      unsubscribe();
      window.removeEventListener(SEEN_EVENT, recount);
    };
  }, [uid]);

  return count;
}
