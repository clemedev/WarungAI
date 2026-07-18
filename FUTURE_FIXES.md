# WarungAI — Future Fixes & Improvements

This is the next backlog for `design/ui-redesign-2.0`. It excludes the issues already raised and addressed in the current redesign work: theme mismatches, mobile quick-action routing, demo stock handling, sale undo, record-deletion stock restoration, item grouping, email-verification messaging, analytics cost/low-stock presentation, print theme, and scroll smoothness.

## Do next — codebase only

### 1. Keep dashboard data requests small as history grows

**Why:** The dashboard loads broad sales, expense, and product data and calculates most summaries in the browser. A stall with months of history will make the dashboard and analytics progressively slower.

**Improve:** Request only the date ranges a screen needs, add pagination to Records, and cache the current dashboard range while the user remains on the page.

**Relevant code:** `src/lib/supabaseDashboard.js`, `src/lib/supabaseSales.js`, `src/components/SalesList/SalesList.jsx`

### 2. Split large browser downloads

**Why:** The production build’s initial JavaScript chunk is over 500 kB, while OCR and charts are not needed on every first visit.

**Improve:** Load OCR/receipt scanning and analytics/chart code only when their respective views are opened. This makes login and Overview feel quicker on lower-end phones.

**Relevant code:** `src/App.jsx`, `src/components/ReceiptScanner/`, `src/components/WeeklyInsights/`, `vite.config.js`

### 3. Make native delete prompts part of the app design

**Why:** Browser `window.confirm()` dialogs vary across browsers, cannot follow the selected language/theme properly, and feel abrupt on phones.

**Improve:** Replace them with one reusable confirmation modal with a clear destructive-action label, keyboard focus handling, and a mobile-friendly cancel action.

**Relevant code:** `src/components/SalesList/SalesList.jsx`, `src/components/ExpenseTracker/ExpenseTracker.jsx`, `src/components/ProductList/ProductList.jsx`

### 4. Add a stronger mobile layout for receipt review

**Why:** The receipt-review table has several columns and becomes cramped on narrow screens.

**Improve:** Keep the table on desktop, but render each scanned item as a stacked card on mobile. Keep amount/quantity labels visible and tap targets large.

**Relevant code:** `src/components/ReceiptScanner/SaleReceiptScanner.jsx`, `src/components/ReceiptScanner/ReceiptScanner.module.css`

### 5. Preserve scanned receipt drafts

**Why:** OCR or network failure currently risks losing the owner’s receipt corrections.

**Improve:** Store in-progress OCR results and edits in session storage until they are saved or deliberately discarded. Offer “Resume receipt review” after a reload.

**Relevant code:** `src/components/ReceiptScanner/SaleReceiptScanner.jsx`, `src/components/ReceiptScanner/ReceiptScanner.jsx`

### 6. Provide graceful fallback for unsupported voice input

**Why:** The Web Speech API is browser-dependent.

**Improve:** Detect support before recording, show a clear inline explanation, and offer typed entry in the same place.

**Relevant code:** `src/components/VoiceEntry/VoiceEntry.jsx`

### 7. Remove or isolate legacy local-storage account code

**Why:** The project has current Supabase services alongside older browser-storage account/data modules. This makes future changes easier to wire to the wrong persistence path.

**Improve:** Confirm there are no production imports, then retire or clearly isolate legacy modules as test/demo-only utilities.

**Relevant code:** `src/lib/auth.js`, `src/lib/storage.js`, `src/App.jsx`

### 8. Add recovery-friendly account actions

**Why:** Users will forget passwords or miss verification emails.

**Improve:** Add “Forgot password?” and “Resend verification email” controls, with messages that do not reveal whether an email address is registered.

**Relevant code:** `src/components/LoginScreen/LoginScreen.jsx`, `src/lib/supabaseAuth.js`

### 9. Add CSV export for records and inventory

**Why:** CSV is useful for accountants, bookkeeping handoff, and end-of-month checking.

**Improve:** Export a selected sales/expense date range and current inventory with stock, cost, selling price, and low-stock threshold.

**Relevant code:** `src/components/SalesList/SalesList.jsx`, `src/components/ExpenseTracker/ExpenseTracker.jsx`, `src/components/ProductList/ProductList.jsx`

### 10. Add a lightweight offline experience

**Why:** The app is installable, but live data requests need a clearer recovery state when the phone is offline.

**Improve:** Show an offline banner and retain the last successfully loaded dashboard data as read-only until reconnecting.

**Relevant code:** `vite.config.js`, `src/App.jsx`

## Reliability improvements — requires Supabase/database work

### 11. Add idempotency protection to sale creation

**Why:** A slow request can succeed on the server while the phone misses the response. Retrying may accidentally create the sale twice.

**Improve:** Generate a client request ID and make the sale-creation RPC return the already-created transaction when that ID is submitted again.

**Relevant code:** `src/lib/supabaseSales.js`, Supabase `sales` table and sale-creation RPC.

### 12. Make stock movement an auditable ledger

**Why:** Current stock shows what remains, but not every reason it changed: sale, deletion, manual correction, spoilage, or restock.

**Improve:** Add a `stock_movements` table and record every delta with its reason and linked sale where applicable.

**Relevant code:** `src/lib/supabaseProducts.js`, `src/lib/supabaseSales.js`, Supabase schema/RPCs.

### 13. Add database-side indexes for growing records

**Why:** Records are commonly filtered by owner and date. These reads should not depend on full table scans as data grows.

**Improve:** Add indexes aligned with the app’s main reads, for example owner/date on sales and expenses.

**Relevant code:** `src/lib/supabaseSales.js`, `src/lib/supabaseExpenses.js`, Supabase migrations.

### 14. Build a proper product/category model

**Why:** Normal products do not have categories, which limits category-level analytics, filtering, and ordering.

**Improve:** Add optional Food, Drinks, Ingredients, and Other categories; show category sales/profit in analytics and allow inventory filtering.

**Relevant code:** `src/components/ProductList/ProductList.jsx`, `src/lib/supabaseProducts.js`, `src/lib/weeklyInsights.js`, Supabase `products` schema.

## Quality gate before a real launch

### 15. Add end-to-end tests for actual money flows

**Why:** Existing tests cover parsers and selected components, but not complete browser journeys.

**Improve:** Add browser tests for sign-up/login, manual sale, receipt review, low stock, expense, language/theme persistence, undo expiry, and mobile navigation.

### 16. Test accessibility deliberately

**Why:** Visual controls, sheets, and status messages need more than a quick manual check.

**Improve:** Add automated accessibility checks and verify tab order, focus return after overlays, focus rings, touch-target size, contrast, and reduced motion.

### 17. Add non-sensitive error monitoring before real users rely on it

**Why:** Console warnings cannot tell the team when save, OCR, or authentication failures happen in the field.

**Improve:** Add privacy-conscious error reporting with no receipt text, passwords, or business data—only failure type, app version, and route.

## Recommended order

1. Dashboard/request performance and code splitting.
2. Mobile receipt review and draft recovery.
3. Reusable confirmation modal and account recovery actions.
4. CSV export and offline state.
5. Idempotent sale creation and stock-movement ledger when Supabase work is allowed.
6. End-to-end and accessibility tests before a wider release.
