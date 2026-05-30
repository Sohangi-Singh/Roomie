import type { Category, DealbreakerKey, Questionnaire } from "@/types";
import type { DealbreakerConflict } from "./scoring";

const REASONS: Record<Category, string> = {
  sleep: "You're on similar sleep schedules.",
  cleanliness: "You keep your space at a similar tidiness level.",
  noise: "Your noise comfort levels line up well.",
  study: "You study in compatible ways.",
  lighting: "You agree on lights and brightness.",
  temperature: "Similar temperature and airflow preferences.",
  bathroom: "Bathroom routines and hygiene expectations match.",
  social: "Your social energy is well aligned.",
  spending: "Your spending styles are compatible.",
  outing: "You enjoy similar kinds of outings.",
  travel: "You like to travel similar distances and ways.",
  sharing: "You're on the same page about sharing.",
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
      return "Bathroom timing or hygiene expectations differ.";
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
  reasons: string[];
  conflicts: string[];
}

export function buildInsights(
  a: Questionnaire,
  b: Questionnaire,
  categories: Record<Category, number>,
  dbConflicts: DealbreakerConflict[],
): Insights {
  const reasons: string[] = [];
  const conflicts: string[] = [];

  // Dealbreakers lead — they matter most.
  for (const c of dbConflicts) {
    const line = DEALBREAKER_LINES[c.key];
    if (!conflicts.includes(line)) conflicts.push(line);
  }

  const entries = (Object.keys(categories) as Category[]).map((c) => ({
    c,
    score: categories[c],
  }));
  const high = entries.filter((e) => e.score >= 78).sort((x, y) => y.score - x.score);
  const low = entries.filter((e) => e.score <= 45).sort((x, y) => x.score - y.score);

  for (const e of high.slice(0, 4)) reasons.push(REASONS[e.c]);
  for (const e of low.slice(0, 4)) {
    const line = conflictLine(e.c, a, b);
    if (!conflicts.includes(line)) conflicts.push(line);
  }

  if (reasons.length === 0) {
    reasons.push("You have a balanced, workable mix of habits.");
  }
  return { reasons, conflicts };
}
