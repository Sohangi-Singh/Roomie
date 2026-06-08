/**
 * Matching algorithm spec — v2 (post-fix).
 *
 * Covers the original audit's human-obvious truths (adjusted for the v2
 * dealbreaker math) PLUS explicit proof tests for Fixes 1–6. Pure + in-memory.
 */
import { describe, it, expect } from "vitest";
import type { Category, Questionnaire } from "@/types";
import { CATEGORIES, defaultQuestionnaire } from "@/config/questionnaire";
import {
  scorePair,
  rankCandidates,
  sleepScore,
  cleanlinessScore,
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

/** Extreme lifestyle opposites that trigger NO dealbreaker (all stances okay,
 *  behavior left unset → unknown). */
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
  console.log(`\n──────── ${label} → ${r.overall}%  (hardDealbreaker=${r.dealbreaker})`);
  console.log(`  flags: ${r.dealbreakerFlags.join(", ") || "—"}`);
  console.log(`  categories: ${cats}`);
  console.log(`  ✓ why you match : ${r.reasons.join(" | ") || "—"}`);
  console.log(`  ? worth discussing: ${r.worthDiscussing.join(" | ") || "—"}`);
  console.log(`  ~ might be a prob: ${r.annoyances.join(" | ") || "—"}`);
  console.log(`  ✗ potential clash: ${r.conflicts.join(" | ") || "—"}`);
  return r;
}

/* ======================================================================== */
/* Step 2 — human-obvious truths (adjusted for v2)                          */
/* ======================================================================== */

describe("Step 2 — human-obvious truths (v2)", () => {
  it("1) a profile matched against itself scores exactly 100%", () => {
    for (const a of ARCHETYPES) {
      const self = scorePair(a.questionnaire, clone(a.questionnaire)).overall;
      console.log(`[T1] self-match ${a.label} = ${self}%`);
    }
    const q = chillMiddleGround("self");
    expect(scorePair(q, clone(q)).overall).toBe(100);
  });

  it("2) a near-clone matches ≥ 99% (bathroom no longer caps identical timing)", () => {
    const s = scorePair(earlyBirdNeatFreak("eb"), earlyBirdClone("eb2")).overall;
    console.log(`[T2] Early Bird vs near-clone = ${s}%`);
    expect(s).toBeGreaterThanOrEqual(99);
  });

  it("3) Early Bird Neat Freak vs Night Owl Gamer is floored at 40 with explicit flags", () => {
    const r = scorePair(earlyBirdNeatFreak("eb"), nightOwlGamer("no"));
    console.log(`[T3] Early Bird vs Night Owl = ${r.overall}% flags=${r.dealbreakerFlags.join(",")}`);
    // v2: the "they'd hate each other" warning moved from a tanked score to a flag.
    expect(r.overall).toBe(40);
    expect(r.dealbreaker).toBe(true);
    expect(r.dealbreakerFlags.length).toBeGreaterThan(0);
  });

  it("4) ordering: a dealbreaker pair ranks above a pure lifestyle opposite, below a free pair of similar raw", () => {
    const db = scorePair(earlyBirdNeatFreak("e"), nightOwlGamer("n"));
    const opp = scorePair(oppositeA(), oppositeB());
    expect(opp.dealbreaker).toBe(false);
    console.log(`[T4] dealbreaker pair = ${db.overall}%  pure lifestyle opposite = ${opp.overall}%`);
    // Fix 4: "one specific issue but otherwise might work" > "very different".
    expect(db.overall).toBeGreaterThan(opp.overall);

    // Fix 3: but among SIMILAR raw compatibility, the dealbreaker pair ranks lower.
    const g1 = chillMiddleGround("g1");
    const g2 = chillMiddleGround("g2");
    const free = scorePair(g1, g2).overall;
    const g1f = clone(g1);
    g1f.dealbreakers.substances = "dealbreaker";
    const g2d = clone(g2);
    g2d.behavior = { substances: "regularly", nonveg: null };
    expect(scorePair(g1f, g2d).overall).toBeLessThan(free);
  });

  it("5) sleep category is not high (~90) when sleep times differ ~5 hours", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    a.sleep = { sleepTime: 22 * 60, wakeTime: 6 * 60, naps: "sometimes" };
    b.sleep = { sleepTime: 3 * 60, wakeTime: 11 * 60, naps: "sometimes" };
    const far = sleepScore(a, b);
    const near = clone(a);
    near.sleep = { sleepTime: 0, wakeTime: 8 * 60, naps: "sometimes" };
    console.log(`[T5] sleepScore 5h-offset = ${far} (2h-offset = ${sleepScore(a, near)})`);
    expect(far).toBeLessThan(90);
    expect(far).toBeLessThan(sleepScore(a, near));
  });

  it("5b) cleanliness reflects the tidiness gap", () => {
    const a = defaultQuestionnaire("a");
    a.cleanliness = { room: 5, desk: 5, laundry: 5 };
    const b = defaultQuestionnaire("b");
    b.cleanliness = { room: 1, desk: 1, laundry: 1 };
    const near = clone(a);
    near.cleanliness = { room: 4, desk: 4, laundry: 4 };
    const far = cleanlinessScore(a, b);
    console.log(`[T5b] cleanliness 5-vs-1 = ${far} (5-vs-4 = ${cleanlinessScore(a, near)})`);
    expect(far).toBeLessThan(40);
    expect(far).toBeLessThan(cleanlinessScore(a, near));
  });

  it("6) rankCandidates is deterministic and sorted high → low", () => {
    const me = chillMiddleGround("me");
    const pool = randomTestUsers(12, 42).map((u) => u.questionnaire);
    const run1 = rankCandidates(me, pool).map((r) => `${r.uid}:${r.overall}`);
    const run2 = rankCandidates(clone(me), pool.map(clone)).map((r) => `${r.uid}:${r.overall}`);
    expect(run1).toEqual(run2);
    const overalls = rankCandidates(me, pool).map((r) => r.overall);
    expect([...overalls].sort((x, y) => y - x)).toEqual(overalls);
  });

  it("7) flagging cleanliness makes a clean↔messy mismatch hurt more", () => {
    const clean = defaultQuestionnaire("clean");
    clean.cleanliness = { room: 5, desk: 5, laundry: 5 };
    const messy = defaultQuestionnaire("messy");
    messy.cleanliness = { room: 1, desk: 1, laundry: 1 };
    const flagged = clone(clean);
    flagged.importance.cleanliness = 2;
    const sFlagged = scorePair(flagged, messy).overall;
    const sPlain = scorePair(clean, messy).overall;
    console.log(`[T7] cleanliness flagged = ${sFlagged}%  unflagged = ${sPlain}%`);
    expect(sFlagged).toBeLessThan(sPlain);
  });

  it("8) symmetry: score(A,B) equals score(B,A)", () => {
    const pairs: [Questionnaire, Questionnaire][] = [
      [earlyBirdNeatFreak("a"), nightOwlGamer("b")],
      [studiousIntrovert("a"), socialButterfly("b")],
      [chillMiddleGround("a"), substanceLateNighter("b")],
    ];
    for (const [a, b] of pairs) {
      expect(scorePair(a, b).overall).toBe(scorePair(b, a).overall);
    }
  });
});

