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

let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialises (or reuses) an invisible reCAPTCHA verifier bound to `containerId`.
 * Call this once on mount of the Login screen before sending OTP.
 */
export function initRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved — OTP send can proceed
    },
    "expired-callback": () => {
      recaptchaVerifier = null;
    },
  });
  return recaptchaVerifier;
}

/** Clears the reCAPTCHA verifier (call on unmount) */
export function clearRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
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
