import type { Category, DealbreakerKey, Questionnaire } from "@/types";
import { DEALBREAKER_META } from "@/config/questionnaire";
import type { DealbreakerConflict } from "./scoring";

const REASONS: Record<Category, string> = {
  sleep: "You're on similar sleep schedules.",
  cleanliness: "You keep your space at a similar tidiness level.",
  noise: "Your noise comfort levels line up well.",
  study: "You study in compatible ways.",
  lighting: "You agree on lights and brightness.",
  temperature: "Similar temperature and airflow preferences.",
  bathroom: "Bathroom routines complement each other nicely.",
  social: "Your social energy is well aligned.",
  spending: "Your spending styles are compatible.",
  outing: "You enjoy similar kinds of outings.",
  travel: "You like to travel similar distances and ways.",
  sharing: "You're on the same page about sharing.",
};

// Fix 2: neutral, constructive copy for the 50–77 "Worth discussing" band.
const WORTH_DISCUSSING: Record<Category, string> = {
  sleep: "Sleep timings differ a little — worth agreeing on quiet hours.",
  cleanliness: "Slightly different tidiness levels — set a shared baseline early.",
  noise: "Some difference in noise comfort — headphones go a long way.",
  study: "You focus a bit differently — easy to plan around.",
  lighting: "Minor lighting differences — sort out a late-night lamp.",
  temperature: "Fan preferences differ a touch — usually easy to settle.",
  bathroom: "Bathroom routines are fairly close — a quick schedule helps.",
  social: "Somewhat different social energy — align on guests and quiet time.",
  spending: "Budgets differ a little — agree on shared costs up front.",
  outing: "Partly overlapping outing tastes — still plenty to do together.",
  travel: "Slightly different travel appetites — easy to compromise.",
  sharing: "Mostly aligned on sharing — just confirm the specifics.",
};

const DEALBREAKER_LABEL = Object.fromEntries(
  DEALBREAKER_META.map((d) => [d.key, d.label]),
) as Record<DealbreakerKey, string>;

/** What the doer actually does, phrased from each side's point of view. */
const DEALBREAKER_DOES: Record<DealbreakerKey, { they: string; you: string }> = {
  substances: {
    they: "they'll smoke or drink in the room",
    you: "you smoke or drink in the room",
  },
  nonveg: {
    they: "they'll eat non-veg in the room",
    you: "you eat non-veg in the room",
  },
  loudMusic: {
    they: "they'll play audio out loud",
    you: "you play audio out loud",
  },
  lateSleeping: {
    they: "they're up well past midnight",
    you: "you're up well past midnight",
  },
  messyRoom: {
    they: "they'll leave clutter around",
    you: "you leave clutter around",
  },
  frequentGuests: {
    they: "they'll have friends over often",
    you: "you have friends over often",
  },
};

/** Plain-language line for a hard/medium dealbreaker conflict (§3.6).
 *  `a` is always the viewer ("you"); `doer` says which side does the thing. */
function dealbreakerLine(c: DealbreakerConflict): string {
  const label = DEALBREAKER_LABEL[c.category];
  const does = DEALBREAKER_DOES[c.category];
  if (c.severity === "hard") {
    return c.doer === "b"
      ? `${label} — ${does.they}, and you can't live with that.`
      : `${label} — ${does.you}, and they can't live with that.`;
  }
  return c.doer === "b"
    ? `${label} — ${does.they}, and you'd find it annoying.`
    : `${label} — ${does.you}, and they'd find it annoying.`;
}

