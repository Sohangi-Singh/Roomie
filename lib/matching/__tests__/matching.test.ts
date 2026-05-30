import { describe, it, expect } from "vitest";
import type { Questionnaire } from "@/types";
import { defaultQuestionnaire } from "@/config/questionnaire";
import { scorePair, rankCandidates } from "@/lib/matching";
import {
  simLinear,
  simCircularTime,
  simFreq,
  noiseScore,
  dealbreakerConflicts,
  exhibits,
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

describe("scorePair", () => {
  it("near-identical profiles score very high with no dealbreaker", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    const res = scorePair(a, b);
    expect(res.overall).toBeGreaterThanOrEqual(95);
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

  it("an absolute dealbreaker craters an otherwise great match", () => {
    const a = defaultQuestionnaire("a");
    const b = defaultQuestionnaire("b");
    const before = scorePair(a, b).overall;

    a.dealbreakers.substances = "dealbreaker"; // a can't stand it
    b.dealbreakers.substances = "okay"; // b is fine with it → exhibits
    const res = scorePair(a, b);

    expect(before).toBeGreaterThanOrEqual(95);
    expect(res.dealbreaker).toBe(true);
    expect(res.overall).toBeLessThan(30);
    expect(res.conflicts.some((c) => /substances/i.test(c))).toBe(true);
  });

  it("detects exhibited habits used for dealbreakers", () => {
    const messy = defaultQuestionnaire("m");
    messy.cleanliness.room = 1;
    expect(exhibits(messy, "messyRoom")).toBe(true);

    const nightOwl = defaultQuestionnaire("n");
    nightOwl.sleep.sleepTime = 120; // 2am
    expect(exhibits(nightOwl, "lateSleeping")).toBe(true);

    const conflicts = dealbreakerConflicts(
      Object.assign(defaultQuestionnaire("x"), {
        dealbreakers: { ...defaultQuestionnaire("x").dealbreakers, lateSleeping: "dealbreaker" },
      }),
      nightOwl,
    );
    expect(conflicts.some((c) => c.key === "lateSleeping" && c.severity === "hard")).toBe(true);
  });
});

describe("importance weighting changes ranking", () => {
  it("flagging sleep as important favours the sleep-aligned candidate", () => {
    const me = defaultQuestionnaire("me");

    // X: same sleep as me, very different spending.
    const x = clone(me);
    x.uid = "x";
    x.spending.monthly = 36000;

    // Y: very different sleep, same spending as me.
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
