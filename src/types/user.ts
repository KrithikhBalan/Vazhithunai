import type { Timestamp } from "firebase/firestore";

/** Supported UI languages */
export type Language = "ta" | "en";

/**
 * Firestore `users/{uid}` document schema.
 * Amounts (future) are always stored as bigint paise — never floats.
 */
export interface UserDocument {
  /** Firebase Auth UID — also the Firestore document ID */
  uid: string;
  /** Display name (from Auth profile or manual entry) */
  name: string;
  /** E.164 phone number e.g. "+919876543210" */
  phone: string;
  /** Email address — null for phone-only users */
  email: string | null;
  /** Firebase Storage URL for profile photo */
  photoURL: string | null;
  /** User's preferred UPI VPA e.g. "name@upi" — null until set */
  upiId: string | null;
  /** Persisted language preference — mirrors localStorage["vt_lang"] */
  languagePreference: Language;
  /** Server-side creation timestamp */
  createdAt: Timestamp;
}

/** Partial shape used for upsert (omit uid + createdAt which are set server-side) */
export type UserDocumentUpdate = Omit<UserDocument, "uid" | "createdAt">;