/** Tailored conflict copy where we can be specific, generic otherwise. */
function conflictLine(c: Category, a: Questionnaire, b: Questionnaire): string {
  switch (c) {
    case "lighting":
      return a.lighting.lightsOff !== b.lighting.lightsOff
        ? "One prefers lights off early while the other keeps them on late."
        : "You disagree on brightness in the room.";
    case "temperature":
      return "Different fan-speed comfort across seasons.";
    case "sleep":
      return "One's an early sleeper while the other's more of a night owl.";
    case "noise":
      return "One plays media or games often; the other needs quiet.";
    case "social":
      return "One is noticeably more social than the other.";
    case "cleanliness":
      return "One keeps things noticeably tidier than the other.";
    case "study":
      return "You focus best in different study environments.";
    case "bathroom":
      return "Bathroom timing or hygiene expectations may clash.";
    case "spending":
      return "Your monthly budgets are fairly different.";
    case "outing":
      return "You enjoy different kinds of outings.";
    case "travel":
      return "Different appetite for how far or how planned outings are.";
    case "sharing":
      return "Different comfort levels around sharing things.";
  }
}

export interface Insights {
  /** Positive compatibility — "Why you match" (green). */
  reasons: string[];
  /** MEDIUM dealbreaker conflicts + mild notes (50–77 band) — "Worth discussing". */
  worthDiscussing: string[];
  /** Soft concerns — 30–49 categories. */
  annoyances: string[];
  /** HARD dealbreaker conflicts + severe (<30) category mismatches. */
  conflicts: string[];
}

export function buildInsights(
  a: Questionnaire,
  b: Questionnaire,
  categories: Record<Category, number>,
  dbConflicts: DealbreakerConflict[],
  overall: number,
): Insights {
  const reasons: string[] = [];
  const worthDiscussing: string[] = [];
  const annoyances: string[] = [];
  const conflicts: string[] = [];

  // Dealbreaker conflicts (§3.6): HARD → "Potential clashes" (red),
  // MEDIUM → "Worth discussing" (orange), MILD → nothing — it silently
  // nudges the score and never surfaces in any UI (§3.4c).
  let hardCount = 0;
  for (const c of dbConflicts) {
    if (c.severity === "mild") continue;
    const line = dealbreakerLine(c);
    if (c.severity === "hard") {
      hardCount++;
      conflicts.push(line);
    } else {
      worthDiscussing.push(line);
    }
  }

  const entries = (Object.keys(categories) as Category[]).map((c) => ({
    c,
    score: categories[c],
  }));
  const high = entries.filter((e) => e.score >= 78).sort((x, y) => y.score - x.score);
  // 50–77 = pretty good, minor difference → neutral "worth discussing"
  const mid = entries.filter((e) => e.score >= 50 && e.score < 78).sort((x, y) => x.score - y.score);
  // 30–49 = bothersome but liveable
  const moderate = entries.filter((e) => e.score >= 30 && e.score < 50).sort((x, y) => x.score - y.score);
  // < 30 = severe enough to surface as a potential clash
  const severe = entries.filter((e) => e.score < 30).sort((x, y) => x.score - y.score);

  for (const e of high.slice(0, 4)) reasons.push(REASONS[e.c]);
  for (const e of mid.slice(0, 3)) worthDiscussing.push(WORTH_DISCUSSING[e.c]);
  for (const e of moderate.slice(0, 3)) {
    const line = conflictLine(e.c, a, b);
    if (!annoyances.includes(line) && !conflicts.includes(line)) {
      annoyances.push(line);
    }
  }
  for (const e of severe.slice(0, 3)) {
    const line = conflictLine(e.c, a, b);
    if (!conflicts.includes(line)) conflicts.push(line);
  }

  // Fix 2: never falsely reassure. The reassuring fallback only appears on a
  // genuinely balanced match; otherwise show an honest, neutral line instead.
  if (reasons.length === 0) {
    if (overall < 60 || hardCount > 0 || severe.length > 0) {
      worthDiscussing.unshift(
        "This match has notable friction points — review the clashes below before deciding.",
      );
    } else {
      reasons.push("You have a balanced, workable mix of habits.");
    }
  }

  return { reasons, worthDiscussing, annoyances, conflicts };
}
