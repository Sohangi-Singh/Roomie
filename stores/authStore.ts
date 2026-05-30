import { create } from "zustand";
import type { User as FbUser } from "firebase/auth";
import type { Questionnaire, User } from "@/types";

export type AuthStatus = "loading" | "authed" | "guest";

interface AuthState {
  fbUser: FbUser | null;
  user: User | null;
  questionnaire: Questionnaire | null;
  status: AuthStatus;
  setAuth: (
    patch: Partial<
      Pick<AuthState, "fbUser" | "user" | "questionnaire" | "status">
    >,
  ) => void;
  setUser: (user: User | null) => void;
  setQuestionnaire: (q: Questionnaire | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  fbUser: null,
  user: null,
  questionnaire: null,
  status: "loading",
  setAuth: (patch) => set(patch),
  setUser: (user) => set({ user }),
  setQuestionnaire: (questionnaire) => set({ questionnaire }),
  reset: () =>
    set({ fbUser: null, user: null, questionnaire: null, status: "guest" }),
}));
