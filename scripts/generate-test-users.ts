/**
 * Synthetic test-user generator for the matching pre-launch audit.
 *
 * PURE + IN-MEMORY. Builds fully-typed `User` + `Questionnaire` objects from
 * the real `defaultQuestionnaire` factory and the real `@/types`. It imports
 * NOTHING from Firebase and performs NO I/O / writes — safe to import from a
 * unit test (and that is its only consumer; see __tests__/matching.spec.ts).
 *
 * The named archetypes are hand-tuned to read like real students so the
 * generated match explanations make human sense.
 */
import { defaultQuestionnaire } from "@/config/questionnaire";
import type {
  BehaviorFreq,
  Category,
  Freq,
  Importance,
  Level,
  Persona,
  Questionnaire,
  Stance,
  Tri,
  User,
} from "@/types";

/* ------------------------------ profiles -------------------------------- */

/** A fully-typed fake account: public profile + private questionnaire. */
export interface TestUser {
  key: string;
  label: string;
  user: User;
  questionnaire: Questionnaire;
}

export function makeUser(
  uid: string,
  fullName: string,
  overrides: Partial<User> = {},
): User {
  return {
    uid,
    email: `${uid}@sst.scaler.com`,
    fullName,
    year: 1,
    gender: "female",
    hostelPrefs: ["uniworld1"],
    roomTypePrefs: ["small_double"],
    contactNumber: "9000000000",
    onboarded: true,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

/** minutes-from-midnight helper (matches the Questionnaire time encoding). */
const t = (hour: number, min = 0): number => hour * 60 + min;

/* --------------------------- named archetypes --------------------------- */

/** Sleeps 10pm, spotless, needs silence, introvert. Flags mess/noise as
 *  dealbreakers (on-brand for a neat freak who needs quiet). */
export function earlyBirdNeatFreak(uid = "early-bird"): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.sleep = { sleepTime: t(22), wakeTime: t(6), naps: "never" };
  q.cleanliness = { room: 5, desk: 5, laundry: 5 };
  q.noise = { tolerance: 1, gaming: "never", reelsMusic: "never" };
  q.study = { seriousness: 5, environment: "silent", mode: "solo" };
  q.lighting = { lightsOff: "early", brightness: "dim" };
  q.temperature = { fanSummer: 3, fanWinter: 1 };
  q.bathroom = { timing: "morning", durationMin: 15, hygieneWeight: 5 };
  q.social = { introExtro: 10, guests: "never", calls: "rarely" };
  q.spending = { monthly: 6000, common: 2, outings: 2 };
  q.outingPersona = ["nature", "cafe"];
  q.travel = { maxKm: 10, style: "planned" };
  q.sharing = { food: "no", clothes: "no", cosmetics: "no" };
  q.behavior = { substances: "never", nonveg: "never" };
  q.importance = { ...q.importance, cleanliness: 2, noise: 2, sleep: 1 };
  q.dealbreakers = {
    ...q.dealbreakers,
    substances: "dealbreaker",
    messyRoom: "dealbreaker",
    loudMusic: "dealbreaker",
    lateSleeping: "annoying",
  };
  return q;
}

/** Sleeps 3am, messy, loud gaming, extroverted. Chill — flags nothing. */
export function nightOwlGamer(uid = "night-owl"): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.sleep = { sleepTime: t(3), wakeTime: t(11), naps: "often" };
  q.cleanliness = { room: 2, desk: 2, laundry: 1 };
  q.noise = { tolerance: 5, gaming: "always", reelsMusic: "often" };
  q.study = { seriousness: 2, environment: "music", mode: "group" };
  q.lighting = { lightsOff: "late", brightness: "bright" };
  q.temperature = { fanSummer: 5, fanWinter: 4 };
  q.bathroom = { timing: "night", durationMin: 30, hygieneWeight: 2 };
  q.social = { introExtro: 70, guests: "often", calls: "often" };
  q.spending = { monthly: 15000, common: 4, outings: 4 };
  q.outingPersona = ["arcade", "nightlife"];
  q.travel = { maxKm: 40, style: "spontaneous" };
  q.sharing = { food: "yes", clothes: "yes", cosmetics: "maybe" };
  q.behavior = { substances: "never", nonveg: "occasionally" };
  q.importance = { ...q.importance, noise: 1, social: 1 };
  return q;
}

