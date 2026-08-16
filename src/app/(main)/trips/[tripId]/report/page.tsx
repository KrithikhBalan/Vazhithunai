// Purpose: SCR-14 Trip PDF Report View screen — bilingual preview pane for the auto-generated trip audit PDF, with single-tap download (triggers server-side PDF rendering via /api/reports/pdf), native Share Sheet integration, and print action. Requires trips, expenses, and settlements from Modules 2–4.

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { subscribeToTrip } from "@/lib/firebase/trips";
import { subscribeToTripExpenses } from "@/lib/firebase/expenses";
import { subscribeToTripSettlements } from "@/lib/firebase/settlements";
import type { TripDocument } from "@/types/trip";
import type { ExpenseDocument } from "@/types/expense";
import type { SettlementDocument } from "@/types/settlement";
import { formatPaise } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  FileDown,
  Share2,
  Printer,
  CheckCircle2,
  FileText,
  Globe,
  Languages,
  Loader2,
  Receipt,
  Users,
  Coins,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Category Helpers ─────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, string> = {
  fuel: "⛽",
  toll: "🛣️",
  food: "🍽️",
  tea_snacks: "☕",
  hotel: "🏨",
  parking: "🅿️",
  tickets: "🎟️",
  shopping: "🛍️",
  travel: "🚌",
  miscellaneous: "📦",
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  fuel: "Fuel",
  toll: "Toll",
  food: "Food",
  tea_snacks: "Tea & Snacks",
  hotel: "Hotel",
  parking: "Parking",
  tickets: "Tickets",
  shopping: "Shopping",
  travel: "Travel",
  miscellaneous: "Misc",
};

const CATEGORY_LABELS_TA: Record<string, string> = {
  fuel: "எரிபொருள்",
  toll: "டோல்",
  food: "உணவு",
  tea_snacks: "தேநீர்",
  hotel: "தங்குமிடம்",
  parking: "பார்க்கிங்",
  tickets: "டிக்கெட்",
  shopping: "கடை",
  travel: "பயண",
  miscellaneous: "இதர",
};

