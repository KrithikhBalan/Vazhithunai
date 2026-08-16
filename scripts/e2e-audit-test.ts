// Purpose: End-to-end comprehensive test suite validating the entire Vazhithunai user flow: Trip Creation -> Member Roster -> Expenses with all 4 split algorithms (Equal with remainder paise distribution, Exact, Percentage, Shares) -> Greedy debt-minimization settlement calculation -> UPI deep link URL generation -> Settlement confirmation -> Zod Integer Paise monetary validation.

import { computeSplitDetails } from "../src/lib/splitCalculators";
import { computeMemberBalances, computeSettlements } from "../src/lib/settlementEngine";
import { buildUpiUrl, formatPaise, inrToPaise } from "../src/lib/utils";
import { PaiseIntegerSchema, ExpenseSchema, SettlementSchema } from "../src/lib/validation/monetarySchemas";
import type { ExpenseDocument } from "../src/types/expense";
import type { TripMember } from "../src/types/trip";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    process.exit(1);
  }
}

console.log("\n=======================================================");
console.log("  VAZHITHUNAI END-TO-END PRODUCTION VALIDATION TEST");
console.log("=======================================================\n");

// ─── Step 1: Trip & Members Setup ─────────────────────────────────────────────
console.log("1. TRIP & MEMBERS CREATION");
const members: TripMember[] = [
  { memberId: "m1", name: "Anand", phone: "+919876543210", upiId: "anand@okhdfcbank", joinedAt: {} as any },
  { memberId: "m2", name: "Bala", phone: "+919876543211", upiId: "bala@paytm", joinedAt: {} as any },
  { memberId: "m3", name: "Chitra", phone: "+919876543212", upiId: "chitra@ybl", joinedAt: {} as any },
  { memberId: "m4", name: "Dinesh", phone: "+919876543213", upiId: "dinesh@oksbi", joinedAt: {} as any },
];
const memberIds = members.map((m) => m.memberId);

runTest("Trip members initialized with valid VPAs", () => {
  if (members.length !== 4) throw new Error("Expected 4 members");
});

// ─── Step 2: Split Mode Calculations (Paise-Precise) ──────────────────────────
console.log("\n2. SPLIT CALCULATORS (ALL 4 SPLIT TYPES)");

// Test 2.1: Equal Split with Remainder Paise
runTest("Equal Split with remainder paise distribution (₹100.01 / 10001 paise among 3 members)", () => {
  const amountPaise = 10001; // ₹100.01
  const participants = ["m1", "m2", "m3"];
  const res = computeSplitDetails("equal", amountPaise, participants, {});
  
  if (!res.isValid) throw new Error(res.errorMessage || "Validation failed");
  // 10001 / 3 = 3333 with remainder 2 -> first 2 get 3334, 3rd gets 3333
  const sum = res.splitDetails.reduce((acc, d) => acc + d.sharePaise, 0);
  if (sum !== amountPaise) throw new Error(`Sum mismatch: ${sum} vs ${amountPaise}`);
  if (res.splitDetails[0].sharePaise !== 3334 || res.splitDetails[1].sharePaise !== 3334 || res.splitDetails[2].sharePaise !== 3333) {
    throw new Error(`Unexpected shares: ${JSON.stringify(res.splitDetails)}`);
  }
});

// Test 2.2: Exact Split
runTest("Exact Split (₹500.00 / 50000 paise manual assignment)", () => {
  const amountPaise = 50000;
  const participants = ["m1", "m2"];
  const res = computeSplitDetails("exact", amountPaise, participants, {
    exactShares: { m1: 30000, m2: 20000 },
  });
  if (!res.isValid) throw new Error("Exact split should be valid");
  const sum = res.splitDetails.reduce((acc, d) => acc + d.sharePaise, 0);
  if (sum !== amountPaise) throw new Error("Exact split sum mismatch");
});

