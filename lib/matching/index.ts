import type { Category, Questionnaire } from "@/types";
import { CATEGORY_META } from "@/config/questionnaire";
import { categoryScores, dealbreakerConflicts } from "./scoring";
import { effectiveWeights } from "./weights";
import { buildInsights } from "./insights";

export * from "./scoring";
export * from "./weights";

export interface RadarPoint {
  category: Category;
  label: string;
  score: number;
}

export interface MatchResult {
  /** uid of the candidate (the "b" side of the pair). */
  uid: string;
  /** Overall compatibility 0–100. */
  overall: number;
  categories: Record<Category, number>;
  radar: RadarPoint[];
  reasons: string[];
  conflicts: string[];
  /** True when an absolute dealbreaker conflict exists. */
  dealbreaker: boolean;
}

/** Score the compatibility of two completed questionnaires. */
export function scorePair(a: Questionnaire, b: Questionnaire): MatchResult {
  const categories = categoryScores(a, b);
  const weights = effectiveWeights(a.importance, b.importance);

  let overall = 0;
  (Object.keys(categories) as Category[]).forEach((c) => {
    overall += categories[c] * weights[c];
  });

  const conflicts = dealbreakerConflicts(a, b);
  const hard = conflicts.filter((c) => c.severity === "hard").length;
  const soft = conflicts.filter((c) => c.severity === "soft").length;

  // An absolute dealbreaker craters the score; annoyances chip away at it.
  overall = overall * Math.pow(0.25, hard);
  overall -= 5 * soft;
  overall = Math.max(0, Math.min(100, Math.round(overall)));

  const radar: RadarPoint[] = (Object.keys(categories) as Category[]).map((c) => ({
    category: c,
    label: CATEGORY_META[c].label,
    score: categories[c],
  }));

  const insights = buildInsights(a, b, categories, conflicts);

  return {
    uid: b.uid,
    overall,
    categories,
    radar,
    reasons: insights.reasons,
    conflicts: insights.conflicts,
    dealbreaker: hard > 0,
  };
}

/** Score `me` against every candidate, sorted most → least compatible. */
export function rankCandidates(
  me: Questionnaire,
  candidates: Questionnaire[],
): MatchResult[] {
  return candidates
    .map((c) => scorePair(me, c))
    .sort((x, y) => y.overall - x.overall);
}
