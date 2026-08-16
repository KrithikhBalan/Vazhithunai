// Purpose: Firestore CRUD operations and real-time listeners for the settlements collection — writes minimal settlement transactions, marks them paid, and fetches balances.

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  Timestamp,
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
  // 1. Delete all existing pending settlements for this trip
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

  // 2. Write new settlement documents
  const writePromises = edges.map((edge) => {
    const settlementId = `sett_${tripId}_${edge.fromMemberId}_${edge.toMemberId}_${Date.now()}`;
    const ref = doc(db, SETTLEMENTS_COLLECTION, settlementId);
    const settlement: SettlementDocument = {
      settlementId,
      tripId,
      fromMemberId: edge.fromMemberId,
      toMemberId: edge.toMemberId,
      amountPaise: Math.floor(edge.amountPaise),
      status: "pending",
      paymentReference: null,
      settledAt: null,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    return setDoc(ref, settlement);
  });

  await Promise.all(writePromises);
}

// ─── Mark as Settled ──────────────────────────────────────────────────────────

/**
 * Marks a single settlement as "settled" and records the optional UPI payment reference.
 */
export async function markSettled(
  settlementId: string,
  paymentReference?: string | null
): Promise<void> {
  const ref = doc(db, SETTLEMENTS_COLLECTION, settlementId);
  await updateDoc(ref, {
    status: "settled",
    paymentReference: paymentReference ?? null,
    settledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Marks a settlement as disputed (e.g. payment denied or reference mismatch).
 */
export async function markDisputed(settlementId: string): Promise<void> {
  const ref = doc(db, SETTLEMENTS_COLLECTION, settlementId);
  await updateDoc(ref, {
    status: "disputed",
    updatedAt: serverTimestamp(),
  });
}

// ─── Real-time Listener ───────────────────────────────────────────────────────

/**
 * Subscribes to real-time settlement updates for a trip.
 * Returns settlements sorted: pending first, then settled, then disputed.
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

      // Sort: pending first, then settled, then disputed
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
