// Purpose: Server-side data aggregator that fetches all Firestore documents required for generating a full trip audit PDF report — trip, members, expenses, member balances, and settlement transactions — using Firebase Admin-compatible getDocs queries via the client SDK running in Node.js API Route context.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { TripDocument } from "@/types/trip";
import type { ExpenseDocument } from "@/types/expense";
import type { SettlementDocument } from "@/types/settlement";
import type { MemberBalance } from "@/types/settlement";

export interface TripReportPayload {
  trip: TripDocument;
  expenses: ExpenseDocument[];
  settlements: SettlementDocument[];
  memberBalances: MemberBalance[];
  generatedAt: string; // ISO 8601
}

/**
 * Fetches all data required for a trip PDF audit report.
 * Runs server-side inside a Next.js Route Handler (Node.js environment).
 */
export async function fetchTripReportData(
  tripId: string
): Promise<TripReportPayload> {
  // 1. Load trip document
  const tripSnap = await getDoc(doc(db, "trips", tripId));
  if (!tripSnap.exists()) {
    throw new Error(`Trip not found: ${tripId}`);
  }
  const trip = tripSnap.data() as TripDocument;

  // 2. Load all expenses for this trip
  const expensesSnap = await getDocs(
    query(collection(db, "expenses"), where("tripId", "==", tripId))
  );
  const expenses: ExpenseDocument[] = [];
  expensesSnap.forEach((d) => expenses.push(d.data() as ExpenseDocument));
  // Sort chronologically
  expenses.sort((a, b) => {
    const aTime =
      typeof a.createdAt === "object" && "seconds" in a.createdAt
        ? a.createdAt.seconds
        : new Date(a.createdAt as string).getTime() / 1000;
    const bTime =
      typeof b.createdAt === "object" && "seconds" in b.createdAt
        ? b.createdAt.seconds
        : new Date(b.createdAt as string).getTime() / 1000;
    return aTime - bTime;
  });

  // 3. Load all settlements (pending + settled) for this trip
  const settlementsSnap = await getDocs(
    query(
      collection(db, "settlements"),
      where("tripId", "==", tripId)
    )
  );
  const settlements: SettlementDocument[] = [];
  settlementsSnap.forEach((d) => settlements.push(d.data() as SettlementDocument));
  // Only include active (non-replaced) settlements
  const activeSettlements = settlements.filter((s) => s.status !== "replaced");

  // 4. Compute member net balances from expense split details
  const members = trip.members || [];
  const totalPaidMap: Record<string, number> = {};
  const totalShareMap: Record<string, number> = {};

  members.forEach((m) => {
    totalPaidMap[m.memberId] = 0;
    totalShareMap[m.memberId] = 0;
  });

  expenses.forEach((expense) => {
    // Add to payer's paid total
    if (totalPaidMap[expense.paidBy] !== undefined) {
      totalPaidMap[expense.paidBy] += expense.amountPaise;
    }
    // Add to each participant's share
    expense.splitDetails.forEach((detail) => {
      if (totalShareMap[detail.memberId] !== undefined) {
        totalShareMap[detail.memberId] += detail.sharePaise;
      }
    });
  });

  const memberBalances: MemberBalance[] = members.map((m) => ({
    memberId: m.memberId,
    name: m.name,
    totalPaidPaise: totalPaidMap[m.memberId] || 0,
    totalSharePaise: totalShareMap[m.memberId] || 0,
    netBalancePaise:
      (totalPaidMap[m.memberId] || 0) - (totalShareMap[m.memberId] || 0),
  }));

  return {
    trip,
    expenses,
    settlements: activeSettlements,
    memberBalances,
    generatedAt: new Date().toISOString(),
  };
}
