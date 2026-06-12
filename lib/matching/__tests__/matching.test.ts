import { describe, it, expect } from "vitest";
import type { Questionnaire } from "@/types";
import { defaultQuestionnaire } from "@/config/questionnaire";
import { scorePair, rankCandidates } from "@/lib/matching";
import {
  simLinear,
  simCircularTime,
  simTolerantTime,
  simFreq,
  noiseScore,
  bathroomScore,
  outingScore,
  dealbreakerConflicts,
} from "@/lib/matching/scoring";

const clone = (q: Questionnaire): Questionnaire =>
  JSON.parse(JSON.stringify(q)) as Questionnaire;

describe("similarity atoms", () => {
  it("simLinear is 100 when equal and clamps to 0 past range", () => {
    expect(simLinear(5, 5, 10)).toBe(100);
    expect(simLinear(0, 10, 10)).toBe(0);
    expect(simLinear(0, 20, 10)).toBe(0);
    expect(simLinear(0, 5, 10)).toBe(50);
  });

  it("simCircularTime treats 11pm and 1am as close", () => {
    const elevenPm = 23 * 60;
    const oneAm = 1 * 60;
    const s = simCircularTime(elevenPm, oneAm);
    expect(s).toBeGreaterThan(80);
    expect(s).toBeLessThan(90);
  });

  it("simFreq spans never↔always", () => {
    expect(simFreq("never", "always")).toBe(0);
    expect(simFreq("often", "always")).toBe(75);
    expect(simFreq("sometimes", "sometimes")).toBe(100);
  });
});

describe("simTolerantTime (forgiving sleep/wake curve)", () => {
  it("forgives ≤1 hour differences completely", () => {
    const base = 23 * 60;
    expect(simTolerantTime(base, base)).toBe(100);
    expect(simTolerantTime(base, base + 30)).toBe(100);
    expect(simTolerantTime(base, base + 60)).toBe(100);
  });

  it("only mildly penalises 2-hour differences", () => {
    const base = 23 * 60;
    expect(simTolerantTime(base, base + 120)).toBeGreaterThanOrEqual(90);
  });

  it("moderately penalises 4-hour differences", () => {
    const base = 23 * 60;
    const s = simTolerantTime(base, base + 240);
    expect(s).toBeGreaterThanOrEqual(70);
    expect(s).toBeLessThanOrEqual(80);
  });

  it("heavily penalises 8+ hour differences", () => {
    const base = 23 * 60;
    expect(simTolerantTime(base, base + 480)).toBeLessThanOrEqual(35);
  });
});

describe("noiseScore (asymmetric clash model)", () => {
  it("craters when both are loud and intolerant", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    a.noise = { tolerance: 1, gaming: "always", reelsMusic: "always" };
    b.noise = { tolerance: 1, gaming: "always", reelsMusic: "always" };
    expect(noiseScore(a, b)).toBeLessThan(20);
  });

  it("is perfect for two quiet, tolerant people", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    a.noise = { tolerance: 5, gaming: "never", reelsMusic: "never" };
    b.noise = { tolerance: 5, gaming: "never", reelsMusic: "never" };
    expect(noiseScore(a, b)).toBe(100);
  });
});

describe("bathroomScore (shared resource — different is better)", () => {
  it("rewards different bath timings over identical ones", () => {
    const same = defaultQuestionnaire("a");
    const other = defaultQuestionnaire("b");
    same.bathroom.timing = "morning";
    other.bathroom.timing = "night";
    const sameSame = clone(same);
    expect(bathroomScore(same, other)).toBeGreaterThan(bathroomScore(same, sameSame));
  });

  it("does not crater on identical timing — hygiene/duration still count", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    expect(bathroomScore(a, b)).toBeGreaterThanOrEqual(50);
  });
});

describe("outingScore (skippable persona step)", () => {
  it("a skipper scores neutral 60 against anyone who picked personas", () => {
    const skipper = defaultQuestionnaire("a");
    const picker = defaultQuestionnaire("b");
    skipper.outingPersona = [];
    picker.outingPersona = ["cafe", "nightlife"];
    expect(outingScore(skipper, picker)).toBe(60);
    expect(outingScore(picker, skipper)).toBe(60);
  });

  it("two skippers score neutral 60", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    a.outingPersona = [];
    b.outingPersona = [];
    expect(outingScore(a, b)).toBe(60);
  });

  it("non-empty sets still use Jaccard", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    a.outingPersona = ["cafe", "nature"];
    b.outingPersona = ["cafe", "nightlife"];
    expect(outingScore(a, b)).toBe(33); // 1 shared of 3 distinct
    b.outingPersona = ["cafe", "nature"];
    expect(outingScore(a, b)).toBe(100);
    b.outingPersona = ["nightlife"];
    expect(outingScore(a, b)).toBe(0);
  });
});

