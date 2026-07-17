# WarungAI — Hackathon-Facing Improvements

These suggestions focus on features judges can immediately see and understand.

## Scope rule

Every item below can be built in the existing codebase. No Supabase dashboard, database-schema, RPC, policy, Vercel, API-key, or external-service change is required.

The features may read and save through the app's existing Supabase client, but they do not require any backend changes.

## Recommended order

### 1. Busy Mode / quick-tap product grid

Create a fast-selling screen with large product cards, quantity controls, Cash/QR selection, and a clear Save action.

Why it matters:

- Gives the app an immediately understandable real-world use case.
- Lets a busy hawker record a sale without typing.
- Makes a strong live-demo moment.

Use the existing product list and `saveSale()` flow.

### 2. Tomorrow preparation suggestion

Use previous weekday sales to provide a practical recommendation, for example:

> Fridays usually sell 18 cups of Teh Tarik. Prepare around 20.

Why it matters:

- Feels intelligent without needing a generative-AI service.
- Uses business data the app already has.
- Gives judges a clear story about how WarungAI helps owners plan ahead.

### 3. Daily closing screen

Create a polished end-of-day view containing:

- Total sales
- Net profit
- Cash and QR totals
- Top-selling product
- Largest expense
- Low-stock warnings
- WhatsApp sharing

Why it matters:

- Turns several existing features into one compelling business moment.
- Makes the product feel complete rather than a collection of forms.

### 4. Low-stock actions

Upgrade low-stock warnings with direct actions such as:

- Add stock
- Open product details
- Record a stock adjustment

Why it matters:

- Shows that WarungAI helps users act, not only observe.
- Is small enough to implement and demo quickly.

### 5. Profit-leak insight

Highlight products that are sold below cost or have weak profit margins despite high sales.

Example:

> Nasi Lemak is selling well, but its average selling price is below its cost.

Why it matters:

- Creates a memorable business insight beyond simple revenue charts.
- Uses existing product costs and sale snapshots.

### 6. Weekly business story

Add a short deterministic explanation to Weekly Insights, for example:

> Sales increased this week, but gas spending reduced net profit.

Why it matters:

- Makes the analytics easier to understand at a glance.
- Works in BM, BI, and BC because it is based on structured data and locale strings.

### 7. OCR correction confidence

Make receipt review clearer by flagging rows that likely need attention:

- No matched product
- Missing quantity
- Unusual amount
- Low OCR confidence, when available

Why it matters:

- Demonstrates responsible use of OCR.
- Reinforces that users review information before financial records are saved.

### 8. Demo-stall mode

Add a clearly labelled local demo-data option that fills the interface with realistic products, sales, expenses, and insights.

Rules:

- Keep demo data in browser storage only.
- Do not write demo data into a real user's Supabase records.
- Make it easy to clear after a presentation.

Why it matters:

- Makes a presentation reliable even without creating records manually.
- Lets judges immediately see the full product story.

### 9. Print / PDF weekly report

Create a print-friendly weekly summary first; add client-side PDF export only if time remains.

Why it matters:

- Gives owners something they can keep or share with an accountant.
- Adds credibility to a bookkeeping product.

## Suggested demo story

```text
Load demo stall
→ record a sale in Busy Mode
→ review an OCR receipt
→ respond to a low-stock alert
→ open Weekly Insights
→ show tomorrow's preparation suggestion
→ share the daily closing summary through WhatsApp
```

## Best next build

Build **Busy Mode / quick-tap product grid** first. It is highly visible, practical, and can reuse the existing product and sale code without external changes.
