// Purpose: SCR-13 Settlement Screen — computes member net balances using the greedy minimization engine, writes minimal settlement transactions to Firestore, and displays Pay Now UPI hooks and status indicators for the entire trip group.

"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { subscribeToTrip } from "@/lib/firebase/trips";
import { subscribeToTripExpenses } from "@/lib/firebase/expenses";
import { subscribeToTripSettlements, writeSettlements } from "@/lib/firebase/settlements";
import { computeSettlements } from "@/lib/settlementEngine";
import type { TripDocument } from "@/types/trip";
import type { ExpenseDocument } from "@/types/expense";
import type { SettlementDocument } from "@/types/settlement";
import { BalanceCard } from "@/components/settlement/BalanceCard";
import { SettlementCard } from "@/components/settlement/SettlementCard";
import { formatPaise } from "@/lib/utils";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Wallet,
  ChevronDown,
  ChevronUp,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SettlementPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { t, lang } = useLanguage();
  const { user } = useAuthStore();

  const [trip, setTrip] = useState<TripDocument | null>(null);
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [settlements, setSettlements] = useState<SettlementDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [showBalances, setShowBalances] = useState(true);

  // Subscribe to trip, expenses, and settlements in real-time
  useEffect(() => {
    if (!tripId) return;

    const unsubTrip = subscribeToTrip(tripId, (data) => {
      if (data) { setTrip(data); setLoading(false); }
    });

    const unsubExpenses = subscribeToTripExpenses(tripId, setExpenses);
    const unsubSettlements = subscribeToTripSettlements(tripId, setSettlements);

    return () => {
      unsubTrip();
      unsubExpenses();
      unsubSettlements();
    };
  }, [tripId]);

  // Compute balances locally (derived, not stored — pure display)
  const { balances, edges } = useMemo(() => {
    if (!trip || expenses.length === 0) {
      return { balances: [], edges: [] };
    }
    return computeSettlements(trip.members, expenses);
  }, [trip, expenses]);

  // Totals for the header stats bar
  const totalExpensePaise = expenses.reduce((s, e) => s + e.amountPaise, 0);
  const pendingCount = settlements.filter((s) => s.status === "pending").length;
  const settledCount = settlements.filter((s) => s.status === "settled").length;
  const allSettled = pendingCount === 0 && settledCount > 0;

  // Recompute and write minimal settlements to Firestore
  const handleRecompute = async () => {
    if (!trip || expenses.length === 0) {
      toast.error(lang === "ta" ? "செலவுகள் எதுவும் இல்லை" : "No expenses to settle");
      return;
    }
    setRecomputing(true);
    try {
      const { edges: newEdges } = computeSettlements(trip.members, expenses);
      await writeSettlements(tripId, newEdges);
      toast.success(
        lang === "ta"
          ? `${newEdges.length} குறைந்தபட்ச பரிவர்த்தனைகள் கணக்கிடப்பட்டன!`
          : `${newEdges.length} minimal transactions computed!`
      );
    } catch (err) {
      console.error("writeSettlements error:", err);
      toast.error(lang === "ta" ? "கணக்கீடு தோல்வி" : "Failed to compute settlements");
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08131d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-teal-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading settlements…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/80 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-300" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white">
                {t("settlement.settleUp")}
              </h1>
              <p className="text-[11px] text-teal-400 font-medium truncate max-w-[180px]">
                {trip?.name}
              </p>
            </div>
          </div>

          {/* Recompute button */}
          <button
            type="button"
            id="recompute-settlements-btn"
            onClick={handleRecompute}
            disabled={recomputing || expenses.length === 0}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95",
              "bg-teal-600/20 border border-teal-500/30 text-teal-300",
              "hover:bg-teal-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", recomputing && "animate-spin")} />
            <span className="hidden sm:inline">{t("settlement.recompute")}</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* ─── Overview Stats ─── */}
        <section className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center justify-center gap-1">
              <Wallet className="h-3 w-3" />
              {lang === "ta" ? "மொத்தம்" : "Total"}
            </p>
            <p className="text-base font-extrabold text-white font-mono">
              {formatPaise(totalExpensePaise)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
              {lang === "ta" ? "நிலுவை" : "Pending"}
            </p>
            <p className="text-base font-extrabold text-amber-300 font-mono">
              {pendingCount}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
              {lang === "ta" ? "தீர்க்கப்பட்டது" : "Settled"}
            </p>
            <p className="text-base font-extrabold text-emerald-300 font-mono">
              {settledCount}
            </p>
          </div>
        </section>

        {/* ─── All Settled Banner ─── */}
        {allSettled && (
          <section className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-300">{t("settlement.allSettled")}</p>
              <p className="text-xs text-emerald-400/70">
                {lang === "ta"
                  ? "இந்த பயணத்தின் அனைத்து தீர்வுகளும் முடிந்தன"
                  : "All settlements for this trip are complete"}
              </p>
            </div>
          </section>
        )}

        {/* ─── Member Balances Collapsible ─── */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBalances((v) => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
          >
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-teal-400" />
              {t("settlement.balances")}
              <span className="text-[10px] text-gray-400 font-normal bg-white/5 px-2 py-0.5 rounded-full">
                {balances.length} {lang === "ta" ? "உறுப்பினர்கள்" : "members"}
              </span>
            </h2>
            {showBalances ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {showBalances && (
            <div className="px-4 pb-4 space-y-2">
              {balances.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">
                  {t("settlement.noSettlementsYet")}
                </p>
              ) : (
                balances.map((balance) => (
                  <BalanceCard
                    key={balance.memberId}
                    balance={balance}
                    isCurrentUser={balance.memberId === user?.uid}
                    lang={lang}
                  />
                ))
              )}
            </div>
          )}
        </section>

        {/* ─── Settlement Transactions ─── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              {lang === "ta" ? "தீர்வு பரிவர்த்தனைகள்" : "Settlement Transactions"}
            </h2>
            {settlements.length > 0 && (
              <span className="text-[10px] text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full font-medium">
                {edges.length} {lang === "ta" ? "குறைந்தபட்சம்" : "minimized"}
              </span>
            )}
          </div>

          {settlements.length === 0 && expenses.length > 0 && (
            <div className="p-6 rounded-2xl border border-dashed border-white/15 text-center space-y-3 bg-white/[0.01]">
              <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                {lang === "ta"
                  ? "தீர்வுகளை கணக்கிட மேலே உள்ள 'இருப்புகளை மீண்டும் கணக்கிடு' பொத்தானை அழுத்தவும்"
                  : "Press the Recompute Balances button above to generate minimal settlement transactions"}
              </p>
              <button
                type="button"
                onClick={handleRecompute}
                disabled={recomputing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-colors"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", recomputing && "animate-spin")} />
                {lang === "ta" ? "தீர்வுகளை உருவாக்கு" : "Generate Settlements"}
              </button>
            </div>
          )}

          {settlements.length === 0 && expenses.length === 0 && (
            <div className="p-6 rounded-2xl border border-dashed border-white/15 text-center space-y-2">
              <p className="text-xs text-gray-400">
                {t("settlement.noSettlementsYet")}
              </p>
              <Link
                href={`/trips/${tripId}/expenses/new`}
                className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-semibold transition-colors"
              >
                {lang === "ta" ? "செலவுகளை சேர்க்கவும்" : "Add expenses first"}
              </Link>
            </div>
          )}

          {settlements
            .filter((s) => s.status !== "replaced")
            .map((settlement) => (
              <SettlementCard
                key={settlement.settlementId}
                settlement={settlement}
                members={trip?.members ?? []}
                currentUserId={user?.uid}
                lang={lang}
              />
            ))}
        </section>
      </main>
    </div>
  );
}
