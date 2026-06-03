import type { MatchResult } from "@/lib/matching";
import type { Gender, HostelId, Persona, RoomType, Year } from "@/types";

/** Profile fields safe to expose to other students (no contact details). */
export interface PublicProfile {
  uid: string;
  fullName: string;
  year: Year;
  gender: Gender;
  hostelPrefs: HostelId[];
  roomTypePrefs: RoomType[];
  photoURL?: string;
  bio?: string;
}

/**
 * Coarse, non-sensitive lifestyle tags derived server-side purely so Explore
 * filters keep working. Exact answers (times, spend, personality, dealbreakers)
 * are never sent to the client.
 */
export interface MatchFacets {
  sleep: "early" | "late";
  cleanliness: "relaxed" | "neutral" | "tidy";
  spending: "budget" | "moderate" | "premium";
  personas: Persona[];
}

export interface ApiMatch {
  user: PublicProfile;
  result: MatchResult;
  facets: MatchFacets;
}
