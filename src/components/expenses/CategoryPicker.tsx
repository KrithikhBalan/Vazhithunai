// Purpose: UI Component for selecting one of the 10 travel expense categories with bilingual titles and icons.

"use client";

import { useLanguage } from "@/i18n/LanguageContext";
import type { ExpenseCategory } from "@/types/expense";
import { cn } from "@/lib/utils";
import {
  Fuel,
  Receipt,
  Utensils,
  Coffee,
  Hotel,
  Car,
  Ticket,
  ShoppingBag,
  Compass,
  MoreHorizontal,
} from "lucide-react";

interface CategoryPickerProps {
  selectedCategory: ExpenseCategory;
  onSelectCategory: (category: ExpenseCategory) => void;
}

interface CategoryConfig {
  id: ExpenseCategory;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  { id: "fuel", icon: Fuel, color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/30" },
  { id: "toll", icon: Receipt, color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/30" },
  { id: "food", icon: Utensils, color: "text-emerald-400", bgColor: "bg-emerald-500/10 border-emerald-500/30" },
  { id: "tea_snacks", icon: Coffee, color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/30" },
  { id: "hotel", icon: Hotel, color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/30" },
  { id: "parking", icon: Car, color: "text-sky-400", bgColor: "bg-sky-500/10 border-sky-500/30" },
  { id: "tickets", icon: Ticket, color: "text-pink-400", bgColor: "bg-pink-500/10 border-pink-500/30" },
  { id: "shopping", icon: ShoppingBag, color: "text-rose-400", bgColor: "bg-rose-500/10 border-rose-500/30" },
  { id: "travel", icon: Compass, color: "text-teal-400", bgColor: "bg-teal-500/10 border-teal-500/30" },
  { id: "miscellaneous", icon: MoreHorizontal, color: "text-gray-400", bgColor: "bg-gray-500/10 border-gray-500/30" },
];

export function CategoryPicker({
  selectedCategory,
  onSelectCategory,
}: CategoryPickerProps) {
  const { t } = useLanguage();

  return (
    <div className="w-full space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
        {t("expenses.category")}
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const IconComponent = cat.icon;
          const label = t(`expenses.categories.${cat.id}`);

          return (
            <button
              key={cat.id}
              type="button"
              id={`cat-btn-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-150 active:scale-95",
                isSelected
                  ? "bg-teal-500/20 border-teal-400 text-white shadow-md shadow-teal-950/50 ring-1 ring-teal-400/40"
                  : "bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.07] hover:border-white/20"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-lg border shrink-0 transition-colors",
                  isSelected ? "bg-teal-500/30 border-teal-400/50 text-teal-300" : cat.bgColor,
                  cat.color
                )}
              >
                <IconComponent className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium truncate leading-tight">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { CATEGORIES };