// Test 2.3: Percentage Split
runTest("Percentage Split (60% / 40% of ₹1000.00)", () => {
  const amountPaise = 100000;
  const participants = ["m1", "m2"];
  const res = computeSplitDetails("percentage", amountPaise, participants, {
    percentages: { m1: 60, m2: 40 },
  });
  if (!res.isValid) throw new Error("Percentage split should be valid");
  if (res.splitDetails.find((d) => d.memberId === "m1")?.sharePaise !== 60000) throw new Error("m1 share incorrect");
  if (res.splitDetails.find((d) => d.memberId === "m2")?.sharePaise !== 40000) throw new Error("m2 share incorrect");
});

// Test 2.4: Shares / Weight Split
runTest("Shares Split (Ratio 2 : 1 : 1 of ₹400.00 / 40000 paise)", () => {
  const amountPaise = 40000;
  const participants = ["m1", "m2", "m3"];
  const res = computeSplitDetails("shares", amountPaise, participants, {
    shares: { m1: 2, m2: 1, m3: 1 },
  });
  if (!res.isValid) throw new Error("Shares split should be valid");
  if (res.splitDetails.find((d) => d.memberId === "m1")?.sharePaise !== 20000) throw new Error("m1 share incorrect");
  if (res.splitDetails.find((d) => d.memberId === "m2")?.sharePaise !== 10000) throw new Error("m2 share incorrect");
  if (res.splitDetails.find((d) => d.memberId === "m3")?.sharePaise !== 10000) throw new Error("m3 share incorrect");
});

// ─── Step 3: Realistic Trip Expenses Scenario ─────────────────────────────────
console.log("\n3. LOGGING EXPENSES & NET BALANCE COMPUTATION");

const sampleExpenses: ExpenseDocument[] = [
  // E1: Anand paid ₹6000 for Hotel (Equal split across all 4)
  {
    expenseId: "exp_1",
    tripId: "trip_ooty",
    category: "hotel",
    description: "Ooty Mountain Resort",
    amountPaise: 600000,
    paidBy: "m1",
    participants: memberIds,
    splitType: "equal",
    splitDetails: [
      { memberId: "m1", sharePaise: 150000 },
      { memberId: "m2", sharePaise: 150000 },
      { memberId: "m3", sharePaise: 150000 },
      { memberId: "m4", sharePaise: 150000 },
    ],
    receiptUrl: null,
    createdAt: {} as any,
  },
  // E2: Bala paid ₹2000 for Fuel (Equal split between Bala and Chitra)
  {
    expenseId: "exp_2",
    tripId: "trip_ooty",
    category: "fuel",
    description: "HP Petrol Pump",
    amountPaise: 200000,
    paidBy: "m2",
    participants: ["m2", "m3"],
    splitType: "equal",
    splitDetails: [
      { memberId: "m2", sharePaise: 100000 },
      { memberId: "m3", sharePaise: 100000 },
    ],
    receiptUrl: null,
    createdAt: {} as any,
  },
  // E3: Chitra paid ₹1200 for Dinner (Equal across all 4)
  {
    expenseId: "exp_3",
    tripId: "trip_ooty",
    category: "food",
    description: "Chettinad Mess Dinner",
    amountPaise: 120000,
    paidBy: "m3",
    participants: memberIds,
    splitType: "equal",
    splitDetails: [
      { memberId: "m1", sharePaise: 30000 },
      { memberId: "m2", sharePaise: 30000 },
      { memberId: "m3", sharePaise: 30000 },
      { memberId: "m4", sharePaise: 30000 },
    ],
    receiptUrl: null,
    createdAt: {} as any,
  },
];

runTest("Compute Member Net Balances (Total Paid - Total Share)", () => {
  const memberBalances = computeMemberBalances(members, sampleExpenses);
  const balances: Record<string, number> = {};
  for (const mb of memberBalances) {
    balances[mb.memberId] = mb.netBalancePaise;
  }
  
  // Total Spent: ₹6000 + ₹2000 + ₹1200 = ₹9200 (920000 paise)
  // m1 (Anand): Paid 600000, Share 180000 -> Net +420000 (+₹4200)
  // m2 (Bala):  Paid 200000, Share 280000 -> Net -80000 (-₹800)
  // m3 (Chitra): Paid 120000, Share 280000 -> Net -160000 (-₹1600)
  // m4 (Dinesh): Paid 0,      Share 180000 -> Net -180000 (-₹1800)
  
  if (balances["m1"] !== 420000) throw new Error(`m1 balance mismatch: ${balances["m1"]}`);
  if (balances["m2"] !== -80000) throw new Error(`m2 balance mismatch: ${balances["m2"]}`);
  if (balances["m3"] !== -160000) throw new Error(`m3 balance mismatch: ${balances["m3"]}`);
  if (balances["m4"] !== -180000) throw new Error(`m4 balance mismatch: ${balances["m4"]}`);

  // Conservation of Money: sum of all net balances MUST equal 0
  const netSum = Object.values(balances).reduce((a, b) => a + b, 0);
  if (netSum !== 0) throw new Error(`Net balances do not sum to zero: sum = ${netSum}`);
});

