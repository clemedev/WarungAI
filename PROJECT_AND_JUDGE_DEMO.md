# WarungAI — Project & Judge Demo Guide

## What is WarungAI?

WarungAI is a mobile-first bookkeeping and business-insight app for Malaysian warung, hawker, and food-stall owners.

It replaces informal sales tracking—memory, notes, calculator messages, and WhatsApp—with a simple workflow:

1. Record a sale or expense quickly.
2. Review uncertain information before it becomes a financial record.
3. Turn the records into useful daily and weekly decisions.

The product is designed around Malaysian stall workflows, including Cash/QR payments and Bahasa Melayu, English, and Simplified Chinese support.

## Core user value

WarungAI helps a stall owner answer practical questions:

- How much did I sell today?
- Did I actually make a profit after costs and expenses?
- Was the money Cash or QR?
- Which products sell well, and which are slow?
- Am I selling any item below cost?
- What stock needs attention?
- What should I prepare tomorrow?

## How the app works

### Normal account mode

For a normal signed-in user, the app uses the existing Supabase connection for products, sales, and expenses. The project changes do not require a Supabase dashboard change, schema change, new RPC, new policy, Vercel change, or external API key.

### Demo Stall Mode

The app also includes a browser-only Demo Stall Mode for reliable presentations.

- It loads realistic sample products, sales, expenses, low stock, and analytics.
- It does not read from or write to a real Supabase account.
- Demo Busy Mode sales change only browser-local sample data.
- Exiting Demo Stall Mode clears the sample data.
- A visible green banner makes the demo state clear.

This means a live hackathon demo cannot contaminate a real vendor's records.

## Main features

### 1. Flexible sales entry

- **Typed entry:** understands natural phrasing such as `jual 2 teh tarik RM6`.
- **Voice entry:** converts spoken sales into a reviewable draft.
- **Receipt OCR:** reads receipt items into editable rows.
- **Busy Mode:** large quick-tap product cards for peak selling periods.

### 2. Safe record creation

Receipt/OCR rows with an unmatched product, missing quantity, or invalid amount are highlighted before save. The owner can correct the row first, so the app assists with data entry without silently creating incorrect financial records.

### 3. Daily Closing

The Overview screen includes a polished Daily Closing card with:

- today's sales
- net profit
- Cash and QR totals
- top seller
- low-stock warning and an Inventory action
- WhatsApp share action
- Business Health score

Business Health is an explainable local 0–100 signal. Sales, profit, target progress, and low-stock warnings influence whether the day is labelled healthy, needing attention, or needing action.

### 4. Weekly Insights

The Analytics screen turns data into a business story:

- top products
- slow movers, including zero-sale products
- weekly margin and margin change
- expenses and largest expense
- Cash versus QR split
- daily profit trend
- Weekly Business Story
- Profit-Leak Insight
- Tomorrow Preparation suggestion

The Weekly Business Story explains the numbers in plain language, for example: sales rose, but gas spending stopped profit from increasing.

Profit-Leak Insight flags products sold below cost first, then products with a weak 15% or lower margin.

Tomorrow Preparation uses sales from previous matching weekdays, includes zero-sale history, adds a 10% buffer, and rounds up to a practical suggested quantity. It is deterministic business logic, not a paid AI API.

### 5. Print-friendly weekly report

Analytics includes **Print / Save PDF**. It uses the browser's native print dialog and switches Weekly Insights to a clean report layout, so owners can print it, save a PDF, or share it with an accountant without a separate service.

### 6. Languages, theme, and accessibility

- One-tap language cycle: `BM → BI → BC → BM`.
- Light and dark modes.
- Keyboard focus styling.
- Escape closes the activity sheet and restores focus.
- Reduced-motion support.
- Responsive layouts and small-screen adjustments.
- Heavy features are lazy-loaded to reduce the initial bundle.

### 7. Judge Demo Walkthrough

Demo Stall Mode includes a **Demo guide** panel. It provides a step-by-step route through Busy Mode, safe receipt review, Daily Closing, Analytics, and the report, with short speaking prompts for each step.

## How to set up for judges

1. Start the app locally.
2. At the login screen, press **Try the Demo Stall**.
3. Confirm the green Demo Stall banner appears.
4. Press **Demo guide** if you want the built-in presentation prompts.
5. Keep the app in Demo Stall Mode for the entire presentation.
6. Before presenting, test the language button and Print / Save PDF once.

No manual preparation of sales history is needed because the demo dataset already contains enough data to show the key insights.

## Suggested 3–5 minute presentation

### 1. Start with the problem

> Small food-stall owners often track sales in memory, notes, or WhatsApp. That makes it hard to know whether they are truly profitable or what to prepare tomorrow.

### 2. Show Busy Mode

Open Busy Mode, tap products, adjust quantity, choose Cash or QR, and save.

> During a rush, the owner can record a sale in a few taps instead of stopping to type.

### 3. Show safe AI-assisted entry

Open receipt scanning and point out the review state.

> WarungAI helps read a receipt, but it asks the owner to check uncertain rows before a financial record is saved.

### 4. Show Daily Closing

Open Overview and point to sales, net profit, Cash/QR, low stock, and Business Health.

> At the end of the day, the owner gets an immediate business picture instead of adding notes and receipts manually.

### 5. Show Analytics

Open Analytics and point out:

- the Weekly Business Story
- Profit-Leak Insight
- Tomorrow Preparation
- slow movers and top products

> WarungAI does more than store sales. It explains what changed, identifies products that lose money, and helps the owner prepare for tomorrow.

### 6. Finish with the report

Press **Print / Save PDF**.

> The same business insight can become a weekly record or something the owner shares with an accountant—without another tool.

### 7. Close with the impact

> WarungAI turns ordinary sales records into daily decisions for busy Malaysian food-stall owners.

## Key judge talking points

- Built for Malaysian warung and hawker workflows, not generic accounting software.
- Supports BM, English, and Simplified Chinese.
- Makes financial data safer through review-before-save.
- Gives transparent, explainable insights instead of black-box recommendations.
- Works well for a live demo through browser-local Demo Stall Mode.
- Does not require a paid AI API for the business insights.
- Uses the project's existing backend connection only in normal account mode; no external infrastructure was changed for these features.

## Verification status

- Automated checks cover parsers, insights, weekly calculations, tomorrow preparation, i18n consistency, and UI components.
- Current suite: 43 passing tests/checks.
- Production build succeeds.
- The build has a non-blocking bundle-size warning above 500 kB; the app is still code-split and functional.

## Useful files

- `HACKATHON_DEMO_GUIDE.md` — feature-by-feature implementation log and demo instructions.
- `HACKATHON_SUGGESTIONS.md` — original judge-facing improvement roadmap.
- `HANDOFF.md` — implementation context and project handoff notes.
