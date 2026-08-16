// Purpose: General helper utilities across Vazhithunai (Tailwind class merging, Paise integer money conversions, phone formatting, and UPI deep-link generation).

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

/** Convert INR decimal string input to paise integer (no floats ever stored) */
export function inrToPaise(inr: string): number {
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

/** Generate UPI deep-link URL (non-custodial — never stores credentials) */
export function buildUpiUrl(params: {
  pa: string; // payee VPA
  pn: string; // payee name
  am: number; // amount in paise
  tn?: string; // transaction note
}): string {
  const inr = (params.am / 100).toFixed(2);
  const url = new URL("upi://pay");
  url.searchParams.set("pa", params.pa);
  url.searchParams.set("pn", params.pn);
  url.searchParams.set("am", inr);
  url.searchParams.set("cu", "INR");
  if (params.tn) url.searchParams.set("tn", params.tn);
  return url.toString();
}
