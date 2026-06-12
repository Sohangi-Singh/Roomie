import type {
  Category,
  DealbreakerKey,
  Freq,
  Questionnaire,
  Stance,
  Tri,
} from "@/types";
import { freqToIndex } from "@/config/questionnaire";

export const clamp = (lo: number, hi: number, v: number): number =>
  Math.max(lo, Math.min(hi, v));

/* --------------------------- similarity atoms --------------------------- */

/** 100 when equal, decaying linearly to 0 at `range` apart. */
export function simLinear(a: number, b: number, range: number): number {
  if (range <= 0) return 100;
  return clamp(0, 100, 100 * (1 - Math.abs(a - b) / range));
}

export function simLevel(a: number, b: number): number {
  return simLinear(a, b, 4);
}

export function simFreq(a: Freq, b: Freq): number {
  return simLinear(freqToIndex(a), freqToIndex(b), 4);
}

/** Circular time similarity over a 24h clock (minutes-from-midnight). */
export function simCircularTime(a: number, b: number): number {
  const diff = Math.abs(a - b) % 1440;
  const circular = Math.min(diff, 1440 - diff); // 0..720
  return simLinear(0, circular, 720);
}

/**
 * Forgiving circular time similarity for sleep/wake comparisons. Small
 * differences (1–2 hours) cost very little; the curve only steepens past
 * 4 hours apart.
 *
 *  ≤  60 min → 100   (no penalty)
 *  ≤ 120 min → 93    (small penalty)
 *  ≤ 240 min → 75    (moderate penalty)
 *  ≤ 480 min → 28    (significant penalty)
 *  ≤ 720 min → 0     (max — opposite clock)
 */
export function simTolerantTime(aMin: number, bMin: number): number {
  const diff = Math.abs(aMin - bMin) % 1440;
  const circular = Math.min(diff, 1440 - diff);
  if (circular <= 60) return 100;
  if (circular <= 120) return 100 - (circular - 60) * (7 / 60);
  if (circular <= 240) return 93 - (circular - 120) * (18 / 120);
  if (circular <= 480) return 75 - (circular - 240) * (47 / 240);
  return Math.max(0, 28 - (circular - 480) * (28 / 240));
}

const TRI_INDEX: Record<Tri, number> = { no: 0, maybe: 1, yes: 2 };
export function simTri(a: Tri, b: Tri): number {
  return simLinear(TRI_INDEX[a], TRI_INDEX[b], 2);
}

/** Categorical equality, with a configurable floor for "different but okay". */
export function simEqual(a: string, b: string, floor = 35): number {
  return a === b ? 100 : floor;
}

/* --------------------------- category scorers --------------------------- */

export function sleepScore(a: Questionnaire, b: Questionnaire): number {
  // Use the tolerant curve so a 1-hour gap stays near 100; only large
  // differences (4+ hours) really bite.
  return Math.round(
    0.45 * simTolerantTime(a.sleep.sleepTime, b.sleep.sleepTime) +
      0.35 * simTolerantTime(a.sleep.wakeTime, b.sleep.wakeTime) +
      0.2 * simFreq(a.sleep.naps, b.sleep.naps),
  );
}

export function cleanlinessScore(a: Questionnaire, b: Questionnaire): number {
  return Math.round(
    0.5 * simLevel(a.cleanliness.room, b.cleanliness.room) +
      0.25 * simLevel(a.cleanliness.desk, b.cleanliness.desk) +
      0.25 * simLevel(a.cleanliness.laundry, b.cleanliness.laundry),
  );
}

/**
 * Asymmetric model: discomfort arises when one person's noise output exceeds
 * the other's tolerance. Low score means a real clash, not just difference.
 */
export function noiseScore(a: Questionnaire, b: Questionnaire): number {
  const outA = (freqToIndex(a.noise.gaming) + freqToIndex(a.noise.reelsMusic)) / 2;
  const outB = (freqToIndex(b.noise.gaming) + freqToIndex(b.noise.reelsMusic)) / 2;
  const tolA = a.noise.tolerance - 1; // 0..4
  const tolB = b.noise.tolerance - 1;
  const discomfortA = Math.max(0, outB - tolA);
  const discomfortB = Math.max(0, outA - tolB);
  return Math.round(clamp(0, 100, 100 - ((discomfortA + discomfortB) / 8) * 100));
}

export function studyScore(a: Questionnaire, b: Questionnaire): number {
  const env = { silent: 0, ambient: 1, music: 2 } as const;
  return Math.round(
    0.4 * simLevel(a.study.seriousness, b.study.seriousness) +
      0.3 * simLinear(env[a.study.environment], env[b.study.environment], 2) +
      0.3 * simEqual(a.study.mode, b.study.mode, 40),
  );
}

export function lightingScore(a: Questionnaire, b: Questionnaire): number {
  return Math.round(
    0.55 * simEqual(a.lighting.lightsOff, b.lighting.lightsOff, 20) +
      0.45 * simEqual(a.lighting.brightness, b.lighting.brightness, 50),
  );
}

export function temperatureScore(a: Questionnaire, b: Questionnaire): number {
  return Math.round(
    0.5 * simLinear(a.temperature.fanSummer, b.temperature.fanSummer, 5) +
      0.5 * simLinear(a.temperature.fanWinter, b.temperature.fanWinter, 5),
  );
}

