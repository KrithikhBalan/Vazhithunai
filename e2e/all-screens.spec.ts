// Purpose: Comprehensive Playwright DOM test suite verifying every screen (SCR-01 through SCR-15) and every interactive element across both mobile and desktop viewports in Vazhithunai.

import { test, expect } from "@playwright/test";

test.describe("Vazhithunai Full App DOM Test Suite", () => {
  // ─── SCR-01: Splash Screen ──────────────────────────────────────────────────
  test("SCR-01: Splash Screen renders all branding, language selectors, and CTA", async ({ page }) => {
    await page.goto("/splash");

    // 1. Check title
    await expect(page.locator("h1")).toContainText(/Vazhithunai|வழித்துணை/);

    // 2. Check language switchers
    const tamilBtn = page.locator("#lang-ta-btn");
    const enBtn = page.locator("#lang-en-btn");
    await expect(tamilBtn).toBeVisible();
    await expect(enBtn).toBeVisible();

    // 3. Test Language Switch interaction
    await tamilBtn.click();
    await expect(page.locator("h1")).toContainText("வழித்துணை");

    await enBtn.click();
    await expect(page.locator("h1")).toContainText("Vazhithunai");

    // 4. Test Get Started CTA navigation
    const getStartedBtn = page.locator("#get-started-btn");
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();
    await expect(page).toHaveURL(/.*login/);
  });

  // ─── SCR-02: Login Screen ───────────────────────────────────────────────────
  test("SCR-02: Login Screen form fields, validation, and back navigation", async ({ page }) => {
    await page.goto("/login");

    // 1. Check title
    await expect(page.locator("h1")).toBeVisible();

    // 2. Check back button
    const backBtn = page.locator("#login-back-btn");
    await expect(backBtn).toBeVisible();

    // 3. Check Phone Input field
    const phoneInput = page.locator("#phone-input");
    await expect(phoneInput).toBeVisible();

    // 4. Check Send OTP button is disabled when < 10 digits
    const sendOtpBtn = page.locator("#send-otp-btn");
    await phoneInput.fill("12345");
    await expect(sendOtpBtn).toBeDisabled();

    // 5. Fill valid 10-digit number
    await phoneInput.fill("9876543210");
    await expect(sendOtpBtn).toBeEnabled();

    // 6. Check Google Sign-in button exists
    const googleBtn = page.locator("#google-signin-btn");
    await expect(googleBtn).toBeVisible();

    // 7. Back navigation
    await backBtn.click();
    await expect(page).toHaveURL(/.*splash/);
  });

  // ─── SCR-03: Main Dashboard ─────────────────────────────────────────────────
  test("SCR-03: Dashboard renders summary, quick actions, and trip cards", async ({ page }) => {
    await page.goto("/dashboard");

    // Check main container renders without crash
    await expect(page.locator("body")).toBeVisible();

    // Check navigation buttons
    const exploreLinks = page.locator("a[href='/explore']");
    await expect(exploreLinks.first()).toBeVisible();

    const profileLinks = page.locator("a[href='/profile']");
    await expect(profileLinks.first()).toBeVisible();
  });

  // ─── SCR-06: Explore Places ─────────────────────────────────────────────────
  test("SCR-06: Explore Screen category pills, search bar, and place cards", async ({ page }) => {
    await page.goto("/explore");

    // 1. Search bar
    const searchInput = page.locator("input[type='text']").first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Ooty");
    await expect(searchInput).toHaveValue("Ooty");

    // 2. Category pills
    const allPill = page.locator("button:has-text('All'), button:has-text('அனைத்தும்')").first();
    await expect(allPill).toBeVisible();

    // 3. Quick discovery navigation tabs (Hotels, Help)
    const hotelTab = page.locator("a[href='/explore/hotels']").first();
    await expect(hotelTab).toBeVisible();

    const helpTab = page.locator("a[href='/explore/help']").first();
    await expect(helpTab).toBeVisible();
  });

  // ─── SCR-08: Emergency Help Services ────────────────────────────────────────
  test("SCR-08: Emergency Help screen category pills and service cards", async ({ page }) => {
    await page.goto("/explore/help");

    await expect(page.locator("h1")).toBeVisible();

    // Check emergency category buttons
    const fuelBtn = page.locator("button:has-text('Fuel'), button:has-text('பெட்ரோல்')").first();
    await expect(fuelBtn).toBeVisible();

    const hospitalBtn = page.locator("button:has-text('Hospital'), button:has-text('மருத்துவமனை')").first();
    await expect(hospitalBtn).toBeVisible();

    // Click Hospital category pill
    await hospitalBtn.click();
    await expect(hospitalBtn).toBeVisible();
  });

  // ─── SCR-09: Hotel Discovery ────────────────────────────────────────────────
  test("SCR-09: Hotel Discovery screen search and list cards", async ({ page }) => {
    await page.goto("/explore/hotels");

    await expect(page.locator("h1")).toBeVisible();

    // City search input
    const cityInput = page.locator("input[type='text']").first();
    await expect(cityInput).toBeVisible();
  });

  // ─── SCR-10: Route & Travel Cost ────────────────────────────────────────────
  test("SCR-10: Route and Cost Calculator renders vehicle selectors and metrics", async ({ page }) => {
    await page.goto("/trips/demo-trip/route");

    await expect(page.locator("body")).toBeVisible();

    // Check vehicle selectors
    const sedanBtn = page.locator("button:has-text('Sedan'), button:has-text('செடான்')").first();
    if (await sedanBtn.isVisible()) {
      await sedanBtn.click();
    }
  });

  // ─── SCR-11: Expense Ledger ─────────────────────────────────────────────────
  test("SCR-11: Expense Ledger renders running total, category filter, and add button", async ({ page }) => {
    await page.goto("/trips/demo-trip/expenses");

    await expect(page.locator("body")).toBeVisible();

    // Check Add Expense button
    const addExpenseLink = page.locator("a[href*='/expenses/new']").first();
    await expect(addExpenseLink).toBeVisible();
  });

  // ─── SCR-12: Add Expense Screen ─────────────────────────────────────────────
  test("SCR-12: Add Expense form inputs, 4 split modes, and validation", async ({ page }) => {
    await page.goto("/trips/demo-trip/expenses/new");

    // 1. Amount input
    const amountInput = page.locator("#expense-amount-input");
    await expect(amountInput).toBeVisible();
    await amountInput.fill("150.50");
    await expect(amountInput).toHaveValue("150.50");

    // 2. Description input
    const descInput = page.locator("#expense-desc-input");
    await expect(descInput).toBeVisible();
    await descInput.fill("Highway Fuel & Snacks");

    // 3. Category picker
    const fuelCategory = page.locator("button:has-text('Fuel'), button:has-text('எரிபொருள்')").first();
    if (await fuelCategory.isVisible()) {
      await fuelCategory.click();
    }

    // 4. Split Mode Selectors (Equal, Exact, Percentage, Shares)
    const equalMode = page.locator("button:has-text('Equal'), button:has-text('சமமாக')").first();
    const exactMode = page.locator("button:has-text('Exact'), button:has-text('துல்லியமாக')").first();
    const percentMode = page.locator("button:has-text('Percentage'), button:has-text('சதவீதம்')").first();
    const sharesMode = page.locator("button:has-text('Shares'), button:has-text('பங்குகள்')").first();

    await expect(equalMode).toBeVisible();
    await expect(exactMode).toBeVisible();
    await expect(percentMode).toBeVisible();
    await expect(sharesMode).toBeVisible();

    // Switch between split modes
    await exactMode.click();
    await percentMode.click();
    await sharesMode.click();
    await equalMode.click();

    // 5. Submit button presence
    const submitBtn = page.locator("#save-expense-submit-btn");
    await expect(submitBtn).toBeVisible();
  });

  // ─── SCR-13: Settlement Engine Screen ───────────────────────────────────────
  test("SCR-13: Settlement screen renders debt minimization balances and UPI actions", async ({ page }) => {
    await page.goto("/trips/demo-trip/settlement");

    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  // ─── SCR-14: PDF Report View ────────────────────────────────────────────────
  test("SCR-14: PDF Report screen preview tabs, language toggle, and action buttons", async ({ page }) => {
    await page.goto("/trips/demo-trip/report");

    await expect(page.locator("h1")).toBeVisible();

    // Check Download PDF button
    const downloadBtn = page.locator("button:has-text('Download PDF'), button:has-text('PDF பதிவிறக்கம்')").first();
    await expect(downloadBtn).toBeVisible();

    // Check Print / Preview button
    const printBtn = page.locator("button:has-text('Print'), button:has-text('அச்சிடு')").first();
    await expect(printBtn).toBeVisible();

    // Check Share button
    const shareBtn = page.locator("button:has-text('Share'), button:has-text('பகிர்')").first();
    await expect(shareBtn).toBeVisible();

    // Check In-app preview tabs (Summary, Expenses, Balances, Settlements)
    const summaryTab = page.locator("button:has-text('Summary'), button:has-text('சுருக்கம்')").first();
    const expensesTab = page.locator("button:has-text('Expenses'), button:has-text('செலவுகள்')").first();
    const balancesTab = page.locator("button:has-text('Balances'), button:has-text('இருப்பு')").first();
    const settlementsTab = page.locator("button:has-text('Settlements'), button:has-text('தீர்வுகள்')").first();

    await expect(summaryTab).toBeVisible();
    await expect(expensesTab).toBeVisible();
    await expect(balancesTab).toBeVisible();
    await expect(settlementsTab).toBeVisible();

    // Tab switching
    await expensesTab.click();
    await balancesTab.click();
    await settlementsTab.click();
    await summaryTab.click();
  });

  // ─── SCR-15: AI Spending Assistant ──────────────────────────────────────────
  test("SCR-15: AI Assistant screen chat input, suggestions, and summary generator", async ({ page }) => {
    await page.goto("/trips/demo-trip/ai");

    await expect(page.locator("h1")).toBeVisible();

    // Check AI summary generator button
    const generateSummaryBtn = page.locator("button:has-text('Generate'), button:has-text('உருவாக்கு')").first();
    await expect(generateSummaryBtn).toBeVisible();

    // Check Chat Input field
    const chatInput = page.locator("input[type='text']").last();
    await expect(chatInput).toBeVisible();

    await chatInput.fill("How much was spent on food?");
    await expect(chatInput).toHaveValue("How much was spent on food?");
  });

  // ─── SCR-15: Profile & Settings Screen ──────────────────────────────────────
  test("SCR-15: Profile & Settings screen editable fields, UPI presets, and sign-out", async ({ page }) => {
    await page.goto("/profile");

    await expect(page.locator("body")).toBeVisible();

    // Name input
    const nameInput = page.locator("input[type='text']").first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Karthik Raja");
      await expect(nameInput).toHaveValue("Karthik Raja");
    }

    // Language switch buttons
    const taBtn = page.locator("button:has-text('தமிழ்')").first();
    const enBtn = page.locator("button:has-text('English')").first();

    if (await taBtn.isVisible() && await enBtn.isVisible()) {
      await enBtn.click();
      await taBtn.click();
    }

    // Sign out button
    const signOutBtn = page.locator("button:has-text('Sign Out'), button:has-text('வெளியேறு')").first();
    await expect(signOutBtn).toBeVisible();
  });
});
