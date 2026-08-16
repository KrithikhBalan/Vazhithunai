// Purpose: Firestore CRUD operations, real-time queries, and atomic transactions for Expenses and Trip totalExpensePaise synchronization.

import { db } from "./config";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
  Timestamp,
} from "firebase/firestore";
import type { ExpenseDocument, ExpenseFormData } from "@/types/expense";
import type { TripDocument } from "@/types/trip";
import { uploadReceiptPhoto, deleteReceiptPhoto } from "./storage";

const EXPENSES_COLLECTION = "expenses";
const TRIPS_COLLECTION = "trips";

/**
 * Creates an expense and atomically increments `totalExpensePaise` on the parent trip document.
 */
export async function createExpense(
  tripId: string,
  formData: ExpenseFormData
): Promise<string> {
  const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let receiptUrl = formData.receiptUrl || null;

  // 1. Upload receipt image to Storage if provided
  if (formData.receiptFile) {
    try {
      receiptUrl = await uploadReceiptPhoto(tripId, expenseId, formData.receiptFile);
    } catch (uploadErr) {
      console.warn("Receipt upload failed, continuing with expense creation:", uploadErr);
    }
  }

  const expenseRef = doc(db, EXPENSES_COLLECTION, expenseId);
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);

  // 2. Atomic transaction to write expense & update trip total
  await runTransaction(db, async (transaction) => {
    const tripSnap = await transaction.get(tripRef);
    const currentTotal = tripSnap.exists()
      ? (tripSnap.data() as TripDocument).totalExpensePaise || 0
      : 0;

    const newExpense: ExpenseDocument = {
      expenseId,
      tripId,
      category: formData.category,
      description: formData.description.trim(),
      amountPaise: Math.floor(formData.amountPaise),
      paidBy: formData.paidBy,
      participants: formData.participants,
      splitType: formData.splitType,
      splitDetails: formData.splitDetails,
      receiptUrl,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    transaction.set(expenseRef, newExpense);
    if (tripSnap.exists()) {
      transaction.update(tripRef, {
        totalExpensePaise: currentTotal + Math.floor(formData.amountPaise),
        updatedAt: serverTimestamp(),
      });
    }
  });

  return expenseId;
}

/**
 * Updates an existing expense and atomically adjusts `totalExpensePaise` on the parent trip document.
 */
export async function updateExpense(
  tripId: string,
  expenseId: string,
  formData: ExpenseFormData,
  oldAmountPaise: number
): Promise<void> {
  let receiptUrl = formData.receiptUrl || null;

  if (formData.receiptFile) {
    try {
      receiptUrl = await uploadReceiptPhoto(tripId, expenseId, formData.receiptFile);
    } catch (uploadErr) {
      console.warn("Receipt re-upload failed:", uploadErr);
    }
  }

  const expenseRef = doc(db, EXPENSES_COLLECTION, expenseId);
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);

  await runTransaction(db, async (transaction) => {
    const tripSnap = await transaction.get(tripRef);
    const currentTotal = tripSnap.exists()
      ? (tripSnap.data() as TripDocument).totalExpensePaise || 0
      : 0;

    const diffPaise = Math.floor(formData.amountPaise) - Math.floor(oldAmountPaise);
    const updatedTotal = Math.max(0, currentTotal + diffPaise);

    const updatedData: Partial<ExpenseDocument> = {
      category: formData.category,
      description: formData.description.trim(),
      amountPaise: Math.floor(formData.amountPaise),
      paidBy: formData.paidBy,
      participants: formData.participants,
      splitType: formData.splitType,
      splitDetails: formData.splitDetails,
      receiptUrl,
      updatedAt: serverTimestamp() as any,
    };

    transaction.update(expenseRef, updatedData);
    if (tripSnap.exists()) {
      transaction.update(tripRef, {
        totalExpensePaise: updatedTotal,
        updatedAt: serverTimestamp(),
      });
    }
  });
}

/**
 * Deletes an expense and atomically decrements `totalExpensePaise` on the parent trip document.
 */
export async function deleteExpense(
  tripId: string,
  expenseId: string,
  amountPaise: number,
  receiptUrl?: string | null
): Promise<void> {
  const expenseRef = doc(db, EXPENSES_COLLECTION, expenseId);
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);

  await runTransaction(db, async (transaction) => {
    const tripSnap = await transaction.get(tripRef);
    const currentTotal = tripSnap.exists()
      ? (tripSnap.data() as TripDocument).totalExpensePaise || 0
      : 0;

    const updatedTotal = Math.max(0, currentTotal - Math.floor(amountPaise));

    transaction.delete(expenseRef);
    if (tripSnap.exists()) {
      transaction.update(tripRef, {
        totalExpensePaise: updatedTotal,
        updatedAt: serverTimestamp(),
      });
    }
  });

  // Clean up receipt image from Storage if present
  if (receiptUrl) {
    deleteReceiptPhoto(receiptUrl).catch(() => {});
  }
}

/**
 * Fetches a single expense document by ID.
 */
export async function getExpense(expenseId: string): Promise<ExpenseDocument | null> {
  const expenseRef = doc(db, EXPENSES_COLLECTION, expenseId);
  const snap = await getDoc(expenseRef);
  if (!snap.exists()) return null;
  return snap.data() as ExpenseDocument;
}

/**
 * Subscribes to real-time updates for all expenses belonging to a specific trip.
 * Safely handles error callbacks to prevent unhandled Firestore permission exceptions.
 */
export function subscribeToTripExpenses(
  tripId: string,
  onUpdate: (expenses: ExpenseDocument[]) => void
): Unsubscribe {
  if (!tripId) {
    onUpdate([]);
    return () => {};
  }

  const expensesRef = collection(db, EXPENSES_COLLECTION);
  const q = query(expensesRef, where("tripId", "==", tripId));

  return onSnapshot(
    q,
    (snapshot) => {
      const expenses: ExpenseDocument[] = [];
      snapshot.forEach((docSnap) => {
        expenses.push(docSnap.data() as ExpenseDocument);
      });

      // Sort chronologically descending (newest first)
      expenses.sort((a, b) => {
        const timeA =
          a.createdAt instanceof Timestamp
            ? a.createdAt.toMillis()
            : new Date(a.createdAt as string).getTime() || 0;
        const timeB =
          b.createdAt instanceof Timestamp
            ? b.createdAt.toMillis()
            : new Date(b.createdAt as string).getTime() || 0;
        return timeB - timeA;
      });

      onUpdate(expenses);
    },
    (error) => {
      console.warn(`[Firestore] subscribeToTripExpenses warning for trip ${tripId}:`, error.message);
      onUpdate([]);
    }
  );
}
