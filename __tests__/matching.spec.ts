/**
 * Matching algorithm spec — v3 (dealbreaker rework, FABLE_HANDOFF.md).
 *
 * Covers the §6 test plan in full: the 8 symmetric penalty-matrix cases, the
 * composite scenarios with exact bases, migration, self-match, and the
 * still-passing invariants — plus the human-obvious truths and the explain
 * pass carried over from the v1/v2 audits. Pure + in-memory.
 */
import { describe, it, expect } from "vitest";
import type { Category, Questionnaire, Stance } from "@/types";
import {
  CATEGORIES,
  defaultQuestionnaire,
  migrateQuestionnaire,
} from "@/config/questionnaire";
import {
  scorePair,
  rankCandidates,
  sleepScore,
  cleanlinessScore,
  dealbreakerConflicts,
  ALGORITHM_VERSION,
  IncompleteProfileError,
} from "@/lib/matching";
import { buildInsights } from "@/lib/matching/insights";
import {
  earlyBirdNeatFreak,
  nightOwlGamer,
  studiousIntrovert,
  socialButterfly,
  chillMiddleGround,
  substanceLateNighter,
  earlyBirdClone,
  randomTestUsers,
  ARCHETYPES,
} from "@/scripts/generate-test-users";

const clone = (q: Questionnaire): Questionnaire =>
  JSON.parse(JSON.stringify(q)) as Questionnaire;

/** Identical-lifestyle fixture: every base category 100 except bathroom (94,
 *  identical timing scores 85 on its timing component) → base rounds to 100. */
function baseFixture(uid: string): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.outingPersona = ["cafe"]; // avoid the empty-set outing default of 60
  return q;
}

/** A pair of identical fixtures plus an optional base-shaping mutation. */
function pair(
  mutate?: (a: Questionnaire, b: Questionnaire) => void,
): [Questionnaire, Questionnaire] {
  const a = baseFixture("pair-a");
  const b = baseFixture("pair-b");
  mutate?.(a, b);
  return [a, b];
}

/* Base-shaping recipes (no dealbreaker conflicts — stances stay "fine").
 * Each lands the 12-category weighted base on an exact target. */

/** → base 90 (temperature opposite + lights-off split). */
function shape90(a: Questionnaire, b: Questionnaire): void {
  a.temperature = { fanSummer: 0, fanWinter: 0 };
  b.temperature = { fanSummer: 5, fanWinter: 5 };
  b.lighting = { ...b.lighting, lightsOff: "early" }; // a stays "late"
}

/** → base 88 (90 recipe + travel style split). */
function shape88(a: Questionnaire, b: Questionnaire): void {
  shape90(a, b);
  b.travel = { ...b.travel, style: "spontaneous" }; // a stays "planned"
}

/** → base 85 (90 recipe + sharing/spending gaps). */
function shape85(a: Questionnaire, b: Questionnaire): void {
  shape90(a, b);
  a.sharing = { ...a.sharing, food: "no" };
  b.sharing = { ...b.sharing, food: "yes" };
  b.spending = { ...b.spending, monthly: 15500 };
}

/** → base 60 (cleanliness/noise/temperature/study craters + spending gap). */
function shape60(a: Questionnaire, b: Questionnaire): void {
  a.cleanliness = { room: 5, desk: 5, laundry: 5 };
  b.cleanliness = { room: 1, desk: 1, laundry: 1 };
  a.noise = { tolerance: 1, gaming: "always", reelsMusic: "always" };
  b.noise = { tolerance: 1, gaming: "always", reelsMusic: "always" };
  a.temperature = { fanSummer: 0, fanWinter: 0 };
  b.temperature = { fanSummer: 5, fanWinter: 5 };
  a.study = { seriousness: 5, environment: "silent", mode: "solo" };
  b.study = { seriousness: 1, environment: "music", mode: "group" };
  b.spending = { ...b.spending, monthly: 22000 };
}

