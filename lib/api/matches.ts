import { auth } from "@/lib/firebase/client";
import type { MatchResult } from "@/lib/matching";
import type { ApiMatch } from "./types";

async function idToken(): Promise<string | null> {
  const user = auth.currentUser;
  return user ? user.getIdToken() : null;
}

/** Ranked matches for the signed-in user (computed server-side). */
export async function fetchMatches(): Promise<ApiMatch[]> {
  const token = await idToken();
  if (!token) return [];
  const res = await fetch("/api/matches", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load matches");
  const data = (await res.json()) as { matches: ApiMatch[] };
  return data.matches;
}

/** Pairwise compatibility result between the signed-in user and `uid`. */
export async function fetchMatch(uid: string): Promise<MatchResult | null> {
  const token = await idToken();
  if (!token) return null;
  const res = await fetch(`/api/match?uid=${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: MatchResult | null };
  return data.result;
}
