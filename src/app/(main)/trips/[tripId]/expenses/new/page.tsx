// Purpose: Screen component for SCR-12 (Add Expense) with paise-precise currency inputs, category picker, 4 split modes, and receipt photo capture.

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { subscribeToTrip, ensureDemoTrip } from "@/lib/firebase/trips";
import { createExpense } from "@/lib/firebase/expenses";
import type { TripDocument } from "@/types/trip";
import type { ExpenseCategory, SplitType, ExpenseFormData } from "@/types/expense";
import { CategoryPicker } from "@/components/expenses/CategoryPicker";
import { SplitModeSelector } from "@/components/expenses/SplitModeSelector";
import { ReceiptUploader } from "@/components/expenses/ReceiptUploader";
import { computeSplitDetails } from "@/lib/splitCalculators";
import { inrToPaise } from "@/lib/utils";
import { ArrowLeft, Save, UserCheck, Sparkles, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { t, lang } = useLanguage();
  const { user, userDoc } = useAuthStore();

  const [trip, setTrip] = useState<TripDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [amountStr, setAmountStr] = useState("");
  const [amountPaise, setAmountPaise] = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [paidBy, setPaidBy] = useState<string>("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>("equal");

  // Mode-specific state
  const [exactSharesPaise, setExactSharesPaise] = useState<Record<string, number>>({});
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [shares, setShares] = useState<Record<string, number>>({});

  // Receipt File
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // AI OCR suggestion state — shown as a confirmation banner, never auto-saved
  const [ocrSuggestion, setOcrSuggestion] = useState<{
    amountPaise?: number;
    description?: string;
    category?: string;
  } | null>(null);

  // Load trip members
  useEffect(() => {
    if (!tripId) return;
    const unsub = subscribeToTrip(tripId, (data) => {
      if (data) {
        setTrip(data);
        if (!paidBy && data.members.length > 0) {
          const currentMember = data.members.find((m) => m.memberId === user?.uid) || data.members[0];
          setPaidBy(currentMember.memberId);
        }
        if (selectedParticipants.length === 0 && data.members.length > 0) {
          setSelectedParticipants(data.members.map((m) => m.memberId));
        }
        setLoading(false);
      } else if (user) {
        ensureDemoTrip({
          uid: user.uid,
          name: userDoc?.name || user.displayName || "You",
          phone: userDoc?.phone || user.phoneNumber || undefined,
        }).then((demo) => {
          setTrip(demo);
          setPaidBy(demo.members[0]?.memberId || user.uid);
          setSelectedParticipants(demo.members.map((m) => m.memberId));
          setLoading(false);
        });
      }
    });

    return () => unsub();
  }, [tripId, user, userDoc, paidBy, selectedParticipants.length]);

  // Update amount in paise when amount string changes
  const handleAmountChange = (val: string) => {
    setAmountStr(val);
    setAmountPaise(inrToPaise(val));
  };

  // Participant toggles
  const handleToggleParticipant = (memberId: string) => {
    if (selectedParticipants.includes(memberId)) {
      setSelectedParticipants(selectedParticipants.filter((id) => id !== memberId));
    } else {
      setSelectedParticipants([...selectedParticipants, memberId]);
    }
  };

  const handleSelectAllParticipants = () => {
    if (trip) setSelectedParticipants(trip.members.map((m) => m.memberId));
  };

  const handleClearAllParticipants = () => {
    setSelectedParticipants([]);
  };

  // Split calculations
  const splitComputation = computeSplitDetails(splitType, amountPaise, selectedParticipants, {
    exactShares: exactSharesPaise,
    percentages,
    shares,
  });

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amountPaise <= 0) {
      toast.error(lang === "ta" ? "செல்லுபடியாகும் தொகையை உள்ளிடவும்" : "Enter a valid expense amount");
      return;
    }
    if (!description.trim()) {
      toast.error(lang === "ta" ? "விளக்கத்தை உள்ளிடவும்" : "Enter an expense description");
      return;
    }
    if (!paidBy) {
      toast.error(lang === "ta" ? "பணம் செலுத்தியவரைத் தேர்ந்தெடுக்கவும்" : "Select who paid for this expense");
      return;
    }
    if (selectedParticipants.length === 0) {
      toast.error(lang === "ta" ? "குறைந்தது ஒரு பங்கேற்பாளரைத் தேர்ந்தெடுக்கவும்" : "Select at least one participant");
      return;
    }
    if (!splitComputation.isValid) {
      toast.error(splitComputation.errorMessage || "Please fix split breakdown amounts");
      return;
    }

    setSaving(true);
    try {
      const formData: ExpenseFormData = {
        category,
        description: description.trim(),
        amountPaise,
        paidBy,
        participants: selectedParticipants,
        splitType,
        splitDetails: splitComputation.splitDetails,
        receiptFile,
      };

      await createExpense(tripId, formData);
      toast.success(t("expenses.expenseAddedSuccess"));
      router.push(`/trips/${tripId}/expenses`);
    } catch (err) {
      console.error("Error creating expense:", err);
      toast.error("Failed to save expense. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08131d] text-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading trip details…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/80 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-gray-300" />
            </button>
            <h1 className="text-base font-bold text-white">
              {t("expenses.addExpense")}
            </h1>
          </div>

          <span className="text-xs text-teal-400 font-medium truncate max-w-[150px]">
            {trip?.name}
          </span>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-xl mx-auto px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ─── Amount Input Card ─── */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-teal-400">
              {t("expenses.amountINR")}
            </label>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold text-teal-300">₹</span>
              <input
                id="expense-amount-input"
                type="number"
                step="0.01"
                min="0"
                autoFocus
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full text-3xl font-extrabold bg-transparent text-white placeholder:text-gray-600 focus:outline-none font-mono"
              />
            </div>
            {amountPaise > 0 && (
              <p className="text-[11px] text-gray-400 font-mono">
                = {amountPaise.toLocaleString()} Paise (Paise-precise integer storage)
              </p>
            )}
          </div>

          {/* ─── Description ─── */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t("expenses.description")}
            </label>
            <input
              id="expense-desc-input"
              type="text"
              placeholder={lang === "ta" ? "எ.கா. நெடுஞ்சாலை டோல் / இரவு உணவு" : "e.g. Highway toll / Dinner at restaurant"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          {/* ─── Category Picker (10 categories) ─── */}
          <CategoryPicker
            selectedCategory={category}
            onSelectCategory={setCategory}
          />

          {/* ─── Paid By Selector ─── */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t("expenses.paidBy")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {trip?.members.map((member) => {
                const isSelected = paidBy === member.memberId;
                return (
                  <button
                    key={member.memberId}
                    type="button"
                    onClick={() => setPaidBy(member.memberId)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition-all active:scale-95",
                      isSelected
                        ? "bg-teal-500/20 border-teal-400 text-white ring-1 ring-teal-400/40"
                        : "bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.06]"
                    )}
                  >
                    <UserCheck className={cn("h-4 w-4 shrink-0", isSelected ? "text-teal-400" : "text-gray-500")} />
                    <span className="truncate">{member.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Split Calculator (4 Modes) ─── */}
          <SplitModeSelector
            amountPaise={amountPaise}
            members={trip?.members || []}
            selectedParticipants={selectedParticipants}
            splitType={splitType}
            splitDetails={splitComputation.splitDetails}
            exactSharesPaise={exactSharesPaise}
            percentages={percentages}
            shares={shares}
            onToggleParticipant={handleToggleParticipant}
            onSelectAllParticipants={handleSelectAllParticipants}
            onClearAllParticipants={handleClearAllParticipants}
            onChangeSplitType={setSplitType}
            onChangeExactShare={(mId, paise) => setExactSharesPaise({ ...exactSharesPaise, [mId]: paise })}
            onChangePercentage={(mId, pct) => setPercentages({ ...percentages, [mId]: pct })}
            onChangeShareWeight={(mId, wt) => setShares({ ...shares, [mId]: wt })}
            validationError={splitComputation.errorMessage}
          />

          {/* ─── AI OCR Suggestion Banner ─── */}
          {ocrSuggestion && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {lang === "ta" ? "AI மதிப்பீடு — உறுதிப்படுத்தவும்" : "AI Suggestion — Please verify before saving"}
                </span>
                <button
                  type="button"
                  onClick={() => setOcrSuggestion(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-xs text-gray-200">
                {ocrSuggestion.amountPaise !== undefined && ocrSuggestion.amountPaise > 0 && (
                  <p>💰 {lang === "ta" ? "தொகை" : "Amount"}: <strong className="text-white font-mono">₹{(ocrSuggestion.amountPaise / 100).toFixed(2)}</strong></p>
                )}
                {ocrSuggestion.description && (
                  <p>📝 {lang === "ta" ? "விவரம்" : "Description"}: <strong className="text-white">{ocrSuggestion.description}</strong></p>
                )}
                {ocrSuggestion.category && (
                  <p>🏷️ {lang === "ta" ? "வகை" : "Category"}: <strong className="text-white">{ocrSuggestion.category}</strong></p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (ocrSuggestion.amountPaise && ocrSuggestion.amountPaise > 0) {
                      setAmountPaise(ocrSuggestion.amountPaise);
                      setAmountStr((ocrSuggestion.amountPaise / 100).toFixed(2));
                    }
                    if (ocrSuggestion.description) setDescription(ocrSuggestion.description);
                    if (ocrSuggestion.category) setCategory(ocrSuggestion.category as ExpenseCategory);
                    setOcrSuggestion(null);
                    toast.success(lang === "ta" ? "AI மதிப்பீடு பயன்படுத்தப்பட்டது" : "AI suggestion applied");
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all active:scale-95"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {lang === "ta" ? "ஏற்றுக்கொள்" : "Accept Suggestion"}
                </button>
                <button
                  type="button"
                  onClick={() => setOcrSuggestion(null)}
                  className="px-3 py-2 rounded-xl bg-white/10 text-gray-300 text-xs font-semibold hover:bg-white/20 transition-all"
                >
                  {lang === "ta" ? "நிராகரி" : "Dismiss"}
                </button>
              </div>
            </div>
          )}

          {/* ─── Receipt / Bill Photo Uploader & OCR Hook ─── */}}
          <ReceiptUploader
            receiptFile={receiptFile}
            receiptUrl={null}
            onSelectFile={setReceiptFile}
            onOcrExtracted={(details) => {
              // Store OCR suggestion — user must explicitly accept before it's applied
              setOcrSuggestion(details);
            }}
          />

          {/* ─── Submit Button ─── */}
          <button
            id="save-expense-submit-btn"
            type="submit"
            disabled={saving || amountPaise <= 0 || !splitComputation.isValid}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm text-white",
              "bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all active:scale-95 shadow-xl shadow-teal-950/60"
            )}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{t("expenses.saveExpense")}</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
