// Purpose: SCR-03 User Profile & UPI Management Screen — allows users to configure their display name, language preference, and public UPI ID (VPA) to receive non-custodial trip settlement payments.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { updateUserProfile, updateUserUpiId } from "@/lib/firebase/users";
import { signOut } from "@/lib/firebase/auth";
import { formatPhone, isValidUpiId } from "@/lib/utils";
import {
  User,
  Phone,
  Mail,
  QrCode,
  ShieldCheck,
  Check,
  Save,
  ArrowLeft,
  LogOut,
  Sparkles,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

const COMMON_UPI_HANDLES = [
  "@okhdfcbank",
  "@okaxis",
  "@oksbi",
  "@paytm",
  "@ybl",
  "@ibl",
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, userDoc, loading } = useAuthStore();
  const { lang, t, setLanguage } = useLanguage();

  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/splash");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (userDoc) {
      setName(userDoc.name || user?.displayName || "");
      setUpiId(userDoc.upiId || "");
    } else if (user) {
      setName(user.displayName || "");
    }
  }, [userDoc, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (upiId.trim() && !isValidUpiId(upiId.trim())) {
      toast.error(
        lang === "ta"
          ? "சரியான UPI ஐடி உள்ளிடவும் (எ.கா: name@okhdfcbank, mobile@paytm)"
          : "Please enter a valid UPI ID (e.g. name@okhdfcbank, mobile@paytm)"
      );
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        name: name.trim() || user.displayName || "Traveller",
        upiId: upiId.trim() || null,
        languagePreference: lang,
      });
      toast.success(
        lang === "ta"
          ? "சுயவிவரம் வெற்றிகரமாக சேமிக்கப்பட்டது!"
          : "Profile saved successfully!"
      );
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(lang === "ta" ? "சேமிக்க முடியவில்லை" : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickPreset = (handle: string) => {
    const prefix = upiId.includes("@") ? upiId.split("@")[0] : (upiId || name.toLowerCase().replace(/\s+/g, ""));
    setUpiId(`${prefix}${handle}`);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success(lang === "ta" ? "வெளியேறினீர்கள்" : "Signed out");
    router.push("/splash");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#08131d] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/80 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-300" />
            </button>
            <h1 className="text-base font-bold text-white">
              {lang === "ta" ? "உங்கள் சுயவிவரம்" : "Your Profile"}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t("common.signOut")}</span>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* User Card */}
        <section className="p-5 rounded-3xl bg-gradient-to-br from-teal-900/40 via-[#0d2235] to-[#08131d] border border-teal-500/30 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-2xl font-bold text-teal-300 shrink-0">
            {name.charAt(0).toUpperCase() || <User className="h-8 w-8 text-teal-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white truncate">
              {name || (lang === "ta" ? "பயணி" : "Traveller")}
            </h2>
            {user.phoneNumber && (
              <p className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                <Phone className="h-3.5 w-3.5 text-teal-400" />
                <span>{formatPhone(user.phoneNumber)}</span>
              </p>
            )}
            {user.email && (
              <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                <Mail className="h-3.5 w-3.5 text-teal-400" />
                <span>{user.email}</span>
              </p>
            )}
          </div>
        </section>

        {/* Profile & UPI Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* Display Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {lang === "ta" ? "பெயர்" : "Full Name"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === "ta" ? "உங்கள் பெயர்" : "Your name"}
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500 transition-colors text-sm"
              />
              <User className="absolute right-4 top-3.5 h-4 w-4 text-gray-500" />
            </div>
          </div>

          {/* UPI ID Input (Key Requirement) */}
          <div className="space-y-2 p-5 rounded-3xl bg-white/[0.02] border border-teal-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-teal-400" />
                <span>{t("settlement.upiId")} ({lang === "ta" ? "பணம் பெற" : "To Receive Payments"})</span>
              </label>
              {upiId && isValidUpiId(upiId) && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Check className="h-3 w-3" /> Valid VPA
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.toLowerCase().trim())}
                placeholder={t("settlement.upiIdPlaceholder")}
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/15 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400 transition-colors text-sm font-mono"
              />
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              {lang === "ta"
                ? "பயணக் குழு உறுப்பினர்கள் உங்களுக்கு நேரடியாக GPay, PhonePe, Paytm மூலம் பணம் செலுத்த இந்த UPI ஐடி பயன்படுத்தப்படும்."
                : "Group members will use this UPI ID to pay you back directly via their installed UPI apps."}
            </p>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                {lang === "ta" ? "விரைவு வங்கி நீட்டிப்புகள்" : "Quick Handles"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_UPI_HANDLES.map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    onClick={() => handleQuickPreset(handle)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-mono bg-white/5 border border-white/10 text-teal-300 hover:bg-teal-500/20 hover:border-teal-500/30 transition-colors"
                  >
                    {handle}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Non-Custodial Zero Credentials Security Notice */}
          <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-2">
            <div className="flex items-center gap-2 text-teal-300 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0" />
              <span>{lang === "ta" ? "பாதுகாப்பான கட்டணக் கொள்கை" : "100% Non-Custodial Security"}</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t("settlement.nonCustodialSecurityNote")}
            </p>
          </div>

          {/* Language Preference */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {t("common.language")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLanguage("ta")}
                className={`py-3 rounded-2xl text-sm font-semibold border transition-all ${
                  lang === "ta"
                    ? "bg-teal-500/20 border-teal-400 text-teal-300 shadow-md shadow-teal-950/40"
                    : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                தமிழ் (Tamil)
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`py-3 rounded-2xl text-sm font-semibold border transition-all ${
                  lang === "en"
                    ? "bg-teal-500/20 border-teal-400 text-teal-300 shadow-md shadow-teal-950/40"
                    : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 transition-all active:scale-95 shadow-xl shadow-teal-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? (lang === "ta" ? "சேமிக்கிறது…" : "Saving…") : (lang === "ta" ? "சுயவிவரத்தை சேமி" : "Save Profile")}</span>
          </button>
        </form>
      </main>
    </div>
  );
}
