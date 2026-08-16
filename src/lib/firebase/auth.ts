// Purpose: Authentication helper functions for Firebase Phone OTP (with invisible reCAPTCHA), Google OAuth Sign-In, and Sign-Out.

import {
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth } from "./config";

// ─── reCAPTCHA Verifier ───────────────────────────────────────────────────────

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

/**
 * Initialises (or reuses) an invisible reCAPTCHA verifier bound to `containerId`.
 * Safely handles React fast-refresh and re-renders so "already rendered" errors never occur.
 */
export function getOrInitRecaptcha(containerId: string): RecaptchaVerifier {
  if (typeof window === "undefined") {
    throw new Error("reCAPTCHA can only be initialized in the browser.");
  }

  // Return existing active verifier if already created
  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = "";
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved
    },
    "expired-callback": () => {
      clearRecaptcha(containerId);
    },
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

/** Clears the reCAPTCHA verifier and cleans up container DOM */
export function clearRecaptcha(containerId?: string) {
  if (typeof window !== "undefined") {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {
        // Ignore clear error if already disposed
      }
      window.recaptchaVerifier = null;
    }
    if (containerId) {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
    }
  }
}

// ─── Phone OTP ───────────────────────────────────────────────────────────────

/**
 * Sends an OTP SMS to the given E.164 phone number.
 * @returns ConfirmationResult — pass to `confirmOTP`
 */
export async function sendOTP(
  phone: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phone, appVerifier);
}

/**
 * Confirms the OTP code entered by the user.
 * @returns Firebase User on success
 */
export async function confirmOTP(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<User> {
  const credential = await confirmationResult.confirm(otp);
  return credential.user;
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");

/**
 * Triggers Google sign-in popup.
 * @returns Firebase User on success
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}