/** Silent study, lights off early, no guests, tidy. Flags frequent guests. */
export function studiousIntrovert(uid = "studious"): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.sleep = { sleepTime: t(22, 30), wakeTime: t(6, 30), naps: "rarely" };
  q.cleanliness = { room: 4, desk: 4, laundry: 4 };
  q.noise = { tolerance: 2, gaming: "never", reelsMusic: "rarely" };
  q.study = { seriousness: 5, environment: "silent", mode: "solo" };
  q.lighting = { lightsOff: "early", brightness: "dim" };
  q.temperature = { fanSummer: 3, fanWinter: 2 };
  q.bathroom = { timing: "evening", durationMin: 15, hygieneWeight: 4 };
  q.social = { introExtro: 15, guests: "never", calls: "rarely" };
  q.spending = { monthly: 7000, common: 2, outings: 2 };
  q.outingPersona = ["nature", "cafe"];
  q.travel = { maxKm: 12, style: "planned" };
  q.sharing = { food: "no", clothes: "no", cosmetics: "maybe" };
  q.behavior = { substances: "never", nonveg: "never" };
  q.importance = { ...q.importance, study: 2, noise: 1, sleep: 1 };
  q.dealbreakers = {
    ...q.dealbreakers,
    frequentGuests: "dealbreaker",
    loudMusic: "annoying",
  };
  return q;
}

/** Extrovert, frequent guests, loud calls, splurges. Open — flags nothing. */
export function socialButterfly(uid = "social"): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.sleep = { sleepTime: t(1), wakeTime: t(9), naps: "sometimes" };
  q.cleanliness = { room: 3, desk: 3, laundry: 2 };
  q.noise = { tolerance: 4, gaming: "sometimes", reelsMusic: "often" };
  q.study = { seriousness: 2, environment: "music", mode: "group" };
  q.lighting = { lightsOff: "late", brightness: "bright" };
  q.temperature = { fanSummer: 4, fanWinter: 3 };
  q.bathroom = { timing: "morning", durationMin: 25, hygieneWeight: 3 };
  q.social = { introExtro: 95, guests: "always", calls: "always" };
  q.spending = { monthly: 12000, common: 4, outings: 5 };
  q.outingPersona = ["shopping", "cafe", "nightlife", "sports"];
  q.travel = { maxKm: 50, style: "spontaneous" };
  q.sharing = { food: "yes", clothes: "yes", cosmetics: "yes" };
  q.behavior = { substances: "occasionally", nonveg: "regularly" };
  q.importance = { ...q.importance, social: 2 };
  return q;
}

/** Moderate on everything (defaults) + a moderate outing persona set. */
export function chillMiddleGround(uid = "chill"): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.outingPersona = ["cafe", "nature", "sports"];
  q.behavior = { substances: "never", nonveg: "occasionally" };
  return q;
}

/** Sleeps 4am, messy, loud, "okay" with substances + non-veg (which the model
 *  treats as *exhibiting* them). Trips a dealbreaker for anyone who flags
 *  substances, non-veg, late sleeping, loud music, mess, or frequent guests. */
export function substanceLateNighter(uid = "substance-late"): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.sleep = { sleepTime: t(4), wakeTime: t(12), naps: "often" };
  q.cleanliness = { room: 2, desk: 2, laundry: 2 };
  q.noise = { tolerance: 4, gaming: "often", reelsMusic: "often" };
  q.study = { seriousness: 2, environment: "music", mode: "solo" };
  q.lighting = { lightsOff: "late", brightness: "bright" };
  q.temperature = { fanSummer: 5, fanWinter: 3 };
  q.bathroom = { timing: "night", durationMin: 35, hygieneWeight: 2 };
  q.social = { introExtro: 60, guests: "often", calls: "sometimes" };
  q.spending = { monthly: 14000, common: 3, outings: 4 };
  q.outingPersona = ["nightlife", "arcade"];
  q.travel = { maxKm: 35, style: "spontaneous" };
  q.sharing = { food: "maybe", clothes: "no", cosmetics: "no" };
  // Fix 1: behavior is explicit now — this person genuinely uses substances and
  // eats non-veg in the room, so they "exhibit" both.
  q.behavior = { substances: "regularly", nonveg: "occasionally" };
  return q;
}

/** Early Bird Neat Freak with only tiny numeric tweaks (near-clone). */
export function earlyBirdClone(uid = "early-bird-clone"): Questionnaire {
  const q = earlyBirdNeatFreak(uid);
  q.sleep.sleepTime += 15; // 22:15 vs 22:00
  q.spending.monthly += 500; // 6500 vs 6000
  q.travel.maxKm += 2; // 12 vs 10
  return q;
}

/* --------------------------- randomized pool ---------------------------- */

