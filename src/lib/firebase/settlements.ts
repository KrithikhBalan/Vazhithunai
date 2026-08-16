// Purpose: Firestore CRUD operations and real-time listeners for the settlements collection — writes minimal settlement transactions, manages non-custodial UPI payment states, and handles creditor-only receipt confirmations.

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type { SettlementDocument, SettlementEdge } from "@/types/settlement";

const SETTLEMENTS_COLLECTION = "settlements";

// ─── Write Computed Settlements ───────────────────────────────────────────────

/**
 * Deletes any existing pending settlements for a trip, then writes a fresh set
 * from the greedy minimization output. Always call this after recomputing balances.
 *
 * NOTE: This replaces (not merges) pending settlements so the set stays minimal.
 */
export async function writeSettlements(
  tripId: string,
  edges: SettlementEdge[]
): Promise<void> {
  // 1. Mark all existing pending settlements for this trip as replaced
  const q = query(
    collection(db, SETTLEMENTS_COLLECTION),
    where("tripId", "==", tripId),
    where("status", "==", "pending")
  );
  const existing = await getDocs(q);
  const deletePromises = existing.docs.map((d) =>
    updateDoc(d.ref, { status: "replaced", updatedAt: serverTimestamp() })
  );
  await Promise.all(deletePromises);

  // 2. Write new minimal settlement documents
  const writePromises = edges.map((edge) => {
    const settlementId = `sett_${tripId}_${edge.fromMemberId}_${edge.toMemberId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ref = doc(db, SETTLEMENTS_COLLECTION, settlementId);
    const settlement: SettlementDocument = {
      settlementId,
      tripId,
      fromMemberId: edge.fromMemberId,
      toMemberId: edge.toMemberId,
      amountPaise: Math.floor(edge.amountPaise),
      status: "pending",
      paymentReference: null,
      paymentInitiatedAt: null,
      initiatedByDebtor: false,
      settledAt: null,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    return setDoc(ref, settlement);
  });

  await Promise.all(writePromises);
}

// ─── Debtor Action: Record Payment Initiated ──────────────────────────────────

/**
 * Records that the debtor has initiated UPI payment and optionally entered a reference/UTR.
 * Status remains "pending" until the CREDITOR explicitly acknowledges receipt.
 */
export async function recordPaymentInitiated(
  settlementId: string,
  paymentReference?: string | null
): Promise<void> {
  const ref = doc(db, SETTLEMENTS_COLLECTION, settlementId);
  await updateDoc(ref, {
    initiatedByDebtor: true,
    paymentReference: paymentReference?.trim() || null,
    paymentInitiatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Creditor Action: Mark as Received (Settled) ──────────────────────────────

/**
 * Marks a single settlement as "settled".
 * STRICT REQUIREMENT: Only the CREDITOR (toMemberId) or authorized group member
 * can confirm receipt of payment. Never auto-confirm without creditor acknowledgment.
 */
export async function markSettled(
  settlementId: string,
  paymentReference?: string | null
): Promise<void> {
  const ref = doc(db, SETTLEMENTS_COLLECTION, settlementId);
  const payload: Record<string, any> = {
    status: "settled",
    settledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (paymentReference !== undefined && paymentReference !== null) {
    payload.paymentReference = paymentReference.trim();
  }

  await updateDoc(ref, payload);
}

// ─── Creditor Action: Dispute Settlement ──────────────────────────────────────

/**
 * Marks a settlement as disputed (e.g. debtor claimed to pay, but creditor did not receive).
 */
export async function markDisputed(settlementId: string): Promise<void> {
  const ref = doc(db, SETTLEMENTS_COLLECTION, settlementId);
  await updateDoc(ref, {
    status: "disputed",
    disputedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Real-time Listener ───────────────────────────────────────────────────────

/**
 * Subscribes to real-time settlement updates for a trip.
 * Returns settlements sorted: pending first, then disputed, then settled.
 */
export function subscribeToTripSettlements(
  tripId: string,
  onUpdate: (settlements: SettlementDocument[]) => void
): Unsubscribe {
  if (!tripId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, SETTLEMENTS_COLLECTION),
    where("tripId", "==", tripId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const settlements: SettlementDocument[] = [];
      snapshot.forEach((docSnap) => {
        settlements.push(docSnap.data() as SettlementDocument);
      });

      // Sort: pending first, then disputed, then settled, then replaced
      const statusOrder: Record<string, number> = {
        pending: 0,
        disputed: 1,
        settled: 2,
        replaced: 3,
      };
      settlements.sort(
        (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      );

      onUpdate(settlements);
    },
    (error) => {
      console.warn(
        `[Firestore] subscribeToTripSettlements error for trip ${tripId}:`,
        error.message
      );
      onUpdate([]);
    }
  );
}
