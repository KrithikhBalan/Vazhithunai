// Purpose: Screen component for SCR-12 (Edit Expense) allowing modification of expense amount, category, split breakdown, and receipt photo with atomic trip total recomputation.

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import { subscribeToTrip } from "@/lib/firebase/trips";
import { getExpense, updateExpense } from "@/lib/firebase/expenses";
import type { TripDocument } from "@/types/trip";
import type { ExpenseDocument, ExpenseCategory, SplitType, ExpenseFormData } from "@/types/expense";
import { CategoryPicker } from "@/components/expenses/CategoryPicker";
import { SplitModeSelector } from "@/components/expenses/SplitModeSelector";
import { ReceiptUploader } from "@/components/expenses/ReceiptUploader";
import { computeSplitDetails } from "@/lib/splitCalculators";
import { inrToPaise, formatPaise } from "@/lib/utils";
import { ArrowLeft, Save, UserCheck, Sparkles, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const expenseId = params.expenseId as string;
  const { t, lang } = useLanguage();

  const [trip, setTrip] = useState<TripDocument | null>(null);
  const [existingExpense, setExistingExpense] = useState<ExpenseDocument | null>(null);
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
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // AI OCR suggestion state
  const [ocrSuggestion, setOcrSuggestion] = useState<{
    amountPaise?: number;
    description?: string;
    category?: string;
  } | null>(null);

  // Fetch trip & expense
  useEffect(() => {
    if (!tripId || !expenseId) return;

    let unsubTrip: (() => void) | undefined;

    const loadData = async () => {
      try {
        const expData = await getExpense(expenseId);
        if (!expData) {
          toast.error("Expense not found");
          router.push(`/trips/${tripId}/expenses`);
          return;
        }

        setExistingExpense(expData);
        setAmountPaise(expData.amountPaise);
        setAmountStr((expData.amountPaise / 100).toString());
        setDescription(expData.description);
        setCategory(expData.category);
        setPaidBy(expData.paidBy);
        setSelectedParticipants(expData.participants);
        setSplitType(expData.splitType);
        setReceiptUrl(expData.receiptUrl);

        // Pre-fill exact shares
        if (expData.splitType === "exact") {
          const exactMap: Record<string, number> = {};
          expData.splitDetails.forEach((d) => {
            exactMap[d.memberId] = d.sharePaise;
          });
          setExactSharesPaise(exactMap);
        }

        unsubTrip = subscribeToTrip(tripId, (data) => {
          setTrip(data);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error loading expense:", err);
        setLoading(false);
      }
    };

    loadData();
    return () => {
      if (unsubTrip) unsubTrip();
    };
  }, [tripId, expenseId, router]);

  // Update amount in paise
  const handleAmountChange = (val: string) => {
    setAmountStr(val);
    const parsed = parseFloat(val) || 0;
    setAmountPaise(inrToPaise(parsed));
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

  // Split calculation
  const splitComputation = computeSplitDetails(splitType, amountPaise, selectedParticipants, {
    exactShares: exactSharesPaise,
    percentages,
    shares,
  });

  // Handle Update Submission
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
      toast.error(lang === "ta" ? "பணம் செலுத்தியவரைத் தேர்ந்தெடுக்கவும்" : "Select who paid");
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
        receiptUrl,
      };

      await updateExpense(
        tripId,
        expenseId,
        formData,
        existingExpense?.amountPaise || 0
      );

      toast.success(t("expenses.expenseUpdatedSuccess"));
      router.push(`/trips/${tripId}/expenses`);
    } catch (err) {
      console.error("Error updating expense:", err);
      toast.error("Failed to update expense");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08131d] text-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading expense data…</p>
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
              {t("expenses.editExpense")}
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
          {/* Amount Input */}
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
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full text-3xl font-extrabold bg-transparent text-white placeholder:text-gray-600 focus:outline-none font-mono"
              />
            </div>
            {amountPaise > 0 && (
              <p className="text-[11px] text-gray-400 font-mono">
                = {amountPaise.toLocaleString()} Paise
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t("expenses.description")}
            </label>
            <input
              id="expense-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Category Picker */}
          <CategoryPicker
            selectedCategory={category}
            onSelectCategory={setCategory}
          />

          {/* Paid By */}
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

          {/* Split Mode Calculator */}
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

          {/* Receipt Uploader */}
          <ReceiptUploader
            receiptFile={receiptFile}
            receiptUrl={receiptUrl}
            onSelectFile={setReceiptFile}
            onOcrExtracted={(details) => {
              setOcrSuggestion(details);
            }}
          />

          {/* Save / Update Button */}
          <button
            id="update-expense-submit-btn"
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
                Updating…
              </span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{t("expenses.updateExpense")}</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
