"use client";

import { useAuthStore } from "@/stores/authStore";

/** Convenience accessors over the auth store. */
export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useQuestionnaire = () => useAuthStore((s) => s.questionnaire);
export const useAuthStatus = () => useAuthStore((s) => s.status);
export const useFbUser = () => useAuthStore((s) => s.fbUser);