export default function TripReportPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { lang, t } = useLanguage();
  const { user } = useAuthStore();

  const [trip, setTrip] = useState<TripDocument | null>(null);
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [settlements, setSettlements] = useState<SettlementDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfLang, setPdfLang] = useState<"ta" | "en">(lang as "ta" | "en");
  const [activeTab, setActiveTab] = useState<"summary" | "expenses" | "balances" | "settlements">("summary");

  // ── Real-time subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!tripId) return;
    const unsub = subscribeToTrip(tripId, (data) => {
      setTrip(data);
      setLoading(false);
    });
    return () => unsub();
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    return subscribeToTripExpenses(tripId, setExpenses);
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    return subscribeToTripSettlements(tripId, (all) => {
      setSettlements(all.filter((s) => s.status !== "replaced"));
    });
  }, [tripId]);

  // ── Computed member balances ───────────────────────────────────────────────
  const memberBalances = (trip?.members || []).map((member) => {
    const paid = expenses
      .filter((e) => e.paidBy === member.memberId)
      .reduce((s, e) => s + e.amountPaise, 0);
    const share = expenses
      .flatMap((e) => e.splitDetails)
      .filter((d) => d.memberId === member.memberId)
      .reduce((s, d) => s + d.sharePaise, 0);
    return {
      memberId: member.memberId,
      name: member.name,
      totalPaidPaise: paid,
      totalSharePaise: share,
      netBalancePaise: paid - share,
    };
  });

  const memberName = (id: string) =>
    trip?.members.find((m) => m.memberId === id)?.name ?? id;

  // ── Category totals ────────────────────────────────────────────────────────
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amountPaise;
  });

  // ── PDF Download / Print ───────────────────────────────────────────────────
  const handlePdfAction = useCallback(
    async (download: boolean) => {
      if (!tripId) return;
      setPdfLoading(true);
      try {
        const url = `/api/reports/pdf?tripId=${encodeURIComponent(tripId)}&lang=${pdfLang}&download=${download ? 1 : 0}`;

        if (download) {
          // Programmatic download via <a> click
          const res = await fetch(url);
          if (!res.ok) throw new Error(await res.text());
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = `Vazhithunai_${trip?.name?.replace(/\s+/g, "_") ?? tripId}_Report.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);
          toast.success(
            lang === "ta"
              ? "PDF பதிவிறக்கம் தொடங்கியது!"
              : "PDF download started!"
          );
        } else {
          // Open inline in new tab for print
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch (err) {
        console.error("[PDF Report] Error:", err);
        toast.error(
          lang === "ta"
            ? "PDF உருவாக்குவதில் பிழை"
            : "Failed to generate PDF"
        );
      } finally {
        setPdfLoading(false);
      }
    },
    [tripId, pdfLang, lang, trip]
  );

  // ── Native Share Sheet ────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!tripId || !trip) return;
    setPdfLoading(true);
    try {
      const url = `/api/reports/pdf?tripId=${encodeURIComponent(tripId)}&lang=${pdfLang}&download=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch PDF");
      const blob = await res.blob();
      const file = new File(
        [blob],
        `Vazhithunai_${trip.name.replace(/\s+/g, "_")}_Report.pdf`,
        { type: "application/pdf" }
      );

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${trip.name} — ${lang === "ta" ? "பயண அறிக்கை" : "Trip Report"}`,
          text: lang === "ta"
            ? `வழித்துணை பயன்பாட்டில் இருந்து ${trip.name} பயண அறிக்கை`
            : `Trip report for ${trip.name} from Vazhithunai`,
          files: [file],
        });
      } else {
        // Fallback: download the file
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        toast(lang === "ta" ? "கோப்பு பதிவிறக்கப்பட்டது" : "File saved (sharing not supported on this browser)", { icon: "💾" });
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error(lang === "ta" ? "பகிர முடியவில்லை" : "Sharing failed");
      }
    } finally {
      setPdfLoading(false);
    }
  }, [tripId, pdfLang, lang, trip]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || !trip) {
    return (
      <div className="min-h-screen bg-[#08131d] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const settledCount = settlements.filter((s) => s.status === "settled").length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-28">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/85 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-300" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-teal-400" />
                <span>
                  {lang === "ta" ? "பயண அறிக்கை" : "Trip Report"}
                </span>
              </h1>
              <p className="text-[11px] text-teal-400 font-medium truncate max-w-[180px]">
                {trip.name}
              </p>
            </div>
          </div>

          {/* Language toggle for PDF */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setPdfLang("ta")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                pdfLang === "ta"
                  ? "bg-teal-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              )}
            >
              தமிழ்
            </button>
            <button
              type="button"
              onClick={() => setPdfLang("en")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                pdfLang === "en"
                  ? "bg-teal-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              )}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-6">
        {/* ─── PDF Export Action Cards ─── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Download Button */}
          <button
            type="button"
            onClick={() => handlePdfAction(true)}
            disabled={pdfLoading}
            className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-gradient-to-br from-teal-700/50 to-teal-900/50 border border-teal-500/40 hover:border-teal-400/60 hover:from-teal-600/50 hover:to-teal-800/50 transition-all active:scale-95 disabled:opacity-60"
          >
            {pdfLoading ? (
              <Loader2 className="h-7 w-7 text-teal-300 animate-spin" />
            ) : (
              <FileDown className="h-7 w-7 text-teal-300 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-sm font-bold text-teal-200">
              {lang === "ta" ? "PDF பதிவிறக்கம்" : "Download PDF"}
            </span>
            <span className="text-[10px] text-teal-400">
              {pdfLang === "ta" ? "தமிழில்" : "In English"}
            </span>
          </button>

          {/* Print / Preview Button */}
          <button
            type="button"
            onClick={() => handlePdfAction(false)}
            disabled={pdfLoading}
            className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95 disabled:opacity-60"
          >
            <Printer className="h-7 w-7 text-gray-300 group-hover:text-white group-hover:scale-110 transition-all" />
            <span className="text-sm font-bold text-gray-200">
              {lang === "ta" ? "அச்சிடு / முன்னோட்டம்" : "Print / Preview"}
            </span>
            <span className="text-[10px] text-gray-400">
              {lang === "ta" ? "புதிய தாவலில்" : "Opens in new tab"}
            </span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            disabled={pdfLoading}
            className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95 disabled:opacity-60"
          >
            <Share2 className="h-7 w-7 text-gray-300 group-hover:text-white group-hover:scale-110 transition-all" />
            <span className="text-sm font-bold text-gray-200">
              {lang === "ta" ? "பகிர்" : "Share PDF"}
            </span>
            <span className="text-[10px] text-gray-400">
              {lang === "ta" ? "நேட்டிவ் ஷேர் ஷீட்" : "Native share sheet"}
            </span>
          </button>
        </section>

        {/* PDF Language hint */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
          <Languages className="h-4 w-4 text-teal-400 shrink-0" />
          <p className="text-xs text-teal-300">
            {pdfLang === "ta"
              ? lang === "ta"
                ? "PDF தமிழ் மொழியில் (நோட்டோ சான்ஸ் தமிழ் எழுத்துருவுடன்) உருவாக்கப்படும்."
                : "PDF will be generated in Tamil with NotoSansTamil font (full Unicode glyphs)."
              : lang === "ta"
              ? "PDF ஆங்கிலத்தில் உருவாக்கப்படும்."
              : "PDF will be generated in English."}
          </p>
        </div>

        {/* ─── In-App Preview Tabs ─── */}
        <section>
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-5 overflow-x-auto">
            {(
              [
                { id: "summary", labelEn: "Summary", labelTa: "சுருக்கம்", icon: BarChart3 },
                { id: "expenses", labelEn: "Expenses", labelTa: "செலவுகள்", icon: Receipt },
                { id: "balances", labelEn: "Balances", labelTa: "இருப்பு", icon: Users },
                { id: "settlements", labelEn: "Settlements", labelTa: "தீர்வுகள்", icon: Coins },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-1 justify-center",
                    isActive
                      ? "bg-teal-500 text-white shadow-md"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{lang === "ta" ? tab.labelTa : tab.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* ── Tab: Summary ── */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              {/* Trip Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-900/50 via-[#0d2235] to-[#08131d] border border-teal-500/40">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">{trip.name}</h2>
                    <p className="text-sm text-teal-400">{trip.destination}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {trip.startDate} → {trip.endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-white font-mono">
                      {formatPaise(trip.totalExpensePaise)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {lang === "ta" ? "மொத்த செலவு" : "Total spent"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-lg font-bold text-teal-300">{expenses.length}</p>
                    <p className="text-[10px] text-gray-400">{lang === "ta" ? "செலவுகள்" : "Expenses"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-teal-300">{trip.members.length}</p>
                    <p className="text-[10px] text-gray-400">{lang === "ta" ? "உறுப்பினர்கள்" : "Members"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-teal-300 font-mono">
                      {trip.members.length > 0
                        ? formatPaise(Math.round(trip.totalExpensePaise / trip.members.length))
                        : "₹0"}
                    </p>
                    <p className="text-[10px] text-gray-400">{lang === "ta" ? "ஒருவருக்கு சராசரி" : "Avg/member"}</p>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {lang === "ta" ? "வகையின்படி செலவு" : "By Category"}
                </h3>
                {Object.entries(categoryTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, total]) => {
                    const pct = trip.totalExpensePaise > 0
                      ? (total / trip.totalExpensePaise) * 100
                      : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-300 flex items-center gap-1.5">
                            <span>{CATEGORY_ICON[cat]}</span>
                            <span>
                              {lang === "ta"
                                ? CATEGORY_LABELS_TA[cat]
                                : CATEGORY_LABELS_EN[cat]}
                            </span>
                          </span>
                          <span className="font-bold text-white font-mono">
                            {formatPaise(total)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Settlement summary */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className={cn(
                  "p-2.5 rounded-xl",
                  settledCount === settlements.length && settlements.length > 0
                    ? "bg-emerald-500/20"
                    : "bg-amber-500/20"
                )}>
                  <CheckCircle2 className={cn(
                    "h-5 w-5",
                    settledCount === settlements.length && settlements.length > 0
                      ? "text-emerald-400"
                      : "text-amber-400"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {settledCount} / {settlements.length}{" "}
                    {lang === "ta" ? "தீர்வுகள் நிறைவு" : "Settlements complete"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {lang === "ta"
                      ? `${settlements.length - settledCount} நிலுவையில் உள்ளது`
                      : `${settlements.length - settledCount} pending`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Expenses ── */}
          {activeTab === "expenses" && (
            <div className="space-y-2">
              {expenses.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {lang === "ta" ? "இன்னும் செலவுகள் இல்லை" : "No expenses recorded yet"}
                </div>
              ) : (
                expenses.map((expense) => (
                  <div
                    key={expense.expenseId}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">
                        {CATEGORY_ICON[expense.category]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {expense.description}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {lang === "ta"
                            ? CATEGORY_LABELS_TA[expense.category]
                            : CATEGORY_LABELS_EN[expense.category]}{" "}
                          · {memberName(expense.paidBy)}{" "}
                          {lang === "ta" ? "செலுத்தினார்" : "paid"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-extrabold text-teal-300 font-mono shrink-0">
                      {formatPaise(expense.amountPaise)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Balances ── */}
          {activeTab === "balances" && (
            <div className="space-y-2">
              {memberBalances.map((mb) => (
                <div
                  key={mb.memberId}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0",
                      mb.netBalancePaise > 0
                        ? "bg-emerald-500/20 text-emerald-300"
                        : mb.netBalancePaise < 0
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-gray-500/20 text-gray-300"
                    )}>
                      {mb.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{mb.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {lang === "ta" ? "செலுத்தியது" : "Paid"}: {formatPaise(mb.totalPaidPaise)}{" "}
                        · {lang === "ta" ? "பங்கு" : "Share"}: {formatPaise(mb.totalSharePaise)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-sm font-extrabold font-mono",
                      mb.netBalancePaise > 0
                        ? "text-emerald-400"
                        : mb.netBalancePaise < 0
                        ? "text-rose-400"
                        : "text-gray-400"
                    )}>
                      {mb.netBalancePaise >= 0 ? "+" : ""}
                      {formatPaise(mb.netBalancePaise)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {mb.netBalancePaise > 0
                        ? lang === "ta" ? "கடன் வரவு" : "Creditor"
                        : mb.netBalancePaise < 0
                        ? lang === "ta" ? "கடன்படுவோர்" : "Debtor"
                        : lang === "ta" ? "சமன்" : "Settled"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Tab: Settlements ── */}
          {activeTab === "settlements" && (
            <div className="space-y-2">
              {settlements.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {lang === "ta" ? "தீர்வு பரிவர்த்தனைகள் இல்லை" : "No settlement transactions"}
                </div>
              ) : (
                settlements.map((sett) => (
                  <div
                    key={sett.settlementId}
                    className={cn(
                      "p-4 rounded-xl border flex items-center justify-between gap-3",
                      sett.status === "settled"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : sett.status === "disputed"
                        ? "bg-rose-500/5 border-rose-500/20"
                        : "bg-white/[0.03] border-white/10"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {memberName(sett.fromMemberId)}{" "}
                        <span className="text-gray-400 font-normal">
                          → {memberName(sett.toMemberId)}
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {sett.status === "settled"
                          ? lang === "ta" ? "✓ தீர்க்கப்பட்டது" : "✓ Settled"
                          : sett.status === "disputed"
                          ? lang === "ta" ? "⚠ தகராறு" : "⚠ Disputed"
                          : lang === "ta" ? "⏳ நிலுவையில்" : "⏳ Pending"}
                      </p>
                    </div>

                    <p className="text-base font-extrabold text-teal-300 font-mono shrink-0">
                      {formatPaise(sett.amountPaise)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
