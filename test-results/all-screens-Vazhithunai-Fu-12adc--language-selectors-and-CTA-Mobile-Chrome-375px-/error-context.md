# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-screens.spec.ts >> Vazhithunai Full App DOM Test Suite >> SCR-01: Splash Screen renders all branding, language selectors, and CTA
- Location: e2e\all-screens.spec.ts:7:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "வழித்துணை"
Received string:    "Vazhithunai"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    14 × locator resolved to <h1 class="text-4xl font-bold tracking-tight mb-1">…</h1>
       - unexpected value "Vazhithunai"

```

```yaml
- heading "Vazhithunai" [level=1]
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
  10  |     // 1. Check Kolam SVG branding
  11  |     const kolam = page.locator("svg[aria-hidden='true']").first();
  12  |     await expect(kolam).toBeVisible();
  13  | 
  14  |     // 2. Check title and tagline
> 15  |     await expect(page.locator("h1")).toContainText("வழித்துணை");
      |                                      ^ Error: expect(locator).toContainText(expected) failed
  16  | 
  17  |     // 3. Check language switchers
  18  |     const tamilBtn = page.locator("button:has-text('தமிழ்')").first();
  19  |     const enBtn = page.locator("button:has-text('English')").first();
  20  |     await expect(tamilBtn).toBeVisible();
  21  |     await expect(enBtn).toBeVisible();
  22  | 
  23  |     // 4. Test Language Switch interaction
  24  |     await enBtn.click();
  25  |     await expect(page.locator("body")).toBeVisible();
  26  |     await tamilBtn.click();
  27  |     await expect(page.locator("body")).toBeVisible();
  28  | 
  29  |     // 5. Test Get Started CTA navigation
  30  |     const getStartedBtn = page.locator("a[href='/login']").first();
  31  |     await expect(getStartedBtn).toBeVisible();
  32  |     await getStartedBtn.click();
  33  |     await expect(page).toHaveURL(/.*login/);
  34  |   });
  35  | 
  36  |   // ─── SCR-02: Login Screen ───────────────────────────────────────────────────
  37  |   test("SCR-02: Login Screen form fields, validation, and back navigation", async ({ page }) => {
  38  |     await page.goto("/login");
  39  | 
  40  |     // 1. Check title
  41  |     await expect(page.locator("h1")).toBeVisible();
  42  | 
  43  |     // 2. Check back button
  44  |     const backBtn = page.locator("#login-back-btn");
  45  |     await expect(backBtn).toBeVisible();
  46  | 
  47  |     // 3. Check Phone Input field
  48  |     const phoneInput = page.locator("input[type='tel']");
  49  |     await expect(phoneInput).toBeVisible();
  50  | 
  51  |     // 4. Type invalid phone number (less than 10 digits)
  52  |     await phoneInput.fill("12345");
  53  |     const sendOtpBtn = page.locator("button[type='submit']");
  54  |     await expect(sendOtpBtn).toBeDisabled();
  55  | 
  56  |     // 5. Type valid 10-digit phone number
  57  |     await phoneInput.fill("9876543210");
  58  |     await expect(sendOtpBtn).toBeEnabled();
  59  | 
  60  |     // 6. Check Google Sign-in button exists
  61  |     const googleBtn = page.locator("button:has-text('Google')");
  62  |     await expect(googleBtn).toBeVisible();
  63  | 
  64  |     // 7. Back navigation
  65  |     await backBtn.click();
  66  |     await expect(page).toHaveURL(/.*splash/);
  67  |   });
  68  | 
  69  |   // ─── SCR-03: Main Dashboard ─────────────────────────────────────────────────
  70  |   test("SCR-03: Dashboard renders summary, quick actions, and trip cards", async ({ page }) => {
  71  |     await page.goto("/dashboard");
  72  | 
  73  |     // Check main container renders without crash
  74  |     await expect(page.locator("body")).toBeVisible();
  75  | 
  76  |     // Check navigation buttons or links
  77  |     const exploreLinks = page.locator("a[href='/explore']");
  78  |     await expect(exploreLinks.first()).toBeVisible();
  79  | 
  80  |     const profileLinks = page.locator("a[href='/profile']");
  81  |     await expect(profileLinks.first()).toBeVisible();
  82  |   });
  83  | 
  84  |   // ─── SCR-06: Explore Places ─────────────────────────────────────────────────
  85  |   test("SCR-06: Explore Screen category pills, search bar, and place cards", async ({ page }) => {
  86  |     await page.goto("/explore");
  87  | 
  88  |     // 1. Search bar
  89  |     const searchInput = page.locator("input[type='text']").first();
  90  |     await expect(searchInput).toBeVisible();
  91  | 
  92  |     // 2. Type in search bar
  93  |     await searchInput.fill("Ooty");
  94  |     await expect(searchInput).toHaveValue("Ooty");
  95  | 
  96  |     // 3. Category pills
  97  |     const allPill = page.locator("button:has-text('All'), button:has-text('அனைத்தும்')").first();
  98  |     await expect(allPill).toBeVisible();
  99  | 
  100 |     // 4. City filter pills
  101 |     const ootyCity = page.locator("button:has-text('Ooty')").first();
  102 |     if (await ootyCity.isVisible()) {
  103 |       await ootyCity.click();
  104 |     }
  105 | 
  106 |     // 5. Quick discovery navigation tabs (Hotels, Help)
  107 |     const hotelTab = page.locator("a[href='/explore/hotels']").first();
  108 |     await expect(hotelTab).toBeVisible();
  109 | 
  110 |     const helpTab = page.locator("a[href='/explore/help']").first();
  111 |     await expect(helpTab).toBeVisible();
  112 |   });
  113 | 
  114 |   // ─── SCR-08: Emergency Help Services ────────────────────────────────────────
  115 |   test("SCR-08: Emergency Help screen category pills and service cards", async ({ page }) => {
```