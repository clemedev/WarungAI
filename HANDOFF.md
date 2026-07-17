# WarungAI — Handoff

Context dump for an agent picking this up cold. Written 2026-07-17 on branch `design/ui-redesign`.

---

## 1. What this project is

A sales/expense tracker for Malaysian warung (food stall) owners. Mobile-first PWA.

| | |
|---|---|
| **Repo** | `github.com/clemedev/WarungAI` — owned by a teammate (Clement), not by the user |
| **Branch** | `design/ui-redesign` — **local only, never pushed** |
| **Stack** | React 18 + Vite, Supabase (Postgres + RLS), Chart.js, Tesseract.js, react-i18next v26 |
| **Languages** | Bahasa Melayu (default), English, Simplified Chinese |
| **Backend docs** | `BACKEND.md` — schema, RPC contracts, supported enum values |

### Hard constraints — do not plan around these

- **No Supabase dashboard access.** Cannot add columns, RPCs, or Edge Functions. This blocks recurring expenses (no recurrence column) and any server-side API-key proxy.
- **A `VITE_`-prefixed env var ships in the public browser bundle.** `BACKEND.md` forbids putting secrets there. This is why there's no Gemini integration yet.
- **The user must be asked before any `git push`.** Nothing has been pushed. Ever.

---

## 2. Current state

### Commits on this branch (ahead of `origin/main`)

```
d9c3194  Add i18n dependencies
9986d0e  Fix OCR quantity loss: parser formats + expense scanner dropping qty
fe7120d  i18n batch 4/4: sales list, expenses, products
2503071  i18n batch 3/4: entry components
8e022a3  i18n batch 2/4: dashboard family
65ef20c  i18n batch 1/4: shell, login, theme toggle
55bebf5  Restore friend's shell and re-wire features into it
```
(plus older churn: `29798dd`, `729bc87`, `07624d4`, `960de8e`)

### Uncommitted in the working tree

A Vitest setup + accessibility polish added by the user/Codex — **not** from the previous agent, left untouched:
`vitest.config.js`, `src/test/`, `*.test.jsx` (ConfirmSale, LanguageSwitcher, ThemeToggle), `scripts/test-i18n.mjs`, `src/i18n/languages.js`, plus `disabled` props / aria-labels / `role="alert"` on entry components, and an objectURL cleanup in `SaleReceiptScanner`.

### Verification (all currently green)

```bash
npm test        # test-parsers + test-insights + test-i18n + vitest run
npx vite build  # must be warning-free
```

---

## 3. Design direction — READ THIS FIRST

**The teammate's green + "Liquid Glass" UI on `origin/main` is the live direction.** His `App.jsx` shell, `App.module.css`, `ThemeContext`, `ThemeToggle`, and `OverviewMetrics` are canonical.

**Anything orange/brown is DEAD CODE from an abandoned direction.** If you see `#e8672c`, `#8a7362`, `--color-accent: #e8672c`, `--radius-card`, `--shadow-card`, or `--color-loss`, it is a leftover — those tokens don't even exist in the current palette. Do not "restore" it.

