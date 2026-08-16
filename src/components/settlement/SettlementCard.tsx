// Purpose: Reusable UI card for a single settlement transaction (debtor → creditor), showing amount, status badge, UPI Pay Now button hook, and Mark as Paid confirmation — used in SCR-13 Settlement Screen.

"use client";

import { useState } from "react";
import { formatPaise, buildUpiUrl } from "@/lib/utils";
import { markSettled, markDisputed } from "@/lib/firebase/settlements";
import type { SettlementDocument } from "@/types/settlement";
import type { TripMember } from "@/types/trip";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Smartphone,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface SettlementCardProps {
  settlement: SettlementDocument;
  members: TripMember[];
  currentUserId?: string;
  lang: "ta" | "en";
}

export function SettlementCard({
  settlement,
  members,
  currentUserId,
  lang,
}: SettlementCardProps) {
  const [saving, setSaving] = useState(false);
  const [showRefInput, setShowRefInput] = useState(false);
  const [upiRef, setUpiRef] = useState("");

  const fromMember = members.find((m) => m.memberId === settlement.fromMemberId);
  const toMember = members.find((m) => m.memberId === settlement.toMemberId);

  const isCurrentUserDebtor = currentUserId === settlement.fromMemberId;
  const isCurrentUserCreditor = currentUserId === settlement.toMemberId;
  const isPending = settlement.status === "pending";
  const isSettled = settlement.status === "settled";
  const isDisputed = settlement.status === "disputed";

  // Build UPI deep link — hooks into Module 5 (Maps & Places) for UPI ID lookup
  const upiLink =
    toMember?.upiId
      ? buildUpiUrl({
          pa: toMember.upiId,
          pn: toMember.name,
          am: settlement.amountPaise,
          tn: `Vazhithunai: ${fromMember?.name ?? "?"} → ${toMember.name}`,
        })
      : null;

  const handlePayNow = () => {
    if (upiLink) {
      window.open(upiLink, "_blank");
    } else {
      toast(
        lang === "ta"
          ? `${toMember?.name}-இன் UPI ID பதிவு செய்யப்படவில்லை`
          : `${toMember?.name}'s UPI ID is not set up yet`,
        { icon: "ℹ️" }
      );
    }
    setShowRefInput(true);
  };

  const handleMarkPaid = async () => {
    setSaving(true);
    try {
      await markSettled(settlement.settlementId, upiRef.trim() || null);
      toast.success(
        lang === "ta" ? "தீர்வு பதிவு செய்யப்பட்டது!" : "Settlement recorded!"
      );
      setShowRefInput(false);
    } catch (err) {
      console.error("markSettled error:", err);
      toast.error(lang === "ta" ? "பதிவு தோல்வி" : "Failed to record settlement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "p-4 rounded-2xl border space-y-3 transition-all",
        isPending && "bg-white/[0.03] border-white/10 hover:border-teal-500/20",
        isSettled && "bg-emerald-500/5 border-emerald-500/20 opacity-70",
        isDisputed && "bg-amber-500/5 border-amber-500/20"
      )}
    >
      {/* Transaction row: debtor → creditor → amount */}
      <div className="flex items-center gap-3">
        {/* Debtor */}
        <div className="flex flex-col items-center gap-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-sm font-bold text-rose-300">
            {fromMember?.name.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="text-[10px] text-rose-300 font-medium truncate max-w-[56px] text-center">
            {fromMember?.name ?? settlement.fromMemberId}
          </span>
        </div>

        {/* Arrow + amount */}
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-base font-extrabold text-white font-mono">
            {formatPaise(settlement.amountPaise)}
          </span>
          <div className="flex items-center gap-1 text-gray-500">
            <div className="h-px w-12 bg-gray-600" />
            <ArrowRight className="h-3.5 w-3.5 text-teal-400" />
            <div className="h-px w-12 bg-gray-600" />
          </div>
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
            {isSettled
              ? (lang === "ta" ? "தீர்க்கப்பட்டது" : "Settled")
              : isPending
              ? (lang === "ta" ? "நிலுவையில்" : "Pending")
              : (lang === "ta" ? "சர்ச்சை" : "Disputed")}
          </span>
        </div>

        {/* Creditor */}
        <div className="flex flex-col items-center gap-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-300">
            {toMember?.name.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="text-[10px] text-emerald-300 font-medium truncate max-w-[56px] text-center">
            {toMember?.name ?? settlement.toMemberId}
          </span>
        </div>

        {/* Status icon */}
        <div className="shrink-0">
          {isSettled && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          {isDisputed && <AlertTriangle className="h-5 w-5 text-amber-400" />}
          {isPending && <Clock className="h-5 w-5 text-gray-500" />}
        </div>
      </div>

      {/* Action buttons (only for pending settlements) */}
      {isPending && (
        <div className="flex gap-2 pt-1 border-t border-white/5">
          {/* Pay Now button — UPI deep link hook */}
          {isCurrentUserDebtor && (
            <button
              type="button"
              onClick={handlePayNow}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-500 hover:to-teal-400 transition-all active:scale-95 shadow-md shadow-teal-950/40"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>{lang === "ta" ? "இப்போது செலுத்து" : "Pay Now (UPI)"}</span>
            </button>
          )}

          {/* Mark as Paid button — for debtor to confirm */}
          {(isCurrentUserDebtor || isCurrentUserCreditor) && (
            <button
              type="button"
              onClick={() => setShowRefInput((v) => !v)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all active:scale-95"
            >
              <Banknote className="h-3.5 w-3.5" />
              <span>{lang === "ta" ? "செலுத்தியதாக குறி" : "Mark as Paid"}</span>
            </button>
          )}
        </div>
      )}

      {/* UPI Reference Input + Confirm */}
      {showRefInput && isPending && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          <input
            type="text"
            placeholder={
              lang === "ta"
                ? "UPI பரிவர்த்தனை ஐடி (விரும்பினால்)"
                : "UPI transaction ID (optional)"
            }
            value={upiRef}
            onChange={(e) => setUpiRef(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={saving}
            className="w-full py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all active:scale-95"
          >
            {saving
              ? (lang === "ta" ? "சேமிக்கிறது…" : "Saving…")
              : (lang === "ta" ? "கட்டணத்தை உறுதிப்படுத்து" : "Confirm Payment")}
          </button>
        </div>
      )}

      {/* Settled reference display */}
      {isSettled && settlement.paymentReference && (
        <p className="text-[10px] text-gray-500 font-mono truncate">
          Ref: {settlement.paymentReference}
        </p>
      )}
    </div>
  );
}
