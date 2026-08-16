// Purpose: SCR-15 User Profile & Settings Screen — allows users to view and edit their name, photoURL, email, public UPI ID (VPA), and language preference (தமிழ்/English) with instant Firestore synchronization, view read-only Auth account info, and sign out.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { updateUserProfile } from "@/lib/firebase/users";
import { signOut } from "@/lib/firebase/auth";
import { formatPhone, isValidUpiId } from "@/lib/utils";
import type { Language } from "@/types/user";
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
  Camera,
  Languages,
  BadgeCheck,
  Lock,
  Globe,
  Settings,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// Common UPI provider suffix handles
const COMMON_UPI_HANDLES = [
  "@okhdfcbank",
  "@okaxis",
  "@oksbi",
  "@paytm",
  "@ybl",
  "@ibl",
  "@postbank",
  "@upi",
];

// Preset avatar options if user wants a quick avatar
const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Traveller1",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Adventure",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Explorer",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Nomad",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Vazhi",
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, userDoc, loading } = useAuthStore();
  const { lang, t, setLanguage } = useLanguage();

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [upiId, setUpiId] = useState("");
  const [selectedLang, setSelectedLang] = useState<Language>(lang);
  const [saving, setSaving] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState(false);

  // Authentication guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/splash");
    }
  }, [user, loading, router]);

  // Sync state from Firestore userDoc or Auth user
  useEffect(() => {
    if (userDoc) {
      setName(userDoc.name || user?.displayName || "");
      setEmail(userDoc.email || user?.email || "");
      setPhotoURL(userDoc.photoURL || user?.photoURL || "");
      setUpiId(userDoc.upiId || "");
      if (userDoc.languagePreference) {
        setSelectedLang(userDoc.languagePreference);
      }
    } else if (user) {
      setName(user.displayName || "");
      setEmail(user.email || "");
      setPhotoURL(user.photoURL || "");
    }
  }, [userDoc, user]);

  // Handle immediate language change (updates context + Firestore)
  const handleLanguageChange = async (newLang: Language) => {
    setSelectedLang(newLang);
    await setLanguage(newLang);
    if (user?.uid) {
      try {
        await updateUserProfile(user.uid, { languagePreference: newLang });
      } catch (err) {
        console.error("Failed to update language in Firestore:", err);
      }
    }
    toast.success(
      newLang === "ta"
        ? "மொழி தமிழுக்கு மாற்றப்பட்டது"
        : "Language switched to English"
    );
  };

  // Quick preset append for UPI
  const handleQuickPreset = (handle: string) => {
    const prefix = upiId.includes("@")
      ? upiId.split("@")[0]
      : upiId || name.toLowerCase().replace(/\s+/g, "");
    setUpiId(`${prefix}${handle}`);
  };

  // Save profile changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate UPI ID format if provided
    if (upiId.trim() && !isValidUpiId(upiId.trim())) {
      toast.error(
        lang === "ta"
          ? "சரியான UPI ஐடி உள்ளிடவும் (எ.கா: name@okhdfcbank, 9876543210@paytm)"
          : "Please enter a valid UPI ID (e.g. name@okhdfcbank, 9876543210@paytm)"
      );
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        name: name.trim() || user.displayName || "Traveller",
        email: email.trim() || null,
        photoURL: photoURL.trim() || null,
        upiId: upiId.trim() || null,
        languagePreference: selectedLang,
      });

      toast.success(
        lang === "ta"
          ? "சுயவிவரம் வெற்றிகரமாக சேமிக்கப்பட்டது!"
          : "Profile & settings saved successfully!"
      );
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(
        lang === "ta" ? "சேமிக்க முடியவில்லை" : "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(lang === "ta" ? "வெளியேறினீர்கள்" : "Signed out successfully");
      router.push("/splash");
    } catch (err) {
      toast.error(lang === "ta" ? "வெளியேறுவதில் பிழை" : "Error signing out");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08131d] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentUser = user || {
    uid: "guest_user_123456",
    displayName: name || "Karthik Raja",
    phoneNumber: "+919876543210",
    email: email || "karthik@example.com",
    photoURL: null,
  };

  const effectiveAvatar = photoURL || currentUser.photoURL;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-28">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/85 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-300" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-teal-400" />
                <span>{lang === "ta" ? "சுயவிவரம் & அமைப்புகள்" : "Profile & Settings"}</span>
              </h1>
              <p className="text-[10px] text-gray-400">SCR-15 · Vazhithunai</p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t("common.signOut")}</span>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* ─── User Profile Banner Card ─── */}
        <section className="p-5 rounded-3xl bg-gradient-to-br from-teal-900/40 via-[#0d2235] to-[#08131d] border border-teal-500/30 flex items-center gap-4 shadow-xl shadow-teal-950/40">
          <div className="relative group">
            {effectiveAvatar ? (
              <div className="w-18 h-18 rounded-2xl overflow-hidden border-2 border-teal-400 shadow-md relative w-[72px] h-[72px]">
                <Image
                  src={effectiveAvatar}
                  alt={name || "User Avatar"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-[72px] h-[72px] rounded-2xl bg-teal-500/20 border-2 border-teal-500/40 flex items-center justify-center text-2xl font-extrabold text-teal-300">
                {name ? name.charAt(0).toUpperCase() : <User className="h-8 w-8 text-teal-400" />}
              </div>
            )}
            <button
              type="button"
              onClick={() => setCustomAvatarInput(!customAvatarInput)}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-teal-500 text-white shadow-lg hover:bg-teal-400 transition-colors"
              title="Change Photo"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-extrabold text-white truncate">
                {name || (lang === "ta" ? "பயணி" : "Traveller")}
              </h2>
              <BadgeCheck className="h-4 w-4 text-teal-400 shrink-0" />
            </div>

            {currentUser.phoneNumber && (
              <p className="text-xs text-teal-300/90 flex items-center gap-1.5 font-mono mt-0.5">
                <Phone className="h-3 w-3 text-teal-400" />
                <span>{formatPhone(currentUser.phoneNumber)}</span>
              </p>
            )}

            {email && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate mt-0.5">
                <Mail className="h-3 w-3 text-teal-400" />
                <span>{email}</span>
              </p>
            )}
          </div>
        </section>

        {/* ─── Avatar Picker Panel (Expandable) ─── */}
        {customAvatarInput && (
          <section className="p-4 rounded-2xl bg-white/[0.03] border border-teal-500/30 space-y-3">
            <label className="block text-xs font-semibold text-teal-300 uppercase tracking-wider">
              {lang === "ta" ? "சுயவிவர படம் தேர்ந்தெடுக்கவும் / URL" : "Choose Avatar / Custom Image URL"}
            </label>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoURL(preset)}
                  className={cn(
                    "relative w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-transform active:scale-95",
                    photoURL === preset ? "border-teal-400 ring-2 ring-teal-400/40 scale-105" : "border-white/10 opacity-70 hover:opacity-100"
                  )}
                >
                  <Image src={preset} alt={`Preset ${idx + 1}`} fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400 font-mono"
              />
              <p className="text-[10px] text-gray-400">
                {lang === "ta" ? "படத்தின் நேரடி இணைய இணைப்பை உள்ளிடலாம்" : "Enter a direct image link or choose a preset"}
              </p>
            </div>
          </section>
        )}

        {/* ─── Profile Form ─── */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* Display Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {lang === "ta" ? "முழு பெயர்" : "Full Name"}
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

          {/* Email Address Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {lang === "ta" ? "மின்னஞ்சல் முகவரி" : "Email Address"}
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500 transition-colors text-sm font-mono"
              />
              <Mail className="absolute right-4 top-3.5 h-4 w-4 text-gray-500" />
            </div>
          </div>

          {/* Read-only Phone Number (Tied to Auth) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                {lang === "ta" ? "தொலைபேசி எண்" : "Phone Number"}
              </label>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Lock className="h-3 w-3 text-gray-400" />
                {lang === "ta" ? "கணக்குடன் இணைக்கப்பட்டது (மாற்ற இயலாது)" : "Auth verified (read-only)"}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={currentUser.phoneNumber ? formatPhone(currentUser.phoneNumber) : "—"}
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 text-gray-400 text-sm font-mono cursor-not-allowed"
              />
              <Phone className="absolute right-4 top-3.5 h-4 w-4 text-gray-600" />
            </div>
          </div>

          {/* ─── UPI ID Input Section (For Receiving Payments) ─── */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-teal-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-teal-400" />
                <span>{t("settlement.upiId")} ({lang === "ta" ? "பணம் பெற" : "To Receive Payments"})</span>
              </label>
              {upiId && isValidUpiId(upiId) && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Valid VPA
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
                ? "பயணத் தீர்வுத் தொகையை உங்கள் கணக்கிற்கு நேரடியாகப் பெற உங்கள் UPI ID (VPA) ஐப் பதிவு செய்யவும்."
                : "Enter your UPI ID so trip members can settle their debts directly into your bank via UPI deep links."}
            </p>

            {/* Quick Handles */}
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

          {/* ─── Language Preference Switcher ─── */}
          <div className="space-y-2 p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-teal-400" />
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                {t("common.language")} / Language Preference
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleLanguageChange("ta")}
                className={cn(
                  "py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all flex items-center justify-center gap-2",
                  selectedLang === "ta"
                    ? "bg-teal-500/20 border-teal-400 text-teal-300 shadow-md shadow-teal-950/40 ring-1 ring-teal-400/40"
                    : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
                )}
              >
                <span>தமிழ்</span>
                {selectedLang === "ta" && <Check className="h-4 w-4 text-teal-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={cn(
                  "py-3.5 px-4 rounded-2xl text-sm font-bold border transition-all flex items-center justify-center gap-2",
                  selectedLang === "en"
                    ? "bg-teal-500/20 border-teal-400 text-teal-300 shadow-md shadow-teal-950/40 ring-1 ring-teal-400/40"
                    : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
                )}
              >
                <span>English</span>
                {selectedLang === "en" && <Check className="h-4 w-4 text-teal-400" />}
              </button>
            </div>
          </div>

          {/* ─── Security & Non-Custodial Guarantee Banner ─── */}
          <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-2">
            <div className="flex items-center gap-2 text-teal-300 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0" />
              <span>{lang === "ta" ? "100% பாதுகாப்பான கட்டணக் கொள்கை" : "100% Non-Custodial Architecture"}</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t("settlement.nonCustodialSecurityNote")}
            </p>
          </div>

          {/* ─── Account Details & Metadata ─── */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-xs text-gray-500">
            <p className="flex items-center justify-between">
              <span>Account UID:</span>
              <span className="font-mono text-gray-400">{currentUser.uid.substring(0, 16)}…</span>
            </p>
            {userDoc?.createdAt && (
              <p className="flex items-center justify-between">
                <span>Member Since:</span>
                <span className="text-gray-400">
                  {userDoc.createdAt.toDate ? userDoc.createdAt.toDate().toLocaleDateString() : "Active"}
                </span>
              </p>
            )}
          </div>

          {/* ─── Save Changes Button ─── */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 transition-all active:scale-95 shadow-xl shadow-teal-950/60 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>
              {saving
                ? lang === "ta" ? "சேமிக்கிறது…" : "Saving…"
                : lang === "ta" ? "சுயவிவரத்தை சேமி" : "Save Profile & Settings"}
            </span>
          </button>
        </form>
      </main>
    </div>
  );
}
