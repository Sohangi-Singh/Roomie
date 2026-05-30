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