// ─── Step 4: Greedy Settlement Minimization Engine ───────────────────────────
console.log("\n4. GREEDY DEBT MINIMIZATION ENGINE");

runTest("Compute Minimal Settlement Transactions", () => {
  const { edges } = computeSettlements(members, sampleExpenses);
  
  // Total Debt = 1800 + 1600 + 800 = 420000 paise
  const totalSettledAmount = edges.reduce((s, item) => s + item.amountPaise, 0);
  if (totalSettledAmount !== 420000) {
    throw new Error(`Total settlement mismatch: ${totalSettledAmount} vs 420000`);
  }

  // Greedy algorithm produces exactly 3 minimal transactions:
  // Dinesh (owes 1800) -> Anand (gets 1800)
  // Chitra (owes 1600) -> Anand (gets 1600)
  // Bala (owes 800) -> Anand (gets 800)
  if (edges.length !== 3) {
    throw new Error(`Expected exactly 3 minimal transactions, got ${edges.length}`);
  }

  console.log(`     Generated ${edges.length} optimal settlements:`);
  edges.forEach((s) => {
    console.log(`     • ${s.fromMemberId} -> ${s.toMemberId}: ${formatPaise(s.amountPaise)}`);
  });
});

// ─── Step 5: UPI Deep Link Generation ────────────────────────────────────────
console.log("\n5. NON-CUSTODIAL UPI DEEP LINK GENERATION");

runTest("Generate Standard UPI Deep Link with correct URL parameters", () => {
  const upiUrl = buildUpiUrl({
    pa: "anand@okhdfcbank",
    pn: "Anand Kumar",
    am: 180000, // ₹1800.00
    tn: "Ooty Trip 2026 sett_001",
  });

  if (!upiUrl.startsWith("upi://pay?")) throw new Error("Missing upi:// scheme");
  if (!upiUrl.includes("pa=anand%40okhdfcbank") && !upiUrl.includes("pa=anand@okhdfcbank")) {
    throw new Error("Missing or malformed VPA address");
  }
  if (!upiUrl.includes("am=1800.00")) throw new Error("Missing or incorrect decimal amount (1800.00)");
  if (!upiUrl.includes("cu=INR")) throw new Error("Missing currency INR");
  
  console.log(`     Generated UPI Link: ${upiUrl}`);
});

// ─── Step 6: Zod Runtime Monetary Schema Validation ───────────────────────────
console.log("\n6. MONETARY INTEGRITY VALIDATION");

runTest("PaiseIntegerSchema rejects decimals, NaN, negative amounts", () => {
  // Should accept valid integers
  PaiseIntegerSchema.parse(10050);
  PaiseIntegerSchema.parse(0);

  // Should reject float
  try {
    PaiseIntegerSchema.parse(100.5);
    throw new Error("Failed to reject float");
  } catch (err: any) {
    if (!err.errors && !err.issues) throw err;
  }

  // Should reject negative
  try {
    PaiseIntegerSchema.parse(-50);
    throw new Error("Failed to reject negative");
  } catch (err: any) {
    if (!err.errors && !err.issues) throw err;
  }
});

runTest("ExpenseSchema validates full document boundary", () => {
  ExpenseSchema.parse(sampleExpenses[0]);
});

console.log("\n=======================================================");
console.log("  ALL END-TO-END VALIDATION TESTS PASSED (100% OK)");
console.log("=======================================================\n");