History (so you don't repeat it): an earlier pass built a flat brown/cream/orange "Pushcart" theme. The teammate independently built a green glass theme and merged it to `main`. The user chose **his**. A merge left a broken hybrid (our shell + his components = mismatched CSS class names, visibly broken sidebar); `55bebf5` fixed it by restoring his shell wholesale and re-wiring our features into it.

**The operating rule that emerged: design comes from the teammate, features come from this branch.**

### Live palette (`src/index.css`)
`--color-primary: #176b43` · `--color-accent: #f4b740` · `--color-danger: #c13c32` · `--radius-lg` · `--shadow-sm`
Dark theme via `html[data-theme="dark"]`, driven by `src/theme/ThemeContext.jsx`.
Component dark overrides use the `:global(html[data-theme="dark"]) .foo` pattern.

---

## 4. Architecture rules established (breaking these regresses real work)

### 4.1 The data layer returns DATA, never prose

`createDailySummary` / `createInsight` in `src/lib/supabaseDashboard.js` used to build Malay **sentences**. No amount of component-level `t()` can translate a finished sentence, so they were refactored:

```js
createDailySummary(...) -> { hasSales, totalSales, transactionCount, netProfit, topItem, expenseTotal }
createInsight(...)      -> { type: 'belowCost'|'topSeller', ...params } | null
```

The **view** composes wording and formats currency. `formatRM` was deleted from the lib for this reason.

Side benefit: `InsightOfTheDay` used to decide its warning styling by checking whether the text *started with a ⚠️ emoji*; it now keys off `insight.type === 'belowCost'`.

**Any new lib function must follow this.** Returning a sentence re-breaks i18n.

### 4.2 i18n is complete — keep it that way

- 245 keys, all resolving in ms/en/zh. Every component uses `useTranslation`.
- Plurals are i18next v4 (`_one` / `_other`). English inflects; ms/zh have `_other` only.
- Dates go through `getDateLocale()` in `src/i18n/config.js` → `ms-MY` / **`en-MY`** / **`zh-MY`**. Malaysia-first on purpose: an English-speaking warung owner is still in Malaysia. Never hardcode `'ms-MY'` into `Intl`.
- Enum values (expense categories `bahan|gas|...`, sale `source`, nav ids) stay as stored values; **only labels are translated**. Components hold locale *keys*, not display text.
- The language switcher is on the login screen too — a non-Malay speaker must be able to read the form they need to sign in with.
- `scripts/test-i18n.mjs` checks every `t()` key resolves in all 3 locales. Run it.

### 4.3 There are TWO scanners — do not merge them

| File | Saves | Lives in |
|---|---|---|
| `ReceiptScanner.jsx` | **Expenses** (supplier receipts) → one expense, `source: 'receipt'` | Belanja tab |
| `SaleReceiptScanner.jsx` | **Sales** (order chits) → one sale per row, `source: 'ocr'` | Jualan composer |

They share `ReceiptScanner.module.css`. Both were explicitly requested. The rationale: paper receipts flow *in* from suppliers (expense), but a stall also writes order chits (sales).

### 4.4 `price` from `ocrParser` is the LINE TOTAL, not a unit price

Never multiply it by quantity — that double-counts. The expense scanner's `includedTotal` depends on this. The parser docblock states the contract.

---

## 5. NEXT TASK — Weekly insights dashboard

The user chose this **over** an AI/Gemini summarizer, explicitly: *"is it possible to build something like that but without relying on AI"* — the data already exists, calculations are free, instant, and need no API key.

### Where

The **Analitik** tab — `App.jsx`, `view === 'insights'`. It currently renders `<Dashboard />` again, an **exact duplicate of Ringkasan**. That's a redundancy and a purpose-built empty slot. Replace it.

### Data layer

New `getWeeklyInsights()` in `src/lib/supabaseDashboard.js`.

**Three things that are easy to get wrong:**

1. **Fetch 14 days, not 7.** `getSales()` / `getExpenses()` take `{ fromDate, toDate }` (added on this branch; they filter in Postgres rather than downloading the whole ledger). Week-over-week needs two weeks — `lastNDates(14)`, then split.

2. **Slow movers must include products with ZERO sales.** *This is the main trap.* If you aggregate only from sales rows, a product that sold nothing all week never appears — and that is exactly the insight the vendor needs. Join against `getProducts()` and left-fill zeros.

3. **Return structured data, not prose** (see §4.1).

### Cards to build

- Top 3 products (revenue or qty)
- Bottom 3 / slow movers — **including zero-sellers**
- Profit margin: this week vs last week + delta
- Expense breakdown by category
- Biggest single expense
- Daily profit trend (chart)
- Tunai vs QR split

### Chart

`chart.js` + `react-chartjs-2` are already deps. Copy the pattern in `SevenDayChart.jsx`. Use green `#1a7f4b` (today/primary) and `#a8c9b8` (muted) — **not** orange.

---

## 6. Remaining backlog after that

- **Sales editing** — currently delete-and-retype only. No `updateSale` exists in `supabaseSales.js`; needs a lib function + edit UI in `SalesList`.
- **Recurring expenses** — no DB column and no dashboard access, so this must be a **client-side localStorage template** ("repeat last month's sewa"), not real automation. Don't design a server solution.
- Unprioritized ideas: quick-tap product grid, weekday prep suggestion, wastage tracking, CSV/PDF export, peak-hour insight.
- Rejected by the user, do not re-propose: offline queue ("most warung sellers have mobile data"), hutang/credit tracking.

---

## 7. Known bugs & landmines

### Fixed here but STILL BROKEN on `origin/main`
`.headerDate` in the teammate's `App.module.css` (commit `a8dcc87`) has characters mangled into asterisks: `inline*flex`, `min*height`, `padding: 0.48rem 0*72rem`, `--color-text-m*ted`, `rg*a(...)`. Browsers silently drop invalid declarations, so **the header date pill renders unstyled on main today**. Fixed on this branch. Worth telling Clement / including in a PR.

### `adjustStock` is not atomic
`src/lib/supabaseProducts.js`. The Postgres RPC `create_single_item_sale` never touched stock, so stock decrement is done **client-side, best-effort** after the sale commits (and restored on delete). Deliberately non-fatal so a stock failure never blocks a committed sale. **Concurrent sales can lose updates.** It belongs inside the RPC if DB access ever appears. Documented in-file.

### OCR — UNRESOLVED, needs user input before any big change
The user reports quantities aren't detected. Investigation so far:

- The parser was tested against **real Tesseract output** from `sample_ocr/sample_ocr.png` (format: `Nasi Lemak  3  12.00`) and gets **every quantity right**, including recovering Tesseract's `il` → `1` misread.
- Four genuine parser bugs *were* found and fixed in `9986d0e`: `qty x unit`, `qty @ unit`, plain `NAME QTY UNIT TOTAL` columns, and unit-price polluting the product name. Each fix is guarded by an arithmetic check (`qty × unit ≈ line total`) so a name like `100PLUS` is never mistaken for pricing.
- A second real bug: the **expense scanner was discarding `it.quantity` entirely** (kept only name+price, no QTY column). Fixed — now shown read-only, because the `expenses` table has no quantity column so there is nowhere for it to persist.

**Why it may still fail:** `Tesseract.recognize(file, 'eng')` with **zero image preprocessing** (no grayscale/contrast/threshold/deskew) and **English-only** language data. Tesseract is built for flat scanned documents; a phone photo of crumpled thermal paper is near its worst case. No parser can rescue garbage input.

**Before ripping out Tesseract, get the raw text.** The UI already exposes it — the scan result has a **"Teks OCR mentah"** expander. Ask the user to paste it:
- Garbled → Tesseract lost → migration is the right fix.
- Clean but wrong quantities → parser bug, get the exact line.
- Empty → the image never reached OCR; a different bug.

**Open proposal (user's idea, not yet decided):** move OCR to **Gemini vision via Firebase AI Logic**. Genuinely attractive because it (a) solves the API-key blocker via App Check — no backend needed, and it'd be the *user's own* Firebase project rather than the teammate's Supabase; (b) lets Gemini return structured JSON, deleting `ocrParser.js` (~350 lines of regex heuristics); (c) drops **30MB** of `tesseract.js-core` plus a ~5MB runtime language download. Trade-offs: needs network (offline scanning dies), sends receipt images to Google, App Check is mandatory or the endpoint is abusable, and **the Spark-vs-Blaze plan requirement was not verified** — check it. Note the distinction: Firebase *Extensions* run Cloud Functions (needs Blaze/billing card); the **Firebase AI Logic client SDK** is the thing you actually want.

### Misc
- `eng.traineddata` (5MB) is a Tesseract runtime download, now gitignored via `*.traineddata`. Don't commit it.
- The preview browser has **no Supabase session**, so an agent cannot see anything past the login screen. The user verifies logged-in UI themselves. Verify translations via `scripts/test-i18n.mjs` + grep, not by eye.

---

## 8. Collaboration state

The teammate is actively pushing to `main` (his UI work is already merged there). This branch is **local-only and now ~7 commits ahead**, and none of its features exist on his side: stock decrement, low-stock card, uncapped target %, date-scoped queries, sales-history range chips, the OCR expense/sale split, and all of i18n.

**Divergence is growing.** Worth raising with the user: whether to open a PR now. Two things are directly useful to Clement — the `.headerDate` fix, and the duplicate Analitik tab.

**Do not push without explicit permission.**
