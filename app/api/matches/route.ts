import { NextResponse, type NextRequest } from "next/server";
import { adminDb, uidFromAuthHeader } from "@/lib/firebase/admin";
import { rankCandidates } from "@/lib/matching";
import { exhibits } from "@/lib/matching/scoring";
import { hostelsOverlap, roomTypesOverlap } from "@/config/hostels";
import type { ApiMatch, MatchFacets, PublicProfile } from "@/lib/api/types";
import type { Gender, HostelId, Questionnaire, RoomType } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A questionnaire doc, plus the server-only fields embedded for matching.
 *  _profile is `unknown` because old test-data snapshots may have the legacy
 *  singular `hostel`/`roomType` instead of the new array prefs. */
type StoredQ = Questionnaire & {
  _gender?: Gender;
  _onboarded?: boolean;
  _profile?: PublicProfile & {
    hostel?: HostelId;
    roomType?: RoomType;
  };
};

/** Migrate legacy snapshots (singular hostel/roomType) to the new prefs
 *  arrays on the fly so the client never sees undefined. */
function normaliseProfile(
  p: NonNullable<StoredQ["_profile"]>,
): PublicProfile {
  const hostelPrefs: HostelId[] = Array.isArray(p.hostelPrefs)
    ? p.hostelPrefs
    : p.hostel
      ? [p.hostel]
      : [];
  const roomTypePrefs: RoomType[] = Array.isArray(p.roomTypePrefs)
    ? p.roomTypePrefs
    : p.roomType
      ? [p.roomType]
      : [];
  return {
    uid: p.uid,
    fullName: p.fullName,
    year: p.year,
    gender: p.gender,
    hostelPrefs,
    roomTypePrefs,
    ...(p.photoURL ? { photoURL: p.photoURL } : {}),
    ...(p.bio ? { bio: p.bio } : {}),
  };
}

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
  const meProfile = meData._profile ? normaliseProfile(meData._profile) : null;
  const myHostels: HostelId[] = meProfile?.hostelPrefs ?? [];
  const myRooms: RoomType[] = meProfile?.roomTypePrefs ?? [];
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
      matches.push({
        user: normaliseProfile(data._profile),
        result,
        facets: facetsOf(data),
      });
    }
  }

  // Compatibility tier — hostel/room preference overlap dominates the order:
  //   0 = both hostel AND room overlap  (you can realistically room together)
  //   1 = one of hostel or room overlaps
  //   2 = neither overlaps              (still visible, just ranked lower)
  // Within a tier, sort by overall compatibility score descending.
  function tierFor(theirH: HostelId[], theirR: RoomType[]): number {
    const h = hostelsOverlap(myHostels, theirH);
    const r = roomTypesOverlap(myRooms, theirR);
    if (h && r) return 0;
    if (h || r) return 1;
    return 2;
  }

  matches.sort((a, b) => {
    const ta = tierFor(a.user.hostelPrefs, a.user.roomTypePrefs);
    const tb = tierFor(b.user.hostelPrefs, b.user.roomTypePrefs);
    if (ta !== tb) return ta - tb;
    return b.result.overall - a.result.overall;
  });

  return NextResponse.json({ matches });
}
