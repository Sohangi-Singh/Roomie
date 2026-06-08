import { z } from "zod";
import type {
  BehaviorFreq,
  Category,
  DealbreakerKey,
  Freq,
  Persona,
  Questionnaire,
  Stance,
} from "@/types";

export const CATEGORIES: Category[] = [
  "sleep",
  "cleanliness",
  "noise",
  "study",
  "lighting",
  "temperature",
  "bathroom",
  "social",
  "spending",
  "outing",
  "travel",
  "sharing",
];

export const DEALBREAKER_KEYS: DealbreakerKey[] = [
  "substances",
  "nonveg",
  "loudMusic",
  "lateSleeping",
  "messyRoom",
  "frequentGuests",
];

/* ----------------------------- option sets ------------------------------ */

export const FREQ_ORDER: Freq[] = [
  "never",
  "rarely",
  "sometimes",
  "often",
  "always",
];

export const FREQ_OPTIONS: { value: Freq; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "rarely", label: "Rarely" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Often" },
  { value: "always", label: "Always" },
];

export function freqToIndex(f: Freq): number {
  return FREQ_ORDER.indexOf(f);
}

export const PERSONA_OPTIONS: { value: Persona; label: string; emoji: string }[] =
  [
    { value: "nature", label: "Nature", emoji: "🌿" },
    { value: "shopping", label: "Shopping", emoji: "🛍️" },
    { value: "arcade", label: "Arcade", emoji: "🎮" },
    { value: "cafe", label: "Cafés", emoji: "☕" },
    { value: "nightlife", label: "Nightlife", emoji: "🌙" },
    { value: "sports", label: "Sports", emoji: "🏏" },
  ];

export const STANCE_OPTIONS: { value: Stance; label: string }[] = [
  { value: "okay", label: "Fine" },
  { value: "annoying", label: "Annoying" },
  { value: "dealbreaker", label: "Dealbreaker" },
];

/** In-room behavior options (Fix 1 — substances/non-veg are behavior, not
 *  inferred from tolerance). "prefer_not" and an unset (null) value are both
 *  treated as UNKNOWN by the matching engine. */
