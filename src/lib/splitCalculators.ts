// Purpose: Pure integer math split calculators (Equal, Exact, Percentage, Shares) operating strictly in 64-bit integer Paise with deterministic remainder distribution.

import type { SplitDetail, SplitType } from "@/types/expense";

/**
 * 1. EQUAL SPLIT CALCULATOR
 * Divides amountPaise evenly among N participants.
 * Distributes the remainder R = amountPaise % N by assigning 1 extra paise
 * to the first R participants, ensuring the sum matches amountPaise exactly.
 */
export function calculateEqualSplit(
  amountPaise: number,
  participants: string[]
): SplitDetail[] {
  if (participants.length === 0 || amountPaise <= 0) {
    return participants.map((id) => ({ memberId: id, sharePaise: 0 }));
  }

  const n = participants.length;
  const quotient = Math.floor(amountPaise / n);
  const remainder = amountPaise % n;

  return participants.map((memberId, index) => ({
    memberId,
    // First 'remainder' participants get quotient + 1 paise
    sharePaise: index < remainder ? quotient + 1 : quotient,
  }));
}

/**
 * 2. EXACT SPLIT CALCULATOR
 * Takes explicit paise amounts per participant and validates that the sum
 * equals amountPaise exactly.
 */
export function calculateExactSplit(
  amountPaise: number,
  participants: string[],
  exactSharesPaise: Record<string, number>
): { splitDetails: SplitDetail[]; isValid: boolean; differencePaise: number } {
  let totalAssigned = 0;

  const splitDetails: SplitDetail[] = participants.map((memberId) => {
    const share = Math.max(0, Math.floor(exactSharesPaise[memberId] || 0));
    totalAssigned += share;
    return { memberId, sharePaise: share };
  });

  const differencePaise = amountPaise - totalAssigned;
  const isValid = differencePaise === 0;

  return { splitDetails, isValid, differencePaise };
}

/**
 * 3. PERCENTAGE SPLIT CALCULATOR
 * Converts percentage weights (which must sum to 100%) into integer paise shares.
 * Allocates fractional remainder paise to participants with the highest percentage/remainder.
 */
export function calculatePercentageSplit(
  amountPaise: number,
  participants: string[],
  percentages: Record<string, number>
): { splitDetails: SplitDetail[]; isValid: boolean; totalPercent: number } {
  if (participants.length === 0 || amountPaise <= 0) {
    return {
      splitDetails: participants.map((id) => ({ memberId: id, sharePaise: 0 })),
      isValid: false,
      totalPercent: 0,
    };
  }

  let totalPercent = 0;
  participants.forEach((id) => {
    totalPercent += Number(percentages[id] || 0);
  });

  // Percentages must sum to 100 (allowing slight floating tolerance e.g. 99.99 to 100.01)
  const isValid = Math.abs(totalPercent - 100) < 0.01;

  // Calculate base paise shares and track fractional remainders
  const allocations = participants.map((memberId) => {
    const pct = Math.max(0, Number(percentages[memberId] || 0));
    const exactPaise = (amountPaise * pct) / 100;
    const basePaise = Math.floor(exactPaise);
    const fractionalPart = exactPaise - basePaise;
    return { memberId, basePaise, fractionalPart };
  });

  const totalBasePaise = allocations.reduce((sum, a) => sum + a.basePaise, 0);
  let remainderPaise = amountPaise - totalBasePaise;

  // Sort by highest fractional remainder to fairly distribute leftover paise
  allocations.sort((a, b) => b.fractionalPart - a.fractionalPart);

  const resultMap = new Map<string, number>();
  allocations.forEach((item) => {
    let extra = 0;
    if (remainderPaise > 0) {
      extra = 1;
      remainderPaise -= 1;
    }
    resultMap.set(item.memberId, item.basePaise + extra);
  });

  // Preserve original participant ordering
  const splitDetails: SplitDetail[] = participants.map((memberId) => ({
    memberId,
    sharePaise: resultMap.get(memberId) || 0,
  }));

  return { splitDetails, isValid, totalPercent };
}