/** → base 40 (60 recipe + social/sharing/travel/bathroom gaps). */
function shape40(a: Questionnaire, b: Questionnaire): void {
  shape60(a, b);
  a.social = { introExtro: 0, guests: "never", calls: "never" };
  b.social = { introExtro: 100, guests: "always", calls: "always" };
  a.sharing = { food: "no", clothes: "no", cosmetics: "no" };
  b.sharing = { food: "yes", clothes: "yes", cosmetics: "yes" };
  b.travel = { ...b.travel, style: "spontaneous" };
  b.bathroom = { ...b.bathroom, durationMin: 28 };
}

/** Extreme lifestyle opposites that trigger NO dealbreaker (all stances fine). */
function oppositeA(uid = "opp-a"): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.sleep = { sleepTime: 0, wakeTime: 0, naps: "never" };
  q.cleanliness = { room: 5, desk: 5, laundry: 5 };
  q.noise = { tolerance: 1, gaming: "always", reelsMusic: "always" };
  q.study = { seriousness: 5, environment: "silent", mode: "solo" };
  q.lighting = { lightsOff: "early", brightness: "dim" };
  q.temperature = { fanSummer: 0, fanWinter: 0 };
  q.bathroom = { timing: "morning", durationMin: 5, hygieneWeight: 5 };
  q.social = { introExtro: 0, guests: "never", calls: "never" };
  q.spending = { monthly: 2000, common: 1, outings: 1 };
  q.outingPersona = ["nature"];
  q.travel = { maxKm: 1, style: "planned" };
  q.sharing = { food: "no", clothes: "no", cosmetics: "no" };
  return q;
}
function oppositeB(uid = "opp-b"): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.sleep = { sleepTime: 720, wakeTime: 720, naps: "always" };
  q.cleanliness = { room: 1, desk: 1, laundry: 1 };
  q.noise = { tolerance: 1, gaming: "always", reelsMusic: "always" };
  q.study = { seriousness: 1, environment: "music", mode: "group" };
  q.lighting = { lightsOff: "late", brightness: "bright" };
  q.temperature = { fanSummer: 5, fanWinter: 5 };
  q.bathroom = { timing: "morning", durationMin: 60, hygieneWeight: 1 };
  q.social = { introExtro: 100, guests: "always", calls: "always" };
  q.spending = { monthly: 50000, common: 5, outings: 5 };
  q.outingPersona = ["nightlife"];
  q.travel = { maxKm: 100, style: "spontaneous" };
  q.sharing = { food: "yes", clothes: "yes", cosmetics: "yes" };
  return q;
}

function explain(label: string, a: Questionnaire, b: Questionnaire) {
  const r = scorePair(a, b);
  const cats = (Object.keys(r.categories) as Category[])
    .map((c) => `${c}=${r.categories[c]}`)
    .join("  ");
  const flags = r.dealbreakerFlags
    .map((f) => `${f.label} (${f.severity})`)
    .join(", ");
  console.log(`\n──────── ${label} → ${r.overall}%  (hardDealbreaker=${r.dealbreaker})`);
  console.log(`  flags: ${flags || "—"}`);
  console.log(`  categories: ${cats}`);
  console.log(`  ✓ why you match : ${r.reasons.join(" | ") || "—"}`);
  console.log(`  ? worth discussing: ${r.worthDiscussing.join(" | ") || "—"}`);
  console.log(`  ~ might be a prob: ${r.annoyances.join(" | ") || "—"}`);
  console.log(`  ✗ potential clash: ${r.conflicts.join(" | ") || "—"}`);
  return r;
}

/* ======================================================================== */
/* §6 — penalty matrix: 8 cases, each in BOTH orderings                     */
/* ======================================================================== */

