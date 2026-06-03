"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { sendMessage, subscribeToConversation } from "@/lib/firebase/db";
import type { Message } from "@/types";

/**
 * Live subscription to the conversation between the signed-in user and
 * `otherUid`. Returns the sorted message list, a loading flag, and a
 * `send(text)` helper.
 */
export function useChat(otherUid: string | null) {
  const me = useAuthStore((s) => s.fbUser);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me || !otherUid) {
      return;
    }
    let cancelled = false;
    const unsubscribe = subscribeToConversation(me.uid, otherUid, (msgs) => {
      if (cancelled) return;
      setMessages(msgs);
      setLoading(false);
    });
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

  return { messages, loading, send };
}
