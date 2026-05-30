"use client";

/** Lightweight haptic feedback for taps on supported devices. */
export function useHaptics() {
  const tap = (ms = 10) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  };
  return { tap };
}
