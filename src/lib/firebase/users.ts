import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./config";
import type { UserDocument, Language } from "@/types/user";

// ─── Upsert ───────────────────────────────────────────────────────────────────

/**
 * Creates or updates the Firestore `users/{uid}` document on every successful auth.
 * Uses `merge: true` so existing fields (e.g. upiId, languagePreference) are preserved.
 */
export async function upsertUser(
  firebaseUser: User,
  languagePreference: Language = "en"
): Promise<void> {
  const ref = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);
  const exists = snap.exists();

  const payload: Partial<UserDocument> = {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName ?? "",
    phone: firebaseUser.phoneNumber ?? "",
    email: firebaseUser.email ?? null,
    photoURL: firebaseUser.photoURL ?? null,
    // Preserve existing languagePreference if doc already exists
    languagePreference: exists
      ? (snap.data()?.languagePreference ?? languagePreference)
      : languagePreference,
  };

  if (!exists) {
    // Only set createdAt once, on first creation
    await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
  } else {
    await setDoc(ref, payload, { merge: true });
  }
}

// ─── Real-time listener ───────────────────────────────────────────────────────

/**
 * Subscribes to real-time updates on `users/{uid}`.
 * @returns unsubscribe function
 */
export function subscribeToUser(
  uid: string,
  callback: (doc: UserDocument | null) => void
): Unsubscribe {
  const ref = doc(db, "users", uid);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as UserDocument) : null);
  });
}

// ─── One-shot read ────────────────────────────────────────────────────────────

export async function getUser(uid: string): Promise<UserDocument | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserDocument) : null;
}

// ─── Language preference update ───────────────────────────────────────────────

export async function updateLanguagePreference(
  uid: string,
  lang: Language
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    { languagePreference: lang },
    { merge: true }
  );
}
