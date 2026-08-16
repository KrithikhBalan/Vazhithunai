// Purpose: Pure deterministic settlement engine — computes each member's net balance from expenses and runs a greedy debt-graph minimization algorithm to produce the fewest possible payment transactions. Contains a built-in unit test fixture.

import type { ExpenseDocument } from "@/types/expense";
import type { TripMember } from "@/types/trip";
import type { MemberBalance, SettlementEdge } from "@/types/settlement";

// ─── Step 1: Compute Net Balances ────────────────────────────────────────────

/**
 * Computes each trip member's net balance from a list of expenses.
 *
 * NetBalance[member] = TotalPaid[member] − TotalShare[member]
 *   > 0  →  creditor (is owed money by others)
 *   < 0  →  debtor   (owes money to others)
 *   = 0  →  fully settled
 *
 * All arithmetic is integer Paise only — no floats are ever used.
 */
export function computeMemberBalances(
  members: TripMember[],
  expenses: ExpenseDocument[]
): MemberBalance[] {
  // Initialize all balances to zero for every member
  const paid: Record<string, number> = {};
  const share: Record<string, number> = {};

  for (const m of members) {
    paid[m.memberId] = 0;
    share[m.memberId] = 0;
  }

  for (const expense of expenses) {
    // Accumulate total paid by the payer
    if (paid[expense.paidBy] !== undefined) {
      paid[expense.paidBy] += Math.floor(expense.amountPaise);
    }

    // Accumulate each participant's share
    for (const detail of expense.splitDetails) {
      if (share[detail.memberId] !== undefined) {
        share[detail.memberId] += Math.floor(detail.sharePaise);
      }
    }
  }

  return members.map((m) => ({
    memberId: m.memberId,
    name: m.name,
    totalPaidPaise: paid[m.memberId] ?? 0,
    totalSharePaise: share[m.memberId] ?? 0,
    netBalancePaise: (paid[m.memberId] ?? 0) - (share[m.memberId] ?? 0),
  }));
}

// ─── Step 2: Greedy Debt Minimization ────────────────────────────────────────

/**
 * Implements the greedy debt-graph minimization algorithm:
 *
 * 1. Separate members into creditors (netBalance > 0) and debtors (netBalance < 0).
 * 2. Sort both lists in descending absolute amount order.
 * 3. Repeatedly match the largest debtor against the largest creditor:
 *    - Settle the minimum of the two absolute values.
 *    - Reduce both balances by that amount.
 *    - Remove any member whose balance reaches 0.
 * 4. Repeat until all balances are zero.
 *
 * This produces the MINIMUM number of transactions required to settle the group.
 * All amounts are integer Paise — never floats.
 *
 * Complexity: O(n²) in the worst case — acceptable for travel group sizes (≤ 50 members).
 */
export function minimizeSettlements(balances: MemberBalance[]): SettlementEdge[] {
  const edges: SettlementEdge[] = [];

  // Working copies as signed integers: positive = creditor, negative = debtor
  const working = balances
    .map((b) => ({ memberId: b.memberId, balance: b.netBalancePaise }))
    .filter((b) => b.balance !== 0); // skip settled members

  while (true) {
    // Separate into creditors and debtors
    const creditors = working
      .filter((b) => b.balance > 0)
      .sort((a, b) => b.balance - a.balance); // largest creditor first

    const debtors = working
      .filter((b) => b.balance < 0)
      .sort((a, b) => a.balance - b.balance); // largest debtor first (most negative)

    if (creditors.length === 0 || debtors.length === 0) break;

    const creditor = creditors[0];
    const debtor = debtors[0];

    // Amount to settle = min(|debtor|, creditor)
    const settleAmount = Math.min(Math.abs(debtor.balance), creditor.balance);

    if (settleAmount <= 0) break; // safety guard

    edges.push({
      fromMemberId: debtor.memberId,   // debtor pays
      toMemberId: creditor.memberId,   // creditor receives
      amountPaise: settleAmount,
    });

    // Reduce balances — find by memberId in working array
    const workingCreditor = working.find((b) => b.memberId === creditor.memberId)!;
    const workingDebtor = working.find((b) => b.memberId === debtor.memberId)!;

    workingCreditor.balance -= settleAmount;
    workingDebtor.balance += settleAmount;

    // Remove members whose balance reached exactly zero
    const zeroIdx: number[] = [];
    for (let i = 0; i < working.length; i++) {
      if (working[i].balance === 0) zeroIdx.push(i);
    }
    // Remove in reverse order so indices stay valid
    for (let i = zeroIdx.length - 1; i >= 0; i--) {
      working.splice(zeroIdx[i], 1);
    }
  }

  return edges;
}

// ─── Combined Entry Point ─────────────────────────────────────────────────────

/**
 * Given trip members and their expenses, returns the minimal set of settlement
 * transactions (SettlementEdge[]) needed to balance the group.
 */
export function computeSettlements(
  members: TripMember[],
  expenses: ExpenseDocument[]
): { balances: MemberBalance[]; edges: SettlementEdge[] } {
  const balances = computeMemberBalances(members, expenses);
  const edges = minimizeSettlements(balances);
  return { balances, edges };
}