describe("§6 penalty matrix (symmetric, all 8 cases in both orderings)", () => {
  type Expected = {
    penalty: number;
    severity: "hard" | "medium" | "mild" | null;
  };
  const CASES: [Stance, Stance, Expected][] = [
    ["willDo", "dealbreaker", { penalty: 35, severity: "hard" }],
    ["willDo", "annoying", { penalty: 17, severity: "medium" }],
    ["fine", "annoying", { penalty: 3, severity: "mild" }],
    ["fine", "dealbreaker", { penalty: 0, severity: null }],
    ["willDo", "willDo", { penalty: 0, severity: null }],
    ["fine", "fine", { penalty: 0, severity: null }],
    ["annoying", "annoying", { penalty: 0, severity: null }],
    ["dealbreaker", "dealbreaker", { penalty: 0, severity: null }],
  ];

  const withStance = (uid: string, s: Stance) => {
    const q = baseFixture(uid);
    q.dealbreakers.substances = s;
    return q;
  };

  for (const [sa, sb, exp] of CASES) {
    for (const [x, y, tag] of [
      [sa, sb, "(A,B)"],
      [sb, sa, "(B,A)"],
    ] as const) {
      it(`${x} × ${y} ${tag} → −${exp.penalty}${exp.severity ? ` ${exp.severity}` : ""}`, () => {
        const a = withStance("mx-a", x);
        const b = withStance("mx-b", y);

        // Unit level: the matrix evaluator itself.
        const conflicts = dealbreakerConflicts(a, b);
        if (exp.severity === null) {
          expect(conflicts).toHaveLength(0);
        } else {
          expect(conflicts).toHaveLength(1);
          expect(conflicts[0]).toMatchObject({
            category: "substances",
            penalty: exp.penalty,
            severity: exp.severity,
          });
        }

        // Score level: identical-lifestyle pair scores 100 free, so the
        // overall drop equals the cell's penalty exactly.
        const r = scorePair(a, b);
        expect(r.overall).toBe(100 - exp.penalty);

        // Flags carry hard+medium only — mild never flags (§3.4d).
        if (exp.severity === "hard" || exp.severity === "medium") {
          expect(r.dealbreakerFlags).toEqual([
            {
              category: "substances",
              label: "Intoxicating substances",
              severity: exp.severity,
            },
          ]);
        } else {
          expect(r.dealbreakerFlags).toHaveLength(0);
        }
        expect(r.dealbreaker).toBe(exp.severity === "hard");
      });
    }
  }

  it("mild (−3) appears in NO UI surface — no flags, no insight line (§3.4c)", () => {
    const a = withStance("mild-a", "fine");
    const b = withStance("mild-b", "annoying");
    const r = scorePair(a, b);
    expect(r.overall).toBe(97);
    expect(r.dealbreakerFlags).toHaveLength(0);
    const allText = [
      ...r.reasons,
      ...r.worthDiscussing,
      ...r.annoyances,
      ...r.conflicts,
    ].join(" ");
    expect(allText).not.toMatch(/substance/i);
  });

  it("doer flips with ordering but penalty/severity stay identical", () => {
    const a = withStance("d-a", "willDo");
    const b = withStance("d-b", "dealbreaker");
    expect(dealbreakerConflicts(a, b)[0].doer).toBe("a");
    expect(dealbreakerConflicts(b, a)[0].doer).toBe("b");
  });
});

/* ======================================================================== */
/* §6 — composite scenarios (exact bases asserted separately)               */
/* ======================================================================== */

