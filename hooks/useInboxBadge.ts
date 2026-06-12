"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { markMessagesStatus, subscribeToInbox } from "@/lib/firebase/db";
import type { Connection, Message } from "@/types";

// Seen-state keys are namespaced by the signed-in uid — a browser can hold
// several accounts over time, and one account's "seen" must not silence
// another account's badge.
const KEY = (uid: string) => `roomie-inbox-seen-${uid}`;
const CHAT_KEY = (uid: string, peerUid: string) =>
  `roomie-chat-seen-${uid}-${peerUid}`;
const SEEN_EVENT = "roomie-inbox-seen";

function myUid(): string | null {
  return useAuthStore.getState().fbUser?.uid ?? null;
}

function load(key: string): number {
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Call when the user views the DMs list — clears the request badge. */
export function markInboxSeen(): void {
  const uid = myUid();
  if (!uid) return;
  try {
    localStorage.setItem(KEY(uid), String(Date.now()));
  } catch {
    /* private mode / quota — ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SEEN_EVENT));
  }
}

/** Call when the user is viewing a specific chat — clears its unread tally. */
export function markChatSeen(peerUid: string): void {
  const uid = myUid();
  if (!uid) return;
  try {
    localStorage.setItem(CHAT_KEY(uid, peerUid), String(Date.now()));
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
      const lastInbox = load(KEY(uid));
      const unseenRequests = connections.filter(
        (c) =>
          c.status === "pending" && c.to === uid && c.createdAt > lastInbox,
      ).length;
      const unseenMessages = messages.filter(
        (m) => m.to === uid && m.createdAt > load(CHAT_KEY(uid, m.from)),
      ).length;
      setCount(unseenRequests + unseenMessages);
    };

    const unsubscribe = subscribeToInbox(
      uid,
      (data) => {
        dataRef.current = data;
        recount();
        // This listener runs on every authed page, so receiving a snapshot IS
        // "the recipient's client got the message" — flip sent → delivered.
        const undelivered = data.messages
          .filter((m) => m.to === uid && (m.status ?? "sent") === "sent")
          .map((m) => m.id);
        if (undelivered.length > 0) {
          void markMessagesStatus(undelivered, "delivered").catch(() => {});
        }
      },
      (err) => {
        console.warn("[inbox badge] subscription error:", err);
        setCount(0);
      },
    );
    window.addEventListener(SEEN_EVENT, recount);
    return () => {
      unsubscribe();
      window.removeEventListener(SEEN_EVENT, recount);
    };
  }, [uid]);

  return count;
}
