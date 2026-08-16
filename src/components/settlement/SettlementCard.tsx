// Purpose: Reusable UI card for a single settlement transaction (debtor → creditor), managing UPI deep-link generation, non-custodial app handoff, debtor initiation tracking, and creditor-only receipt confirmation.

"use client";

import { useState, useEffect } from "react";
import { formatPaise, buildUpiUrl, isValidUpiId } from "@/lib/utils";
import {
  recordPaymentInitiated,
  markSettled,
  markDisputed,
} from "@/lib/firebase/settlements";
import { getUser } from "@/lib/firebase/users";
import type { SettlementDocument } from "@/types/settlement";
import type { TripMember } from "@/types/trip";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Smartphone,
  Check,
  QrCode,
  Copy,
  ExternalLink,
  ShieldCheck,
  Send,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface SettlementCardProps {
  settlement: SettlementDocument;
  tripName?: string;
  members: TripMember[];
  currentUserId?: string;
  lang: "ta" | "en";
}

export function SettlementCard({
  settlement,
  tripName = "Trip",
  members,
  currentUserId,
  lang,
}: SettlementCardProps) {
  const [saving, setSaving] = useState(false);
  const [showDebtorRefInput, setShowDebtorRefInput] = useState(false);
  const [upiRef, setUpiRef] = useState(settlement.paymentReference || "");
  const [recipientUpiId, setRecipientUpiId] = useState<string | null>(null);
  const [customUpiInput, setCustomUpiInput] = useState("");
  const [showCustomUpiModal, setShowCustomUpiModal] = useState(false);

  const fromMember = members.find((m) => m.memberId === settlement.fromMemberId);
  const toMember = members.find((m) => m.memberId === settlement.toMemberId);

  const isCurrentUserDebtor = currentUserId === settlement.fromMemberId;
  const isCurrentUserCreditor = currentUserId === settlement.toMemberId;
  const isPending = settlement.status === "pending";
  const isSettled = settlement.status === "settled";
  const isDisputed = settlement.status === "disputed";
  const isInitiatedByDebtor = settlement.initiatedByDebtor || false;

  // Resolve recipient's UPI ID from trip member data or directly from users collection
  useEffect(() => {
    if (toMember?.upiId) {
      setRecipientUpiId(toMember.upiId);
    } else if (settlement.toMemberId) {
      getUser(settlement.toMemberId).then((userDoc) => {
        if (userDoc?.upiId) {
          setRecipientUpiId(userDoc.upiId);
        }
      });
    }
  }, [toMember, settlement.toMemberId]);

  const activeUpiId = recipientUpiId || customUpiInput.trim() || null;

  // Generate UPI Deep Link Protocol: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
  const upiLink = activeUpiId
    ? buildUpiUrl({
        pa: activeUpiId,
        pn: toMember?.name || "Member",
        am: settlement.amountPaise,
        tn: `Vazhithunai: ${tripName} (${settlement.settlementId.slice(0, 8)})`,
      })
    : null;

  // 1. Debtor Click: Handoff to external UPI app (GPay / PhonePe / Paytm / BHIM)
  const handlePayNow = async () => {
    if (!upiLink) {
      setShowCustomUpiModal(true);
      return;
    }

    try {
      // Record payment initiation state in Firestore
      await recordPaymentInitiated(settlement.settlementId, upiRef.trim() || null);
    } catch (e) {
      console.warn("Could not record initiation:", e);
    }

    // Trigger external UPI app intent
    window.location.href = upiLink;

    setShowDebtorRefInput(true);
    toast.success(
      lang === "ta"
        ? "UPI ஆப்பில் செலுத்தப்படுகிறது…"
        : "Opening installed UPI app…",
      { icon: "📱" }
    );
  };

  // 2. Debtor records that they have sent payment with optional reference/UTR
  const handleDebtorConfirmSent = async () => {
    setSaving(true);
    try {
      await recordPaymentInitiated(settlement.settlementId, upiRef.trim() || null);
      toast.success(
        lang === "ta"
          ? "பணம் அனுப்பப்பட்டதாக குறிக்கப்பட்டது. பெறுநர் உறுதிப்படுத்தியதும் தீர்க்கப்படும்."
          : "Payment recorded! Recipient will confirm once received."
      );
      setShowDebtorRefInput(false);
    } catch (err) {
      console.error("recordPaymentInitiated error:", err);
      toast.error(lang === "ta" ? "பதிவு தோல்வி" : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  // 3. Creditor Action: Mark as Received (ONLY Creditor can finalize settlement!)
  const handleCreditorConfirmReceived = async () => {
    setSaving(true);
    try {
      await markSettled(settlement.settlementId, upiRef.trim() || settlement.paymentReference || null);
      toast.success(
        lang === "ta"
          ? "பணம் பெறப்பட்டது உறுதி செய்யப்பட்டது! 🎉"
          : "Payment received & settled! 🎉"
      );
    } catch (err) {
      console.error("markSettled error:", err);
      toast.error(lang === "ta" ? "உறுதிப்படுத்தல் தோல்வி" : "Failed to confirm receipt");
    } finally {
      setSaving(false);
    }
  };

  // 4. Creditor Action: Dispute Payment
  const handleCreditorDispute = async () => {
    if (
      !confirm(
        lang === "ta"
          ? "இந்த பரிவர்த்தனையை சர்ச்சைக்குரியதாக குறிக்க விரும்புகிறீர்களா?"
          : "Are you sure you want to dispute this payment?"
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      await markDisputed(settlement.settlementId);
      toast(
        lang === "ta"
          ? "சர்ச்சைக்குரியதாக குறிக்கப்பட்டது"
          : "Marked as disputed",
        { icon: "⚠️" }
      );
    } catch (err) {
      console.error("markDisputed error:", err);
      toast.error(lang === "ta" ? "தோல்வி" : "Failed to dispute");
    } finally {
      setSaving(false);
    }
  };

  const copyUpiId = (idToCopy: string) => {
    navigator.clipboard.writeText(idToCopy);
    toast.success(lang === "ta" ? "UPI ஐடி நகலெடுக்கப்பட்டது!" : "UPI ID copied!");
  };

  return (
    <div
      className={cn(
        "p-4 sm:p-5 rounded-3xl border space-y-4 transition-all",
        isPending && !isInitiatedByDebtor && "bg-white/[0.03] border-white/10 hover:border-teal-500/25",
        isPending && isInitiatedByDebtor && "bg-amber-500/[0.06] border-amber-500/30",
        isSettled && "bg-emerald-500/[0.06] border-emerald-500/25 opacity-90",
        isDisputed && "bg-rose-500/[0.06] border-rose-500/30"
      )}
    >
      {/* ─── Transaction Flow (From → Amount → To) ─── */}
      <div className="flex items-center justify-between gap-3">
        {/* Debtor (From) */}
        <div className="flex flex-col items-center gap-1.5 min-w-0 max-w-[90px]">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-sm font-bold text-rose-300 shadow-inner">
            {fromMember?.name.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="text-xs text-rose-300 font-semibold truncate text-center w-full">
            {fromMember?.name ?? settlement.fromMemberId}
          </span>
          <span className="text-[10px] text-rose-400/80 font-mono uppercase tracking-wider">
            {lang === "ta" ? "கொடுக்க வேண்டும்" : "Debtor"}
          </span>
        </div>

        {/* Amount & Direction Arrow */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-lg sm:text-xl font-extrabold text-white font-mono tracking-tight">
            {formatPaise(settlement.amountPaise)}
          </span>

          <div className="flex items-center gap-1 w-full max-w-[120px] justify-center text-gray-500">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-teal-500/40" />
            <ArrowRight className="h-4 w-4 text-teal-400 shrink-0" />
            <div className="h-px flex-1 bg-gradient-to-r from-teal-500/40 to-transparent" />
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1">
            {isSettled && (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {lang === "ta" ? "தீர்க்கப்பட்டது" : "Settled"}
              </span>
            )}
            {isDisputed && (
              <span className="text-[10px] text-rose-400 font-bold bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {lang === "ta" ? "சர்ச்சை" : "Disputed"}
              </span>
            )}
            {isPending && !isInitiatedByDebtor && (
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lang === "ta" ? "நிலுவையில்" : "Pending"}
              </span>
            )}
            {isPending && isInitiatedByDebtor && (
              <span className="text-[10px] text-teal-300 font-bold bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <Clock className="h-3 w-3" />
                {lang === "ta" ? "உறுதிப்படுத்தல் தேவை" : "Awaiting Creditor"}
              </span>
            )}
          </div>
        </div>

        {/* Creditor (To) */}
        <div className="flex flex-col items-center gap-1.5 min-w-0 max-w-[90px]">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-sm font-bold text-emerald-300 shadow-inner">
            {toMember?.name.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="text-xs text-emerald-300 font-semibold truncate text-center w-full">
            {toMember?.name ?? settlement.toMemberId}
          </span>
          <span className="text-[10px] text-emerald-400/80 font-mono uppercase tracking-wider">
            {lang === "ta" ? "வர வேண்டும்" : "Creditor"}
          </span>
        </div>
      </div>

      {/* ─── Recipient UPI ID Chip & Copy ─── */}
      {activeUpiId && (
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <QrCode className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            <span className="text-gray-400 text-[11px]">{lang === "ta" ? "பெறுநர் UPI:" : "Pay to:"}</span>
            <span className="text-teal-300 font-mono font-medium truncate">{activeUpiId}</span>
          </div>
          <button
            type="button"
            onClick={() => copyUpiId(activeUpiId)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Copy UPI ID"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ─── Debtor Controls: Pay Now (UPI Deep Link) ─── */}
      {isPending && isCurrentUserDebtor && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex flex-wrap gap-2">
            {/* Primary Pay Now Button */}
            <button
              type="button"
              id={`pay-now-btn-${settlement.settlementId}`}
              onClick={handlePayNow}
              disabled={saving}
              className="flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-500 hover:to-teal-400 transition-all active:scale-95 shadow-lg shadow-teal-950/50"
            >
              <Smartphone className="h-4 w-4" />
              <span>{lang === "ta" ? "செலுத்துங்கள் (Pay via UPI)" : "Pay Now (UPI App)"}</span>
            </button>

            {/* Enter Reference toggle */}
            <button
              type="button"
              onClick={() => setShowDebtorRefInput((v) => !v)}
              className="px-3.5 py-3 rounded-2xl text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* If debtor already initiated, show awaiting creditor banner */}
          {isInitiatedByDebtor && (
            <p className="text-[11px] text-teal-300/90 bg-teal-500/10 border border-teal-500/20 p-2.5 rounded-xl flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span>
                {lang === "ta"
                  ? "கட்டணம் செலுத்தப்பட்டது. " + (toMember?.name || "பெறுநர்") + "-இன் உறுதிப்படுத்தலுக்காக காத்திருக்கிறது."
                  : "Payment initiated! Awaiting confirmation from " + (toMember?.name || "the recipient") + "."}
              </span>
            </p>
          )}

          {/* Reference / UTR Number form */}
          {showDebtorRefInput && (
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
              <p className="text-[11px] text-gray-300 font-medium">
                {lang === "ta"
                  ? "UPI பரிவர்த்தனை குறிப்பு / UTR ஐ உள்ளிடவும்:"
                  : "Enter UPI Reference / UTR ID:"}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 423589123456 / UTR"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleDebtorConfirmSent}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 transition-colors"
                >
                  {saving ? "…" : lang === "ta" ? "சேமி" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Creditor Controls: Mark as Received (ONLY Creditor!) ─── */}
      {isPending && isCurrentUserCreditor && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          {isInitiatedByDebtor && (
            <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>
                {fromMember?.name || "Debtor"} {lang === "ta" ? "பணம் செலுத்தியதாக அறிவித்துள்ளார். பணம் வந்துவிட்டதா?" : "indicated they sent payment. Did you receive it?"}
              </span>
            </p>
          )}

          <div className="flex gap-2">
            {/* Prominent Mark as Received Button */}
            <button
              type="button"
              id={`mark-received-btn-${settlement.settlementId}`}
              onClick={handleCreditorConfirmReceived}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-950/50"
            >
              <Check className="h-4 w-4" />
              <span>
                {lang === "ta" ? "பணம் பெறப்பட்டது (உறுதிப்படுத்து)" : "Mark as Received"}
              </span>
            </button>

            {/* Dispute Button */}
            <button
              type="button"
              onClick={handleCreditorDispute}
              disabled={saving}
              className="px-3.5 py-3 rounded-2xl text-xs font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition-all"
              title={lang === "ta" ? "பணம் வரவில்லை (சர்ச்சை)" : "Dispute payment"}
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Other Group Member View ─── */}
      {isPending && !isCurrentUserDebtor && !isCurrentUserCreditor && (
        <div className="pt-1 text-center">
          <span className="text-[11px] text-gray-400">
            {lang === "ta"
              ? `${fromMember?.name || "Debtor"} → ${toMember?.name || "Creditor"} நேரடி தீர்வு நிலுவையில் உள்ளது`
              : `Direct settlement pending between ${fromMember?.name} and ${toMember?.name}`}
          </span>
        </div>
      )}

      {/* ─── Settled or Disputed Footnotes ─── */}
      {isSettled && (
        <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-400/90 font-mono">
          <span className="flex items-center gap-1 font-sans">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            {lang === "ta" ? "முழுமையாக தீர்க்கப்பட்டது" : "Settlement Completed"}
          </span>
          {settlement.paymentReference && (
            <span className="truncate max-w-[140px]">Ref: {settlement.paymentReference}</span>
          )}
        </div>
      )}

      {isDisputed && (
        <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-[11px] text-rose-300">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            {lang === "ta" ? "சர்ச்சைக்குரியது — சரிபார்க்கவும்" : "Payment Disputed — Please verify"}
          </span>
          {isCurrentUserCreditor && (
            <button
              type="button"
              onClick={handleCreditorConfirmReceived}
              className="text-teal-400 underline hover:text-teal-300 font-semibold"
            >
              {lang === "ta" ? "இப்போது உறுதிப்படுத்து" : "Resolve & Confirm"}
            </button>
          )}
        </div>
      )}

      {/* ─── Missing UPI Modal / Fallback Input ─── */}
      {showCustomUpiModal && (
        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-2 text-xs">
          <p className="text-teal-200 font-semibold">
            {lang === "ta"
              ? `${toMember?.name}-இன் UPI ID அமைக்கப்படவில்லை.`
              : `${toMember?.name}'s UPI ID is not registered.`}
          </p>
          <p className="text-gray-300 text-[11px]">
            {lang === "ta"
              ? "நேரடியாக செலுத்த அவர்களின் UPI ஐடியை உள்ளிடவும் (எ.கா: mobile@paytm):"
              : "Enter their UPI ID manually to open GPay/PhonePe:"}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="recipient@upi"
              value={customUpiInput}
              onChange={(e) => setCustomUpiInput(e.target.value.toLowerCase().trim())}
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-white/10 border border-white/20 text-white font-mono placeholder:text-gray-400 focus:outline-none focus:border-teal-400"
            />
            <button
              type="button"
              onClick={() => {
                if (isValidUpiId(customUpiInput)) {
                  setShowCustomUpiModal(false);
                  handlePayNow();
                } else {
                  toast.error(lang === "ta" ? "தவறான UPI ஐடி" : "Invalid UPI ID");
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-teal-500 text-black font-bold text-xs hover:bg-teal-400"
            >
              {lang === "ta" ? "செலுத்து" : "Pay"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
