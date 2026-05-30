import type { Gender, HostelId, RoomType } from "./user";

export type GroupStatus = "open" | "full" | "closed";

export interface Group {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  /** Target number of roommates sharing the room. */
  size: 2 | 3;
  /** Remaining unfilled spots (size - memberUids.length). */
  openSlots: number;
  hostel: HostelId;
  roomType: RoomType;
  /** Groups are single-gender (matches access rules). */
  gender: Gender;
  status: GroupStatus;
  createdAt: number;
}
