"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { onAuthChange } from "@/lib/firebase/auth";
import { getQuestionnaire, getUser } from "@/lib/firebase/db";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);

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

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