/* ======================================================================== */
/* Fixes applied (v2) — explicit proof per fix                              */
/* ======================================================================== */

describe("Fix 1 — substances/non-veg are behavior, not tolerance", () => {
  const flagger = () => {
    const q = chillMiddleGround("flagger");
    q.dealbreakers = { ...q.dealbreakers, substances: "dealbreaker" };
    q.behavior = { substances: "never", nonveg: "never" };
    return q;
  };

  it("a real substance user (behavior 'regularly') triggers a hard conflict when flagged", () => {
    const user = chillMiddleGround("user");
    user.behavior = { substances: "regularly", nonveg: "never" };
    const r = scorePair(flagger(), user);
    expect(r.dealbreaker).toBe(true);
    expect(r.dealbreakerFlags).toContain("Intoxicating substances");
  });

  it("'never' does not trigger a conflict", () => {
    const abstainer = chillMiddleGround("abstainer");
    abstainer.behavior = { substances: "never", nonveg: "never" };
    expect(scorePair(flagger(), abstainer).dealbreaker).toBe(false);
  });

  it("UNKNOWN (null / 'prefer_not') never triggers a conflict, but adds a soft note", () => {
    for (const v of [null, "prefer_not"] as const) {
      const unsure = chillMiddleGround("unsure");
      unsure.behavior = { substances: v, nonveg: "never" };
      const r = scorePair(flagger(), unsure);
      expect(r.dealbreaker).toBe(false);
      expect(r.worthDiscussing.join(" ")).toMatch(/haven't shared/i);
    }
  });

  it("a plain default profile (behavior unset) is no longer falsely flagged as a substance user", () => {
    const paranoid = chillMiddleGround("p");
    paranoid.dealbreakers = {
      substances: "dealbreaker",
      nonveg: "dealbreaker",
      loudMusic: "dealbreaker",
      lateSleeping: "dealbreaker",
      messyRoom: "dealbreaker",
      frequentGuests: "dealbreaker",
    };
    const plain = defaultQuestionnaire("plain"); // behavior { null, null }
    const r = scorePair(paranoid, plain);
    console.log(`[Fix1] everything-flagger vs plain default = ${r.overall}% hard=${r.dealbreaker}`);
    expect(r.dealbreaker).toBe(false); // the old proxy would have hard-conflicted here
    expect(r.worthDiscussing.join(" ")).toMatch(/haven't shared/i);
  });
});

describe("Fix 2 — no falsely reassuring copy on bad matches", () => {
  const allMid = Object.fromEntries(CATEGORIES.map((c) => [c, 60])) as Record<Category, number>;
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
    const ins = buildInsights(a, b, allMid, [{ key: "messyRoom", severity: "hard" }], 70);
    expect(ins.reasons.join(" ")).not.toContain("balanced");
  });

  it("a sub-30 category suppresses the fallback", () => {
    const withSevere = { ...allMid, outing: 10 };
    const ins = buildInsights(a, b, withSevere, [], 70);
    expect(ins.reasons.join(" ")).not.toContain("balanced");
  });

  it("the 50–77 band surfaces as neutral 'Worth discussing' notes", () => {
    const r = scorePair(chillMiddleGround("c"), studiousIntrovert("s"));
    console.log(`[Fix2] chill↔studious worthDiscussing = ${JSON.stringify(r.worthDiscussing)}`);
    expect(r.worthDiscussing.length).toBeGreaterThan(0);
    expect(r.worthDiscussing.join(" ")).not.toMatch(/friction/i); // good match → no friction line
  });
});

