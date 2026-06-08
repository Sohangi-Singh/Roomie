/** 5-point rating scale (1 = low, 5 = high). */
export type Level = 1 | 2 | 3 | 4 | 5;

/** Frequency scale, mapped to 0..4 in the matching engine. */
export type Freq = "never" | "rarely" | "sometimes" | "often" | "always";

/** Sharing willingness. */
export type Tri = "no" | "maybe" | "yes";

/** Dealbreaker stance for a given habit. */
export type Stance = "okay" | "annoying" | "dealbreaker";

/** Self-reported in-room behavior frequency (substances / non-veg).
 *  `null` (unset) and "prefer_not" are both treated as UNKNOWN by matching. */
export type BehaviorFreq = "never" | "occasionally" | "regularly" | "prefer_not";

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

  /** Actual in-room behavior, used for dealbreaker detection (substances /
   *  non-veg). `null` = not answered yet; "prefer_not" = declined. Both are
   *  treated as UNKNOWN — they never trigger a dealbreaker, only a soft note. */
  behavior: {
    substances: BehaviorFreq | null;
    nonveg: BehaviorFreq | null;
  };

  importance: Record<Category, Importance>;
  dealbreakers: Record<DealbreakerKey, Stance>;

  completedAt: number;
}
