// Purpose: TypeScript type definitions for Settlement documents, member balance calculations, greedy minimization algorithm output, and UPI payment state tracking.

import type { Timestamp } from "firebase/firestore";

/** Settlement status — "pending" | "settled" | "disputed" | "replaced" */
export type SettlementStatus = "pending" | "settled" | "disputed" | "replaced";

/** Firestore document schema for a single settlement transaction */
export interface SettlementDocument {
  settlementId: string;
  tripId: string;
  fromMemberId: string; // debtor — the one who owes money
  toMemberId: string;   // creditor — the one who is owed money
  amountPaise: number;  // 64-bit integer paise (positive, non-zero)
  status: SettlementStatus;
  paymentReference: string | null; // UPI transaction reference/UTR if entered by debtor
  paymentInitiatedAt?: Timestamp | Date | string | null; // Timestamp when debtor clicked Pay Now / entered Ref
  initiatedByDebtor?: boolean; // Flag indicating debtor has sent payment and awaits creditor confirmation
  settledAt: Timestamp | Date | null; // Set only when CREDITOR confirms receipt
  disputedAt?: Timestamp | Date | null;
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
