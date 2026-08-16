// Purpose: UI Component for selecting and calculating the 4 Split modes (Equal, Exact, Percentage, Shares) with paise-exact integer math.

"use client";

import { useLanguage } from "@/i18n/LanguageContext";
import type { TripMember } from "@/types/trip";
import type { SplitDetail, SplitType } from "@/types/expense";
import { formatPaise, inrToPaise } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Check, Users, Percent, Calculator, PieChart, AlertCircle, CheckCircle2 } from "lucide-react";

interface SplitModeSelectorProps {
  amountPaise: number;
  members: TripMember[];
  selectedParticipants: string[];
  splitType: SplitType;
  splitDetails: SplitDetail[];
  exactSharesPaise: Record<string, number>;
  percentages: Record<string, number>;
  shares: Record<string, number>;
  onToggleParticipant: (memberId: string) => void;
  onSelectAllParticipants: () => void;
  onClearAllParticipants: () => void;
  onChangeSplitType: (type: SplitType) => void;
  onChangeExactShare: (memberId: string, paise: number) => void;
  onChangePercentage: (memberId: string, percent: number) => void;
  onChangeShareWeight: (memberId: string, weight: number) => void;
  validationError?: string;
}

export function SplitModeSelector({
  amountPaise,
  members,
  selectedParticipants,
  splitType,
  splitDetails,
  exactSharesPaise,
  percentages,
  shares,
  onToggleParticipant,
  onSelectAllParticipants,
  onClearAllParticipants,
  onChangeSplitType,
  onChangeExactShare,
  onChangePercentage,
  onChangeShareWeight,
  validationError,
}: SplitModeSelectorProps) {
  const { t } = useLanguage();

  const SPLIT_MODES: { id: SplitType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "equal", label: t("expenses.splitEqual"), icon: Users },
    { id: "exact", label: t("expenses.splitExact"), icon: Calculator },
    { id: "percentage", label: t("expenses.splitPercentage"), icon: Percent },
    { id: "shares", label: t("expenses.splitShares"), icon: PieChart },
  ];

  const shareMap = new Map(splitDetails.map((d) => [d.memberId, d.sharePaise]));

  // Calculate sum of exact amounts
  const exactSumPaise = selectedParticipants.reduce((sum, id) => sum + (exactSharesPaise[id] || 0), 0);
  const exactDiffPaise = amountPaise - exactSumPaise;

  // Calculate sum of percentages
  const totalPercent = selectedParticipants.reduce((sum, id) => sum + (percentages[id] || 0), 0);

  return (
    <div className="w-full space-y-4">
      {/* ─── Participant Selection Header ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {t("expenses.splitWith")} ({selectedParticipants.length}/{members.length})
          </label>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onSelectAllParticipants}
              className="text-teal-400 hover:text-teal-300 transition-colors"
            >
              {t("expenses.selectAll")}
            </button>
            <span className="text-gray-600">•</span>
            <button
              type="button"
              onClick={onClearAllParticipants}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              {t("expenses.clearAll")}
            </button>
          </div>
        </div>

        {/* Member Chip Grid */}
        <div className="flex flex-wrap gap-2">
          {members.map((member) => {
            const isSelected = selectedParticipants.includes(member.memberId);
            return (
              <button
                key={member.memberId}
                type="button"
                id={`participant-${member.memberId}`}
                onClick={() => onToggleParticipant(member.memberId)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-150 active:scale-95",
                  isSelected
                    ? "bg-teal-500/20 border-teal-500/50 text-white shadow-sm"
                    : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-gray-200"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                    isSelected ? "bg-teal-500 border-teal-400 text-black" : "border-white/20 bg-transparent"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <span>{member.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Split Mode Tabs ─── */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t("expenses.splitMode")}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10">
          {SPLIT_MODES.map((mode) => {
            const isSelected = splitType === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                id={`split-tab-${mode.id}`}
                onClick={() => onChangeSplitType(mode.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all",
                  isSelected
                    ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-950/40"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Mode Specific Input & Breakdowns ─── */}
      {selectedParticipants.length === 0 ? (
        <div className="p-3.5 rounded-xl border border-dashed border-white/15 text-center text-xs text-gray-400">
          Please select at least 1 participant to split this expense.
        </div>
      ) : (
        <div className="space-y-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          {/* Status / Validation header */}
          {splitType === "exact" && (
            <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
              <span className="text-gray-400">
                Total Assigned: <strong className="text-white">{formatPaise(exactSumPaise)}</strong> / {formatPaise(amountPaise)}
              </span>
              {exactDiffPaise === 0 ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Matched
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {exactDiffPaise > 0 ? `Remaining: ${formatPaise(exactDiffPaise)}` : `Over by: ${formatPaise(Math.abs(exactDiffPaise))}`}
                </span>
              )}
            </div>
          )}

          {splitType === "percentage" && (
            <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
              <span className="text-gray-400">
                Total Percentage: <strong className="text-white">{totalPercent.toFixed(1)}%</strong> / 100%
              </span>
              {Math.abs(totalPercent - 100) < 0.01 ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 100%
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" /> Must equal 100%
                </span>
              )}
            </div>
          )}

          {/* Individual Member Rows */}
          <div className="space-y-2">
            {selectedParticipants.map((memberId) => {
              const member = members.find((m) => m.memberId === memberId);
              const computedShare = shareMap.get(memberId) || 0;

              return (
                <div
                  key={memberId}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/5"
                >
                  <span className="text-xs font-medium text-gray-200 truncate flex-1">
                    {member?.name || memberId}
                  </span>

                  {/* 1. EQUAL SPLIT DISPLAY */}
                  {splitType === "equal" && (
                    <div className="text-right">
                      <span className="text-xs font-semibold text-teal-300 font-mono">
                        {formatPaise(computedShare)}
                      </span>
                    </div>
                  )}

                  {/* 2. EXACT SPLIT INPUT */}
                  {splitType === "exact" && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-gray-400">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={exactSharesPaise[memberId] ? (exactSharesPaise[memberId] / 100).toString() : ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onChangeExactShare(memberId, inrToPaise(val));
                        }}
                        className="w-24 px-2 py-1 rounded-lg text-xs font-semibold text-right text-white bg-black/40 border border-white/15 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  )}

                  {/* 3. PERCENTAGE SPLIT INPUT */}
                  {splitType === "percentage" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={percentages[memberId] !== undefined ? percentages[memberId] : ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onChangePercentage(memberId, val);
                          }}
                          className="w-16 px-2 py-1 rounded-lg text-xs font-semibold text-right text-white bg-black/40 border border-white/15 focus:outline-none focus:border-teal-400"
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                      <span className="text-xs font-mono text-teal-300 w-20 text-right">
                        {formatPaise(computedShare)}
                      </span>
                    </div>
                  )}

                  {/* 4. SHARES / WEIGHTED SPLIT INPUT */}
                  {splitType === "shares" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="1"
                          value={shares[memberId] !== undefined ? shares[memberId] : 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            onChangeShareWeight(memberId, val);
                          }}
                          className="w-14 px-2 py-1 rounded-lg text-xs font-semibold text-center text-white bg-black/40 border border-white/15 focus:outline-none focus:border-teal-400"
                        />
                        <span className="text-xs text-gray-400">share(s)</span>
                      </div>
                      <span className="text-xs font-mono text-teal-300 w-20 text-right">
                        {formatPaise(computedShare)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Validation error badge */}
          {validationError && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
