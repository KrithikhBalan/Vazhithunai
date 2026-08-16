# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows.spec.ts >> Vazhithunai Comprehensive User Flows >> Flow 3: Settlement Engine and UPI deep link generation
- Location: e2e\flows.spec.ts:56:7

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator:  locator('button:has-text(\'Recompute\'), button:has-text(\'மறு கணக்கீடு\')').first()
Expected: enabled
Received: disabled
Timeout:  5000ms

Call log:
  - Expect "toBeEnabled" with timeout 5000ms
  - waiting for locator('button:has-text(\'Recompute\'), button:has-text(\'மறு கணக்கீடு\')').first()
    14 × locator resolved to <button disabled type="button" id="recompute-settlements-btn" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 bg-teal-600/20 border border-teal-500/30 text-teal-300 hover:bg-teal-600/30 disabled:opacity-40 disabled:cursor-not-allowed">…</button>
       - unexpected value "disabled"

```

```yaml
- button [disabled]
```

# Test source

```ts
  1   | // Purpose: End-to-end integration flow tests for Vazhithunai verifying core user journeys: Auth flow, 4 Split Modes, UPI Deep Link Generation, Creditor-only Settlement, and PDF generation.
  2   | 
  3   | import { test, expect } from "@playwright/test";
  4   | 
  5   | test.describe("Vazhithunai Comprehensive User Flows", () => {
  6   |   // ─── Flow 1: Auth Journey ───────────────────────────────────────────────────
  7   |   test("Flow 1: Phone OTP Form Validation and Error Handling", async ({ page }) => {
  8   |     await page.goto("/login");
  9   | 
  10  |     const phoneInput = page.locator("#phone-input");
  11  |     const sendOtpBtn = page.locator("#send-otp-btn");
  12  | 
  13  |     // Invalid phone number (less than 10 digits)
  14  |     await phoneInput.fill("98765");
  15  |     await expect(sendOtpBtn).toBeDisabled();
  16  | 
  17  |     // 10 digits starting with non-Indian mobile digit (< 6)
  18  |     await phoneInput.fill("1234567890");
  19  |     await expect(sendOtpBtn).toBeEnabled();
  20  | 
  21  |     // Valid 10-digit Indian mobile number
  22  |     await phoneInput.fill("9876543210");
  23  |     await expect(sendOtpBtn).toBeEnabled();
  24  |   });
  25  | 
  26  |   // ─── Flow 2: 4 Expense Split Types ──────────────────────────────────────────
  27  |   test("Flow 2: Expense Entry across Equal, Exact, Percentage, and Shares Split Modes", async ({ page }) => {
  28  |     await page.goto("/trips/demo-trip/expenses/new");
  29  | 
  30  |     const amountInput = page.locator("#expense-amount-input");
  31  |     const descInput = page.locator("#expense-desc-input");
  32  |     const submitBtn = page.locator("#save-expense-submit-btn");
  33  | 
  34  |     // 1. Equal Split Mode
  35  |     await amountInput.fill("300.00");
  36  |     await descInput.fill("Lunch at Hilltop Restaurant");
  37  |     await expect(submitBtn).toBeVisible();
  38  | 
  39  |     // 2. Exact Split Mode
  40  |     const exactModeBtn = page.locator("button:has-text('Exact'), button:has-text('துல்லியமாக')").first();
  41  |     await exactModeBtn.click();
  42  |     await expect(exactModeBtn).toBeVisible();
  43  | 
  44  |     // 3. Percentage Split Mode
  45  |     const percentModeBtn = page.locator("button:has-text('Percentage'), button:has-text('சதவீதம்')").first();
  46  |     await percentModeBtn.click();
  47  |     await expect(percentModeBtn).toBeVisible();
  48  | 
  49  |     // 4. Shares Split Mode
  50  |     const sharesModeBtn = page.locator("button:has-text('Shares'), button:has-text('பங்குகள்')").first();
  51  |     await sharesModeBtn.click();
  52  |     await expect(sharesModeBtn).toBeVisible();
  53  |   });
  54  | 
  55  |   // ─── Flow 3: Settlement Engine & Non-Custodial UPI Link ──────────────────────
  56  |   test("Flow 3: Settlement Engine and UPI deep link generation", async ({ page }) => {
  57  |     await page.goto("/trips/demo-trip/settlement");
  58  | 
  59  |     await expect(page.locator("h1")).toBeVisible();
  60  | 
  61  |     // Verify Recompute / Settle action button exists
  62  |     const recomputeBtn = page.locator("button:has-text('Recompute'), button:has-text('மறு கணக்கீடு')").first();
  63  |     if (await recomputeBtn.isVisible()) {
> 64  |       await expect(recomputeBtn).toBeEnabled();
      |                                  ^ Error: expect(locator).toBeEnabled() failed
  65  |     }
  66  |   });
  67  | 
  68  |   // ─── Flow 4: PDF Report Preview & Download ──────────────────────────────────
  69  |   test("Flow 4: Bilingual PDF Report Preview Tabs and Export Actions", async ({ page }) => {
  70  |     await page.goto("/trips/demo-trip/report");
  71  | 
  72  |     await expect(page.locator("h1")).toBeVisible();
  73  | 
  74  |     // Verify all 4 report section tabs switch smoothly
  75  |     const tabs = ["Summary", "Expenses", "Balances", "Settlements"];
  76  |     for (const tab of tabs) {
  77  |       const tabBtn = page.locator(`button:has-text('${tab}'), button:has-text('சுருக்கம்'), button:has-text('செலவுகள்'), button:has-text('இருப்பு'), button:has-text('தீர்வுகள்')`).first();
  78  |       if (await tabBtn.isVisible()) {
  79  |         await tabBtn.click();
  80  |       }
  81  |     }
  82  | 
  83  |     // Verify Download action
  84  |     const downloadBtn = page.locator("button:has-text('Download PDF'), button:has-text('PDF பதிவிறக்கம்')").first();
  85  |     await expect(downloadBtn).toBeVisible();
  86  |   });
  87  | 
  88  |   // ─── Flow 5: Profile & Instant Language Switch ──────────────────────────────
  89  |   test("Flow 5: Profile & Settings instant language propagation", async ({ page }) => {
  90  |     await page.goto("/profile");
  91  | 
  92  |     const taBtn = page.locator("button:has-text('தமிழ்')").first();
  93  |     const enBtn = page.locator("button:has-text('English')").first();
  94  | 
  95  |     if (await taBtn.isVisible() && await enBtn.isVisible()) {
  96  |       // Switch to Tamil
  97  |       await taBtn.click();
  98  |       await expect(page.locator("body")).toBeVisible();
  99  | 
  100 |       // Switch to English
  101 |       await enBtn.click();
  102 |       await expect(page.locator("body")).toBeVisible();
  103 |     }
  104 |   });
  105 | });
  106 | 
```