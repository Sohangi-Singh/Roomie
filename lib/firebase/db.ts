import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
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
  Message,
  Questionnaire,
  User,
} from "@/types";
import type { PublicProfile } from "@/lib/api/types";
import { normaliseUserPrefs } from "./normalise";

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
const msgCol = collection(db, "messages").withConverter(converter<Message>());

/* -------------------------------- users --------------------------------- */

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(usersCol, uid));
  // Migrate legacy singular hostel/roomType → prefs arrays on read so the
  // profile detail page matches the (already-normalised) matches list.
  return snap.exists() ? normaliseUserPrefs(snap.data()) : null;
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
  await setDoc(doc(db, "questionnaires", q.uid), {
    ...q,
    _gender: profile.gender,
    _onboarded: true,
    _profile: profile,
  });
  // Tick the global version so every connected client refreshes its match list.
  await bumpMatchesVersion().catch(() => undefined);
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
  await bumpMatchesVersion().catch(() => undefined);
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

/* ------------------------------ messages -------------------------------- */

export async function sendMessage(m: Omit<Message, "id">): Promise<string> {
  const ref = await addDoc(msgCol, m as Message);
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

/** Subscribe to live updates of the conversation between `myUid` and
 *  `otherUid`. Returns an unsubscribe function. */
export function subscribeToConversation(
  myUid: string,
  otherUid: string,
  cb: (messages: Message[]) => void,
  onError?: (err: Error) => void,
): () => void {
  // Pull everything I'm a participant in, filter to this pair client-side.
  const q = query(msgCol, where("participants", "array-contains", myUid));
  return onSnapshot(
    q,
    (snap) => {
      const convo = snap.docs
        .map((d) => d.data())
        .filter((m) => m.participants.includes(otherUid))
        .sort((a, b) => a.createdAt - b.createdAt);
      cb(convo);
    },
    onError,
  );
}

/** Latest message for every accepted conversation involving `uid` —
 *  keyed by the OTHER participant's uid. Used for the conversations list. */
export async function getLastMessagesByPeer(
  uid: string,
): Promise<Record<string, Message>> {
  const snap = await getDocs(
    query(msgCol, where("participants", "array-contains", uid)),
  );
  const byPeer: Record<string, Message> = {};
  snap.docs.forEach((d) => {
    const m = d.data();
    const peer = m.from === uid ? m.to : m.from;
    if (!byPeer[peer] || m.createdAt > byPeer[peer].createdAt) {
      byPeer[peer] = m;
    }
  });
  return byPeer;
}

/** All messages addressed to `uid`. Used by the DMs badge to count unread. */
export async function getMessagesTo(uid: string): Promise<Message[]> {
  const snap = await getDocs(query(msgCol, where("to", "==", uid)));
  return snap.docs.map((d) => d.data());
}

/* ---------------------------- matches version --------------------------- */

/** Global tick that increments whenever any user saves/updates their
 *  questionnaire. Connected clients subscribe and force-refresh their
 *  match list so rankings reflect new data without a manual refresh. */
export async function bumpMatchesVersion(): Promise<void> {
  const ref = doc(db, "meta", "matches");
  // Use a transaction so multiple concurrent updates don't lose increments.
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.exists() ? (snap.data() as { version?: number }).version : 0) ?? 0;
    tx.set(ref, { version: current + 1, updatedAt: Date.now() });
  });
}

/** Subscribe to the matches version counter. `cb` fires with the latest
 *  version (and again on every increment). Returns an unsubscribe fn. */
export function subscribeToMatchesVersion(
  cb: (version: number) => void,
): () => void {
  const ref = doc(db, "meta", "matches");
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      cb(0);
      return;
    }
    const data = snap.data() as { version?: number };
    cb(data.version ?? 0);
  });
}
