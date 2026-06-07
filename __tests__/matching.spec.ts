/**
 * Pre-launch matching audit (READ-ONLY of lib/matching).
 *
 * These specs assert HUMAN-OBVIOUS truths about the matching algorithm. Some
 * are EXPECTED TO FAIL by the current design — those failures are findings,
 * documented in MATCHING_AUDIT.md. Per the audit rules, the algorithm is NOT
 * modified to make them pass; the failing assertions ARE the signal.
 *
 * Everything here is pure + in-memory (no Firebase, no I/O).
 */
import { describe, it, expect } from "vitest";
import type { Category, Questionnaire } from "@/types";
import { defaultQuestionnaire } from "@/config/questionnaire";
import {
  scorePair,
  rankCandidates,
  sleepScore,
  cleanlinessScore,
} from "@/lib/matching";
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

/** Two extreme lifestyle opposites that trigger NO dealbreaker (all stances
 *  left "okay"), used to probe the "dealbreaker is always worst" claim. */
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
  return q; // all dealbreakers stay "okay" → no conflict possible
}
function oppositeB(uid = "opp-b"): Questionnaire {
  const q = defaultQuestionnaire(uid);
  q.sleep = { sleepTime: 720, wakeTime: 720, naps: "always" };
  q.cleanliness = { room: 1, desk: 1, laundry: 1 };
  q.noise = { tolerance: 1, gaming: "always", reelsMusic: "always" };
  q.study = { seriousness: 1, environment: "music", mode: "group" };
  q.lighting = { lightsOff: "late", brightness: "bright" };
  q.temperature = { fanSummer: 5, fanWinter: 5 };
  q.bathroom = { timing: "morning", durationMin: 60, hygieneWeight: 1 }; // SAME timing → bathroom low
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
  console.log(`  categories: ${cats}`);
  console.log(`  ✓ why you match : ${r.reasons.join(" | ") || "—"}`);
  console.log(`  ~ might be a prob: ${r.annoyances.join(" | ") || "—"}`);
  console.log(`  ✗ potential clash: ${r.conflicts.join(" | ") || "—"}`);
  return r;
}

/* ======================================================================== */
/* STEP 2 — human-obvious truths                                            */
/* ======================================================================== */

describe("Step 2 — human-obvious truths", () => {
  it("1) a profile matched against itself scores 100%  [EXPECTED FAIL — see audit]", () => {
    for (const a of ARCHETYPES) {
      const self = scorePair(a.questionnaire, clone(a.questionnaire)).overall;
      console.log(`[T1] self-match ${a.label} = ${self}%`);
    }
    const q = chillMiddleGround("self");
    // Human-obvious: you are 100% compatible with yourself.
    // FAILS: bathroom timing is intentionally reversed (you share your own
    // timing → 0 on that sub-score → bathroom caps ~60); empty persona sets
    // score 60 on outing. The algorithm is NOT changed — this is a finding.
    expect(scorePair(q, clone(q)).overall).toBe(100);
  });

  it("2) a near-clone matches > 90%", () => {
    const s = scorePair(earlyBirdNeatFreak("eb"), earlyBirdClone("eb2")).overall;
    console.log(`[T2] Early Bird vs near-clone = ${s}%`);
    expect(s).toBeGreaterThan(90);
  });

  it("3) Early Bird Neat Freak vs Night Owl Gamer scores LOW (< 35%)", () => {
    const r = scorePair(earlyBirdNeatFreak("eb"), nightOwlGamer("no"));
    console.log(`[T3] Early Bird vs Night Owl = ${r.overall}% (hard=${r.dealbreaker})`);
    expect(r.overall).toBeLessThan(35);
  });

  it("4) any hard-dealbreaker pair scores below any non-dealbreaker pair  [EXPECTED FAIL — see audit]", () => {
    const dbPair = scorePair(earlyBirdNeatFreak("a"), nightOwlGamer("b"));
    expect(dbPair.dealbreaker).toBe(true);

    const ndPair = scorePair(oppositeA(), oppositeB());
    expect(ndPair.dealbreaker).toBe(false);

    console.log(
      `[T4] hard-dealbreaker pair = ${dbPair.overall}%  vs  worst non-dealbreaker pair = ${ndPair.overall}%`,
    );
    // Human-obvious: a dealbreaker conflict should be worse than anything without one.
    // FAILS: the 22% dealbreaker FLOOR lifts the dealbreaker pair above a
    // lifestyle-opposite pair that legitimately scores ~5%. Finding, not fixed.
    expect(dbPair.overall).toBeLessThan(ndPair.overall);
  });

  it("5) sleep category is NOT high (~90) when sleep times differ by ~5 hours", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    a.sleep = { sleepTime: 22 * 60, wakeTime: 6 * 60, naps: "sometimes" };
    b.sleep = { sleepTime: 3 * 60, wakeTime: 11 * 60, naps: "sometimes" };
    const far = sleepScore(a, b);
    const near = clone(a);
    near.sleep = { sleepTime: 0, wakeTime: 8 * 60, naps: "sometimes" }; // ~2h offset
    console.log(`[T5] sleepScore 5h-offset = ${far} (2h-offset = ${sleepScore(a, near)})`);
    expect(far).toBeLessThan(90);
    expect(far).toBeLessThan(sleepScore(a, near)); // monotonic: bigger gap scores lower
  });

  it("5b) cleanliness category reflects the tidiness gap", () => {
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

  it("7) flagging cleanliness as important makes a clean↔messy mismatch hurt more", () => {
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
      const ab = scorePair(a, b).overall;
      const ba = scorePair(b, a).overall;
      console.log(`[T8] score(A,B)=${ab}  score(B,A)=${ba}`);
      expect(ab).toBe(ba);
    }
  });
});

