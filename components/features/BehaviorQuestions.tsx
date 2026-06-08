"use client";

import { BEHAVIOR_OPTIONS, BEHAVIOR_QUESTIONS } from "@/config/questionnaire";
import type { BehaviorFreq } from "@/types";
import { cn } from "@/lib/utils/cn";

export type BehaviorValue = {
  substances: BehaviorFreq | null;
  nonveg: BehaviorFreq | null;
};

/** Shared renderer for the two in-room behavior questions (Fix 1) — used by
 *  both the onboarding step and the backfill modal. */
export function BehaviorQuestions({
  value,
  onChange,
}: {
  value: BehaviorValue;
  onChange: (next: BehaviorValue) => void;
}) {
  return (
    <div className="space-y-6">
      {BEHAVIOR_QUESTIONS.map((q) => (
        <div key={q.key}>
          <p className="mb-2.5 text-sm font-medium text-ink">{q.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {BEHAVIOR_OPTIONS.map((o) => {
              const selected = value[q.key] === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onChange({ ...value, [q.key]: o.value })}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors",
                    selected
                      ? "bg-accent-500 text-canvas"
                      : "bg-surface text-ink shadow-soft ring-1 ring-line hover:bg-sand",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-faint">
        Kept private. Only used to flag clear dealbreakers — never shown on your
        profile.
      </p>
    </div>
  );
}
