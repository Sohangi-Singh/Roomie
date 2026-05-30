"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface TimePickerProps {
  value: number; // minutes from midnight
  onChange: (minutes: number) => void;
  className?: string;
}

function decompose(mins: number) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const period: "AM" | "PM" = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h12, min, period };
}

function recompose(h12: number, min: number, period: "AM" | "PM") {
  const h24 = period === "PM" ? (h12 % 12) + 12 : h12 % 12;
  return (((h24 * 60 + min) % 1440) + 1440) % 1440;
}

function Stepper({
  display,
  onUp,
  onDown,
}: {
  display: string;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onUp}
        className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand active:scale-90"
      >
        <ChevronUp className="size-5" />
      </button>
      <div className="w-16 rounded-2xl bg-surface py-3 text-center font-display text-2xl font-semibold shadow-soft">
        {display}
      </div>
      <button
        type="button"
        onClick={onDown}
        className="rounded-full p-1.5 text-muted transition-colors hover:bg-sand active:scale-90"
      >
        <ChevronDown className="size-5" />
      </button>
    </div>
  );
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const { h12, min, period } = decompose(value);
  const emit = (nh: number, nmin: number, np: "AM" | "PM") =>
    onChange(recompose(nh, nmin, np));

  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <Stepper
        display={String(h12)}
        onUp={() => emit(h12 === 12 ? 1 : h12 + 1, min, period)}
        onDown={() => emit(h12 === 1 ? 12 : h12 - 1, min, period)}
      />
      <span className="font-display text-2xl font-semibold text-muted">:</span>
      <Stepper
        display={min.toString().padStart(2, "0")}
        onUp={() => emit(h12, (min + 5) % 60, period)}
        onDown={() => emit(h12, (min + 55) % 60, period)}
      />
      <div className="ml-1 flex flex-col gap-1">
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => emit(h12, min, p)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              period === p
                ? "bg-accent-500 text-canvas shadow-soft"
                : "bg-sand text-muted hover:text-ink",
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
