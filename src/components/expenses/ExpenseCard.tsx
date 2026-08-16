// Purpose: UI Component for displaying an expense card in the ledger with category icon, payer info, paise amount, receipt preview, and edit/delete actions.

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ExpenseDocument } from "@/types/expense";
import type { TripMember } from "@/types/trip";
import { formatPaise } from "@/lib/utils";
import { CATEGORIES } from "./CategoryPicker";
import {
  Receipt,
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  Eye,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseCardProps {
  expense: ExpenseDocument;
  tripId: string;
  members: TripMember[];
  onDelete: (expenseId: string, amountPaise: number, receiptUrl?: string | null) => void;
}

export function ExpenseCard({
  expense,
  tripId,
  members,
  onDelete,
}: ExpenseCardProps) {
  const { t, lang } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const categoryConfig = CATEGORIES.find((c) => c.id === expense.category) || CATEGORIES[9];
  const IconComponent = categoryConfig.icon;
  const payer = members.find((m) => m.memberId === expense.paidBy);

  // Format date
  const dateStr = expense.createdAt
    ? typeof (expense.createdAt as any).toDate === "function"
      ? (expense.createdAt as any).toDate().toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date(expense.createdAt as string).toLocaleDateString()
    : "";

  return (
    <div className="relative group p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-500/30 hover:bg-white/[0.05] transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        {/* Left: Category Icon & Details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "p-2.5 rounded-xl border shrink-0 mt-0.5",
              categoryConfig.bgColor,
              categoryConfig.color
            )}
          >
            <IconComponent className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">
              {expense.description || t(`expenses.categories.${expense.category}`)}
            </h4>

            <p className="text-xs text-gray-400 mt-0.5">
              {t("expenses.paidBy")}: <strong className="text-gray-200">{payer?.name || "Unknown"}</strong>
            </p>

            <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                <Users className="h-3 w-3 text-teal-400" />
                <span>{expense.participants?.length || 0} split</span>
              </span>

              <span className="capitalize px-1.5 py-0.5 rounded-md bg-white/5 text-gray-300">
                {expense.splitType}
              </span>

              {dateStr && <span>• {dateStr}</span>}
            </div>
          </div>
        </div>

        {/* Right: Amount & Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-base font-bold text-teal-300 font-mono">
            {formatPaise(expense.amountPaise)}
          </span>

          <div className="flex items-center gap-1">
            {/* Receipt button if photo exists */}
            {expense.receiptUrl && (
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                title="View Receipt"
                className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
              >
                <Receipt className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {/* Action Dropdown */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-32 rounded-xl bg-gray-900 border border-white/15 shadow-xl shadow-black/80 z-30 py-1 overflow-hidden">
                    <Link
                      href={`/trips/${tripId}/expenses/${expense.expenseId}/edit`}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/10 transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-teal-400" />
                      <span>{t("expenses.editExpense")}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      <span>{t("expenses.deleteExpense")}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && expense.receiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowReceiptModal(false)}
        >
          <div className="relative max-w-md w-full bg-gray-900 border border-white/15 rounded-2xl overflow-hidden p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white truncate">
                {expense.description}
              </h4>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-black/50">
              <Image
                src={expense.receiptUrl}
                alt="Receipt Image"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-gray-900 border border-red-500/30 rounded-2xl p-5 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {t("expenses.deleteExpense")}
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {t("expenses.deleteConfirm")}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(expense.expenseId, expense.amountPaise, expense.receiptUrl);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-md shadow-red-950/50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