describe("§6 composite scenarios", () => {
  /** Asserts the conflict-free base first so failures are self-explanatory. */
  function assertBase(
    shape: (a: Questionnaire, b: Questionnaire) => void,
    expected: number,
  ): [Questionnaire, Questionnaire] {
    const [a, b] = pair(shape);
    expect(scorePair(a, b).overall).toBe(expected);
    return [a, b];
  }

  it("high base 88 + one HARD → 53, red flag", () => {
    const [a, b] = assertBase(shape88, 88);
    a.dealbreakers.substances = "dealbreaker";
    b.dealbreakers.substances = "willDo";
    const r = scorePair(a, b);
    expect(r.overall).toBe(53);
    expect(r.dealbreaker).toBe(true);
    expect(r.dealbreakerFlags).toEqual([
      { category: "substances", label: "Intoxicating substances", severity: "hard" },
    ]);
  });

  it("medium base 60 + one MEDIUM (−17) → 43, orange flag", () => {
    const [a, b] = assertBase(shape60, 60);
    a.dealbreakers.loudMusic = "annoying";
    b.dealbreakers.loudMusic = "willDo";
    const r = scorePair(a, b);
    expect(r.overall).toBe(43);
    expect(r.dealbreaker).toBe(false);
    expect(r.dealbreakerFlags).toEqual([
      { category: "loudMusic", label: "Loud music", severity: "medium" },
    ]);
  });

  it("high base 90 + three MILD (−3 each) → 81, NO flags", () => {
    const [a, b] = assertBase(shape90, 90);
    a.dealbreakers.loudMusic = "annoying";
    a.dealbreakers.nonveg = "annoying";
    a.dealbreakers.frequentGuests = "annoying"; // b stays "fine" on all three
    const r = scorePair(a, b);
    expect(r.overall).toBe(81);
    expect(r.dealbreaker).toBe(false);
    expect(r.dealbreakerFlags).toHaveLength(0);
    // The milds leave no trace in any insight text (category-band lines about
    // temperature/lighting are fine — they're base clashes, not dealbreakers).
    const allText = [
      ...r.reasons,
      ...r.worthDiscussing,
      ...r.annoyances,
      ...r.conflicts,
    ].join(" ");
    expect(allText).not.toMatch(/find it annoying|non-veg|friends over/i);
  });

  it("low base 40 + one HARD → 35 (floored), red flag", () => {
    const [a, b] = assertBase(shape40, 40);
    a.dealbreakers.substances = "dealbreaker";
    b.dealbreakers.substances = "willDo";
    const r = scorePair(a, b);
    expect(r.overall).toBe(35);
    expect(r.dealbreaker).toBe(true);
    expect(r.dealbreakerFlags).toHaveLength(1);
  });

  it("high base 85 + one HARD + two MEDIUM → 85−35−34=16 → floored 35, red flag dominates", () => {
    const [a, b] = assertBase(shape85, 85);
    a.dealbreakers.substances = "dealbreaker";
    b.dealbreakers.substances = "willDo";
    a.dealbreakers.loudMusic = "annoying";
    b.dealbreakers.loudMusic = "willDo";
    a.dealbreakers.frequentGuests = "annoying";
    b.dealbreakers.frequentGuests = "willDo";
    const r = scorePair(a, b);
    expect(r.overall).toBe(35);
    expect(r.dealbreaker).toBe(true);
    expect(r.dealbreakerFlags.filter((f) => f.severity === "hard")).toHaveLength(1);
    expect(r.dealbreakerFlags.filter((f) => f.severity === "medium")).toHaveLength(2);
  });

  it("penalties stack additively with no cap before the floor: 90 − 35 − 17 − 3 = 35 (§3.4b)", () => {
    const [a, b] = assertBase(shape90, 90);
    a.dealbreakers.substances = "dealbreaker";
    b.dealbreakers.substances = "willDo"; // −35
    a.dealbreakers.loudMusic = "annoying";
    b.dealbreakers.loudMusic = "willDo"; // −17
    a.dealbreakers.nonveg = "annoying"; // b fine → −3
    const r = scorePair(a, b);
    expect(r.overall).toBe(35);
  });
});

/* ======================================================================== */
/* §6 — migration                                                           */
/* ======================================================================== */

describe("§6 migration (old 3-option answers → v3)", () => {
  function legacyDoc(uid: string): Questionnaire {
    const q = baseFixture(uid) as unknown as Record<string, unknown>;
    q.dealbreakers = {
      substances: "okay",
      nonveg: "okay",
      loudMusic: "annoying",
      lateSleeping: "dealbreaker",
      messyRoom: "okay",
      frequentGuests: "okay",
    };
    q.behavior = { substances: "regularly", nonveg: null }; // removed v2 field
    delete q.dealbreakersVersion; // legacy docs predate the version stamp
    return q as unknown as Questionnaire;
  }

  it('maps okay→Fine, keeps annoying/dealbreaker, NEVER auto-assigns "Will do"', () => {
    const m = migrateQuestionnaire(legacyDoc("legacy"));
    expect(m.dealbreakers).toEqual({
      substances: "fine",
      nonveg: "fine",
      loudMusic: "annoying",
      lateSleeping: "dealbreaker",
      messyRoom: "fine",
      frequentGuests: "fine",
    });
    expect(Object.values(m.dealbreakers)).not.toContain("willDo");
    expect((m as { behavior?: unknown }).behavior).toBeUndefined();
    expect(m.dealbreakersVersion).toBeUndefined(); // only the modal stamps it
  });

  it("a migrated legacy user scores cleanly: validates, no false flags", () => {
    const m = migrateQuestionnaire(legacyDoc("legacy"));
    const partner = baseFixture("partner"); // all fine, does nothing
    const r = scorePair(m, partner);
    // Their mapped loudMusic "annoying" × partner "fine" is a silent −3 mild
    // (correct per the matrix); nothing hard/medium can fire — no "willDo".
    expect(r.overall).toBe(97);
    expect(r.dealbreakerFlags).toHaveLength(0);
    expect(r.dealbreaker).toBe(false);
  });

  it("migrateQuestionnaire is a no-op on already-v3 answers", () => {
    const q = baseFixture("v3");
    q.dealbreakers.substances = "willDo";
    q.dealbreakers.messyRoom = "dealbreaker";
    const m = migrateQuestionnaire(clone(q));
    expect(m.dealbreakers).toEqual(q.dealbreakers);
    expect(m.dealbreakersVersion).toBe(q.dealbreakersVersion);
  });
});

