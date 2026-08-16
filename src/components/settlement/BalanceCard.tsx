// Purpose: Reusable UI card showing one trip member's net balance — green for creditor (owed money), red for debtor (owes money), grey for settled — used in SCR-13 Settlement Screen.

"use client";

import { formatPaise } from "@/lib/utils";
import type { MemberBalance } from "@/types/settlement";
import { TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  balance: MemberBalance;
  isCurrentUser?: boolean;
  lang: "ta" | "en";
}

export function BalanceCard({ balance, isCurrentUser, lang }: BalanceCardProps) {
  const isCreditor = balance.netBalancePaise > 0;
  const isDebtor = balance.netBalancePaise < 0;
  const isSettled = balance.netBalancePaise === 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3.5 rounded-xl border transition-all",
        isCreditor && "bg-emerald-500/10 border-emerald-500/25",
        isDebtor && "bg-rose-500/10 border-rose-500/25",
        isSettled && "bg-white/[0.03] border-white/10 opacity-60"
      )}
    >
      {/* Left: Name + status */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
            isCreditor && "bg-emerald-500/20 text-emerald-400",
            isDebtor && "bg-rose-500/20 text-rose-400",
            isSettled && "bg-white/10 text-gray-400"
          )}
        >
          {balance.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {balance.name}
            {isCurrentUser && (
              <span className="ml-1.5 text-[10px] font-normal text-teal-400 bg-teal-500/15 px-1.5 py-0.5 rounded-full">
                {lang === "ta" ? "நீங்கள்" : "You"}
              </span>
            )}
          </p>
          <p className="text-[10px] text-gray-400 font-mono">
            {lang === "ta" ? "செலுத்தியது" : "Paid"}: {formatPaise(balance.totalPaidPaise)}
            {" · "}
            {lang === "ta" ? "பங்கு" : "Share"}: {formatPaise(balance.totalSharePaise)}
          </p>
        </div>
      </div>

      {/* Right: Net balance */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isCreditor && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
        {isDebtor && <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
        {isSettled && <CheckCircle2 className="h-3.5 w-3.5 text-gray-500" />}

        <span
          className={cn(
            "text-sm font-bold font-mono",
            isCreditor && "text-emerald-400",
            isDebtor && "text-rose-400",
            isSettled && "text-gray-500"
          )}
        >
          {isCreditor && "+"}
          {formatPaise(balance.netBalancePaise)}
        </span>
      </div>
    </div>
  );
}
