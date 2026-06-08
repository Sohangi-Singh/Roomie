import { NextResponse, type NextRequest } from "next/server";
import { adminDb, uidFromAuthHeader } from "@/lib/firebase/admin";
import { scorePair, IncompleteProfileError } from "@/lib/matching";
import type { Questionnaire } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pairwise compatibility between the caller and ?uid=<target>, computed
 *  server-side so neither questionnaire is exposed to the client. */
export async function GET(req: NextRequest) {
  const uid = await uidFromAuthHeader(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const target = req.nextUrl.searchParams.get("uid");
  if (!target) return NextResponse.json({ error: "missing uid" }, { status: 400 });

  const db = adminDb();
  const [myQSnap, theirQSnap] = await Promise.all([
    db.collection("questionnaires").doc(uid).get(),
    db.collection("questionnaires").doc(target).get(),
  ]);
  if (!myQSnap.exists || !theirQSnap.exists) {
    return NextResponse.json({ result: null });
  }

  try {
    const result = scorePair(
      myQSnap.data() as Questionnaire,
      theirQSnap.data() as Questionnaire,
    );
    return NextResponse.json({ result });
  } catch (e) {
    if (e instanceof IncompleteProfileError) {
      // Fix 6: friendly message instead of a NaN/crash.
      return NextResponse.json({
        result: null,
        error: "This user hasn't finished their questionnaire yet.",
      });
    }
    throw e;
  }
}