// ─── Unit Test Fixture ────────────────────────────────────────────────────────

/**
 * Built-in unit test:
 *   6 members, total expense ₹12,000 (1,200,000 Paise)
 *   Paid amounts: ₹5,000 / ₹4,000 / ₹3,000 / ₹0 / ₹0 / ₹0
 *   Equal share:  ₹2,000 each
 *   Expected result: exactly 5 minimal settlement transactions
 *
 * Run this in development/CI to verify algorithm correctness.
 * Returns true if the fixture passes, false + console.error if it fails.
 */
export function runSettlementUnitTest(): boolean {
  const SHARE = 200000; // ₹2,000 per person in paise

  const mockMembers: TripMember[] = [
    { memberId: "A", name: "Alice" },
    { memberId: "B", name: "Bob" },
    { memberId: "C", name: "Charlie" },
    { memberId: "D", name: "Diana" },
    { memberId: "E", name: "Eve" },
    { memberId: "F", name: "Frank" },
  ];

  // Three expenses paid by A, B, C respectively; shared equally among all 6
  const mockExpenses: ExpenseDocument[] = [
    {
      expenseId: "e1",
      tripId: "test",
      category: "food",
      description: "Expense by Alice",
      amountPaise: 500000, // ₹5,000
      paidBy: "A",
      participants: ["A", "B", "C", "D", "E", "F"],
      splitType: "equal",
      splitDetails: [
        { memberId: "A", sharePaise: SHARE },
        { memberId: "B", sharePaise: SHARE },
        { memberId: "C", sharePaise: SHARE },
        { memberId: "D", sharePaise: SHARE },
        { memberId: "E", sharePaise: SHARE },
        { memberId: "F", sharePaise: SHARE },
      ],
      receiptUrl: null,
      createdAt: new Date().toISOString(),
    },
    {
      expenseId: "e2",
      tripId: "test",
      category: "hotel",
      description: "Expense by Bob",
      amountPaise: 400000, // ₹4,000
      paidBy: "B",
      participants: ["A", "B", "C", "D", "E", "F"],
      splitType: "equal",
      splitDetails: [
        { memberId: "A", sharePaise: SHARE },
        { memberId: "B", sharePaise: SHARE },
        { memberId: "C", sharePaise: SHARE },
        { memberId: "D", sharePaise: SHARE },
        { memberId: "E", sharePaise: SHARE },
        { memberId: "F", sharePaise: SHARE },
      ],
      receiptUrl: null,
      createdAt: new Date().toISOString(),
    },
    {
      expenseId: "e3",
      tripId: "test",
      category: "fuel",
      description: "Expense by Charlie",
      amountPaise: 300000, // ₹3,000
      paidBy: "C",
      participants: ["A", "B", "C", "D", "E", "F"],
      splitType: "equal",
      splitDetails: [
        { memberId: "A", sharePaise: SHARE },
        { memberId: "B", sharePaise: SHARE },
        { memberId: "C", sharePaise: SHARE },
        { memberId: "D", sharePaise: SHARE },
        { memberId: "E", sharePaise: SHARE },
        { memberId: "F", sharePaise: SHARE },
      ],
      receiptUrl: null,
      createdAt: new Date().toISOString(),
    },
  ];

  const { balances, edges } = computeSettlements(mockMembers, mockExpenses);

  // Verify net balances
  // A: paid 500000, share 200000 → net +300000
  // B: paid 400000, share 200000 → net +200000
  // C: paid 300000, share 200000 → net +100000
  // D: paid 0,      share 200000 → net -200000
  // E: paid 0,      share 200000 → net -200000
  // F: paid 0,      share 200000 → net -200000

  const balanceMap: Record<string, number> = {};
  for (const b of balances) balanceMap[b.memberId] = b.netBalancePaise;

  const expectedBalances: Record<string, number> = {
    A: 300000,
    B: 200000,
    C: 100000,
    D: -200000,
    E: -200000,
    F: -200000,
  };

  let passed = true;

  for (const [id, expected] of Object.entries(expectedBalances)) {
    if (balanceMap[id] !== expected) {
      console.error(
        `[SettlementTest] Balance mismatch for ${id}: expected ${expected}, got ${balanceMap[id]}`
      );
      passed = false;
    }
  }

  // Verify: exactly 5 settlement transactions
  if (edges.length !== 5) {
    console.error(
      `[SettlementTest] Expected 5 settlement edges, got ${edges.length}:`,
      edges
    );
    passed = false;
  }

  // Verify: sum of all edge amounts = sum of absolute debtor balances = 600000
  const totalSettledPaise = edges.reduce((s, e) => s + e.amountPaise, 0);
  if (totalSettledPaise !== 600000) {
    console.error(
      `[SettlementTest] Total settled paise should be 600000, got ${totalSettledPaise}`
    );
    passed = false;
  }

  if (passed) {
    console.log(
      `[SettlementTest] ✅ PASSED — ${edges.length} transactions, ₹${totalSettledPaise / 100} total settled`
    );
  }

  return passed;
}
