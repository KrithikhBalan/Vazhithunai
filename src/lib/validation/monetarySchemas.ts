// Purpose: Zod runtime validation schemas enforcing strict integer paise currency storage across all monetary boundaries. Prevents floating-point drift, negative amounts, or non-integer numbers from entering Firestore or API handlers.

import { z } from "zod";

/**
 * Validates that an amount is a non-negative safe integer representing Indian Paise.
 * Rejects floats, NaN, negative numbers, and numbers exceeding Number.MAX_SAFE_INTEGER.
 */
export const PaiseIntegerSchema = z
  .number({
    message: "Amount in paise must be a valid number",
  })
  .int("Amount in paise must be an exact integer (no decimals)")
  .nonnegative("Amount in paise cannot be negative")
  .max(Number.MAX_SAFE_INTEGER, "Amount exceeds safe maximum integer limit");

/**
 * Zod validation schema for Expense creation/update payload.
 */
export const ExpenseSchema = z.object({
  expenseId: z.string().min(1),
  tripId: z.string().min(1),
  category: z.enum([
    "fuel",
    "toll",
    "food",
    "tea_snacks",
    "hotel",
    "parking",
    "tickets",
    "shopping",
    "travel",
    "miscellaneous",
  ]),
  description: z.string().min(1).max(200),
  amountPaise: PaiseIntegerSchema,
  paidBy: z.string().min(1),
  participants: z.array(z.string().min(1)).min(1),
  splitType: z.enum(["equal", "exact", "percentage", "shares"]),
  splitDetails: z.array(
    z.object({
      memberId: z.string().min(1),
      sharePaise: PaiseIntegerSchema,
    })
  ),
  receiptUrl: z.string().nullable().optional(),
});

/**
 * Zod validation schema for Settlement documents.
 */
export const SettlementSchema = z.object({
  settlementId: z.string().min(1),
  tripId: z.string().min(1),
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amountPaise: PaiseIntegerSchema,
  status: z.enum(["pending", "settled", "disputed", "replaced"]),
  paymentReference: z.string().nullable().optional(),
  settledAt: z.any().nullable().optional(),
});

/**
 * Helper to validate an amount in paise at runtime.
 * Throws ZodError or returns true.
 */
export function validatePaise(amount: unknown): number {
  return PaiseIntegerSchema.parse(amount);
}