/**
 * 4. SHARES / WEIGHTED SPLIT CALCULATOR
 * Divides amountPaise proportionally by integer weights (e.g. 1 share, 2 shares).
 * Allocates fractional remainder paise proportionally to participants with highest remainders.
 */
export function calculateSharesSplit(
  amountPaise: number,
  participants: string[],
  shares: Record<string, number>
): { splitDetails: SplitDetail[]; isValid: boolean; totalShares: number } {
  if (participants.length === 0 || amountPaise <= 0) {
    return {
      splitDetails: participants.map((id) => ({ memberId: id, sharePaise: 0 })),
      isValid: false,
      totalShares: 0,
    };
  }

  let totalShares = 0;
  participants.forEach((id) => {
    totalShares += Math.max(0, Math.floor(shares[id] || 0));
  });

  if (totalShares <= 0) {
    return {
      splitDetails: calculateEqualSplit(amountPaise, participants),
      isValid: false,
      totalShares: 0,
    };
  }

  // Calculate base paise shares
  const allocations = participants.map((memberId) => {
    const weight = Math.max(0, Math.floor(shares[memberId] || 0));
    const exactPaise = (amountPaise * weight) / totalShares;
    const basePaise = Math.floor(exactPaise);
    const fractionalPart = exactPaise - basePaise;
    return { memberId, basePaise, fractionalPart };
  });

  const totalBasePaise = allocations.reduce((sum, a) => sum + a.basePaise, 0);
  let remainderPaise = amountPaise - totalBasePaise;

  // Sort by highest fractional remainder
  allocations.sort((a, b) => b.fractionalPart - a.fractionalPart);

  const resultMap = new Map<string, number>();
  allocations.forEach((item) => {
    let extra = 0;
    if (remainderPaise > 0) {
      extra = 1;
      remainderPaise -= 1;
    }
    resultMap.set(item.memberId, item.basePaise + extra);
  });

  const splitDetails: SplitDetail[] = participants.map((memberId) => ({
    memberId,
    sharePaise: resultMap.get(memberId) || 0,
  }));

  return { splitDetails, isValid: true, totalShares };
}

/**
 * Universal dispatcher to calculate split details based on SplitType
 */
export function computeSplitDetails(
  type: SplitType,
  amountPaise: number,
  participants: string[],
  options?: {
    exactShares?: Record<string, number>;
    percentages?: Record<string, number>;
    shares?: Record<string, number>;
  }
): { splitDetails: SplitDetail[]; isValid: boolean; errorMessage?: string } {
  if (participants.length === 0) {
    return { splitDetails: [], isValid: false, errorMessage: "Select at least 1 participant" };
  }
  if (amountPaise <= 0) {
    return {
      splitDetails: participants.map((id) => ({ memberId: id, sharePaise: 0 })),
      isValid: false,
      errorMessage: "Amount must be greater than zero",
    };
  }

  switch (type) {
    case "equal": {
      const details = calculateEqualSplit(amountPaise, participants);
      return { splitDetails: details, isValid: true };
    }
    case "exact": {
      const { splitDetails, isValid, differencePaise } = calculateExactSplit(
        amountPaise,
        participants,
        options?.exactShares || {}
      );
      return {
        splitDetails,
        isValid,
        errorMessage: isValid
          ? undefined
          : `Exact split difference is ${differencePaise > 0 ? "+" : ""}${(differencePaise / 100).toFixed(2)}`,
      };
    }
    case "percentage": {
      const { splitDetails, isValid, totalPercent } = calculatePercentageSplit(
        amountPaise,
        participants,
        options?.percentages || {}
      );
      return {
        splitDetails,
        isValid,
        errorMessage: isValid
          ? undefined
          : `Total percentage must equal 100% (currently ${totalPercent.toFixed(1)}%)`,
      };
    }
    case "shares": {
      const { splitDetails, isValid, totalShares } = calculateSharesSplit(
        amountPaise,
        participants,
        options?.shares || {}
      );
      return {
        splitDetails,
        isValid,
        errorMessage: isValid && totalShares > 0 ? undefined : "Total shares must be at least 1",
      };
    }
  }
}
