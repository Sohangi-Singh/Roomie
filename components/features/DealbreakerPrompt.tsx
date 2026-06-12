"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { updateQuestionnaireDealbreakers } from "@/lib/firebase/db";
import { DEALBREAKERS_VERSION } from "@/config/questionnaire";
import { BottomSheet, Button } from "@/components/ui";
import { DealbreakerQuestions } from "./DealbreakerQuestions";
import type { Questionnaire } from "@/types";

/**
 * One-time v3 migration modal. Shown to already-onboarded users whose
 * dealbreaker answers predate the 4-option format (dealbreakersVersion < 3).
 * Pre-filled with their mapped legacy answers (okay→Fine — "Will do" is never
 * auto-assigned); saving writes to their own questionnaire.
 */
export function DealbreakerPrompt() {
  const user = useAuthStore((s) => s.user);
  const questionnaire = useAuthStore((s) => s.questionnaire);
  const setQuestionnaire = useAuthStore((s) => s.setQuestionnaire);

  const [draft, setDraft] = useState<Questionnaire["dealbreakers"] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const needsPrompt =
    !!user?.onboarded &&
    !!questionnaire &&
    (questionnaire.dealbreakersVersion ?? 0) < DEALBREAKERS_VERSION;

  if (!needsPrompt || dismissed) return null;

  const value = draft ?? questionnaire.dealbreakers;

  async function save() {
    if (!user || !questionnaire) return;
    setSaving(true);
    try {
      await updateQuestionnaireDealbreakers(user.uid, value);
      setQuestionnaire({
        ...questionnaire,
        dealbreakers: value,
        dealbreakersVersion: DEALBREAKERS_VERSION,
      });
      setDismissed(true);
    } catch {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open
      onClose={() => setDismissed(true)}
      title="Update your dealbreakers"
    >
      <p className="mb-4 text-sm text-muted">
        We&apos;ve improved how we ask about lifestyle dealbreakers. Take 30
        seconds to update your answers so your matches stay accurate.
      </p>
      <DealbreakerQuestions value={value} onChange={setDraft} />
      <div className="mt-6">
        <Button fullWidth size="lg" onClick={save} loading={saving}>
          Save answers
        </Button>
      </div>
    </BottomSheet>
  );
}
