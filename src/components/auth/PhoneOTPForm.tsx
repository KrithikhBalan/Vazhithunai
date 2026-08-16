// Purpose: UI Component for Phone Number OTP authentication flow (Phone input with +91 prefix, invisible reCAPTCHA with single instance lifecycle, 6-digit auto-advancing OTP input, and error translation).

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import {
  getOrCreateRecaptchaVerifier,
  cleanupRecaptchaVerifier,
  sendOTP,
  confirmOTP,
  getFriendlyAuthErrorMessage,
} from "@/lib/firebase/auth";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Phone, ArrowRight, Shield, RotateCcw } from "lucide-react";

type Step = "phone" | "otp";

export function PhoneOTPForm() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if (verifierRef.current) {
        try {
          verifierRef.current.clear();
        } catch {
          // Ignored
        }
        verifierRef.current = null;
      }
      cleanupRecaptchaVerifier();
    };
  }, []);

  // ─── Send OTP ───────────────────────────────────────────────────────────────

  const handleSendOTP = useCallback(async () => {
    if (loading) return; // Prevent duplicate concurrent requests

    const cleaned = phone.trim();
    if (!cleaned) {
      toast.error(lang === "ta" ? "தொலைபேசி எண்ணை உள்ளிடவும்" : "Enter your phone number");
      return;
    }

    // Strictly validate Indian 10-digit number
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      toast.error(
        lang === "ta"
          ? "செல்லுபடியாகும் இந்திய தொலைபேசி எண்ணை உள்ளிடவும் (10 இலக்கங்கள், 6-9 இல் தொடங்கும்)"
          : "Enter a valid 10-digit Indian mobile number starting with 6-9"
      );
      return;
    }

    const e164 = `+91${cleaned}`;
    setLoading(true);

    try {
      if (!containerRef.current) {
        throw new Error("reCAPTCHA container element not mounted.");
      }

      // Reuse or lazily create a single verifier instance
      if (!verifierRef.current) {
        verifierRef.current = getOrCreateRecaptchaVerifier(containerRef.current, () => {
          // If expired, clean instance so next click refreshes
          if (verifierRef.current) {
            try {
              verifierRef.current.clear();
            } catch {}
            verifierRef.current = null;
          }
        });
      }

      const result = await sendOTP(e164, verifierRef.current);
      setConfirmationResult(result);
      setStep("otp");
      setCountdown(60);
      toast.success(
        lang === "ta" ? `${e164} க்கு OTP வெற்றிகரமாக அனுப்பப்பட்டது` : `OTP sent successfully to ${e164}`
      );
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      console.error("[Auth] sendOTP error:", err);
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code, lang);
      toast.error(friendlyMsg, { duration: 6000 });

      // If reCAPTCHA token failed or was invalid, reset verifier instance
      if (err?.code === "auth/captcha-check-failed" || err?.code === "auth/too-many-requests") {
        if (verifierRef.current) {
          try {
            verifierRef.current.clear();
          } catch {}
          verifierRef.current = null;
        }
        cleanupRecaptchaVerifier();
      }
    } finally {
      setLoading(false);
    }
  }, [phone, loading, lang]);

  // ─── Confirm OTP ────────────────────────────────────────────────────────────

  const handleConfirmOTP = useCallback(async () => {
    if (loading) return; // In-flight guard

    const code = otp.join("");
    if (code.length !== 6) {
      toast.error(lang === "ta" ? "6 இலக்க OTP ஐ உள்ளிடவும்" : "Enter the 6-digit OTP");
      return;
    }
    if (!confirmationResult) return;

    setLoading(true);
    try {
      await confirmOTP(confirmationResult, code);
      toast.success(lang === "ta" ? "வெற்றிகரமாக உள்நுழைந்தது!" : "Signed in successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("[Auth] confirmOTP error:", err);
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code, lang);
      toast.error(friendlyMsg);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [otp, confirmationResult, loading, router, lang]);

  // ─── OTP input auto-advance ──────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 digits are filled
    if (digit && index === 5 && newOtp.every(Boolean)) {
      setTimeout(handleConfirmOTP, 50);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // ─── Resend ──────────────────────────────────────────────────────────────────

  const handleResend = () => {
    setStep("phone");
    setOtp(["", "", "", "", "", ""]);
    setConfirmationResult(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {step === "phone" ? (
        <div className="animate-fade-in-up space-y-4">
          {/* Phone label */}
          <label htmlFor="phone-input" className="block text-sm font-medium text-gray-300">
            {lang === "ta" ? "தொலைபேசி எண்" : "Mobile Number"}
          </label>

          {/* Phone input */}
          <div className="flex items-center gap-2">
            {/* Country prefix */}
            <div className="flex items-center gap-1.5 px-3 py-3.5 rounded-xl border border-white/10 bg-white/5 text-gray-300 text-sm font-medium shrink-0">
              <span className="text-base">🇮🇳</span>
              <span>+91</span>
            </div>
            <input
              id="phone-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
              className={cn(
                "flex-1 px-4 py-3.5 rounded-xl text-white text-base font-medium",
                "bg-white/5 border border-white/10",
                "placeholder:text-gray-500",
                "focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25",
                "transition-all duration-200"
              )}
            />
          </div>

          {/* Send OTP button */}
          <button
            id="send-otp-btn"
            type="button"
            onClick={handleSendOTP}
            disabled={loading || phone.length < 10}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl",
              "font-semibold text-base text-white",
              "bg-gradient-to-r from-teal-600 to-teal-500",
              "hover:from-teal-500 hover:to-teal-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200 active:scale-95",
              "shadow-lg shadow-teal-900/40"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {lang === "ta" ? "அனுப்புகிறது…" : "Sending OTP…"}
              </span>
            ) : (
              <>
                <Phone className="h-4 w-4" />
                {lang === "ta" ? "OTP அனுப்பு" : "Send OTP"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Privacy note */}
          <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            {lang === "ta"
              ? "உங்கள் எண் பாதுகாப்பாக சரிபார்க்கப்படுகிறது"
              : "Your number is verified securely via Firebase"}
          </p>
        </div>
      ) : (
        <div className="animate-fade-in-up space-y-5">
          {/* OTP header */}
          <div>
            <p className="text-sm text-gray-300 mb-1">
              {lang === "ta" ? "OTP அனுப்பப்பட்டது" : "OTP sent to"}
            </p>
            <p className="font-semibold text-white font-mono">+91 {phone}</p>
          </div>

          {/* OTP boxes */}
          <div
            className="flex items-center justify-between gap-2"
            onPaste={handleOtpPaste}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="otp-input"
                aria-label={`OTP digit ${i + 1}`}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            id="verify-otp-btn"
            type="button"
            onClick={handleConfirmOTP}
            disabled={loading || otp.some((d) => !d)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl",
              "font-semibold text-base text-white",
              "bg-gradient-to-r from-teal-600 to-teal-500",
              "hover:from-teal-500 hover:to-teal-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200 active:scale-95",
              "shadow-lg shadow-teal-900/40"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {lang === "ta" ? "சரிபார்க்கிறது…" : "Verifying…"}
              </span>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                {lang === "ta" ? "சரிபார்" : "Verify OTP"}
              </>
            )}
          </button>

          {/* Resend */}
          <div className="flex items-center justify-center gap-2 text-sm">
            {countdown > 0 ? (
              <span className="text-gray-500">
                {lang === "ta"
                  ? `${countdown}s பிறகு மீண்டும் அனுப்பு`
                  : `Resend in ${countdown}s`}
              </span>
            ) : (
              <button
                id="resend-otp-btn"
                type="button"
                onClick={handleResend}
                className="flex items-center gap-1 text-teal-400 hover:text-teal-300 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {lang === "ta" ? "மீண்டும் அனுப்பு" : "Resend OTP"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Invisible reCAPTCHA mount point attached via React ref */}
      <div ref={containerRef} id="recaptcha-container" />
    </div>
  );
}