export const BEHAVIOR_OPTIONS: { value: BehaviorFreq; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "occasionally", label: "Occasionally" },
  { value: "regularly", label: "Regularly" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export const BEHAVIOR_QUESTIONS: {
  key: "substances" | "nonveg";
  label: string;
}[] = [
  { key: "substances", label: "Do you smoke or drink in the room?" },
  { key: "nonveg", label: "Do you eat non-veg in the room?" },
];

export const DEALBREAKER_META: {
  key: DealbreakerKey;
  label: string;
  desc: string;
}[] = [
  {
    key: "substances",
    label: "Intoxicating substances",
    desc: "Smoking, alcohol, etc. in the room",
  },
  { key: "nonveg", label: "Non-vegetarian food", desc: "Non-veg in the room" },
  { key: "loudMusic", label: "Loud music", desc: "Audio without headphones" },
  { key: "lateSleeping", label: "Late sleeping", desc: "Up well past midnight" },
  { key: "messyRoom", label: "Messy room", desc: "Clutter left around" },
  {
    key: "frequentGuests",
    label: "Frequent guests",
    desc: "Friends over often",
  },
];

export const CATEGORY_META: Record<
  Category,
  { label: string; icon: string; blurb: string }
> = {
  sleep: { label: "Sleep", icon: "moon", blurb: "When you wind down" },
  cleanliness: {
    label: "Cleanliness",
    icon: "sparkles",
    blurb: "How tidy you keep things",
  },
  noise: { label: "Noise", icon: "volume-2", blurb: "Sound in the room" },
  study: { label: "Study", icon: "book-open", blurb: "How you focus" },
  lighting: { label: "Lighting", icon: "lamp", blurb: "Lights & brightness" },
  temperature: {
    label: "Temperature",
    icon: "thermometer",
    blurb: "Fan speed by season",
  },
  bathroom: { label: "Bathroom", icon: "droplets", blurb: "Timing & hygiene" },
  social: { label: "Social", icon: "users", blurb: "People & energy" },
  spending: { label: "Spending", icon: "wallet", blurb: "Money & shared cost" },
  outing: { label: "Outings", icon: "compass", blurb: "How you go out" },
  travel: { label: "Travel", icon: "map", blurb: "How far you'll roam" },
  sharing: { label: "Sharing", icon: "heart-handshake", blurb: "What you share" },
};

/* ------------------------------- steps ---------------------------------- */

export type Field =
  | { kind: "time"; key: string; label: string; help?: string }
  | {
      kind: "level";
      key: string;
      label: string;
      lowLabel: string;
      highLabel: string;
      help?: string;
    }
  | { kind: "freq"; key: string; label: string; help?: string }
  | {
      kind: "number";
      key: string;
      label: string;
      min: number;
      max: number;
      step: number;
      unit?: "inr" | "km" | "min";
      help?: string;
    }
  | {
      kind: "range";
      key: string;
      label: string;
      min: number;
      max: number;
      step: number;
      ticks: string[];
      help?: string;
    }
  | {
      kind: "slider";
      key: string;
      label: string;
      min: number;
      max: number;
      step: number;
      lowLabel: string;
      highLabel: string;
      help?: string;
    }
  | {
      kind: "segmented";
      key: string;
      label: string;
      options: { value: string; label: string }[];
      help?: string;
    }
  | { kind: "tri"; key: string; label: string; help?: string };

export type Step =
  | {
      id: string;
      kind: "category";
      category: Category;
      title: string;
      subtitle: string;
      fields: Field[];
    }
  | { id: string; kind: "persona"; title: string; subtitle: string }
  | { id: string; kind: "importance"; title: string; subtitle: string }
  | { id: string; kind: "behavior"; title: string; subtitle: string }
  | { id: string; kind: "dealbreakers"; title: string; subtitle: string };

export const STEPS: Step[] = [
  {
    id: "sleep",
    kind: "category",
    category: "sleep",
    title: "Your sleep rhythm",
    subtitle: "When the room goes quiet matters most.",
    fields: [
      { kind: "time", key: "sleepTime", label: "Usual sleep time" },
      { kind: "time", key: "wakeTime", label: "Usual wake time" },
      { kind: "freq", key: "naps", label: "Daytime naps" },
    ],
  },
  {
    id: "cleanliness",
    kind: "category",
    category: "cleanliness",
    title: "Keeping it tidy",
    subtitle: "Be honest — it saves a lot of friction later.",
    fields: [
      {
        kind: "level",
        key: "room",
        label: "Room cleanliness",
        lowLabel: "Relaxed",
        highLabel: "Spotless",
      },
      {
        kind: "level",
        key: "desk",
        label: "Desk & study area",
        lowLabel: "Cluttered",
        highLabel: "Always neat",
      },
      {
        kind: "level",
        key: "laundry",
        label: "Laundry habits",
        lowLabel: "Piles up",
        highLabel: "On top of it",
      },
    ],
  },
  {
    id: "noise",
    kind: "category",
    category: "noise",
    title: "Sound & volume",
    subtitle: "How much noise feels comfortable to you.",
    fields: [
      {
        kind: "level",
        key: "tolerance",
        label: "Noise tolerance",
        lowLabel: "Need silence",
        highLabel: "Noise is fine",
      },
      { kind: "freq", key: "gaming", label: "Gaming" },
      { kind: "freq", key: "reelsMusic", label: "Reels / music out loud" },
    ],
  },
  {
    id: "study",
    kind: "category",
    category: "study",
    title: "How you study",
    subtitle: "Focus styles can clash — let's line them up.",
    fields: [
      {
        kind: "level",
        key: "seriousness",
        label: "Study seriousness",
        lowLabel: "Chill",
        highLabel: "Very serious",
      },
      {
        kind: "segmented",
        key: "environment",
        label: "Preferred environment",
        options: [
          { value: "silent", label: "Silent" },
          { value: "music", label: "With music" },
          { value: "ambient", label: "Light ambient" },
        ],
      },
      {
        kind: "segmented",
        key: "mode",
        label: "Study mode",
        options: [
          { value: "solo", label: "Solo" },
          { value: "group", label: "Group" },
        ],
      },
    ],
  },
  {
    id: "lighting",
    kind: "category",
    category: "lighting",
    title: "Lights in the room",
    subtitle: "Late-night lights are a classic roommate clash.",
    fields: [
      {
        kind: "segmented",
        key: "lightsOff",
        label: "Lights off",
        options: [
          { value: "early", label: "Early" },
          { value: "late", label: "Late" },
        ],
      },
      {
        kind: "segmented",
        key: "brightness",
        label: "Brightness",
        options: [
          { value: "dim", label: "Dim & warm" },
          { value: "bright", label: "Bright" },
        ],
      },
    ],
  },
  {
    id: "temperature",
    kind: "category",
    category: "temperature",
    title: "Fan & airflow",
    subtitle: "How strong you like the fan, by season.",
    fields: [
      {
        kind: "range",
        key: "fanSummer",
        label: "Fan speed in summer",
        min: 0,
        max: 5,
        step: 1,
        ticks: ["Off", "1", "2", "3", "4", "Max"],
      },
      {
        kind: "range",
        key: "fanWinter",
        label: "Fan speed in winter",
        min: 0,
        max: 5,
        step: 1,
        ticks: ["Off", "1", "2", "3", "4", "Max"],
      },
    ],
  },
  {
    id: "bathroom",
    kind: "category",
    category: "bathroom",
    title: "Bathroom routine",
    subtitle: "Timing and hygiene expectations.",
    fields: [
      {
        kind: "segmented",
        key: "timing",
        label: "Preferred bath timing",
        options: [
          { value: "morning", label: "Morning" },
          { value: "evening", label: "Evening" },
          { value: "night", label: "Night" },
        ],
      },
      {
        kind: "number",
        key: "durationMin",
        label: "Average bath time",
        min: 5,
        max: 60,
        step: 5,
        unit: "min",
      },
      {
        kind: "level",
        key: "hygieneWeight",
        label: "How much bathroom cleanliness matters",
        lowLabel: "Not much",
        highLabel: "A lot",
      },
    ],
  },
  {
    id: "social",
    kind: "category",
    category: "social",
    title: "Social energy",
    subtitle: "There's no wrong answer here.",
    fields: [
      {
        kind: "slider",
        key: "introExtro",
        label: "Where you sit",
        min: 0,
        max: 100,
        step: 5,
        lowLabel: "Introvert",
        highLabel: "Extrovert",
      },
      { kind: "freq", key: "guests", label: "Guests visiting" },
      { kind: "freq", key: "calls", label: "Calls in the room" },
    ],
  },
  {
    id: "spending",
    kind: "category",
    category: "spending",
    title: "Spending style",
    subtitle: "Helps match budgets for shared things.",
    fields: [
      {
        kind: "number",
        key: "monthly",
        label: "Average monthly spend",
        min: 2000,
        max: 50000,
        step: 1000,
        unit: "inr",
      },
      {
        kind: "level",
        key: "common",
        label: "Spending on shared decor / items",
        lowLabel: "Prefer not",
        highLabel: "Happy to",
      },
      {
        kind: "level",
        key: "outings",
        label: "Spending on outings",
        lowLabel: "Budget",
        highLabel: "Splurge",
      },
    ],
  },
  {
    id: "outing",
    kind: "persona",
    title: "Your outing personality",
    subtitle: "Pick everything that sounds like you.",
  },
  {
    id: "travel",
    kind: "category",
    category: "travel",
    title: "Going out",
    subtitle: "How far and how planned.",
    fields: [
      {
        kind: "number",
        key: "maxKm",
        label: "Max distance for an outing",
        min: 1,
        max: 100,
        step: 1,
        unit: "km",
      },
      {
        kind: "segmented",
        key: "style",
        label: "Outing style",
        options: [
          { value: "spontaneous", label: "Spontaneous" },
          { value: "planned", label: "Planned" },
        ],
      },
    ],
  },
  {
    id: "sharing",
    kind: "category",
    category: "sharing",
    title: "What you'll share",
    subtitle: "Boundaries are healthy — set yours.",
    fields: [
      { kind: "tri", key: "food", label: "Food" },
      { kind: "tri", key: "clothes", label: "Clothes" },
      { kind: "tri", key: "cosmetics", label: "Cosmetics & toiletries" },
    ],
  },
  {
    id: "importance",
    kind: "importance",
    title: "What matters most?",
    subtitle: "Tap on one, 2 times to increase the intensity.",
  },
  {
    id: "behavior",
    kind: "behavior",
    title: "Two honest ones",
    subtitle: "Only used to flag clear dealbreakers. Always kept private.",
  },
  {
    id: "dealbreakers",
    kind: "dealbreakers",
    title: "Any dealbreakers?",
    subtitle: "Choose dealbreakers carefully and minimally.",
  },
];

export const TOTAL_STEPS = STEPS.length;

/* ----------------------------- defaults --------------------------------- */

export function defaultQuestionnaire(uid: string): Questionnaire {
  return {
    uid,
    sleep: { sleepTime: 23 * 60, wakeTime: 7 * 60, naps: "sometimes" },
    cleanliness: { room: 3, desk: 3, laundry: 3 },
    noise: { tolerance: 3, gaming: "sometimes", reelsMusic: "sometimes" },
    study: { seriousness: 3, environment: "ambient", mode: "solo" },
    lighting: { lightsOff: "late", brightness: "dim" },
    temperature: { fanSummer: 4, fanWinter: 2 },
    bathroom: { timing: "morning", durationMin: 20, hygieneWeight: 3 },
    social: { introExtro: 50, guests: "sometimes", calls: "sometimes" },
    spending: { monthly: 8000, common: 3, outings: 3 },
    outingPersona: [],
    travel: { maxKm: 15, style: "planned" },
    sharing: { food: "maybe", clothes: "maybe", cosmetics: "maybe" },
    // Behavior unset by default — must be answered, never inferred (Fix 1).
    behavior: { substances: null, nonveg: null },
    importance: {
      sleep: 0,
      cleanliness: 0,
      noise: 0,
      study: 0,
      lighting: 0,
      temperature: 0,
      bathroom: 0,
      social: 0,
      spending: 0,
      outing: 0,
      travel: 0,
      sharing: 0,
    },
    dealbreakers: {
      substances: "okay",
      nonveg: "okay",
      loudMusic: "okay",
      lateSleeping: "okay",
      messyRoom: "okay",
      frequentGuests: "okay",
    },
    completedAt: 0,
  };
}

/* ---------------------------- validation -------------------------------- */

const level = z.number().int().min(1).max(5);
const freq = z.enum(["never", "rarely", "sometimes", "often", "always"]);
const tri = z.enum(["no", "maybe", "yes"]);
const stance = z.enum(["okay", "annoying", "dealbreaker"]);
const behaviorFreq = z.enum([
  "never",
  "occasionally",
  "regularly",
  "prefer_not",
]);
const importanceVal = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const persona = z.enum([
  "nature",
  "shopping",
  "arcade",
  "cafe",
  "nightlife",
  "sports",
]);
const minutes = z.number().int().min(0).max(1439);

export const questionnaireSchema = z.object({
  uid: z.string().min(1),
  sleep: z.object({ sleepTime: minutes, wakeTime: minutes, naps: freq }),
  cleanliness: z.object({ room: level, desk: level, laundry: level }),
  noise: z.object({ tolerance: level, gaming: freq, reelsMusic: freq }),
  study: z.object({
    seriousness: level,
    environment: z.enum(["silent", "music", "ambient"]),
    mode: z.enum(["solo", "group"]),
  }),
  lighting: z.object({
    lightsOff: z.enum(["early", "late"]),
    brightness: z.enum(["dim", "bright"]),
  }),
  temperature: z.object({
    fanSummer: z.number().int().min(0).max(5),
    fanWinter: z.number().int().min(0).max(5),
  }),
  bathroom: z.object({
    timing: z.enum(["morning", "evening", "night"]),
    durationMin: z.number().int().min(1).max(120),
    hygieneWeight: level,
  }),
  social: z.object({
    introExtro: z.number().int().min(0).max(100),
    guests: freq,
    calls: freq,
  }),
  spending: z.object({
    monthly: z.number().int().min(0).max(200000),
    common: level,
    outings: level,
  }),
  outingPersona: z.array(persona),
  travel: z.object({
    maxKm: z.number().int().min(0).max(200),
    style: z.enum(["spontaneous", "planned"]),
  }),
  sharing: z.object({ food: tri, clothes: tri, cosmetics: tri }),
  // Optional so pre-Fix-1 docs (which predate `behavior`) still validate —
  // matching treats a missing/unset value as UNKNOWN, never incomplete.
  behavior: z
    .object({
      substances: behaviorFreq.nullable(),
      nonveg: behaviorFreq.nullable(),
    })
    .optional(),
  importance: z.record(z.string(), importanceVal),
  dealbreakers: z.record(z.string(), stance),
  completedAt: z.number(),
});
