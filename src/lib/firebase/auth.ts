// Purpose: Production Firebase Authentication helpers (Phone OTP with RecaptchaVerifier lifecycle management, Google OAuth Sign-In, and user-friendly error translations).

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

// ─── Global Window Augmentation ───────────────────────────────────────────────

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

// ─── reCAPTCHA Verifier Manager ──────────────────────────────────────────────

/**
 * Initializes or returns an existing RecaptchaVerifier attached to a given DOM container.
 * Guaranteed to be idempotent and safe across React StrictMode / Fast Refresh.
 */
export function getOrCreateRecaptchaVerifier(
  container: HTMLElement | string,
  onExpired?: () => void
): RecaptchaVerifier {
  if (typeof window === "undefined") {
    throw new Error("reCAPTCHA requires a browser environment.");
  }

  // If a valid instance already exists on window, return it
  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  const verifier = new RecaptchaVerifier(auth, container, {
    size: "invisible",
    callback: () => {
      // Invisible reCAPTCHA successfully verified
    },
    "expired-callback": () => {
      console.warn("[Auth] reCAPTCHA verification expired. Please retry.");
      onExpired?.();
    },
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Cleans up the global RecaptchaVerifier and clears any rendered iframes safely.
 */
export function cleanupRecaptchaVerifier(): void {
  if (typeof window !== "undefined" && window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // Ignored if already cleaned up
    }
    window.recaptchaVerifier = null;
  }
}

// ─── Phone OTP ───────────────────────────────────────────────────────────────

/**
 * Sends an OTP SMS to the given E.164 phone number.
 */
export async function sendOTP(
  e164Phone: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, e164Phone, appVerifier);
}

/**
 * Confirms the OTP code entered by the user.
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
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  cleanupRecaptchaVerifier();
  return firebaseSignOut(auth);
}

// ─── Error Message Translator ─────────────────────────────────────────────────

export function getFriendlyAuthErrorMessage(
  errorCode: string | undefined,
  lang: "ta" | "en" = "en"
): string {
  switch (errorCode) {
    case "auth/invalid-phone-number":
      return lang === "ta"
        ? "செல்லுபடியாகாத தொலைபேசி எண். சரியான 10 இலக்க எண்ணை உள்ளிடவும்."
        : "Invalid phone number format. Please enter a valid 10-digit number.";

    case "auth/missing-phone-number":
      return lang === "ta"
        ? "தொலைபேசி எண்ணை உள்ளிடவும்."
        : "Please enter your phone number.";

    case "auth/quota-exceeded":
      return lang === "ta"
        ? "SMS ஒதுக்கீடு முடிந்துவிட்டது. சிறிது நேரம் கழித்து முயற்சிக்கவும் அல்லது Google உள்நுழைவைப் பயன்படுத்தவும்."
        : "SMS quota exceeded for today. Please try again later or use Google Sign-In.";

    case "auth/too-many-requests":
      return lang === "ta"
        ? "அதிகப்படியான முயற்சிகள். சிறிது நேரம் காத்திருந்து மீண்டும் முயற்சிக்கவும்."
        : "Too many attempts from this device. Please wait a moment and try again.";

    case "auth/captcha-check-failed":
      return lang === "ta"
        ? "பாதுகாப்பு சரிபார்ப்பு தோல்வி அடைந்தது. பக்கத்தை புதுப்பித்து மீண்டும் முயற்சிக்கவும்."
        : "Security reCAPTCHA verification failed. Please refresh the page and try again.";

    case "auth/invalid-verification-code":
      return lang === "ta"
        ? "தவறான OTP குறியீடு. மீண்டும் சரிபார்த்து உள்ளிடவும்."
        : "Incorrect OTP code. Please check the code and try again.";

    case "auth/code-expired":
      return lang === "ta"
        ? "OTP காலாவதியாகிவிட்டது. புதிய OTP குறியீட்டை கோரவும்."
        : "This OTP has expired. Please request a new OTP code.";

    case "auth/operation-not-allowed":
      return lang === "ta"
        ? "Phone உள்நுழைவு முறை Firebase Console-ல் இயக்கப்படவில்லை அல்லது SMS Region அனுமதிக்கப்படவில்லை."
        : "Phone sign-in is disabled or SMS region restricted in Firebase Console settings.";

    case "auth/unauthorized-domain":
      return lang === "ta"
        ? "இந்த இணைய முகவரி (Domain) Firebase அமைப்பில் அங்கீகரிக்கப்படவில்லை."
        : "This domain is not authorized in Firebase Console > Authentication > Settings > Authorized Domains.";

    case "auth/network-request-failed":
      return lang === "ta"
        ? "இணைய இணைப்பு தோல்வி. உங்கள் இணைய இணைப்பை சரிபார்க்கவும்."
        : "Network error. Please check your internet connection.";

    case "auth/popup-closed-by-user":
      return lang === "ta"
        ? "உள்நுழைவு சாளரம் மூடப்பட்டது."
        : "Sign-in popup was closed before completing.";

    case "permission-denied":
      return lang === "ta"
        ? "அனுமதி மறுக்கப்பட்டது. உங்கள் பயனர் கணக்கை சரிபார்க்கவும்."
        : "Missing or insufficient permissions. Access denied.";

    default:
      return lang === "ta"
        ? "உள்நுழைவில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."
        : "Authentication failed. Please try again.";
  }
}
