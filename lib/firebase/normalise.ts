import type { HostelId, RoomType, User } from "@/types";

/** A raw `users/{uid}` doc may predate the multi-select migration and still
 *  store a singular `hostel` / `roomType` instead of the prefs arrays. */
type RawUserDoc = Omit<User, "hostelPrefs" | "roomTypePrefs"> & {
  hostelPrefs?: HostelId[];
  roomTypePrefs?: RoomType[];
  hostel?: HostelId;
  roomType?: RoomType;
};

/**
 * Migrate a raw user doc's legacy singular `hostel` / `roomType` into the
 * `hostelPrefs` / `roomTypePrefs` arrays on read, so surfaces that read the
 * user doc directly (e.g. the profile detail page via `getUser`) match the
 * matches list — which already runs the equivalent migration server-side
 * (`normaliseProfile`). A genuinely unset user is left empty (still "Not set").
 */
export function normaliseUserPrefs(user: User): User {
  const u = user as RawUserDoc;
  const hostelPrefs: HostelId[] = u.hostelPrefs?.length
    ? u.hostelPrefs
    : u.hostel
      ? [u.hostel]
      : [];
  const roomTypePrefs: RoomType[] = u.roomTypePrefs?.length
    ? u.roomTypePrefs
    : u.roomType
      ? [u.roomType]
      : [];
  return { ...user, hostelPrefs, roomTypePrefs };
}
