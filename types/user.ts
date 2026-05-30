export type Gender = "male" | "female";
export type Year = 1 | 2 | 3 | 4;

/** Hostels. Display names live in config/hostels.ts. */
export type HostelId = "uniworld1" | "uniworld2";

export type RoomType = "small_double" | "large_double" | "triple";

export interface User {
  uid: string;
  email: string;
  fullName: string;
  year: Year;
  gender: Gender;
  hostel: HostelId;
  roomType: RoomType;
  contactNumber: string;
  instagram?: string;
  bio?: string;
  photoURL?: string;
  /** True once the compatibility questionnaire has been submitted. */
  onboarded: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Fields a user fills in during profile setup (identity is derived from auth). */
export type UserProfileInput = Pick<
  User,
  | "fullName"
  | "year"
  | "gender"
  | "hostel"
  | "roomType"
  | "contactNumber"
  | "instagram"
  | "bio"
  | "photoURL"
>;
