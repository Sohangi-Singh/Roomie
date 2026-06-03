"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { sendMessage, subscribeToConversation } from "@/lib/firebase/db";
import type { Message } from "@/types";

/**
 * Live subscription to the conversation between the signed-in user and
 * `otherUid`. Returns the sorted message list, a loading flag, an error
 * (typically permission-denied if Firestore rules haven't been published),
 * and a `send(text)` helper.
 */
export function useChat(otherUid: string | null) {
  const me = useAuthStore((s) => s.fbUser);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me || !otherUid) {
      return;
    }
    let cancelled = false;
    const unsubscribe = subscribeToConversation(
      me.uid,
      otherUid,
      (msgs) => {
        if (cancelled) return;
        setMessages(msgs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (cancelled) return;
        setLoading(false);
        setError(
          /permission/i.test(err.message)
            ? "Chat isn't enabled yet — Firestore rules need to be published."
            : "Couldn't load messages. Check your connection.",
        );
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [me, otherUid]);

  const send = useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!me || !otherUid || !body) return;
      await sendMessage({
        from: me.uid,
        to: otherUid,
        participants: [me.uid, otherUid],
        text: body,
        createdAt: Date.now(),
      });
    },
    [me, otherUid],
  );

  return { messages, loading, error, send };
}
