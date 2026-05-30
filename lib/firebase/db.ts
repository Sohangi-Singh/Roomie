import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./client";
import type {
  Connection,
  Gender,
  Group,
  Questionnaire,
  User,
} from "@/types";
import type { PublicProfile } from "@/lib/api/types";

function converter<T>() {
  return {
    toFirestore: (data: T) => data as DocumentData,
    fromFirestore: (snap: QueryDocumentSnapshot) => snap.data() as T,
  };
}

const usersCol = collection(db, "users").withConverter(converter<User>());
const qCol = collection(db, "questionnaires").withConverter(
  converter<Questionnaire>(),
);
const groupsCol = collection(db, "groups").withConverter(converter<Group>());
const connCol = collection(db, "connections").withConverter(
  converter<Connection>(),
);

/* -------------------------------- users --------------------------------- */

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(usersCol, uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveUser(user: User): Promise<void> {
  await setDoc(doc(usersCol, user.uid), user, { merge: true });
}

export async function updateUser(
  uid: string,
  patch: Partial<User>,
): Promise<void> {
  await updateDoc(doc(usersCol, uid), { ...patch, updatedAt: Date.now() });
}

/* ---------------------------- questionnaires ---------------------------- */

export async function getQuestionnaire(
  uid: string,
): Promise<Questionnaire | null> {
  const snap = await getDoc(doc(qCol, uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveQuestionnaire(
  q: Questionnaire,
  profile: PublicProfile,
): Promise<void> {
  // The embedded snapshot (server-readable only) lets the matching API build
  // candidate lists from a single read per person. It's non-sensitive public
  // info; raw answers stay owner-only via security rules.
  await setDoc(doc(db, "questionnaires", q.uid), {
    ...q,
    _gender: profile.gender,
    _onboarded: true,
    _profile: profile,
  });
}

/** Keep the questionnaire's embedded public-profile snapshot in sync. */
export async function updateQuestionnaireProfile(
  uid: string,
  profile: PublicProfile,
): Promise<void> {
  await updateDoc(doc(db, "questionnaires", uid), {
    _profile: profile,
    _gender: profile.gender,
    _onboarded: true,
  });
}

/* -------------------------------- groups -------------------------------- */

export async function createGroup(group: Omit<Group, "id">): Promise<string> {
  const ref = await addDoc(groupsCol, group as Group);
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function getGroup(id: string): Promise<Group | null> {
  const snap = await getDoc(doc(groupsCol, id));
  return snap.exists() ? snap.data() : null;
}

export async function listOpenGroups(gender: Gender): Promise<Group[]> {
  const snap = await getDocs(
    query(groupsCol, where("gender", "==", gender), where("status", "==", "open")),
  );
  return snap.docs.map((d) => d.data());
}

export async function getGroupsForUser(uid: string): Promise<Group[]> {
  const snap = await getDocs(
    query(groupsCol, where("memberUids", "array-contains", uid)),
  );
  return snap.docs.map((d) => d.data());
}

export async function joinGroup(groupId: string, uid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = doc(groupsCol, groupId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Group no longer exists.");
    const g = snap.data();
    if (g.memberUids.includes(uid)) return;
    if (g.openSlots <= 0) throw new Error("This group is already full.");
    const memberUids = [...g.memberUids, uid];
    const openSlots = g.size - memberUids.length;
    tx.update(ref, {
      memberUids,
      openSlots,
      status: openSlots <= 0 ? "full" : "open",
    });
  });
}

/* ----------------------------- connections ------------------------------ */

export async function createConnection(
  c: Omit<Connection, "id">,
): Promise<string> {
  const ref = await addDoc(connCol, c as Connection);
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function getConnectionsFor(uid: string): Promise<Connection[]> {
  const snap = await getDocs(
    query(connCol, where("participants", "array-contains", uid)),
  );
  return snap.docs.map((d) => d.data());
}

export async function updateConnectionStatus(
  id: string,
  status: Connection["status"],
): Promise<void> {
  await updateDoc(doc(connCol, id), { status });
}