/* ======================================================================== */
/* §6 — invariants                                                          */
/* ======================================================================== */

describe("§6 invariants", () => {
  it("self-match is exactly 100 with no flags and no insights", () => {
    for (const arch of ARCHETYPES) {
      const r = scorePair(arch.questionnaire, clone(arch.questionnaire));
      expect(r.overall).toBe(100);
      expect(r.dealbreakerFlags).toHaveLength(0);
      expect(r.conflicts).toHaveLength(0);
    }
  });

  it("rankCandidates is deterministic and sorted high → low", () => {
    const me = chillMiddleGround("me");
    const pool = randomTestUsers(12, 42).map((u) => u.questionnaire);
    const run1 = rankCandidates(me, pool).map((r) => `${r.uid}:${r.overall}`);
    const run2 = rankCandidates(clone(me), pool.map(clone)).map(
      (r) => `${r.uid}:${r.overall}`,
    );
    expect(run1).toEqual(run2);
    const overalls = rankCandidates(me, pool).map((r) => r.overall);
    expect([...overalls].sort((x, y) => y - x)).toEqual(overalls);
  });

  it("full-match symmetry: score AND flags identical in both orderings", () => {
    const pairs: [Questionnaire, Questionnaire][] = [
      [earlyBirdNeatFreak("a"), nightOwlGamer("b")],
      [studiousIntrovert("a"), socialButterfly("b")],
      [chillMiddleGround("a"), substanceLateNighter("b")],
      [oppositeA(), oppositeB()],
    ];
    for (const [a, b] of pairs) {
      const ab = scorePair(a, b);
      const ba = scorePair(b, a);
      expect(ab.overall).toBe(ba.overall);
      const key = (f: { category: string; severity: string }) =>
        `${f.category}:${f.severity}`;
      expect(ab.dealbreakerFlags.map(key).sort()).toEqual(
        ba.dealbreakerFlags.map(key).sort(),
      );
    }
  });

  it("importance weighting affects ONLY the 12-category base — penalties stay absolute (§3.4e)", () => {
    const build = (importance: 0 | 2) => {
      const [a, b] = pair(shape90);
      a.importance = { ...a.importance, temperature: importance };
      const free = scorePair(a, b).overall;
      a.dealbreakers.substances = "dealbreaker";
      b.dealbreakers.substances = "willDo";
      return { free, withHard: scorePair(a, b).overall };
    };
    const plain = build(0);
    const flagged = build(2);
    // Importance moves the base (temperature scores 0 here, so boosting it
    // drags the base down)…
    expect(flagged.free).toBeLessThan(plain.free);
    // …but the dealbreaker penalty stays exactly −35 in both worlds.
    expect(plain.free - plain.withHard).toBe(35);
    expect(flagged.free - flagged.withHard).toBe(35);
  });

  it("dealbreaker alignment never adds points: every diagonal equals the free pair (§3.4a)", () => {
    const free = scorePair(...pair()).overall;
    for (const s of ["willDo", "fine", "annoying", "dealbreaker"] as Stance[]) {
      const [a, b] = pair();
      a.dealbreakers.messyRoom = s;
      b.dealbreakers.messyRoom = s;
      expect(scorePair(a, b).overall).toBe(free);
    }
  });
});

/* ======================================================================== */
/* Human-obvious truths (carried over, v3 expectations)                     */
/* ======================================================================== */

