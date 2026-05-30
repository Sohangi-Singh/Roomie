import { NextResponse, type NextRequest } from "next/server";
import { adminDb, uidFromAuthHeader } from "@/lib/firebase/admin";
import { rankCandidates } from "@/lib/matching";
import { exhibits } from "@/lib/matching/scoring";
import type { ApiMatch, MatchFacets, PublicProfile } from "@/lib/api/types";
import type { Gender, Questionnaire, Year } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A questionnaire doc, plus the server-only fields embedded for matching. */
type StoredQ = Questionnaire & {
  _gender?: Gender;
  _onboarded?: boolean;
  _profile?: PublicProfile;
};

function facetsOf(q: Questionnaire): MatchFacets {
  const room = q.cleanliness.room;
  const monthly = q.spending.monthly;
  return {
    sleep: exhibits(q, "lateSleeping") ? "late" : "early",
    cleanliness: room <= 2 ? "relaxed" : room >= 4 ? "tidy" : "neutral",
    spending: monthly < 6000 ? "budget" : monthly <= 15000 ? "moderate" : "premium",
    personas: q.outingPersona,
  };
}

export async function GET(req: NextRequest) {
  const uid = await uidFromAuthHeader(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = adminDb();
  const meSnap = await db.collection("questionnaires").doc(uid).get();
  if (!meSnap.exists) return NextResponse.json({ matches: [] });

  const meData = meSnap.data() as StoredQ;
  const myGender = meData._gender;
  const myYear = meData._profile?.year as Year | undefined;
  if (!myGender) return NextResponse.json({ matches: [] });

  // One read per same-gender candidate — no separate user-doc reads.
  const snap = await db
    .collection("questionnaires")
    .where("_gender", "==", myGender)
    .get();

  const dataByUid = new Map<string, StoredQ>();
  const candidateQs: Questionnaire[] = [];
  snap.docs.forEach((d) => {
    if (d.id === uid) return;
    const data = d.data() as StoredQ;
    if (!data._onboarded || !data._profile) return;
    dataByUid.set(d.id, data);
    candidateQs.push(data);
  });

  const ranked = rankCandidates(meData, candidateQs);
  const matches: ApiMatch[] = [];
  for (const result of ranked) {
    const data = dataByUid.get(result.uid);
    if (data?._profile) {
      matches.push({ user: data._profile, result, facets: facetsOf(data) });
    }
  }

  // Prioritise same-year, then by score within each tier.
  matches.sort((a, b) => {
    const sa = a.user.year === myYear ? 0 : 1;
    const sb = b.user.year === myYear ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return b.result.overall - a.result.overall;
  });

  return NextResponse.json({ matches });
}