/* ======================================================================== */
/* FINDINGS — extra observations the audit surfaces (these PASS; they pin    */
/* the actual behavior so the report can cite it)                            */
/* ======================================================================== */

describe("Findings (documented behavior, not user-specified truths)", () => {
  it("F1) lifestyle opposites WITHOUT dealbreakers stay surprisingly high (~37%)", () => {
    const eb = earlyBirdNeatFreak("eb");
    const no = nightOwlGamer("no");
    // strip every dealbreaker so only raw lifestyle remains
    eb.dealbreakers = {
      substances: "okay",
      nonveg: "okay",
      loudMusic: "okay",
      lateSleeping: "okay",
      messyRoom: "okay",
      frequentGuests: "okay",
    };
    const s = scorePair(eb, no).overall;
    console.log(`[F1] Early Bird vs Night Owl, dealbreakers stripped = ${s}%`);
    expect(s).toBeGreaterThan(35); // leniency: lifestyle alone doesn't cross the "<35%" bar
    expect(s).toBeLessThan(50);
  });

  it("F2) self-match never reaches 100 — bathroom reversal caps it (~94–97%)", () => {
    const withPersona = scorePair(chillMiddleGround("x"), chillMiddleGround("x")).overall;
    const noPersona = scorePair(defaultQuestionnaire("x"), defaultQuestionnaire("x")).overall;
    console.log(`[F2] self-match: with persona = ${withPersona}%, default(no persona) = ${noPersona}%`);
    expect(withPersona).toBeLessThan(100);
    expect(withPersona).toBeGreaterThanOrEqual(90);
  });
});

/* ======================================================================== */
/* STEP 3 — explain pass (read the printed output)                          */
/* ======================================================================== */

describe("Step 3 — explain pass", () => {
  it("prints 5 chosen pairs with reasons / annoyances / conflicts", () => {
    explain("Early Bird ↔ near-clone (should be high)", earlyBirdNeatFreak("eb"), earlyBirdClone("eb2"));
    explain("Early Bird ↔ Night Owl Gamer (should crater)", earlyBirdNeatFreak("eb"), nightOwlGamer("no"));
    explain("Chill Middle-Ground ↔ Studious Introvert (moderate)", chillMiddleGround("c"), studiousIntrovert("s"));
    explain("Social Butterfly ↔ Studious Introvert (guest clash)", socialButterfly("sb"), studiousIntrovert("si"));
    explain("Chill Middle-Ground ↔ Substance/Late Nighter (no flags)", chillMiddleGround("c"), substanceLateNighter("sl"));
    expect(true).toBe(true);
  });
});

