// Purpose: TypeScript type definitions for Settlement documents, member balance calculations, and greedy minimization algorithm output.

import type { Timestamp } from "firebase/firestore";

/** Settlement status — always start as "pending" after computation */
export type SettlementStatus = "pending" | "settled" | "disputed";

/** Firestore document schema for a single settlement transaction */
export interface SettlementDocument {
  settlementId: string;
  tripId: string;
  fromMemberId: string; // debtor — the one who owes
  toMemberId: string;   // creditor — the one who is owed
  amountPaise: number;  // 64-bit integer; positive, non-zero
  status: SettlementStatus;
  paymentReference: string | null; // UPI transaction reference, if provided
  settledAt: Timestamp | Date | null;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

/** Computed balance for a single trip member */
export interface MemberBalance {
  memberId: string;
  name: string;
  totalPaidPaise: number;  // sum of amountPaise where expense.paidBy === memberId
  totalSharePaise: number; // sum of splitDetail.sharePaise across all expenses
  netBalancePaise: number; // totalPaidPaise - totalSharePaise  (+ = creditor, - = debtor)
}

/** A single directed settlement edge output by the greedy minimization algorithm */
export interface SettlementEdge {
  fromMemberId: string; // debtor
  toMemberId: string;   // creditor
  amountPaise: number;  // exact paise (integer)
}
