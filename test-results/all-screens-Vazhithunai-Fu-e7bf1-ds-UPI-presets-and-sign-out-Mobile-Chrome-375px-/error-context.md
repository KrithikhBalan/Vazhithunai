# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-screens.spec.ts >> Vazhithunai Full App DOM Test Suite >> SCR-15: Profile & Settings screen editable fields, UPI presets, and sign-out
- Location: e2e\all-screens.spec.ts:262:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text(\'Sign Out\'), button:has-text(\'வெளியேறு\')').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button:has-text(\'Sign Out\'), button:has-text(\'வெளியேறு\')').first()

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
- alert: Vazhithunai
```

# Test source

```ts
  185 |     await expect(percentMode).toBeVisible();
  186 |     await expect(sharesMode).toBeVisible();
  187 | 
  188 |     // Switch between split modes
  189 |     await exactMode.click();
  190 |     await percentMode.click();
  191 |     await sharesMode.click();
  192 |     await equalMode.click();
  193 | 
  194 |     // 5. Submit button presence
  195 |     const submitBtn = page.locator("#save-expense-submit-btn");
  196 |     await expect(submitBtn).toBeVisible();
  197 |   });
  198 | 
  199 |   // ─── SCR-13: Settlement Engine Screen ───────────────────────────────────────
  200 |   test("SCR-13: Settlement screen renders debt minimization balances and UPI actions", async ({ page }) => {
  201 |     await page.goto("/trips/demo-trip/settlement");
  202 | 
  203 |     await expect(page.locator("body")).toBeVisible();
  204 |     await expect(page.locator("h1")).toBeVisible();
  205 |   });
  206 | 
  207 |   // ─── SCR-14: PDF Report View ────────────────────────────────────────────────
  208 |   test("SCR-14: PDF Report screen preview tabs, language toggle, and action buttons", async ({ page }) => {
  209 |     await page.goto("/trips/demo-trip/report");
  210 | 
  211 |     await expect(page.locator("h1")).toBeVisible();
  212 | 
  213 |     // Check Download PDF button
  214 |     const downloadBtn = page.locator("button:has-text('Download PDF'), button:has-text('PDF பதிவிறக்கம்')").first();
  215 |     await expect(downloadBtn).toBeVisible();
  216 | 
  217 |     // Check Print / Preview button
  218 |     const printBtn = page.locator("button:has-text('Print'), button:has-text('அச்சிடு')").first();
  219 |     await expect(printBtn).toBeVisible();
  220 | 
  221 |     // Check Share button
  222 |     const shareBtn = page.locator("button:has-text('Share'), button:has-text('பகிர்')").first();
  223 |     await expect(shareBtn).toBeVisible();
  224 | 
  225 |     // Check In-app preview tabs (Summary, Expenses, Balances, Settlements)
  226 |     const summaryTab = page.locator("button:has-text('Summary'), button:has-text('சுருக்கம்')").first();
  227 |     const expensesTab = page.locator("button:has-text('Expenses'), button:has-text('செலவுகள்')").first();
  228 |     const balancesTab = page.locator("button:has-text('Balances'), button:has-text('இருப்பு')").first();
  229 |     const settlementsTab = page.locator("button:has-text('Settlements'), button:has-text('தீர்வுகள்')").first();
  230 | 
  231 |     await expect(summaryTab).toBeVisible();
  232 |     await expect(expensesTab).toBeVisible();
  233 |     await expect(balancesTab).toBeVisible();
  234 |     await expect(settlementsTab).toBeVisible();
  235 | 
  236 |     // Tab switching
  237 |     await expensesTab.click();
  238 |     await balancesTab.click();
  239 |     await settlementsTab.click();
  240 |     await summaryTab.click();
  241 |   });
  242 | 
  243 |   // ─── SCR-15: AI Spending Assistant ──────────────────────────────────────────
  244 |   test("SCR-15: AI Assistant screen chat input, suggestions, and summary generator", async ({ page }) => {
  245 |     await page.goto("/trips/demo-trip/ai");
  246 | 
  247 |     await expect(page.locator("h1")).toBeVisible();
  248 | 
  249 |     // Check AI summary generator button
  250 |     const generateSummaryBtn = page.locator("button:has-text('Generate'), button:has-text('உருவாக்கு')").first();
  251 |     await expect(generateSummaryBtn).toBeVisible();
  252 | 
  253 |     // Check Chat Input field
  254 |     const chatInput = page.locator("input[type='text']").last();
  255 |     await expect(chatInput).toBeVisible();
  256 | 
  257 |     await chatInput.fill("How much was spent on food?");
  258 |     await expect(chatInput).toHaveValue("How much was spent on food?");
  259 |   });
  260 | 
  261 |   // ─── SCR-15: Profile & Settings Screen ──────────────────────────────────────
  262 |   test("SCR-15: Profile & Settings screen editable fields, UPI presets, and sign-out", async ({ page }) => {
  263 |     await page.goto("/profile");
  264 | 
  265 |     await expect(page.locator("body")).toBeVisible();
  266 | 
  267 |     // Name input
  268 |     const nameInput = page.locator("input[type='text']").first();
  269 |     if (await nameInput.isVisible()) {
  270 |       await nameInput.fill("Karthik Raja");
  271 |       await expect(nameInput).toHaveValue("Karthik Raja");
  272 |     }
  273 | 
  274 |     // Language switch buttons
  275 |     const taBtn = page.locator("button:has-text('தமிழ்')").first();
  276 |     const enBtn = page.locator("button:has-text('English')").first();
  277 | 
  278 |     if (await taBtn.isVisible() && await enBtn.isVisible()) {
  279 |       await enBtn.click();
  280 |       await taBtn.click();
  281 |     }
  282 | 
  283 |     // Sign out button
  284 |     const signOutBtn = page.locator("button:has-text('Sign Out'), button:has-text('வெளியேறு')").first();
> 285 |     await expect(signOutBtn).toBeVisible();
      |                              ^ Error: expect(locator).toBeVisible() failed
  286 |   });
  287 | });
  288 | 
```