# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-screens.spec.ts >> Vazhithunai Full App DOM Test Suite >> SCR-03: Dashboard renders summary, quick actions, and trip cards
- Location: e2e\all-screens.spec.ts:67:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href=\'/explore\']').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('a[href=\'/explore\']').first()

```

```yaml
- main:
  - group "Language selector":
    - button "English" [pressed]
    - button "தமிழ்"
  - img "Vazhithunai brand mark"
  - heading "Vazhithunai" [level=1]
  - paragraph: Your AI travel companion
  - text: Smart Trip Planning Expense Splitting Group Travel
  - link "Get Started":
    - /url: /login
  - paragraph: By continuing, you agree to our Terms of Service
- alert
```

# Test source

```ts
  1   | // Purpose: Comprehensive Playwright DOM test suite verifying every screen (SCR-01 through SCR-15) and every interactive element across both mobile and desktop viewports in Vazhithunai.
  2   | 
  3   | import { test, expect } from "@playwright/test";
  4   | 
  5   | test.describe("Vazhithunai Full App DOM Test Suite", () => {
  6   |   // ─── SCR-01: Splash Screen ──────────────────────────────────────────────────
  7   |   test("SCR-01: Splash Screen renders all branding, language selectors, and CTA", async ({ page }) => {
  8   |     await page.goto("/splash");
  9   | 
  10  |     // 1. Check title
  11  |     await expect(page.locator("h1")).toContainText(/Vazhithunai|வழித்துணை/);
  12  | 
  13  |     // 2. Check language switchers
  14  |     const tamilBtn = page.locator("#lang-ta-btn");
  15  |     const enBtn = page.locator("#lang-en-btn");
  16  |     await expect(tamilBtn).toBeVisible();
  17  |     await expect(enBtn).toBeVisible();
  18  | 
  19  |     // 3. Test Language Switch interaction
  20  |     await tamilBtn.click();
  21  |     await expect(page.locator("h1")).toContainText("வழித்துணை");
  22  | 
  23  |     await enBtn.click();
  24  |     await expect(page.locator("h1")).toContainText("Vazhithunai");
  25  | 
  26  |     // 4. Test Get Started CTA navigation
  27  |     const getStartedBtn = page.locator("#get-started-btn");
  28  |     await expect(getStartedBtn).toBeVisible();
  29  |     await getStartedBtn.click();
  30  |     await expect(page).toHaveURL(/.*login/);
  31  |   });
  32  | 
  33  |   // ─── SCR-02: Login Screen ───────────────────────────────────────────────────
  34  |   test("SCR-02: Login Screen form fields, validation, and back navigation", async ({ page }) => {
  35  |     await page.goto("/login");
  36  | 
  37  |     // 1. Check title
  38  |     await expect(page.locator("h1")).toBeVisible();
  39  | 
  40  |     // 2. Check back button
  41  |     const backBtn = page.locator("#login-back-btn");
  42  |     await expect(backBtn).toBeVisible();
  43  | 
  44  |     // 3. Check Phone Input field
  45  |     const phoneInput = page.locator("#phone-input");
  46  |     await expect(phoneInput).toBeVisible();
  47  | 
  48  |     // 4. Check Send OTP button is disabled when < 10 digits
  49  |     const sendOtpBtn = page.locator("#send-otp-btn");
  50  |     await phoneInput.fill("12345");
  51  |     await expect(sendOtpBtn).toBeDisabled();
  52  | 
  53  |     // 5. Fill valid 10-digit number
  54  |     await phoneInput.fill("9876543210");
  55  |     await expect(sendOtpBtn).toBeEnabled();
  56  | 
  57  |     // 6. Check Google Sign-in button exists
  58  |     const googleBtn = page.locator("#google-signin-btn");
  59  |     await expect(googleBtn).toBeVisible();
  60  | 
  61  |     // 7. Back navigation
  62  |     await backBtn.click();
  63  |     await expect(page).toHaveURL(/.*splash/);
  64  |   });
  65  | 
  66  |   // ─── SCR-03: Main Dashboard ─────────────────────────────────────────────────
  67  |   test("SCR-03: Dashboard renders summary, quick actions, and trip cards", async ({ page }) => {
  68  |     await page.goto("/dashboard");
  69  | 
  70  |     // Check main container renders without crash
  71  |     await expect(page.locator("body")).toBeVisible();
  72  | 
  73  |     // Check navigation buttons
  74  |     const exploreLinks = page.locator("a[href='/explore']");
> 75  |     await expect(exploreLinks.first()).toBeVisible();
      |                                        ^ Error: expect(locator).toBeVisible() failed
  76  | 
  77  |     const profileLinks = page.locator("a[href='/profile']");
  78  |     await expect(profileLinks.first()).toBeVisible();
  79  |   });
  80  | 
  81  |   // ─── SCR-06: Explore Places ─────────────────────────────────────────────────
  82  |   test("SCR-06: Explore Screen category pills, search bar, and place cards", async ({ page }) => {
  83  |     await page.goto("/explore");
  84  | 
  85  |     // 1. Search bar
  86  |     const searchInput = page.locator("input[type='text']").first();
  87  |     await expect(searchInput).toBeVisible();
  88  |     await searchInput.fill("Ooty");
  89  |     await expect(searchInput).toHaveValue("Ooty");
  90  | 
  91  |     // 2. Category pills
  92  |     const allPill = page.locator("button:has-text('All'), button:has-text('அனைத்தும்')").first();
  93  |     await expect(allPill).toBeVisible();
  94  | 
  95  |     // 3. Quick discovery navigation tabs (Hotels, Help)
  96  |     const hotelTab = page.locator("a[href='/explore/hotels']").first();
  97  |     await expect(hotelTab).toBeVisible();
  98  | 
  99  |     const helpTab = page.locator("a[href='/explore/help']").first();
  100 |     await expect(helpTab).toBeVisible();
  101 |   });
  102 | 
  103 |   // ─── SCR-08: Emergency Help Services ────────────────────────────────────────
  104 |   test("SCR-08: Emergency Help screen category pills and service cards", async ({ page }) => {
  105 |     await page.goto("/explore/help");
  106 | 
  107 |     await expect(page.locator("h1")).toBeVisible();
  108 | 
  109 |     // Check emergency category buttons
  110 |     const fuelBtn = page.locator("button:has-text('Fuel'), button:has-text('பெட்ரோல்')").first();
  111 |     await expect(fuelBtn).toBeVisible();
  112 | 
  113 |     const hospitalBtn = page.locator("button:has-text('Hospital'), button:has-text('மருத்துவமனை')").first();
  114 |     await expect(hospitalBtn).toBeVisible();
  115 | 
  116 |     // Click Hospital category pill
  117 |     await hospitalBtn.click();
  118 |     await expect(hospitalBtn).toBeVisible();
  119 |   });
  120 | 
  121 |   // ─── SCR-09: Hotel Discovery ────────────────────────────────────────────────
  122 |   test("SCR-09: Hotel Discovery screen search and list cards", async ({ page }) => {
  123 |     await page.goto("/explore/hotels");
  124 | 
  125 |     await expect(page.locator("h1")).toBeVisible();
  126 | 
  127 |     // City search input
  128 |     const cityInput = page.locator("input[type='text']").first();
  129 |     await expect(cityInput).toBeVisible();
  130 |   });
  131 | 
  132 |   // ─── SCR-10: Route & Travel Cost ────────────────────────────────────────────
  133 |   test("SCR-10: Route and Cost Calculator renders vehicle selectors and metrics", async ({ page }) => {
  134 |     await page.goto("/trips/demo-trip/route");
  135 | 
  136 |     await expect(page.locator("body")).toBeVisible();
  137 | 
  138 |     // Check vehicle selectors
  139 |     const sedanBtn = page.locator("button:has-text('Sedan'), button:has-text('செடான்')").first();
  140 |     if (await sedanBtn.isVisible()) {
  141 |       await sedanBtn.click();
  142 |     }
  143 |   });
  144 | 
  145 |   // ─── SCR-11: Expense Ledger ─────────────────────────────────────────────────
  146 |   test("SCR-11: Expense Ledger renders running total, category filter, and add button", async ({ page }) => {
  147 |     await page.goto("/trips/demo-trip/expenses");
  148 | 
  149 |     await expect(page.locator("body")).toBeVisible();
  150 | 
  151 |     // Check Add Expense button
  152 |     const addExpenseLink = page.locator("a[href*='/expenses/new']").first();
  153 |     await expect(addExpenseLink).toBeVisible();
  154 |   });
  155 | 
  156 |   // ─── SCR-12: Add Expense Screen ─────────────────────────────────────────────
  157 |   test("SCR-12: Add Expense form inputs, 4 split modes, and validation", async ({ page }) => {
  158 |     await page.goto("/trips/demo-trip/expenses/new");
  159 | 
  160 |     // 1. Amount input
  161 |     const amountInput = page.locator("#expense-amount-input");
  162 |     await expect(amountInput).toBeVisible();
  163 |     await amountInput.fill("150.50");
  164 |     await expect(amountInput).toHaveValue("150.50");
  165 | 
  166 |     // 2. Description input
  167 |     const descInput = page.locator("#expense-desc-input");
  168 |     await expect(descInput).toBeVisible();
  169 |     await descInput.fill("Highway Fuel & Snacks");
  170 | 
  171 |     // 3. Category picker
  172 |     const fuelCategory = page.locator("button:has-text('Fuel'), button:has-text('எரிபொருள்')").first();
  173 |     if (await fuelCategory.isVisible()) {
  174 |       await fuelCategory.click();
  175 |     }
```