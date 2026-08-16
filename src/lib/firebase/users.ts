// Purpose: Firestore operations for the 'users' collection (creating user profiles, real-time sync, updating UPI IDs, and managing user preferences with robust error handling).

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
  if (!firebaseUser || !firebaseUser.uid) return;

  const ref = doc(db, "users", firebaseUser.uid);
  try {
    const snap = await getDoc(ref);
    const exists = snap.exists();

    const payload: Partial<UserDocument> = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName ?? "",
      phone: firebaseUser.phoneNumber ?? "",
      email: firebaseUser.email ?? null,
      photoURL: firebaseUser.photoURL ?? null,
      // Preserve existing languagePreference and upiId if doc already exists
      languagePreference: exists
        ? (snap.data()?.languagePreference ?? languagePreference)
        : languagePreference,
    };

    if (!exists) {
      // Only set createdAt once, on first creation
      await setDoc(ref, { ...payload, upiId: null, createdAt: serverTimestamp() });
    } else {
      await setDoc(ref, payload, { merge: true });
    }
  } catch (err) {
    console.warn("[Firestore] upsertUser warning (may be initial sync):", err);
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
  if (!uid) {
    callback(null);
    return () => {};
  }

  const ref = doc(db, "users", uid);
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? (snap.data() as UserDocument) : null);
    },
    (error) => {
      console.warn(`[Firestore] subscribeToUser error for UID ${uid}:`, error);
      callback(null);
    }
  );
}

// ─── One-shot read ────────────────────────────────────────────────────────────

export async function getUser(uid: string): Promise<UserDocument | null> {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as UserDocument) : null;
  } catch (err) {
    console.warn(`[Firestore] getUser error for UID ${uid}:`, err);
    return null;
  }
}

// ─── Language preference update ───────────────────────────────────────────────

export async function updateLanguagePreference(
  uid: string,
  lang: Language
): Promise<void> {
  if (!uid) return;
  try {
    await setDoc(
      doc(db, "users", uid),
      { languagePreference: lang },
      { merge: true }
    );
  } catch (err) {
    console.warn("[Firestore] updateLanguagePreference error:", err);
  }
}

// ─── UPI ID and Profile update ────────────────────────────────────────────────

/**
 * Updates the user's UPI ID (VPA) in their `users/{uid}` document.
 */
export async function updateUserUpiId(
  uid: string,
  upiId: string
): Promise<void> {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    { upiId: upiId.trim(), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Updates the user's profile information (name, email, photoURL, upiId, language).
 */
export async function updateUserProfile(
  uid: string,
  updates: {
    name?: string;
    email?: string | null;
    photoURL?: string | null;
    upiId?: string | null;
    languagePreference?: Language;
  }
): Promise<void> {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  const payload: Record<string, any> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.email !== undefined) payload.email = updates.email ? updates.email.trim() : null;
  if (updates.photoURL !== undefined) payload.photoURL = updates.photoURL ? updates.photoURL.trim() : null;
  if (updates.upiId !== undefined) payload.upiId = updates.upiId ? updates.upiId.trim() : null;
  if (updates.languagePreference !== undefined) payload.languagePreference = updates.languagePreference;

  await setDoc(ref, payload, { merge: true });
}
