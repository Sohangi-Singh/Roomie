"use client";

import type { Category, Questionnaire, Stance } from "@/types";
import { Slider, Segmented, TimePicker, RangeBar, Chip } from "@/components/ui";
import { CategoryIcon } from "./CategoryIcon";
import {
  FREQ_OPTIONS,
  PERSONA_OPTIONS,
  CATEGORIES,
  CATEGORY_META,
  DEALBREAKER_META,
  STANCE_OPTIONS,
  type Field,
  type Step,
} from "@/config/questionnaire";
import { formatINR, formatKm, formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { BehaviorQuestions } from "./BehaviorQuestions";

type Patch = Partial<Questionnaire>;

export function QuestionStep({
  step,
  answers,
  onChange,
}: {
  step: Step;
  answers: Questionnaire;
  onChange: (patch: Patch) => void;
}) {
  if (step.kind === "category")
    return <CategoryFields step={step} answers={answers} onChange={onChange} />;
  if (step.kind === "persona")
    return <PersonaStep answers={answers} onChange={onChange} />;
  if (step.kind === "importance")
    return <ImportanceStep answers={answers} onChange={onChange} />;
  if (step.kind === "behavior")
    return (
      <BehaviorQuestions
        value={answers.behavior}
        onChange={(behavior) => onChange({ behavior })}
      />
    );
  return <DealbreakersStep answers={answers} onChange={onChange} />;
}

/* --------------------------- category fields ---------------------------- */

function CategoryFields({
  step,
  answers,
  onChange,
}: {
  step: Extract<Step, { kind: "category" }>;
  answers: Questionnaire;
  onChange: (patch: Patch) => void;
}) {
  const category = step.category;
  const value = (answers as unknown as Record<string, unknown>)[
    category
  ] as Record<string, unknown>;
  const set = (key: string, v: unknown) =>
    onChange({ [category]: { ...value, [key]: v } } as Patch);

  return (
    <div className="space-y-7">
      {step.fields.map((f) => (
        <FieldControl
          key={f.key}
          field={f}
          value={value[f.key]}
          onChange={(v) => set(f.key, v)}
        />
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-medium text-ink">{field.label}</p>
      {renderControl(field, value, onChange)}
      {field.help && <p className="mt-1.5 text-xs text-faint">{field.help}</p>}
    </div>
  );
}

function renderControl(
  field: Field,
  value: unknown,
  onChange: (v: unknown) => void,
) {
  switch (field.kind) {
    case "time":
      return (
        <TimePicker
          value={value as number}
          onChange={(m) => onChange(m)}
        />
      );
    case "level":
      return (
        <Slider
          value={value as number}
          min={1}
          max={5}
          step={1}
          lowLabel={field.lowLabel}
          highLabel={field.highLabel}
          onChange={onChange}
        />
      );
    case "slider":
      return (
        <Slider
          value={value as number}
          min={field.min}
          max={field.max}
          step={field.step}
          lowLabel={field.lowLabel}
          highLabel={field.highLabel}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <Slider
          value={value as number}
          min={field.min}
          max={field.max}
          step={field.step}
          format={numberFormatter(field.unit)}
          onChange={onChange}
        />
      );
    case "range":
      return (
        <RangeBar
          value={value as number}
          min={field.min}
          max={field.max}
          step={field.step}
          ticks={field.ticks}
          onChange={onChange}
        />
      );
    case "freq":
      return (
        <Segmented
          size="sm"
          options={FREQ_OPTIONS}
          value={value as string}
          onChange={onChange}
        />
      );
    case "segmented":
      return (
        <Segmented
          options={field.options}
          value={value as string}
          onChange={onChange}
        />
      );
    case "tri":
      return (
        <Segmented
          options={[
            { value: "no", label: "No" },
            { value: "maybe", label: "Maybe" },
            { value: "yes", label: "Yes" },
          ]}
          value={value as string}
          onChange={onChange}
        />
      );
  }
}

function numberFormatter(unit?: "inr" | "km" | "min") {
  if (unit === "inr") return formatINR;
  if (unit === "km") return formatKm;
  if (unit === "min") return formatDuration;
  return undefined;
}

/* ------------------------------ persona --------------------------------- */

function PersonaStep({
  answers,
  onChange,
}: {
  answers: Questionnaire;
  onChange: (patch: Patch) => void;
}) {
  const selected = answers.outingPersona;
  const toggle = (p: (typeof PERSONA_OPTIONS)[number]["value"]) => {
    const next = selected.includes(p)
      ? selected.filter((x) => x !== p)
      : [...selected, p];
    onChange({ outingPersona: next });
  };
  return (
    <div className="flex flex-wrap gap-2.5">
      {PERSONA_OPTIONS.map((o) => (
        <Chip
          key={o.value}
          selected={selected.includes(o.value)}
          onClick={() => toggle(o.value)}
        >
          <span aria-hidden>{o.emoji}</span> {o.label}
        </Chip>
      ))}
    </div>
  );
}

/* ----------------------------- importance ------------------------------- */

const IMPORTANCE_LABELS = ["Normal", "Matters", "Critical"];

function ImportanceStep({
  answers,
  onChange,
}: {
  answers: Questionnaire;
  onChange: (patch: Patch) => void;
}) {
  const imp = answers.importance;
  const cycle = (c: Category) => {
    const next = ((imp[c] + 1) % 3) as 0 | 1 | 2;
    onChange({ importance: { ...imp, [c]: next } });
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      {CATEGORIES.map((c) => {
        const lvl = imp[c];
        return (
          <button
            key={c}
            type="button"
            onClick={() => cycle(c)}
            className={cn(
              "flex items-center gap-3 rounded-2xl p-3.5 text-left transition-colors",
              lvl === 0 && "bg-surface shadow-soft ring-1 ring-line",
              // Brighter mid-tone so single-tap is clearly distinguishable
              // from both the unselected surface and the full-tap accent-500.
              lvl === 1 && "bg-accent-300 text-accent-900",
              lvl === 2 && "bg-accent-500 text-canvas",
            )}
          >
            <CategoryIcon
              name={CATEGORY_META[c].icon}
              className={cn(
                "size-5 shrink-0",
                lvl === 2 ? "text-canvas" : "text-accent-700",
              )}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {CATEGORY_META[c].label}
              </p>
              <p
                className={cn(
                  "text-xs",
                  lvl === 2 ? "text-accent-100" : "text-muted",
                )}
              >
                {IMPORTANCE_LABELS[lvl]}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------- dealbreakers ------------------------------ */

function DealbreakersStep({
  answers,
  onChange,
}: {
  answers: Questionnaire;
  onChange: (patch: Patch) => void;
}) {
  const db = answers.dealbreakers;
  const set = (key: string, v: string) =>
    onChange({ dealbreakers: { ...db, [key]: v as Stance } });
  return (
    <div className="space-y-3">
      {DEALBREAKER_META.map((d) => (
        <div key={d.key} className="rounded-2xl bg-surface p-4 shadow-soft">
          <p className="text-sm font-medium">{d.label}</p>
          <p className="mb-3 text-xs text-muted">{d.desc}</p>
          <Segmented
            size="sm"
            options={STANCE_OPTIONS}
            value={db[d.key]}
            onChange={(v) => set(d.key, v)}
          />
        </div>
      ))}
    </div>
  );
}
