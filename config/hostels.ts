import type { Gender, HostelId, RoomType } from "@/types";

export const HOSTELS: Record<
  HostelId,
  { id: HostelId; name: string; alias: string }
> = {
  uniworld1: { id: "uniworld1", name: "Uniworld 1", alias: "Neeladri" },
  uniworld2: { id: "uniworld2", name: "Uniworld 2", alias: "Velankani" },
};

export const HOSTEL_LIST = Object.values(HOSTELS);

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  small_double: "Small Double Sharing",
  large_double: "Large Double Sharing",
  triple: "Triple Sharing",
};

export const ROOM_TYPE_SHORT: Record<RoomType, string> = {
  small_double: "Small Double",
  large_double: "Large Double",
  triple: "Triple",
};

/**
 * Room-type availability per hostel + gender, encoded exactly from spec:
 *   Uniworld 1 (Neeladri) · female → Small Double only
 *   Uniworld 2 (Velankani) · female → Triple or Small Double
 *   Uniworld 1 (Neeladri) · male   → Large Double, Small Double, or Triple
 *
 * Uniworld 2 · male is not specified in the spec; defaulted to all three.
 * Adjust here if the real policy differs — this is the single source of truth.
 */
const ROOM_RULES: Record<HostelId, Record<Gender, RoomType[]>> = {
  uniworld1: {
    female: ["small_double"],
    male: ["large_double", "small_double", "triple"],
  },
  uniworld2: {
    female: ["triple", "small_double"],
    male: ["small_double", "triple"],
  },
};

export function allowedRoomTypes(
  hostel: HostelId,
  gender: Gender,
): RoomType[] {
  return ROOM_RULES[hostel][gender];
}

export function isRoomTypeAllowed(
  hostel: HostelId,
  gender: Gender,
  roomType: RoomType,
): boolean {
  return allowedRoomTypes(hostel, gender).includes(roomType);
}

/** Triple sharing → 3 people; any double → 2. */
export function roomTypeToGroupSize(roomType: RoomType): 2 | 3 {
  return roomType === "triple" ? 3 : 2;
}

/** Union of allowed room types across any of the user's selected hostels. */
export function allowedRoomTypesForHostels(
  hostels: HostelId[],
  gender: Gender,
): RoomType[] {
  const set = new Set<RoomType>();
  for (const h of hostels) {
    for (const rt of ROOM_RULES[h][gender]) set.add(rt);
  }
  const order: RoomType[] = ["large_double", "small_double", "triple"];
  return order.filter((rt) => set.has(rt));
}

export function hostelsOverlap(a: HostelId[], b: HostelId[]): boolean {
  return a.some((h) => b.includes(h));
}

export function roomTypesOverlap(a: RoomType[], b: RoomType[]): boolean {
  return a.some((r) => b.includes(r));
}

export function formatHostelPrefs(prefs: HostelId[]): string {
  if (prefs.length === 0) return "Not set";
  if (prefs.length === 2) return "Either hostel";
  return HOSTELS[prefs[0]].name;
}

export function formatRoomTypePrefs(prefs: RoomType[]): string {
  if (prefs.length === 0) return "Not set";
  if (prefs.length === 3) return "Any sharing";
  if (prefs.length === 1) return ROOM_TYPE_LABELS[prefs[0]];
  return prefs.map((rt) => ROOM_TYPE_SHORT[rt]).join(" / ");
}
