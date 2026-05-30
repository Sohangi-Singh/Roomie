import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./client";
import { isCollegeEmail, COLLEGE_NAME } from "@/config/college";

/** Thrown for validation problems we raise ourselves (e.g. wrong domain). */
export class AuthError extends Error {}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<FirebaseUser> {
  if (!isCollegeEmail(email)) {
    throw new AuthError(`Please sign up with your ${COLLEGE_NAME} email.`);
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (fullName) await updateProfile(cred.user, { displayName: fullName });
  return cred.user;
}

export async function signIn(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  if (!isCollegeEmail(email)) {
    throw new AuthError(`Please use your ${COLLEGE_NAME} email.`);
  }
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(cb: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, cb);
}

/** Turn a Firebase auth error code into a friendly, calm message. */
export function mapAuthError(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like a valid email.";
    case "auth/email-already-in-use":
      return "An account already exists with this email. Try signing in.";
    case "auth/weak-password":
      return "Please choose a password with at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network issue — check your connection and retry.";
    default:
      return "Something went wrong. Please try again.";
  }
}