describe("Human-obvious truths (v3)", () => {
  it("a near-clone matches ≥ 99%", () => {
    const s = scorePair(earlyBirdNeatFreak("eb"), earlyBirdClone("eb2")).overall;
    console.log(`[T2] Early Bird vs near-clone = ${s}%`);
    expect(s).toBeGreaterThanOrEqual(99);
  });

  it("Early Bird vs Night Owl floors at 35 with 2 hard + 1 medium flags", () => {
    const r = scorePair(earlyBirdNeatFreak("eb"), nightOwlGamer("no"));
    console.log(
      `[T3] Early Bird vs Night Owl = ${r.overall}% flags=${r.dealbreakerFlags
        .map((f) => `${f.category}:${f.severity}`)
        .join(",")}`,
    );
    expect(r.overall).toBe(35);
    expect(r.dealbreaker).toBe(true);
    const hard = r.dealbreakerFlags.filter((f) => f.severity === "hard");
    const medium = r.dealbreakerFlags.filter((f) => f.severity === "medium");
    expect(hard.map((f) => f.category).sort()).toEqual(["loudMusic", "messyRoom"]);
    expect(medium.map((f) => f.category)).toEqual(["lateSleeping"]);
  });

  it("ordering: a dealbreaker pair (floored 35) ranks above a pure lifestyle opposite", () => {
    const db = scorePair(earlyBirdNeatFreak("e"), nightOwlGamer("n"));
    const opp = scorePair(oppositeA(), oppositeB());
    expect(opp.dealbreaker).toBe(false);
    console.log(
      `[T4] dealbreaker pair = ${db.overall}%  pure lifestyle opposite = ${opp.overall}% (natural base, no floor)`,
    );
    expect(opp.overall).toBeLessThan(35); // natural base — no artificial floor
    expect(opp.overall).toBeGreaterThan(0);
    expect(db.overall).toBeGreaterThan(opp.overall);

    // Among similar lifestyles, the dealbreaker pair still ranks lower.
    const g1 = chillMiddleGround("g1");
    const g2 = chillMiddleGround("g2");
    const free = scorePair(g1, g2).overall;
    const g1f = clone(g1);
    g1f.dealbreakers.substances = "dealbreaker";
    const g2d = clone(g2);
    g2d.dealbreakers.substances = "willDo";
    expect(scorePair(g1f, g2d).overall).toBe(free - 35);
  });

  it("messiness is no longer double-counted: the cleanliness slider and the messyRoom stance are independent", () => {
    // Identical-lifestyle pair; b is messy on the slider but neither side
    // flags messyRoom → cleanliness category drops, NO dealbreaker fires.
    const [a, b] = pair((qa, qb) => {
      qa.cleanliness = { room: 5, desk: 3, laundry: 3 };
      qb.cleanliness = { room: 1, desk: 3, laundry: 3 };
    });
    const r = scorePair(a, b);
    expect(r.categories.cleanliness).toBeLessThan(70);
    expect(r.dealbreakerFlags).toHaveLength(0);

    // And the reverse: a messyRoom conflict fires purely off the stance,
    // even when both keep tidy sliders (cleanliness stays 100).
    const [c, d] = pair();
    c.dealbreakers.messyRoom = "dealbreaker";
    d.dealbreakers.messyRoom = "willDo";
    const r2 = scorePair(c, d);
    expect(r2.categories.cleanliness).toBe(100);
    expect(r2.dealbreakerFlags).toEqual([
      { category: "messyRoom", label: "Messy room", severity: "hard" },
    ]);
  });

  it("sleep category is not high when sleep times differ ~5 hours", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    a.sleep = { sleepTime: 22 * 60, wakeTime: 6 * 60, naps: "sometimes" };
    b.sleep = { sleepTime: 3 * 60, wakeTime: 11 * 60, naps: "sometimes" };
    const far = sleepScore(a, b);
    const near = clone(a);
    near.sleep = { sleepTime: 0, wakeTime: 8 * 60, naps: "sometimes" };
    expect(far).toBeLessThan(90);
    expect(far).toBeLessThan(sleepScore(a, near));
  });

  it("cleanliness reflects the tidiness gap", () => {
    const a = defaultQuestionnaire("a");
    a.cleanliness = { room: 5, desk: 5, laundry: 5 };
    const b = defaultQuestionnaire("b");
    b.cleanliness = { room: 1, desk: 1, laundry: 1 };
    const near = clone(a);
    near.cleanliness = { room: 4, desk: 4, laundry: 4 };
    expect(cleanlinessScore(a, b)).toBeLessThan(40);
    expect(cleanlinessScore(a, b)).toBeLessThan(cleanlinessScore(a, near));
  });

  it("flagging cleanliness importance makes a clean↔messy mismatch hurt more", () => {
    const clean = defaultQuestionnaire("clean");
    clean.cleanliness = { room: 5, desk: 5, laundry: 5 };
    const messy = defaultQuestionnaire("messy");
    messy.cleanliness = { room: 1, desk: 1, laundry: 1 };
    const flagged = clone(clean);
    flagged.importance.cleanliness = 2;
    expect(scorePair(flagged, messy).overall).toBeLessThan(
      scorePair(clean, messy).overall,
    );
  });
});