describe("scorePair", () => {
  it("near-identical profiles still score very high (allowing for bath clash)", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    const res = scorePair(a, b);
    expect(res.overall).toBeGreaterThanOrEqual(88);
    expect(res.dealbreaker).toBe(false);
    expect(res.reasons.length).toBeGreaterThan(0);
    expect(res.radar).toHaveLength(12);
  });

  it("every category score and the overall stay within 0–100", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    b.sleep = { sleepTime: 240, wakeTime: 720, naps: "always" };
    b.spending = { monthly: 38000, common: 1, outings: 5 };
    const res = scorePair(a, b);
    expect(res.overall).toBeGreaterThanOrEqual(0);
    expect(res.overall).toBeLessThanOrEqual(100);
    for (const v of Object.values(res.categories)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("a hard dealbreaker (Will do × Dealbreaker) subtracts −35 and flags it", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    const before = scorePair(a, b).overall;

    a.dealbreakers.substances = "dealbreaker";
    b.dealbreakers.substances = "willDo"; // b explicitly does it
    const res = scorePair(a, b);

    expect(before).toBeGreaterThanOrEqual(88);
    expect(res.dealbreaker).toBe(true);
    expect(res.overall).toBe(before - 35);
    expect(res.dealbreakerFlags).toEqual([
      { category: "substances", label: "Intoxicating substances", severity: "hard" },
    ]);
    expect(res.conflicts.some((c) => /smoke or drink/i.test(c))).toBe(true);
  });

  it("a medium conflict (Will do × Annoying) subtracts −17, flags orange, lands in worthDiscussing", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    const before = scorePair(a, b).overall;
    a.dealbreakers.loudMusic = "annoying";
    b.dealbreakers.loudMusic = "willDo";
    const res = scorePair(a, b);
    expect(res.dealbreaker).toBe(false);
    expect(res.overall).toBe(before - 17);
    expect(res.dealbreakerFlags).toEqual([
      { category: "loudMusic", label: "Loud music", severity: "medium" },
    ]);
    expect(res.worthDiscussing.some((s) => /loud/i.test(s))).toBe(true);
    expect(res.conflicts.some((s) => /loud/i.test(s))).toBe(false);
  });

  it("the matrix reads ONLY stances — lifestyle answers no longer trigger dealbreakers", () => {
    const earlyTidy = defaultQuestionnaire("x");
    earlyTidy.dealbreakers.lateSleeping = "dealbreaker";

    // A 2am sleeper who did NOT declare "Will do" raises no conflict…
    const nightOwl = defaultQuestionnaire("n");
    nightOwl.sleep.sleepTime = 120; // 2am
    expect(dealbreakerConflicts(earlyTidy, nightOwl)).toHaveLength(0);

    // …while an explicit "Will do" raises a hard one regardless of sliders.
    const declared = defaultQuestionnaire("d");
    declared.dealbreakers.lateSleeping = "willDo";
    const conflicts = dealbreakerConflicts(earlyTidy, declared);
    expect(conflicts).toEqual([
      { category: "lateSleeping", penalty: 35, severity: "hard", doer: "b" },
    ]);
  });
});

describe("importance weighting changes ranking", () => {
  it("flagging sleep as important favours the sleep-aligned candidate", () => {
    const me = defaultQuestionnaire("me");

    const x = clone(me);
    x.uid = "x";
    x.spending.monthly = 36000;

    const y = clone(me);
    y.uid = "y";
    y.sleep = { sleepTime: 240, wakeTime: 720, naps: "always" };

    const gapNoImportance =
      scorePair(me, x).overall - scorePair(me, y).overall;

    const meSleep = clone(me);
    meSleep.importance.sleep = 2;
    const gapWithImportance =
      scorePair(meSleep, x).overall - scorePair(meSleep, y).overall;

    expect(gapWithImportance).toBeGreaterThan(gapNoImportance);
  });

  it("rankCandidates returns results sorted high → low", () => {
    const me = defaultQuestionnaire("me");
    const good = clone(me);
    good.uid = "good";
    const bad = clone(me);
    bad.uid = "bad";
    bad.sleep = { sleepTime: 240, wakeTime: 720, naps: "always" };
    bad.cleanliness = { room: 1, desk: 1, laundry: 1 };
    bad.social.introExtro = 100;

    const ranked = rankCandidates(me, [bad, good]);
    expect(ranked[0].uid).toBe("good");
    expect(ranked[0].overall).toBeGreaterThanOrEqual(ranked[1].overall);
  });
});
