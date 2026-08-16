// Purpose: UI Component for Google OAuth single sign-on with official branded button styling and automatic error handling.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export function GoogleSignInButton() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success(
        lang === "ta" ? "வெற்றிகரமாக உள்நுழைந்தது!" : "Signed in successfully!"
      );
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user") return; // user dismissed, no toast
      toast.error(
        lang === "ta"
          ? "Google உள்நுழைவு தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்."
          : "Google sign-in failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      id="google-signin-btn"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className={cn(
        "w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl",
        "font-medium text-base text-white",
        "bg-white/5 border border-white/10",
        "hover:bg-white/10 hover:border-white/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-200 active:scale-95"
      )}
      aria-label={lang === "ta" ? "Google மூலம் உள்நுழை" : "Sign in with Google"}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 text-teal-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        /* Google "G" SVG logo */
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      <span>
        {lang === "ta" ? "Google மூலம் தொடரவும்" : "Continue with Google"}
      </span>
    </button>
  );
}
