// Purpose: SCR-02 Login & Authentication Screen — provides seamless Phone OTP login with reCAPTCHA and Google Sign-In with glassmorphic cards.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { PhoneOTPForm } from "@/components/auth/PhoneOTPForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const { lang, setLang } = useLanguage();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const isTamil = lang === "ta";

  return (
    <main className="min-h-dvh bg-vt-gradient relative flex flex-col items-center justify-center px-5 py-safe overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-900/25 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-amber-900/10 blur-3xl" />
        {/* Subtle dot grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" aria-hidden="true">
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Back + language toggle row */}
        <div className="flex items-center justify-between mb-8">
          <button
            id="login-back-btn"
            onClick={() => router.push("/splash")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            aria-label="Go back"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {isTamil ? "திரும்பு" : "Back"}
          </button>

          {/* Language toggle */}
          <div
            role="group"
            aria-label="Language selector"
            className="flex items-center glass rounded-full p-1 gap-1"
          >
            <button
              id="login-lang-en"
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                lang === "en"
                  ? "bg-teal-600 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              EN
            </button>
            <button
              id="login-lang-ta"
              onClick={() => setLang("ta")}
              aria-pressed={lang === "ta"}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                lang === "ta"
                  ? "bg-teal-600 text-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              தமிழ்
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 opacity-0-init animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            {/* Mini kolam icon */}
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#f59e0b">
                <path d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 20.5 L12 16 L6.5 20.5 L8.5 13.5 L3 9 L10 9 Z" />
              </svg>
            </div>
            <span className="text-teal-400 text-sm font-medium tracking-wide uppercase">
              Vazhithunai
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            {isTamil ? "நல்வரவு 👋" : "Welcome back 👋"}
          </h1>
          <p className="text-gray-400 text-base">
            {isTamil
              ? "உங்கள் கணக்கை அணுக உள்நுழைக"
              : "Sign in to continue your journey"}
          </p>
        </div>

        {/* Auth card */}
        <div className="glass-strong rounded-2xl p-6 space-y-6 opacity-0-init animate-fade-in-up delay-100">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold">
              1
            </span>
            <span className="text-sm text-gray-300">
              {isTamil ? "தொலைபேசி மூலம் உள்நுழை" : "Sign in with Phone"}
            </span>
          </div>

          {/* Phone OTP form */}
          <PhoneOTPForm />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 uppercase tracking-widest">
              {isTamil ? "அல்லது" : "or"}
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google sign-in */}
          <GoogleSignInButton />
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-600 opacity-0-init animate-fade-in delay-300">
          {isTamil ? (
            <>
              உங்கள் தரவு <span className="text-teal-500">பாதுகாப்பாக</span> சேமிக்கப்படுகிறது.
              பணம் தொடர்பான எந்த தகவலும் சேமிக்கப்படுவதில்லை.
            </>
          ) : (
            <>
              Your data is stored <span className="text-teal-500">securely</span>.
              No banking credentials are ever stored.
            </>
          )}
        </p>
      </div>
    </main>
  );
}
