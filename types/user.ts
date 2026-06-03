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
  /** Hostels the user is open to living in (1 or 2). */
  hostelPrefs: HostelId[];
  /** Room types the user is open to (subset of the allowed union for their hostelPrefs + gender). */
  roomTypePrefs: RoomType[];
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
  | "hostelPrefs"
  | "roomTypePrefs"
  | "contactNumber"
  | "instagram"
  | "bio"
  | "photoURL"
>;
