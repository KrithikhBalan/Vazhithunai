// Purpose: UI Component for Phone Number OTP authentication flow (Phone input with +91 prefix, invisible reCAPTCHA, 6-digit auto-advancing OTP input, and verification).

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationResult } from "firebase/auth";
import { initRecaptcha, clearRecaptcha, sendOTP, confirmOTP } from "@/lib/firebase/auth";
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
  const recaptchaContainerId = "recaptcha-container";

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    return () => clearRecaptcha();
  }, []);

  // ─── Send OTP ───────────────────────────────────────────────────────────────

  const handleSendOTP = useCallback(async () => {
    const cleaned = phone.trim();
    if (!cleaned) {
      toast.error(lang === "ta" ? "தொலைபேசி எண்ணை உள்ளிடவும்" : "Enter your phone number");
      return;
    }
    const e164 = cleaned.startsWith("+") ? cleaned : `+91${cleaned}`;
    if (!/^\+91[6-9]\d{9}$/.test(e164)) {
      toast.error(
        lang === "ta"
          ? "செல்லுபடியாகும் இந்திய தொலைபேசி எண்ணை உள்ளிடவும் (10 இலக்கங்கள்)"
          : "Enter a valid 10-digit Indian mobile number"
      );
      return;
    }

    setLoading(true);
    try {
      const verifier = initRecaptcha(recaptchaContainerId);
      const result = await sendOTP(e164, verifier);
      setConfirmationResult(result);
      setStep("otp");
      setCountdown(30);
      toast.success(
        lang === "ta" ? `${e164} க்கு OTP அனுப்பப்பட்டது` : `OTP sent to ${e164}`
      );
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === "auth/operation-not-allowed") {
        toast.error(
          lang === "ta"
            ? "Firebase Console-ல் 'Phone' முறை இயக்கப்படவில்லை. Sign-in method-ல் Phone-ஐ Enable செய்யவும்."
            : "Phone sign-in is disabled. Please enable 'Phone' in Firebase Console > Authentication > Sign-in method.",
          { duration: 8000 }
        );
      } else if (errObj.code === "auth/invalid-phone-number") {
        toast.error(lang === "ta" ? "தவறான தொலைபேசி எண் வடிவம்." : "Invalid phone number format.");
      } else if (errObj.code === "auth/too-many-requests") {
        toast.error(
          lang === "ta"
            ? "அதிகப்படியான முயற்சிகள். சிறிது நேரம் கழித்து முயற்சிக்கவும்."
            : "Too many attempts. Please try again later."
        );
      } else {
        const msg = errObj.message || "Failed to send OTP";
        toast.error(msg);
      }
      clearRecaptcha();
    } finally {
      setLoading(false);
    }
  }, [phone, lang]);

  // ─── Confirm OTP ────────────────────────────────────────────────────────────

  const handleConfirmOTP = useCallback(async () => {
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
    } catch (err: unknown) {
      const errObj = err as { code?: string };
      if (errObj.code === "auth/invalid-verification-code") {
        toast.error(lang === "ta" ? "தவறான OTP குறியீடு. மீண்டும் சரிபார்க்கவும்." : "Invalid OTP code. Please check and try again.");
      } else if (errObj.code === "auth/code-expired") {
        toast.error(lang === "ta" ? "OTP காலாவதியாகிவிட்டது. புதிய OTP அனுப்பவும்." : "OTP has expired. Please request a new one.");
      } else {
        toast.error(lang === "ta" ? "சரிபார்ப்பில் தோல்வி. மீண்டும் முயற்சிக்கவும்." : "Verification failed. Please try again.");
      }
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [otp, confirmationResult, router, lang]);

  // ─── OTP input auto-advance ──────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 filled
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
    clearRecaptcha();
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {step === "phone" ? (
        <div className="animate-fade-in-up space-y-4">
          {/* Phone label */}
          <label className="block text-sm font-medium text-gray-300">
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
              placeholder={lang === "ta" ? "98765 43210" : "98765 43210"}
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
                {lang === "ta" ? "அனுப்புகிறது…" : "Sending…"}
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
              : "Your number is verified securely — never stored"}
          </p>
        </div>
      ) : (
        <div className="animate-fade-in-up space-y-5">
          {/* OTP header */}
          <div>
            <p className="text-sm text-gray-300 mb-1">
              {lang === "ta" ? "OTP அனுப்பப்பட்டது" : "OTP sent to"}
            </p>
            <p className="font-semibold text-white">+91 {phone}</p>
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
                ref={(el) => { otpRefs.current[i] = el; }}
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

      {/* Invisible reCAPTCHA mount point */}
      <div id={recaptchaContainerId} />
    </div>
  );
}
