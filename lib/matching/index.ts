import type { Category, DealbreakerKey, Questionnaire } from "@/types";
import {
  CATEGORY_META,
  DEALBREAKER_META,
  questionnaireSchema,
} from "@/config/questionnaire";
import { categoryScores, dealbreakerConflicts } from "./scoring";
import { effectiveWeights } from "./weights";
import { buildInsights } from "./insights";
import { IncompleteProfileError } from "./errors";

export * from "./scoring";
export * from "./weights";
export * from "./errors";
export { ALGORITHM_VERSION } from "./version";

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
  /** Positive compatibility — "Why you match". */
  reasons: string[];
  /** Mild, neutral notes (50–77 band + unknown behavior) — "Worth discussing". */
  worthDiscussing: string[];
  /** Soft mismatches — "Might be a problem, but is fine". */
  annoyances: string[];
  /** Hard dealbreaker conflicts + severe category mismatches — "Potential clashes". */
  conflicts: string[];
  /** True when an absolute (hard) dealbreaker conflict exists. */
  dealbreaker: boolean;
  /** Human labels of the hard dealbreakers that conflict — drives the ⚠️ badge. */
  dealbreakerFlags: string[];
}

// Fix 3 + 4: dealbreakers are an explicit penalty + visible flag, not a floor.
const HARD_PENALTY = 15;
const SOFT_PENALTY = 5;
/** Dealbreaker pairs never drop below this — the warning now lives in the flag. */
const DEALBREAKER_FLOOR = 40;
/** Honest lifestyle mismatch (no dealbreaker) floors here, not near 0, so it
 *  sits BELOW dealbreaker pairs ("very different" is worse than "one issue"). */
const LIFESTYLE_FLOOR = 27;

const DEALBREAKER_LABEL = Object.fromEntries(
  DEALBREAKER_META.map((d) => [d.key, d.label]),
) as Record<DealbreakerKey, string>;

function radarFrom(categories: Record<Category, number>): RadarPoint[] {
  return (Object.keys(categories) as Category[]).map((c) => ({
    category: c,
    label: CATEGORY_META[c].label,
    score: categories[c],
  }));
}

/** Fix 6: validate inputs; throw a typed error the API layer can translate
 *  into a friendly "hasn't finished their questionnaire yet" message. */
function assertComplete(q: Questionnaire, side: string): void {
  const res = questionnaireSchema.safeParse(q);
  if (!res.success) {
    const fields = [
      ...new Set(res.error.issues.map((i) => i.path.join(".")).filter(Boolean)),
    ];
    throw new IncompleteProfileError(side, fields);
  }
}

/** Score the compatibility of two completed questionnaires. */
export function scorePair(a: Questionnaire, b: Questionnaire): MatchResult {
  assertComplete(a, "you");
  assertComplete(b, "the other user");

  // Fix 5: a profile matched against itself is exactly 100%, with no insights.
  if (a.uid === b.uid) {
    const categories = {} as Record<Category, number>;
    (Object.keys(CATEGORY_META) as Category[]).forEach((c) => {
      categories[c] = 100;
    });
    return {
      uid: b.uid,
      overall: 100,
      categories,
      radar: radarFrom(categories),
      reasons: [],
      worthDiscussing: [],
      annoyances: [],
      conflicts: [],
      dealbreaker: false,
      dealbreakerFlags: [],
    };
  }

  const categories = categoryScores(a, b);
  const weights = effectiveWeights(a.importance, b.importance);

  // Honest compatibility first.
  let raw = 0;
  (Object.keys(categories) as Category[]).forEach((c) => {
    raw += categories[c] * weights[c];
  });

  const conflicts = dealbreakerConflicts(a, b);
  const hard = conflicts.filter((c) => c.severity === "hard");
  const soft = conflicts.filter((c) => c.severity === "soft");

  // Fix 3: fixed penalty per conflict (was a ×0.25 crater to a 22% floor).
  let overall = raw - HARD_PENALTY * hard.length - SOFT_PENALTY * soft.length;
  // Fix 3 + 4: dealbreaker pairs floor at 40 (warning is the flag); honest
  // lifestyle mismatch floors at ~27 so it ranks below dealbreaker pairs.
  const floor = hard.length > 0 ? DEALBREAKER_FLOOR : LIFESTYLE_FLOOR;
  overall = Math.max(floor, overall);
  overall = Math.max(0, Math.min(100, Math.round(overall)));

  // Fix 3: hard dealbreakers become explicit, deduped flags for the UI badge.
  const dealbreakerFlags = [...new Set(hard.map((c) => DEALBREAKER_LABEL[c.key]))];

  const insights = buildInsights(a, b, categories, conflicts, overall);

  return {
    uid: b.uid,
    overall,
    categories,
    radar: radarFrom(categories),
    reasons: insights.reasons,
    worthDiscussing: insights.worthDiscussing,
    annoyances: insights.annoyances,
    conflicts: insights.conflicts,
    dealbreaker: hard.length > 0,
    dealbreakerFlags,
  };
}

/** Score `me` against every candidate, sorted most → least compatible.
 *  Candidates whose questionnaires are incomplete are skipped (Fix 6) rather
 *  than crashing the whole list. */
export function rankCandidates(
  me: Questionnaire,
  candidates: Questionnaire[],
): MatchResult[] {
  const results: MatchResult[] = [];
  for (const c of candidates) {
    try {
      results.push(scorePair(me, c));
    } catch (e) {
      if (e instanceof IncompleteProfileError) continue;
      throw e;
    }
  }
  return results.sort((x, y) => y.overall - x.overall);
}
