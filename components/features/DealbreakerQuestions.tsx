"use client";

import { DEALBREAKER_META, STANCE_OPTIONS } from "@/config/questionnaire";
import type { DealbreakerKey, Stance } from "@/types";
import { cn } from "@/lib/utils/cn";

/** Shared renderer for the six 4-option dealbreaker questions — used by both
 *  the onboarding step and the v3 migration modal. ("Will do in room" is a
 *  long label, so a 2-col grid instead of a 4-wide segmented control.) */
export function DealbreakerQuestions({
  value,
  onChange,
}: {
  value: Record<DealbreakerKey, Stance>;
  onChange: (next: Record<DealbreakerKey, Stance>) => void;
}) {
  return (
    <div className="space-y-3">
      {DEALBREAKER_META.map((d) => (
        <div
          key={d.key}
          role="group"
          aria-label={d.label}
          className="rounded-2xl bg-surface p-4 shadow-soft"
        >
          <p className="text-sm font-medium text-ink">{d.label}</p>
          <p className="mb-3 text-xs text-muted">{d.desc}</p>
          <div className="grid grid-cols-2 gap-2">
            {STANCE_OPTIONS.map((o) => {
              const selected = value[d.key] === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ ...value, [d.key]: o.value })}
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
                    selected
                      ? "bg-accent-500 text-canvas"
                      : "bg-canvas text-ink ring-1 ring-line hover:bg-sand",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
