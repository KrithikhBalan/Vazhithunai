# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-screens.spec.ts >> Vazhithunai Full App DOM Test Suite >> SCR-15: AI Assistant screen chat input, suggestions, and summary generator
- Location: e2e\all-screens.spec.ts:244:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h1')

```

```yaml
- navigation:
  - link "Home":
    - /url: /dashboard
  - link "Explore":
    - /url: /explore
  - link "AI Chat":
    - /url: /trips/demo-trip/ai
  - link "Profile":
    - /url: /profile
- alert
```

# Test source

```ts
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
  176 | 
  177 |     // 4. Split Mode Selectors (Equal, Exact, Percentage, Shares)
  178 |     const equalMode = page.locator("button:has-text('Equal'), button:has-text('சமமாக')").first();
  179 |     const exactMode = page.locator("button:has-text('Exact'), button:has-text('துல்லியமாக')").first();
  180 |     const percentMode = page.locator("button:has-text('Percentage'), button:has-text('சதவீதம்')").first();
  181 |     const sharesMode = page.locator("button:has-text('Shares'), button:has-text('பங்குகள்')").first();
  182 | 
  183 |     await expect(equalMode).toBeVisible();
  184 |     await expect(exactMode).toBeVisible();
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
> 247 |     await expect(page.locator("h1")).toBeVisible();
      |                                      ^ Error: expect(locator).toBeVisible() failed
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
  285 |     await expect(signOutBtn).toBeVisible();
  286 |   });
  287 | });
  288 | 
```