// Purpose: Screen component for SCR-11 (Expense Ledger) displaying chronological trip expenses, running total in paise, category/payer filters, and receipt previews.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { subscribeToTrip, ensureDemoTrip } from "@/lib/firebase/trips";
import { subscribeToTripExpenses, deleteExpense } from "@/lib/firebase/expenses";
import type { TripDocument, TripMember } from "@/types/trip";
import type { ExpenseDocument } from "@/types/expense";
import { ExpenseCard } from "@/components/expenses/ExpenseCard";
import { CATEGORIES } from "@/components/expenses/CategoryPicker";
import { formatPaise } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Receipt,
  Wallet,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ExpenseLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { t, lang } = useLanguage();
  const { user, userDoc } = useAuthStore();

  const [trip, setTrip] = useState<TripDocument | null>(null);
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPayer, setSelectedPayer] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Subscribe to Trip & Expenses in real-time
  useEffect(() => {
    if (!tripId) return;

    // Load or initialize demo trip if needed
    const unsubTrip = subscribeToTrip(tripId, (data) => {
      if (data) {
        setTrip(data);
        setLoading(false);
      } else if (user) {
        // Create demo trip for instant preview
        ensureDemoTrip({
          uid: user.uid,
          name: userDoc?.name || user.displayName || "User",
          phone: userDoc?.phone || user.phoneNumber || undefined,
        }).then((demo) => {
          setTrip(demo);
          setLoading(false);
        });
      }
    });

    const unsubExpenses = subscribeToTripExpenses(tripId, (list) => {
      setExpenses(list);
    });

    return () => {
      unsubTrip();
      unsubExpenses();
    };
  }, [tripId, user, userDoc]);

  // Handle Delete Expense
  const handleDeleteExpense = async (
    expenseId: string,
    amountPaise: number,
    receiptUrl?: string | null
  ) => {
    try {
      await deleteExpense(tripId, expenseId, amountPaise, receiptUrl);
      toast.success(t("expenses.expenseDeletedSuccess"));
    } catch (err) {
      console.error("Error deleting expense:", err);
      toast.error("Failed to delete expense");
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchCategory = selectedCategory === "all" || exp.category === selectedCategory;
      const matchPayer = selectedPayer === "all" || exp.paidBy === selectedPayer;
      const matchSearch =
        !searchQuery ||
        exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchPayer && matchSearch;
    });
  }, [expenses, selectedCategory, selectedPayer, searchQuery]);

  // Calculate filtered total in paise
  const filteredTotalPaise = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amountPaise, 0);
  }, [filteredExpenses]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/80 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4 text-gray-300" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                {trip?.name || t("expenses.ledger")}
              </h1>
              <p className="text-[11px] text-teal-400 font-medium">
                {trip?.destination || "Vazhithunai"}
              </p>
            </div>
          </div>

          {/* Add Expense CTA */}
          <Link
            href={`/trips/${tripId}/expenses/new`}
            id="header-add-expense-btn"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 transition-all shadow-md shadow-teal-950/50 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("expenses.addExpense")}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* ─── Running Total Summary Card ─── */}
        <section className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-teal-950/40 via-white/[0.03] to-white/[0.01] border border-teal-500/20 shadow-xl shadow-teal-950/20">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-400">
                <Wallet className="h-4 w-4" />
                {t("expenses.runningTotal")}
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight font-mono">
                {formatPaise(trip?.totalExpensePaise || 0)}
              </h2>
            </div>

            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-xs text-gray-400">
                {expenses.length} {lang === "ta" ? "செலவுகள்" : "transactions"}
              </span>
              <span className="text-[11px] text-teal-300 font-medium bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                {trip?.members?.length || 0} {lang === "ta" ? "பயணிகள்" : "members"}
              </span>
            </div>
          </div>
        </section>

        {/* ─── Search & Filters Bar ─── */}
        <section className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={lang === "ta" ? "செலவுகளை தேடவும்…" : "Search expenses by name or category…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label={t("expenses.filterCategory")}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-gray-300 focus:outline-none focus:border-teal-500 shrink-0"
            >
              <option value="all" className="bg-gray-900 text-white">
                {t("expenses.allCategories")}
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-gray-900 text-white">
                  {t(`expenses.categories.${cat.id}`)}
                </option>
              ))}
            </select>

            {/* Payer Dropdown */}
            <select
              value={selectedPayer}
              onChange={(e) => setSelectedPayer(e.target.value)}
              aria-label={t("expenses.filterPayer")}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-gray-300 focus:outline-none focus:border-teal-500 shrink-0"
            >
              <option value="all" className="bg-gray-900 text-white">
                {t("expenses.allPayers")}
              </option>
              {trip?.members?.map((m) => (
                <option key={m.memberId} value={m.memberId} className="bg-gray-900 text-white">
                  {m.name}
                </option>
              ))}
            </select>

            {/* Filtered count badge */}
            {(selectedCategory !== "all" || selectedPayer !== "all" || searchQuery) && (
              <span className="text-[11px] text-gray-400 shrink-0 px-2">
                Filtered: <strong>{formatPaise(filteredTotalPaise)}</strong>
              </span>
            )}
          </div>
        </section>

        {/* ─── Expense List ─── */}
        <section className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Loading ledger…
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/15 text-center space-y-3 bg-white/[0.01]">
              <div className="p-3 w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 mx-auto flex items-center justify-center border border-teal-500/20">
                <Receipt className="h-6 w-6" />
              </div>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                {t("expenses.noExpensesYet")}
              </p>
              <Link
                href={`/trips/${tripId}/expenses/new`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-colors shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>{t("expenses.addExpense")}</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.expenseId}
                  expense={expense}
                  tripId={tripId}
                  members={trip?.members || []}
                  onDelete={handleDeleteExpense}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Floating Add Expense Button for Mobile */}
      <Link
        href={`/trips/${tripId}/expenses/new`}
        id="fab-add-expense-btn"
        className="fixed bottom-6 right-6 z-40 sm:hidden flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-teal-600 to-teal-400 text-white shadow-2xl shadow-teal-900/80 active:scale-90 transition-transform"
        aria-label="Add Expense"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