/** Deterministic PRNG (mulberry32) so randomized fixtures are reproducible. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const FREQS: Freq[] = ["never", "rarely", "sometimes", "often", "always"];
const PERSONAS: Persona[] = [
  "nature",
  "shopping",
  "arcade",
  "cafe",
  "nightlife",
  "sports",
];
const TRIS: Tri[] = ["no", "maybe", "yes"];
const STANCES: Stance[] = ["okay", "annoying", "dealbreaker"];
const BEHAVIORS: (BehaviorFreq | null)[] = [
  "never",
  "occasionally",
  "regularly",
  "prefer_not",
  null,
];

/** One reproducible random (but schema-valid) questionnaire. */
export function randomQuestionnaire(
  uid: string,
  rnd: () => number,
): Questionnaire {
  const q = defaultQuestionnaire(uid);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rnd() * arr.length)];
  const int = (lo: number, hi: number): number =>
    lo + Math.floor(rnd() * (hi - lo + 1));
  const lvl = (): Level => int(1, 5) as Level;

  q.sleep = { sleepTime: int(0, 1439), wakeTime: int(0, 1439), naps: pick(FREQS) };
  q.cleanliness = { room: lvl(), desk: lvl(), laundry: lvl() };
  q.noise = { tolerance: lvl(), gaming: pick(FREQS), reelsMusic: pick(FREQS) };
  q.study = {
    seriousness: lvl(),
    environment: pick(["silent", "music", "ambient"] as const),
    mode: pick(["solo", "group"] as const),
  };
  q.lighting = {
    lightsOff: pick(["early", "late"] as const),
    brightness: pick(["dim", "bright"] as const),
  };
  q.temperature = { fanSummer: int(0, 5), fanWinter: int(0, 5) };
  q.bathroom = {
    timing: pick(["morning", "evening", "night"] as const),
    durationMin: int(5, 60),
    hygieneWeight: lvl(),
  };
  q.social = { introExtro: int(0, 100), guests: pick(FREQS), calls: pick(FREQS) };
  q.spending = { monthly: int(2, 50) * 1000, common: lvl(), outings: lvl() };
  q.outingPersona = PERSONAS.filter(() => rnd() < 0.4);
  q.travel = {
    maxKm: int(1, 100),
    style: pick(["spontaneous", "planned"] as const),
  };
  q.sharing = { food: pick(TRIS), clothes: pick(TRIS), cosmetics: pick(TRIS) };
  q.behavior = { substances: pick(BEHAVIORS), nonveg: pick(BEHAVIORS) };

  const importance = { ...q.importance };
  (Object.keys(importance) as Category[]).forEach((c) => {
    importance[c] = int(0, 2) as Importance;
  });
  q.importance = importance;

  const dealbreakers = { ...q.dealbreakers };
  (Object.keys(dealbreakers) as (keyof typeof dealbreakers)[]).forEach((k) => {
    dealbreakers[k] = pick(STANCES);
  });
  q.dealbreakers = dealbreakers;

  return q;
}

/** A reproducible batch of randomized test users. */
export function randomTestUsers(count: number, seed = 1): TestUser[] {
  const rnd = mulberry32(seed);
  const out: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    const uid = `rand-${i}`;
    out.push({
      key: uid,
      label: `Randomized #${i}`,
      user: makeUser(uid, `Random ${i}`),
      questionnaire: randomQuestionnaire(uid, rnd),
    });
  }
  return out;
}

/* ----------------------------- the roster ------------------------------- */

export const ARCHETYPES: TestUser[] = [
  {
    key: "early-bird",
    label: "Early Bird Neat Freak",
    user: makeUser("early-bird", "Esha (Early Bird Neat Freak)"),
    questionnaire: earlyBirdNeatFreak("early-bird"),
  },
  {
    key: "night-owl",
    label: "Night Owl Gamer",
    user: makeUser("night-owl", "Nivedita (Night Owl Gamer)"),
    questionnaire: nightOwlGamer("night-owl"),
  },
  {
    key: "studious",
    label: "Studious Introvert",
    user: makeUser("studious", "Sara (Studious Introvert)"),
    questionnaire: studiousIntrovert("studious"),
  },
  {
    key: "social",
    label: "Social Butterfly",
    user: makeUser("social", "Simran (Social Butterfly)"),
    questionnaire: socialButterfly("social"),
  },
  {
    key: "chill",
    label: "Chill Middle-Ground",
    user: makeUser("chill", "Charu (Chill Middle-Ground)"),
    questionnaire: chillMiddleGround("chill"),
  },
  {
    key: "substance-late",
    label: "Substance User + Late Nighter",
    user: makeUser("substance-late", "Sana (Substance User + Late Nighter)"),
    questionnaire: substanceLateNighter("substance-late"),
  },
  {
    key: "early-bird-clone",
    label: "Early Bird Neat Freak (near-clone)",
    user: makeUser("early-bird-clone", "Esha's near-twin"),
    questionnaire: earlyBirdClone("early-bird-clone"),
  },
];