/* ======================================================================== */
/* Insights honesty (carried over from v2 Fix 2)                            */
/* ======================================================================== */

describe("Insight honesty (no false reassurance)", () => {
  const allMid = Object.fromEntries(
    CATEGORIES.map((c) => [c, 60]),
  ) as Record<Category, number>;
  const a = chillMiddleGround("a");
  const b = chillMiddleGround("b");

  it("a genuinely balanced match keeps the reassuring fallback", () => {
    const ins = buildInsights(a, b, allMid, [], 70);
    expect(ins.reasons.join(" ")).toContain("balanced");
  });

  it("overall < 60 suppresses the fallback and shows an honest friction line", () => {
    const ins = buildInsights(a, b, allMid, [], 50);
    expect(ins.reasons.join(" ")).not.toContain("balanced");
    expect(ins.worthDiscussing.join(" ")).toMatch(/friction/i);
  });

  it("a hard dealbreaker suppresses the fallback even at a decent overall", () => {
    const ins = buildInsights(
      a,
      b,
      allMid,
      [{ category: "messyRoom", penalty: 35, severity: "hard", doer: "b" }],
      70,
    );
    expect(ins.reasons.join(" ")).not.toContain("balanced");
  });

  it("HARD conflicts land in 'Potential clashes' with directional copy; MEDIUM in 'Worth discussing'", () => {
    const ins = buildInsights(
      a,
      b,
      allMid,
      [
        { category: "substances", penalty: 35, severity: "hard", doer: "b" },
        { category: "loudMusic", penalty: 17, severity: "medium", doer: "a" },
        { category: "nonveg", penalty: 3, severity: "mild", doer: "a" },
      ],
      45,
    );
    expect(ins.conflicts[0]).toBe(
      "Intoxicating substances — they'll smoke or drink in the room, and you can't live with that.",
    );
    expect(ins.worthDiscussing).toContain(
      "Loud music — you play audio out loud, and they'd find it annoying.",
    );
    // Mild never surfaces anywhere (§3.4c).
    const allText = [
      ...ins.reasons,
      ...ins.worthDiscussing,
      ...ins.annoyances,
      ...ins.conflicts,
    ].join(" ");
    expect(allText).not.toMatch(/non-veg/i);
  });
});

/* ======================================================================== */
/* Input validation (carried over from v2 Fix 6)                            */
/* ======================================================================== */

describe("Input validation on scorePair", () => {
  it("a missing category throws IncompleteProfileError listing the field", () => {
    const good = chillMiddleGround("g");
    const bad = clone(good);
    // @ts-expect-error simulate an unfinished questionnaire (missing sub-object)
    delete bad.sleep;
    expect(() => scorePair(bad, good)).toThrow(IncompleteProfileError);
    try {
      scorePair(bad, good);
    } catch (e) {
      expect(
        (e as IncompleteProfileError).missingFields.some((f) =>
          f.startsWith("sleep"),
        ),
      ).toBe(true);
    }
  });

  it("a missing leaf field throws IncompleteProfileError (no NaN leaks through)", () => {
    const good = chillMiddleGround("g");
    const bad = clone(good);
    // @ts-expect-error corrupt a numeric leaf
    bad.sleep.sleepTime = undefined;
    expect(() => scorePair(bad, good)).toThrow(IncompleteProfileError);
  });

  it("a legacy 3-option stance fails validation unless migrated first", () => {
    const legacy = baseFixture("l");
    (legacy.dealbreakers as Record<string, string>).substances = "okay";
    expect(() => scorePair(legacy, baseFixture("ok"))).toThrow(
      IncompleteProfileError,
    );
    expect(() =>
      scorePair(migrateQuestionnaire(legacy), baseFixture("ok")),
    ).not.toThrow();
  });
});

