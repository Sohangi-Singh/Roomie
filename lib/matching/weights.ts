import type { Category, Importance } from "@/types";

/** Relative importance of each category to day-to-day roommate harmony. */
export const BASE_WEIGHTS: Record<Category, number> = {
  sleep: 1.3,
  cleanliness: 1.3,
  noise: 1.2,
  study: 1.0,
  lighting: 0.8,
  temperature: 0.8,
  bathroom: 0.9,
  social: 1.1,
  spending: 0.9,
  outing: 0.7,
  travel: 0.6,
  sharing: 0.9,
};

/** importance 0 → ×1, 1 → ×1.6, 2 → ×2.2. */
export function importanceMultiplier(i: Importance): number {
  return 1 + 0.6 * i;
}

/**
 * Normalised per-category weights for a pair. If either user flags a category
 * as important, it weighs more (we take the stronger of the two).
 */
export function effectiveWeights(
  aImp: Record<Category, Importance>,
  bImp: Record<Category, Importance>,
): Record<Category, number> {
  const raw = {} as Record<Category, number>;
  let sum = 0;
  (Object.keys(BASE_WEIGHTS) as Category[]).forEach((c) => {
    const imp = Math.max(aImp[c] ?? 0, bImp[c] ?? 0) as Importance;
    const w = BASE_WEIGHTS[c] * importanceMultiplier(imp);
    raw[c] = w;
    sum += w;
  });
  (Object.keys(raw) as Category[]).forEach((c) => {
    raw[c] = raw[c] / sum;
  });
  return raw;
}
