// Purpose: TypeScript type definitions for Expense documents, 10 travel categories, 4 split modes, and split breakdowns.

import type { Timestamp } from "firebase/firestore";

/** The 10 predefined travel expense categories in Vazhithunai */
export type ExpenseCategory =
  | "fuel"
  | "toll"
  | "food"
  | "tea_snacks"
  | "hotel"
  | "parking"
  | "tickets"
  | "shopping"
  | "travel"
  | "miscellaneous";

/** The 4 supported mathematical split calculation types */
export type SplitType = "equal" | "exact" | "percentage" | "shares";

/** Individual member share breakdown in integer Paise */
export interface SplitDetail {
  memberId: string;
  sharePaise: number; // 64-bit integer paise (must never be a float)
}

/** Firestore document schema for an expense */
export interface ExpenseDocument {
  expenseId: string;
  tripId: string;
  category: ExpenseCategory;
  description: string;
  amountPaise: number; // 64-bit integer (e.g. ₹150.50 = 15050 Paise)
  paidBy: string; // memberId
  participants: string[]; // array of memberIds involved in this expense
  splitType: SplitType;
  splitDetails: SplitDetail[];
  receiptUrl: string | null;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

/** Input form state when creating or editing an expense */
export interface ExpenseFormData {
  category: ExpenseCategory;
  description: string;
  amountPaise: number;
  paidBy: string;
  participants: string[];
  splitType: SplitType;
  splitDetails: SplitDetail[];
  receiptFile?: File | null;
  receiptUrl?: string | null;
}