describe("Algorithm version", () => {
  it("is bumped to 3", () => {
    expect(ALGORITHM_VERSION).toBe(3);
  });
});

/* ======================================================================== */
/* Edge cases                                                               */
/* ======================================================================== */

describe("Edge cases (v3)", () => {
  it("identical answers, different importance → score barely moves", () => {
    const a = chillMiddleGround("a");
    const b = clone(a);
    b.uid = "b";
    const base = scorePair(a, b).overall;
    const flagged = clone(a);
    flagged.importance = { ...flagged.importance, sleep: 2, cleanliness: 2, social: 2 };
    expect(Math.abs(base - scorePair(flagged, b).overall)).toBeLessThanOrEqual(5);
  });

  it("flags EVERYTHING vs does EVERYTHING → 6 hard conflicts, floored at 35", () => {
    const paranoid = chillMiddleGround("p");
    paranoid.dealbreakers = {
      substances: "dealbreaker",
      nonveg: "dealbreaker",
      loudMusic: "dealbreaker",
      lateSleeping: "dealbreaker",
      messyRoom: "dealbreaker",
      frequentGuests: "dealbreaker",
    };
    const r = scorePair(paranoid, substanceLateNighter("sl"));
    console.log(
      `[E4] everything-dealbreaker vs all-willDo = ${r.overall}% flags=${r.dealbreakerFlags.length}`,
    );
    expect(r.overall).toBe(35);
    expect(r.dealbreaker).toBe(true);
    expect(r.dealbreakerFlags).toHaveLength(6);
    expect(r.dealbreakerFlags.every((f) => f.severity === "hard")).toBe(true);
  });

  it("a default profile vs an everything-flagger raises NO conflict (fine × dealbreaker = 0)", () => {
    const paranoid = chillMiddleGround("p");
    paranoid.dealbreakers = {
      substances: "dealbreaker",
      nonveg: "dealbreaker",
      loudMusic: "dealbreaker",
      lateSleeping: "dealbreaker",
      messyRoom: "dealbreaker",
      frequentGuests: "dealbreaker",
    };
    const plain = baseFixture("plain"); // all "fine"
    const r = scorePair(paranoid, plain);
    expect(r.dealbreaker).toBe(false);
    expect(r.dealbreakerFlags).toHaveLength(0);
  });

  it("a user who flags NOTHING important scores normally (finite, no NaN)", () => {
    const r = scorePair(chillMiddleGround("a"), studiousIntrovert("s"));
    expect(Number.isFinite(r.overall)).toBe(true);
    expect(r.overall).toBeGreaterThan(0);
  });
});

/* ======================================================================== */
/* Explain pass (the 5 original audit pairs, v3 outputs)                    */
/* ======================================================================== */

describe("Explain pass (v3)", () => {
  it("prints the 5 original audit pairs with v3 scoring + insights", () => {
    explain("Early Bird ↔ near-clone", earlyBirdNeatFreak("eb"), earlyBirdClone("eb2"));
    explain("Early Bird ↔ Night Owl Gamer", earlyBirdNeatFreak("eb"), nightOwlGamer("no"));
    explain("Chill Middle-Ground ↔ Studious Introvert", chillMiddleGround("c"), studiousIntrovert("s"));
    explain("Social Butterfly ↔ Studious Introvert", socialButterfly("sb"), studiousIntrovert("si"));
    explain("Chill Middle-Ground ↔ Substance/Late Nighter", chillMiddleGround("c"), substanceLateNighter("sl"));
    expect(true).toBe(true);
  });
});
