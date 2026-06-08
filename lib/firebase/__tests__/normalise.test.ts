import { describe, it, expect } from "vitest";
import { normaliseUserPrefs } from "@/lib/firebase/normalise";
import type { User } from "@/types";

const base: User = {
  uid: "u",
  email: "u@sst.scaler.com",
  fullName: "U",
  year: 2,
  gender: "female",
  hostelPrefs: [],
  roomTypePrefs: [],
  contactNumber: "9000000000",
  onboarded: true,
  createdAt: 0,
  updatedAt: 0,
};

describe("normaliseUserPrefs — legacy hostel/room migration", () => {
  it("migrates a legacy singular hostel/roomType into the prefs arrays", () => {
    const legacy = {
      ...base,
      hostel: "uniworld1",
      roomType: "small_double",
    } as User;
    const r = normaliseUserPrefs(legacy);
    expect(r.hostelPrefs).toEqual(["uniworld1"]);
    expect(r.roomTypePrefs).toEqual(["small_double"]);
  });

  it("leaves modern array prefs untouched", () => {
    const modern: User = {
      ...base,
      hostelPrefs: ["uniworld2"],
      roomTypePrefs: ["triple"],
    };
    const r = normaliseUserPrefs(modern);
    expect(r.hostelPrefs).toEqual(["uniworld2"]);
    expect(r.roomTypePrefs).toEqual(["triple"]);
  });

  it("prefers existing arrays over a stray legacy field", () => {
    const both = {
      ...base,
      hostelPrefs: ["uniworld1", "uniworld2"],
      hostel: "uniworld1",
    } as User;
    expect(normaliseUserPrefs(both).hostelPrefs).toEqual([
      "uniworld1",
      "uniworld2",
    ]);
  });

  it("leaves a genuinely-unset user empty (still renders 'Not set')", () => {
    const r = normaliseUserPrefs(base);
    expect(r.hostelPrefs).toEqual([]);
    expect(r.roomTypePrefs).toEqual([]);
  });
});
