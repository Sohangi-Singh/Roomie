import { create } from "zustand";
import type { Questionnaire, UserProfileInput } from "@/types";
import { defaultQuestionnaire } from "@/config/questionnaire";

interface OnboardingState {
  step: number;
  profile: Partial<UserProfileInput>;
  answers: Questionnaire | null;
  /** True when editing an existing profile via Settings (skips redirects). */
  editMode: boolean;
  init: (uid: string) => void;
  setStep: (n: number) => void;
  next: () => void;
  prev: () => void;
  updateProfile: (patch: Partial<UserProfileInput>) => void;
  updateAnswers: (patch: Partial<Questionnaire>) => void;
  hydrate: (profile: Partial<UserProfileInput>, answers: Questionnaire) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 0,
  profile: {},
  answers: null,
  editMode: false,
  init: (uid) =>
    set((s) => ({ answers: s.answers ?? defaultQuestionnaire(uid) })),
  setStep: (step) => set({ step }),
  next: () => set((s) => ({ step: s.step + 1 })),
  prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
  updateAnswers: (patch) =>
    set((s) => ({ answers: s.answers ? { ...s.answers, ...patch } : s.answers })),
  hydrate: (profile, answers) =>
    set({ profile, answers, step: 0, editMode: true }),
  reset: () => set({ step: 0, profile: {}, answers: null, editMode: false }),
}));
