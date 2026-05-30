"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  getGroupsForUser,
  joinGroup,
  listOpenGroups,
} from "@/lib/firebase/db";
import type { Group } from "@/types";

export function useGroups() {
  const me = useAuthStore((s) => s.user);
  const [mine, setMine] = useState<Group[]>([]);
  const [open, setOpen] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const [m, o] = await Promise.all([
        getGroupsForUser(me.uid),
        listOpenGroups(me.gender),
      ]);
      setMine(m);
      setOpen(o.filter((g) => !g.memberUids.includes(me.uid)));
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload() flips loading on refetch
    void reload();
  }, [reload]);

  const join = async (groupId: string) => {
    if (!me) return;
    await joinGroup(groupId, me.uid);
    await reload();
  };

  return { mine, open, loading, reload, join };
}
