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

/** A surfaced dealbreaker conflict (hard or medium — mild never flags). */
export interface DealbreakerFlag {
  category: DealbreakerKey;
  label: string;
  severity: "hard" | "medium";
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
  /** Medium dealbreakers + mild notes (50–77 band) — "Worth discussing". */
  worthDiscussing: string[];
  /** Soft mismatches — "Might be a problem, but is fine". */
  annoyances: string[];
  /** Hard dealbreaker conflicts + severe category mismatches — "Potential clashes". */
  conflicts: string[];
  /** True when a hard (Will do × Dealbreaker) conflict exists. */
  dealbreaker: boolean;
  /** Hard + medium conflicts with severity — drives the card badges (§3.4d:
   *  mild conflicts affect the score but are never written here). */
  dealbreakerFlags: DealbreakerFlag[];
}

/** v3 (§3.3): penalties never crater the displayed score below this. Pairs
 *  with no dealbreaker conflicts keep their natural base — lifestyle
 *  opposites bottom out around 25–30 on their own, below dealbreaker pairs. */
const FLOOR = 35;

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

  // §3.3.1 — base: the 12 lifestyle categories only, importance-weighted.
  // Dealbreakers contribute nothing here (and never add positive points).
  const categories = categoryScores(a, b);
  const weights = effectiveWeights(a.importance, b.importance);
  let base = 0;
  (Object.keys(categories) as Category[]).forEach((c) => {
    base += categories[c] * weights[c];
  });

  // §3.3.2 — penalty matrix across the 6 dealbreaker categories. Penalties
  // are absolute (never importance-scaled, §3.4e) and stack with no cap.
  const conflicts = dealbreakerConflicts(a, b);
  const totalPenalty = conflicts.reduce((sum, c) => sum + c.penalty, 0);
  const hadHard = conflicts.some((c) => c.severity === "hard");

  // §3.3.3 — floor at 35: penalties can't crater the score below 35. Pairs
  // with no conflicts keep their natural base.
  let overall = base - totalPenalty;
  if (totalPenalty > 0) overall = Math.max(FLOOR, overall);
  overall = Math.max(0, Math.min(100, Math.round(overall)));

  // §3.4d — flags carry only hard + medium; mild is a silent score nudge.
  const dealbreakerFlags: DealbreakerFlag[] = conflicts.flatMap((c) =>
    c.severity === "mild"
      ? []
      : [
          {
            category: c.category,
            label: DEALBREAKER_LABEL[c.category],
            severity: c.severity,
          },
        ],
  );

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
    dealbreaker: hadHard,
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