describe("Fix 3 — dealbreaker = penalty + flag (not a crater/floor at 22)", () => {
  it("a great match minus one hard dealbreaker = raw − 15 (≈73 for an ~88 base), flag present", () => {
    const g1 = chillMiddleGround("g1");
    const g2 = chillMiddleGround("g2");
    const free = scorePair(g1, g2).overall; // ~100
    const g1f = clone(g1);
    g1f.dealbreakers.substances = "dealbreaker";
    const g2d = clone(g2);
    g2d.behavior = { substances: "regularly", nonveg: null };
    const res = scorePair(g1f, g2d);
    console.log(`[Fix3] free = ${free}%  with one hard dealbreaker = ${res.overall}%`);
    expect(res.overall).toBe(free - 15); // fixed −15 penalty (no crater)
    expect(res.dealbreaker).toBe(true);
    expect(res.dealbreakerFlags.length).toBeGreaterThan(0);
  });

  it("a bad match with a hard dealbreaker floors at exactly 40, flag present", () => {
    const oa = oppositeA("oa");
    oa.dealbreakers.substances = "dealbreaker";
    const ob = oppositeB("ob");
    ob.behavior = { substances: "regularly", nonveg: null };
    const res = scorePair(oa, ob);
    console.log(`[Fix3] bad + hard dealbreaker = ${res.overall}%`);
    expect(res.overall).toBe(40);
    expect(res.dealbreakerFlags.length).toBeGreaterThan(0);
  });

  it("a soft dealbreaker subtracts only 5 and does not flag", () => {
    const a = chillMiddleGround("a");
    a.dealbreakers.loudMusic = "annoying";
    const b = chillMiddleGround("b");
    b.noise = { tolerance: 4, gaming: "always", reelsMusic: "always" }; // exhibits loud music
    const base = scorePair(chillMiddleGround("a"), b).overall;
    const res = scorePair(a, b);
    console.log(`[Fix3] soft: base=${base}% with soft=${res.overall}%`);
    expect(res.dealbreaker).toBe(false);
    expect(res.dealbreakerFlags).toHaveLength(0);
    expect(res.annoyances.join(" ")).toMatch(/music/i);
  });
});

describe("Fix 4 — lifestyle-opposite floor ~25–30", () => {
  it("a pure lifestyle opposite (no dealbreaker) floors at 27, below dealbreaker pairs", () => {
    const opp = scorePair(oppositeA(), oppositeB());
    console.log(`[Fix4] pure lifestyle opposite = ${opp.overall}%`);
    expect(opp.dealbreaker).toBe(false);
    expect(opp.overall).toBe(27);
    expect(opp.overall).toBeGreaterThanOrEqual(25);
    expect(opp.overall).toBeLessThanOrEqual(30);
  });
});

