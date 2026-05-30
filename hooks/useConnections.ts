"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  createConnection,
  getConnectionsFor,
  updateConnectionStatus,
} from "@/lib/firebase/db";
import type { Connection } from "@/types";

/** All connections involving the current user. */
export function useConnections() {
  const me = useAuthStore((s) => s.fbUser);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      setConnections(await getConnectionsFor(me.uid));
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload() flips loading on refetch
    void reload();
  }, [reload]);

  const accept = async (id: string) => {
    await updateConnectionStatus(id, "accepted");
    await reload();
  };
  const decline = async (id: string) => {
    await updateConnectionStatus(id, "declined");
    await reload();
  };

  return { connections, loading, reload, accept, decline, myUid: me?.uid ?? null };
}

/** The connection (if any) between the current user and `targetUid`. */
export function useConnectionWith(targetUid: string | null) {
  const me = useAuthStore((s) => s.fbUser);
  const [conn, setConn] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!me || !targetUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const all = await getConnectionsFor(me.uid);
      setConn(all.find((c) => c.participants.includes(targetUid)) ?? null);
    } finally {
      setLoading(false);
    }
  }, [me, targetUid]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload() flips loading on refetch
    void reload();
  }, [reload]);

  const send = async (message?: string) => {
    if (!me || !targetUid) return;
    await createConnection({
      from: me.uid,
      to: targetUid,
      participants: [me.uid, targetUid],
      type: "invite",
      status: "pending",
      createdAt: Date.now(),
      ...(message ? { message } : {}),
    });
    await reload();
  };
  const accept = async () => {
    if (conn) {
      await updateConnectionStatus(conn.id, "accepted");
      await reload();
    }
  };
  const decline = async () => {
    if (conn) {
      await updateConnectionStatus(conn.id, "declined");
      await reload();
    }
  };

  return { conn, loading, myUid: me?.uid ?? null, send, accept, decline, reload };
}