export function bathroomScore(a: Questionnaire, b: Questionnaire): number {
  const t = { morning: 0, evening: 1, night: 2 } as const;
  // Different bathroom timing avoids contention (a mild bonus), but identical
  // timing is NOT a problem — roommates coordinate. So the timing component
  // ranges high: same = 85, adjacent = 92.5, opposite = 100 (Fix 5). The old
  // 0→100 range tanked identical timing and capped near-clones at ~60.
  const timingDistance = Math.abs(t[a.bathroom.timing] - t[b.bathroom.timing]);
  const timing = 85 + 7.5 * timingDistance;
  return Math.round(
    0.4 * timing +
      0.2 * simLinear(a.bathroom.durationMin, b.bathroom.durationMin, 40) +
      0.4 * simLevel(a.bathroom.hygieneWeight, b.bathroom.hygieneWeight),
  );
}

export function socialScore(a: Questionnaire, b: Questionnaire): number {
  return Math.round(
    0.5 * simLinear(a.social.introExtro, b.social.introExtro, 100) +
      0.25 * simFreq(a.social.guests, b.social.guests) +
      0.25 * simFreq(a.social.calls, b.social.calls),
  );
}

export function spendingScore(a: Questionnaire, b: Questionnaire): number {
  return Math.round(
    0.5 * simLinear(a.spending.monthly, b.spending.monthly, 15000) +
      0.25 * simLevel(a.spending.common, b.spending.common) +
      0.25 * simLevel(a.spending.outings, b.spending.outings),
  );
}

export function outingScore(a: Questionnaire, b: Questionnaire): number {
  const A = new Set(a.outingPersona);
  const B = new Set(b.outingPersona);
  // The persona step is skippable — no data on either side is neutral,
  // not a maximal mismatch.
  if (A.size === 0 || B.size === 0) return 60;
  const intersection = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return Math.round((intersection / union) * 100);
}

export function travelScore(a: Questionnaire, b: Questionnaire): number {
  return Math.round(
    0.5 * simLinear(a.travel.maxKm, b.travel.maxKm, 30) +
      0.5 * simEqual(a.travel.style, b.travel.style, 45),
  );
}

export function sharingScore(a: Questionnaire, b: Questionnaire): number {
  return Math.round(
    (simTri(a.sharing.food, b.sharing.food) +
      simTri(a.sharing.clothes, b.sharing.clothes) +
      simTri(a.sharing.cosmetics, b.sharing.cosmetics)) /
      3,
  );
}

export const CATEGORY_SCORERS: Record<
  Category,
  (a: Questionnaire, b: Questionnaire) => number
> = {
  sleep: sleepScore,
  cleanliness: cleanlinessScore,
  noise: noiseScore,
  study: studyScore,
  lighting: lightingScore,
  temperature: temperatureScore,
  bathroom: bathroomScore,
  social: socialScore,
  spending: spendingScore,
  outing: outingScore,
  travel: travelScore,
  sharing: sharingScore,
};

export function categoryScores(
  a: Questionnaire,
  b: Questionnaire,
): Record<Category, number> {
  const out = {} as Record<Category, number>;
  (Object.keys(CATEGORY_SCORERS) as Category[]).forEach((c) => {
    out[c] = CATEGORY_SCORERS[c](a, b);
  });
  return out;
}

/* ----------------------------- dealbreakers ----------------------------- */

const DEALBREAKER_KEYS: DealbreakerKey[] = [
  "substances",
  "nonveg",
  "loudMusic",
  "lateSleeping",
  "messyRoom",
  "frequentGuests",
];

/* v3 penalty matrix (FABLE_HANDOFF §3.2) — symmetric, only three non-zero
 * pairings. "Will do" is the sole signal that a person does the thing; nothing
 * is derived from lifestyle answers anymore (no double-counting). */
export const HARD_PENALTY = 35;
export const MEDIUM_PENALTY = 17;
export const MILD_PENALTY = 3;

export type DealbreakerSeverity = "hard" | "medium" | "mild";

export interface DealbreakerConflict {
  category: DealbreakerKey;
  /** Points to subtract from the base (positive number). */
  penalty: number;
  severity: DealbreakerSeverity;
  /** Which side does the thing — drives directional copy ("they will" vs
   *  "you will"). Only meaningful for hard/medium; mild has no doer. */
  doer: "a" | "b";
}

/** One cell of the symmetric matrix. Same-option pairs (incl. both-willDo)
 *  and every remaining combination are 0 — alignment is never a bonus. */
function evaluateCell(
  aStance: Stance,
  bStance: Stance,
): Omit<DealbreakerConflict, "category"> | null {
  if (aStance === "willDo" || bStance === "willDo") {
    const doer = aStance === "willDo" ? "a" : "b";
    const other = aStance === "willDo" ? bStance : aStance;
    if (other === "dealbreaker")
      return { penalty: HARD_PENALTY, severity: "hard", doer };
    if (other === "annoying")
      return { penalty: MEDIUM_PENALTY, severity: "medium", doer };
    return null; // willDo × willDo / fine → 0
  }
  if (
    (aStance === "fine" && bStance === "annoying") ||
    (aStance === "annoying" && bStance === "fine")
  ) {
    return {
      penalty: MILD_PENALTY,
      severity: "mild",
      doer: aStance === "fine" ? "a" : "b",
    };
  }
  return null; // fine × dealbreaker, annoying × dealbreaker, all diagonals → 0
}

/** Evaluate the penalty matrix for every dealbreaker category (≤ 1 conflict
 *  per category). Symmetric: swapping a/b flips `doer` but nothing else. */
export function dealbreakerConflicts(
  a: Questionnaire,
  b: Questionnaire,
): DealbreakerConflict[] {
  const out: DealbreakerConflict[] = [];
  for (const category of DEALBREAKER_KEYS) {
    const cell = evaluateCell(a.dealbreakers[category], b.dealbreakers[category]);
    if (cell) out.push({ category, ...cell });
  }
  return out;
}