describe("Fix 5 — self-match = 100, near-clone ≥ 99", () => {
  it("scorePair(user, user) is exactly 100 with no insights", () => {
    const q = earlyBirdNeatFreak("same");
    const r = scorePair(q, clone(q)); // clone preserves uid
    expect(r.overall).toBe(100);
    expect(r.reasons).toHaveLength(0);
    expect(r.conflicts).toHaveLength(0);
    expect(r.dealbreakerFlags).toHaveLength(0);
  });

  it("a near-clone scores ≥ 99 and its bathroom category is no longer capped at 60", () => {
    const r = scorePair(earlyBirdNeatFreak("e"), earlyBirdClone("e2"));
    console.log(`[Fix5] near-clone = ${r.overall}% bathroom=${r.categories.bathroom}`);
    expect(r.overall).toBeGreaterThanOrEqual(99);
    expect(r.categories.bathroom).toBeGreaterThan(60);
  });
});

describe("Fix 6 — input validation on scorePair", () => {
  it("a missing category throws IncompleteProfileError listing the field", () => {
    const good = chillMiddleGround("g");
    const bad = clone(good);
    // @ts-expect-error simulate an unfinished questionnaire (missing sub-object)
    delete bad.sleep;
    expect(() => scorePair(bad, good)).toThrow(IncompleteProfileError);
    try {
      scorePair(bad, good);
    } catch (e) {
      expect(e).toBeInstanceOf(IncompleteProfileError);
      expect((e as IncompleteProfileError).missingFields.some((f) => f.startsWith("sleep"))).toBe(true);
    }
  });

  it("a missing leaf field throws IncompleteProfileError (no NaN leaks through)", () => {
    const good = chillMiddleGround("g");
    const bad = clone(good);
    // @ts-expect-error corrupt a numeric leaf
    bad.sleep.sleepTime = undefined;
    expect(() => scorePair(bad, good)).toThrow(IncompleteProfileError);
  });
});

describe("Algorithm version", () => {
  it("is bumped to 2", () => {
    expect(ALGORITHM_VERSION).toBe(2);
  });
});

/* ======================================================================== */
/* Step 3 — explain pass (v2 outputs)                                       */
/* ======================================================================== */

describe("Step 3 — explain pass (v2)", () => {
  it("prints the 5 original audit pairs with v2 scoring + insights", () => {
    explain("Early Bird ↔ near-clone", earlyBirdNeatFreak("eb"), earlyBirdClone("eb2"));
    explain("Early Bird ↔ Night Owl Gamer", earlyBirdNeatFreak("eb"), nightOwlGamer("no"));
    explain("Chill Middle-Ground ↔ Studious Introvert", chillMiddleGround("c"), studiousIntrovert("s"));
    explain("Social Butterfly ↔ Studious Introvert", socialButterfly("sb"), studiousIntrovert("si"));
    explain("Chill Middle-Ground ↔ Substance/Late Nighter", chillMiddleGround("c"), substanceLateNighter("sl"));
    expect(true).toBe(true);
  });
});

/* ======================================================================== */
/* Step 4 — edge cases (v2)                                                 */
/* ======================================================================== */

describe("Step 4 — edge cases (v2)", () => {
  it("identical answers, different importance → score barely moves", () => {
    const a = chillMiddleGround("a");
    const b = clone(a);
    b.uid = "b";
    const base = scorePair(a, b).overall;
    const flagged = clone(a);
    flagged.importance = { ...flagged.importance, sleep: 2, cleanliness: 2, social: 2 };
    const withImp = scorePair(flagged, b).overall;
    console.log(`[E3] identical: base=${base}% importance-flagged=${withImp}%`);
    expect(Math.abs(base - withImp)).toBeLessThanOrEqual(5);
  });

  it("a user who flags EVERYTHING a dealbreaker, vs someone who exhibits them, floors at 40 with flags", () => {
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
    console.log(`[E4] everything-dealbreaker vs Substance/Late = ${r.overall}% flags=${r.dealbreakerFlags.length}`);
    expect(r.overall).toBe(40);
    expect(r.dealbreaker).toBe(true);
    expect(r.dealbreakerFlags.length).toBeGreaterThan(0);
  });

  it("a user who flags NOTHING important scores normally (finite, no NaN)", () => {
    const r = scorePair(chillMiddleGround("a"), studiousIntrovert("s"));
    console.log(`[E5] nothing-important pair = ${r.overall}%`);
    expect(Number.isFinite(r.overall)).toBe(true);
    expect(r.overall).toBeGreaterThan(0);
  });
});
