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
 * Creates a clean, fresh invisible RecaptchaVerifier instance.
 * Completely clears any previous widgets from the DOM to eliminate "already rendered" errors.
 */
export function createFreshRecaptcha(containerId: string): RecaptchaVerifier {
  if (typeof window === "undefined") {
    throw new Error("reCAPTCHA can only be run in the browser.");
  }

  // 1. Destroy previous instance
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // Ignore if already cleared
    }
    window.recaptchaVerifier = null;
  }

  // 2. Wipe DOM container completely
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = "";
  }

  // 3. Instantiate brand new verifier
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // Invisible reCAPTCHA completed
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
        // Ignore clear error
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
