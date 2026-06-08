"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { updateQuestionnaireBehavior } from "@/lib/firebase/db";
import { BottomSheet, Button } from "@/components/ui";
import { BehaviorQuestions, type BehaviorValue } from "./BehaviorQuestions";

/**
 * Backfill modal (Fix 1). Shown to already-onboarded users whose `behavior`
 * fields are still unset (the migration leaves them null). Saving writes the
 * answers to their own questionnaire — no inference from old answers.
 */
export function BehaviorPrompt() {
  const user = useAuthStore((s) => s.user);
  const questionnaire = useAuthStore((s) => s.questionnaire);
  const setQuestionnaire = useAuthStore((s) => s.setQuestionnaire);

  const [behavior, setBehavior] = useState<BehaviorValue>({
    substances: null,
    nonveg: null,
  });
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const needsPrompt =
    !!user?.onboarded &&
    !!questionnaire &&
    (questionnaire.behavior?.substances == null ||
      questionnaire.behavior?.nonveg == null);

  if (!needsPrompt || dismissed) return null;

  const canSave = behavior.substances != null && behavior.nonveg != null;

  async function save() {
    if (!user || !questionnaire || !canSave) return;
    setSaving(true);
    try {
      await updateQuestionnaireBehavior(user.uid, behavior);
      setQuestionnaire({ ...questionnaire, behavior });
      setDismissed(true);
    } catch {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open
      onClose={() => setDismissed(true)}
      title="Two quick questions"
    >
      <p className="mb-4 text-sm text-muted">
        We added two honest questions so roommate matching can flag real
        dealbreakers instead of guessing. Takes ten seconds.
      </p>
      <BehaviorQuestions value={behavior} onChange={setBehavior} />
      <div className="mt-6">
        <Button
          fullWidth
          size="lg"
          onClick={save}
          loading={saving}
          disabled={!canSave}
        >
          Save
        </Button>
      </div>
    </BottomSheet>
  );
}
