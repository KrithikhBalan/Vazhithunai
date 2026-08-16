// Purpose: Main User Dashboard Screen showing user profile, active trip cards with real-time total expense paise balances, and quick actions to Expense Ledger (SCR-11) and Add Expense (SCR-12).

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { signOut } from "@/lib/firebase/auth";
import { subscribeToUserTrips, ensureDemoTrip } from "@/lib/firebase/trips";
import type { TripDocument } from "@/types/trip";
import { formatPaise, formatPhone } from "@/lib/utils";
import {
  MapPin,
  LogOut,
  User,
  Plus,
  Receipt,
  Users,
  Compass,
  ArrowRight,
  Sparkles,
  Wallet,
  Route,
  FileText,
  Bot,
} from "lucide-react";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const router = useRouter();
  const { user, userDoc, loading } = useAuthStore();
  const { lang, t, setLanguage } = useLanguage();
  const [trips, setTrips] = useState<TripDocument[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  // Guard — redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/splash");
    }
  }, [user, loading, router]);

  // Load user trips in real time
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToUserTrips(user.uid, async (list) => {
      if (list.length === 0) {
        // Ensure default demo trip exists
        const demo = await ensureDemoTrip({
          uid: user.uid,
          name: userDoc?.name || user.displayName || "You",
          phone: user.phoneNumber || userDoc?.phone || undefined,
        });
        setTrips([demo]);
      } else {
        setTrips(list);
      }
      setTripsLoading(false);
    });

    return () => unsub();
  }, [user, userDoc]);

  const handleSignOut = async () => {
    await signOut();
    toast.success(lang === "ta" ? "வெளியேறினீர்கள்" : "Signed out");
    router.push("/splash");
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#08131d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-teal-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const currentUser = user || {
    uid: "guest_user_123",
    displayName: "Karthik Raja",
    phoneNumber: "+919876543210",
  };

  // Calculate cumulative expense across all active trips
  const cumulativeExpensesPaise = trips.reduce((sum, trip) => sum + (trip.totalExpensePaise || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/80 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/profile"
            className="flex items-center gap-3 group p-1.5 -m-1.5 rounded-2xl hover:bg-white/5 transition-all"
            title={lang === "ta" ? "சுயவிவரம் & UPI ஐடி" : "Profile & UPI Settings"}
          >
            <div className="w-10 h-10 rounded-full bg-teal-600/30 border border-teal-500/30 flex items-center justify-center group-hover:border-teal-400 transition-colors">
              <User className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <span>{t("common.greeting")}</span>
                {userDoc?.upiId ? (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">UPI ✓</span>
                ) : (
                  <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">Set UPI</span>
                )}
              </p>
              <p className="font-semibold text-white text-sm group-hover:text-teal-300 transition-colors">
                {userDoc?.name || currentUser.displayName || (lang === "ta" ? "பயணி" : "Traveller")}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Profile Link Button */}
            <Link
              href="/profile"
              className="p-2 rounded-xl text-gray-400 hover:text-teal-300 hover:bg-white/5 transition-colors"
              title={t("common.profile")}
            >
              <User className="h-4 w-4" />
            </Link>

            {/* Language Switcher */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  lang === "en" ? "bg-teal-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("ta")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  lang === "ta" ? "bg-teal-500 text-black shadow-sm" : "text-gray-400 hover:text-white"
                }`}
              >
                தமிழ்
              </button>
            </div>

            {/* Sign Out */}
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
              title={t("common.signOut")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ─── Hero Overview Card ─── */}
        <section className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-teal-900/50 via-[#0d2235] to-[#08131d] border border-teal-500/30 shadow-2xl shadow-teal-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300">
                <Wallet className="h-4 w-4" />
                {lang === "ta" ? "மொத்த பயணச் செலவு" : "Total Trip Spending"}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                {formatPaise(cumulativeExpensesPaise)}
              </h2>
              <p className="text-xs text-gray-300">
                {trips.length} {lang === "ta" ? "செயலில் உள்ள பயணங்கள்" : "active trips recorded"}
              </p>
            </div>

            {trips[0] && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/explore"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 transition-all shadow-lg shadow-teal-950/50 active:scale-95"
                >
                  <Compass className="h-4 w-4" />
                  <span>{t("tourist.explore")}</span>
                </Link>

                <Link
                  href={`/trips/${trips[0].tripId}/route`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-teal-300 bg-teal-950/60 border border-teal-500/40 hover:bg-teal-900/60 transition-all active:scale-95"
                >
                  <Route className="h-4 w-4" />
                  <span>{t("tourist.routeAndCost")}</span>
                </Link>

                <Link
                  href={`/trips/${trips[0].tripId}/expenses`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-200 bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                >
                  <Receipt className="h-4 w-4" />
                  <span>{t("expenses.ledger")}</span>
                </Link>

                <Link
                  href={`/trips/${trips[0].tripId}/settlement`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/40 hover:bg-amber-900/60 transition-all active:scale-95"
                >
                  <Wallet className="h-4 w-4" />
                  <span>{t("settlement.settleUp")}</span>
                </Link>

                <Link
                  href={`/trips/${trips[0].tripId}/ai`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-200 bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/40 transition-all active:scale-95"
                >
                  <Bot className="h-4 w-4" />
                  <span>{lang === "ta" ? "AI உதவியாளர்" : "AI Assistant"}</span>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ─── Trips Section ─── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-teal-400" />
              <span>{lang === "ta" ? "உங்கள் பயணங்கள்" : "Your Trips"}</span>
            </h3>
          </div>

          {tripsLoading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading trips…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trips.map((trip) => (
                <div
                  key={trip.tripId}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-500/30 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-base font-bold text-white truncate">
                        {trip.name}
                      </h4>
                      <p className="text-xs text-teal-400 flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{trip.destination}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-teal-300 font-mono block">
                        {formatPaise(trip.totalExpensePaise || 0)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {lang === "ta" ? "மொத்த செலவு" : "Total spent"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2">
                    {trip.description || "Trip with friends"}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-teal-400" />
                      <span>{trip.members?.length || 0} {lang === "ta" ? "உறுப்பினர்கள்" : "members"}</span>
                      {trip.stops && trip.stops.length > 0 && (
                        <span className="ml-1 text-[10px] text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded">
                          {trip.stops.length} {lang === "ta" ? "நிறுத்தங்கள்" : "stops"}
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/trips/${trip.tripId}/route`}
                        className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold transition-colors"
                      >
                        <Route className="h-3.5 w-3.5" />
                        <span>{lang === "ta" ? "பாதை" : "Route"}</span>
                      </Link>

                      <Link
                        href={`/trips/${trip.tripId}/report`}
                        className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>{lang === "ta" ? "அறிக்கை" : "Report"}</span>
                      </Link>

                      <Link
                        href={`/trips/${trip.tripId}/expenses`}
                        className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold transition-colors"
                      >
                        <span>{t("expenses.ledger")}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
