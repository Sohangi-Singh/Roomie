/** 5-point rating scale (1 = low, 5 = high). */
export type Level = 1 | 2 | 3 | 4 | 5;

/** Frequency scale, mapped to 0..4 in the matching engine. */
export type Freq = "never" | "rarely" | "sometimes" | "often" | "always";

/** Sharing willingness. */
export type Tri = "no" | "maybe" | "yes";

/** Dealbreaker stance for a given habit (v3 — 4 options).
 *  "willDo" ("Will do in room") is the single source of truth for whether the
 *  person does the thing; nothing is derived from lifestyle answers anymore. */
export type Stance = "willDo" | "fine" | "annoying" | "dealbreaker";

/** Compatibility categories — also the axes of the radar chart. */
export type Category =
  | "sleep"
  | "cleanliness"
  | "noise"
  | "study"
  | "lighting"
  | "temperature"
  | "bathroom"
  | "social"
  | "spending"
  | "outing"
  | "travel"
  | "sharing";

export type Persona =
  | "nature"
  | "shopping"
  | "arcade"
  | "cafe"
  | "nightlife"
  | "sports";

export type DealbreakerKey =
  | "substances"
  | "nonveg"
  | "loudMusic"
  | "lateSleeping"
  | "messyRoom"
  | "frequentGuests";

/** User-flagged importance per category: 0 = normal, 1 = matters, 2 = critical. */
export type Importance = 0 | 1 | 2;

export interface Questionnaire {
  uid: string;

  /** Times stored as minutes from midnight (0–1439). */
  sleep: { sleepTime: number; wakeTime: number; naps: Freq };
  cleanliness: { room: Level; desk: Level; laundry: Level };
  noise: { tolerance: Level; gaming: Freq; reelsMusic: Freq };
  study: {
    seriousness: Level;
    environment: "silent" | "music" | "ambient";
    mode: "solo" | "group";
  };
  lighting: { lightsOff: "early" | "late"; brightness: "dim" | "bright" };
  /** Fan speed 0 (off) → 5 (highest), per season. */
  temperature: { fanSummer: number; fanWinter: number };
  bathroom: {
    timing: "morning" | "evening" | "night";
    durationMin: number;
    hygieneWeight: Level;
  };
  /** introExtro 0 (introvert) → 100 (extrovert). */
  social: { introExtro: number; guests: Freq; calls: Freq };
  /** monthly in INR. */
  spending: { monthly: number; common: Level; outings: Level };
  outingPersona: Persona[];
  travel: { maxKm: number; style: "spontaneous" | "planned" };
  sharing: { food: Tri; clothes: Tri; cosmetics: Tri };

  importance: Record<Category, Importance>;
  dealbreakers: Record<DealbreakerKey, Stance>;

  /** Format version of the `dealbreakers` answers. Absent or < 3 means the
   *  doc still holds legacy 3-option answers (mapped okay→fine on read); the
   *  one-time migration modal collects fresh 4-option answers and stamps 3.
   *  "willDo" is never auto-assigned by migration. */
  dealbreakersVersion?: number;

  completedAt: number;
}
