"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
  format?: (value: number) => string;
  className?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  lowLabel,
  highLabel,
  format,
  className,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const snapped = Math.round((min + r * (max - min)) / step) * step;
      onChange(Math.max(min, Math.min(max, snapped)));
    },
    [min, max, step, onChange],
  );

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>{lowLabel}</span>
        <span className="rounded-full bg-accent-100 px-2.5 py-0.5 font-semibold text-accent-800">
          {format ? format(value) : value}
        </span>
        <span>{highLabel}</span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) setFromClientX(e.clientX);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(min, value - step));
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(max, value + step));
          }
        }}
        className="relative h-10 cursor-pointer touch-none outline-none"
      >
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent-100" />
        <div
          className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent-400"
          style={{ width: `${pct}%` }}
        />
        <motion.div
          className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-500 bg-canvas shadow-card"
          style={{ left: `${pct}%` }}
          whileTap={{ scale: 1.2 }}
        />
      </div>
    </div>
  );
}
