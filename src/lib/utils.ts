// Purpose: General helper utilities across Vazhithunai (Tailwind class merging, Paise integer money conversions, phone formatting, UPI deep-link generation, and UPI ID validation).

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely, resolving conflicts */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format paise (integer) to INR display string e.g. 150000 → "₹1,500.00" */
export function formatPaise(paise: number | bigint): string {
  const amount = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Convert INR decimal (string or number) input to paise integer (no floats ever stored) */
export function inrToPaise(inr: string | number): number {
  if (typeof inr === "number") {
    if (isNaN(inr)) return 0;
    return Math.round(inr * 100);
  }
  const parsed = parseFloat(inr.replace(/[^0-9.]/g, ""));
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/** Format an E.164 phone for display e.g. "+919876543210" → "+91 98765 43210" */
export function formatPhone(phone: string): string {
  if (phone.startsWith("+91") && phone.length === 13) {
    return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  return phone;
}

/**
 * Validates UPI VPA format (e.g. name@okhdfcbank, mobile@paytm, user@upi).
 */
export function isValidUpiId(upiId: string): boolean {
  if (!upiId || typeof upiId !== "string") return false;
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upiId.trim());
}

/**
 * Generate standard UPI deep-link URL protocol (non-custodial — never stores credentials).
 * upi://pay?pa={UPI_ID}&pn={Name}&am={Amount}&cu=INR&tn={Note}
 */
export function buildUpiUrl(params: {
  pa: string; // payee VPA (e.g. name@okhdfcbank)
  pn: string; // payee name
  am: number; // amount in paise
  tn?: string; // transaction note
}): string {
  const inr = (Math.max(0, Math.floor(params.am)) / 100).toFixed(2);
  const searchParams = new URLSearchParams();
  searchParams.set("pa", params.pa.trim());
  searchParams.set("pn", params.pn.trim());
  searchParams.set("am", inr);
  searchParams.set("cu", "INR");
  if (params.tn) {
    searchParams.set("tn", params.tn.trim());
  }

  return `upi://pay?${searchParams.toString()}`;
}
