// Purpose: Main User Dashboard Screen — protected route showing authenticated user profile details, Firestore sync status, and navigation to trips and expense modules.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { signOut } from "@/lib/firebase/auth";
import { formatPhone } from "@/lib/utils";
import toast from "react-hot-toast";
import { MapPin, LogOut, User } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, userDoc, loading } = useAuthStore();
  const { lang, t } = useLanguage();

  // Guard — redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/splash");
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    toast.success(lang === "ta" ? "வெளியேறினீர்கள்" : "Signed out");
    router.push("/splash");
  };

  if (loading || !user) {
    return (
      <div className="min-h-dvh bg-vt-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-teal-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">{t("common", "loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-vt-gradient px-5 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-600/30 border border-teal-500/30 flex items-center justify-center">
            <User className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t("common", "greeting")}</p>
            <p className="font-semibold text-white text-sm">
              {userDoc?.name || user.displayName || (lang === "ta" ? "பயணி" : "Traveller")}
            </p>
          </div>
        </div>
        <button
          id="sign-out-btn"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t("common", "signOut")}
        </button>
      </header>

      {/* Welcome card */}
      <div className="glass-strong rounded-2xl p-6 mb-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-600/20 border border-teal-500/20 flex items-center justify-center">
          <MapPin className="h-8 w-8 text-teal-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {lang === "ta" ? "வழித்துணைக்கு வரவேற்கிறோம்!" : "Welcome to Vazhithunai!"}
        </h1>
        <p className="text-gray-400 text-sm mb-4">
          {lang === "ta"
            ? "உங்கள் முதல் பயணத்தை திட்டமிட தயாரா?"
            : "Ready to plan your first adventure?"}
        </p>

        {/* Auth debug info */}
        <div className="glass rounded-xl p-4 text-left space-y-2 text-xs text-gray-400">
          <p>
            <span className="text-gray-500">UID:</span>{" "}
            <span className="text-teal-400 font-mono">{user.uid}</span>
          </p>
          {user.phoneNumber && (
            <p>
              <span className="text-gray-500">
                {lang === "ta" ? "தொலைபேசி:" : "Phone:"}
              </span>{" "}
              {formatPhone(user.phoneNumber)}
            </p>
          )}
          {user.email && (
            <p>
              <span className="text-gray-500">Email:</span> {user.email}
            </p>
          )}
          <p>
            <span className="text-gray-500">
              {lang === "ta" ? "மொழி:" : "Language:"}
            </span>{" "}
            {lang === "ta" ? "தமிழ்" : "English"}
          </p>
          <p className="text-green-400">
            ✓ {lang === "ta" ? "Firestore ஆவணம் உருவாக்கப்பட்டது" : "Firestore document created"}
          </p>
        </div>
      </div>

      {/* Placeholder nav */}
      <p className="text-center text-xs text-gray-600">
        {lang === "ta"
          ? "பயண மற்றும் செலவு தொகுதிகள் வரவிருக்கின்றன…"
          : "Trip & expense modules coming next…"}
      </p>
    </main>
  );
}
