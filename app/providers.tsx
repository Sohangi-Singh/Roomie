"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { onAuthChange } from "@/lib/firebase/auth";
import {
  getQuestionnaire,
  getUser,
  subscribeToMatchesVersion,
} from "@/lib/firebase/db";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/authStore";
import { useMatchesStore } from "@/stores/matchesStore";
import { useThemeStore } from "@/stores/themeStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const fbUser = useAuthStore((s) => s.fbUser);

  useEffect(() => {
    // Pick up the theme set by the no-FOUC script in <head>.
    useThemeStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuth({ status: "guest" });
      return;
    }
    const unsubscribe = onAuthChange(async (fbUser) => {
      if (!fbUser) {
        setAuth({
          fbUser: null,
          user: null,
          questionnaire: null,
          status: "guest",
        });
        return;
      }
      setAuth({ fbUser, status: "loading" });
      try {
        const [user, questionnaire] = await Promise.all([
          getUser(fbUser.uid),
          getQuestionnaire(fbUser.uid),
        ]);
        setAuth({ fbUser, user, questionnaire, status: "authed" });
      } catch {
        setAuth({ fbUser, user: null, questionnaire: null, status: "authed" });
      }
    });
    return () => unsubscribe();
  }, [setAuth]);

  // Real-time match refresh: any user's questionnaire save bumps a global
  // version doc. When it changes, force a re-fetch of the cached match list
  // so rankings reflect the new data without anyone hitting Refresh.
  //
  // Only subscribe while signed in — meta/matches is readable by authenticated
  // users only (Firestore rules), so a logged-out subscription throws
  // permission-denied in the snapshot listener (e.g. on the landing/login
  // pages, or before auth resolves on first load).
  useEffect(() => {
    if (!isFirebaseConfigured || !fbUser) return;
    let lastVersion: number | null = null;
    const unsubscribe = subscribeToMatchesVersion((version) => {
      // First emission = current value; only act when it actually changes.
      if (lastVersion === null) {
        lastVersion = version;
        return;
      }
      if (version === lastVersion) return;
      lastVersion = version;
      const { uid, load } = useMatchesStore.getState();
      if (uid) void load(uid, true);
    });
    return () => unsubscribe();
  }, [fbUser]);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