/* ======================================================================== */
/* STEP 4 — edge cases                                                      */
/* ======================================================================== */

describe("Step 4 — edge cases", () => {
  it("incomplete questionnaire (missing a whole category) THROWS — scorePair has no input guard", () => {
    const good = chillMiddleGround("g");
    const bad = clone(good);
    // @ts-expect-error simulate an unfinished questionnaire (missing sub-object)
    delete bad.sleep;
    expect(() => scorePair(bad, good)).toThrow();
  });

  it("incomplete questionnaire (missing a leaf field) yields NaN overall — no validation", () => {
    const good = chillMiddleGround("g");
    const bad = clone(good);
    // @ts-expect-error deliberately corrupt a numeric leaf
    bad.sleep.sleepTime = undefined;
    const r = scorePair(bad, good);
    console.log(`[E2] overall with a missing leaf = ${r.overall}`);
    expect(Number.isNaN(r.overall)).toBe(true);
  });

  it("identical answers, different importance → score barely moves (importance only weights *differences*)", () => {
    const a = chillMiddleGround("a");
    const b = clone(a);
    b.uid = "b";
    const base = scorePair(a, b).overall;
    const flagged = clone(a);
    flagged.importance = { ...flagged.importance, sleep: 2, cleanliness: 2, social: 2 };
    const withImp = scorePair(flagged, b).overall;
    console.log(`[E3] identical answers: base = ${base}%  importance-flagged = ${withImp}%`);
    expect(Math.abs(base - withImp)).toBeLessThanOrEqual(5);
  });

  it("identical answers but flagging BATHROOM critical LOWERS the score (bathroom self-score is ~60)", () => {
    const a = chillMiddleGround("a");
    const b = clone(a);
    b.uid = "b";
    const base = scorePair(a, b).overall;
    const flagged = clone(a);
    flagged.importance = { ...flagged.importance, bathroom: 2 };
    const withBath = scorePair(flagged, b).overall;
    console.log(`[E3b] identical answers: base = ${base}%  bathroom-critical = ${withBath}%`);
    expect(withBath).toBeLessThanOrEqual(base);
  });

  it("a user who flags EVERYTHING a dealbreaker craters to the floor (22%) vs an exhibiting roommate", () => {
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
    console.log(`[E4] everything-dealbreaker vs Substance/Late = ${r.overall}% (hard=${r.dealbreaker})`);
    expect(r.dealbreaker).toBe(true);
    expect(r.overall).toBe(22);
  });

  it("everything-dealbreaker user ALSO hard-conflicts with a plain default roommate (substances/nonveg 'okay' = exhibits)", () => {
    const paranoid = chillMiddleGround("p");
    paranoid.dealbreakers = {
      substances: "dealbreaker",
      nonveg: "dealbreaker",
      loudMusic: "dealbreaker",
      lateSleeping: "dealbreaker",
      messyRoom: "dealbreaker",
      frequentGuests: "dealbreaker",
    };
    const plain = defaultQuestionnaire("plain"); // all stances "okay"
    const r = scorePair(paranoid, plain);
    console.log(`[E4b] everything-dealbreaker vs plain default = ${r.overall}% (hard=${r.dealbreaker}); clashes=${JSON.stringify(r.conflicts)}`);
    expect(r.dealbreaker).toBe(true);
  });

  it("a user who flags NOTHING important scores normally (no divide-by-zero / NaN)", () => {
    const a = chillMiddleGround("a"); // all importance 0
    const r = scorePair(a, studiousIntrovert("s"));
    console.log(`[E5] nothing-important pair = ${r.overall}%`);
    expect(Number.isFinite(r.overall)).toBe(true);
    expect(r.overall).toBeGreaterThan(0);
  });
});
