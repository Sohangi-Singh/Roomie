import type { Category, DealbreakerKey, Questionnaire } from "@/types";
import { behaviorState, type DealbreakerConflict } from "./scoring";

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

const DEALBREAKER_LINES: Record<DealbreakerKey, string> = {
  substances: "Strong mismatch on intoxicating substances.",
  nonveg: "Mismatch on non-vegetarian food in the room.",
  loudMusic: "One often plays loud music the other can't stand.",
  lateSleeping: "A late-night schedule clashes with an early sleeper.",
  messyRoom: "A tidiness gap is flagged as a dealbreaker.",
  frequentGuests: "Frequent guests are flagged as a dealbreaker.",
};

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

// Fix 1: shown when a person hasn't shared a behavior the other side cares about.
function unknownBehaviorNote(key: "substances" | "nonveg"): string {
  return key === "substances"
    ? "They haven't shared their stance on smoking/drinking in the room yet."
    : "They haven't shared whether they eat non-veg in the room yet.";
}

export interface Insights {
  /** Positive compatibility — "Why you match" (green). */
  reasons: string[];
  /** Mild, neutral notes (50–77 band) + unknown-behavior — "Worth discussing". */
  worthDiscussing: string[];
  /** Soft concerns — annoyance-level dealbreakers + 30–49 categories. */
  annoyances: string[];
  /** Hard dealbreaker conflicts + severe (<30) category mismatches. */
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

  // Dealbreaker conflicts: hard → "Potential clashes",
  //                       soft (annoying) → "Might be a problem, but is fine".
  const seenConflict = new Set<string>();
  const seenAnnoyance = new Set<string>();
  let hardCount = 0;
  for (const c of dbConflicts) {
    const line = DEALBREAKER_LINES[c.key];
    if (c.severity === "hard") {
      hardCount++;
      if (!seenConflict.has(line)) {
        conflicts.push(line);
        seenConflict.add(line);
      }
    } else if (!seenAnnoyance.has(line)) {
      annoyances.push(line);
      seenAnnoyance.add(line);
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

  // Fix 1: surface a neutral note when one side's substance/non-veg behavior is
  // unknown AND the other person actually cares (flagged it as non-"okay").
  for (const key of ["substances", "nonveg"] as const) {
    const note = unknownBehaviorNote(key);
    const bUnknownACares =
      behaviorState(b, key) === "unknown" && a.dealbreakers[key] !== "okay";
    const aUnknownBCares =
      behaviorState(a, key) === "unknown" && b.dealbreakers[key] !== "okay";
    if ((bUnknownACares || aUnknownBCares) && !worthDiscussing.includes(note)) {
      worthDiscussing.push(note);
    }
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
