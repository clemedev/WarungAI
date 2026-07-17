# WarungAI — Hackathon Demo Guide

## Project in one sentence

WarungAI is a mobile-first bookkeeping assistant for Malaysian warung and food-stall owners: it turns typed, spoken, quick-tap, and receipt-based sales into reviewed records, then turns those records into practical business guidance.

## Current branch

Work is being developed on `design/ui-redesign-2.0`.

The current local app runs at:

```text
http://localhost:5173
```

## What has changed so far

### UI and language

- Green Liquid Glass visual direction retained.
- Light and dark themes.
- Bahasa Melayu, English, and Simplified Chinese support.
- One-tap language cycle: `BM → BI → BC → BM`.
- Language keys are checked automatically across all three locales.

### Faster sales entry

- Typed sales entry with natural-language parsing.
- Voice sales entry with review before saving.
- Sale receipt OCR with editable review rows.
- **Busy Mode / Quick Sale Grid:** tap product cards, adjust quantities, choose Cash or QR, and save quickly.
- Every sale still uses the existing confirmation/saving flow; no new database schema or Supabase dashboard change was required.

### Business views

- Dashboard metrics for sales, profit, expenses, targets, payment method split, and low stock.
- Weekly Insights in the Analitik tab:
  - top 3 products
  - slow movers, including products with zero sales
  - weekly net-profit margin compared with the prior week
  - expense breakdown and largest expense
  - cash versus QR totals
  - daily profit trend

### Quality and accessibility

- Better saving, error, empty, and success states for sales entry.
- Clearer receipt-scanning progress and error feedback.
- Keyboard-focus styling, high-contrast support, and reduced-motion support.
- The activity sheet closes with Escape and returns focus to the button that opened it.
- Heavy OCR, records, inventory, and analytics features are lazy-loaded, reducing the first JavaScript bundle from about 680 kB to about 484 kB.

### Verification

- 41 automated tests currently pass.
- Production build succeeds.

## Feature log — Tomorrow Preparation Suggestion

### What changed

- Added a Tomorrow Preparation card at the top of the Analitik view.
- Added a deterministic preparation calculator and automated tests.
- Added BM, BI, and BC wording for the card.

### How it works

The app reads up to eight prior occurrences of tomorrow's weekday from the existing sales history. For each active product, it averages the quantity sold across those matching days, including zero-sale days. It then adds a 10% buffer and rounds up to a practical preparation number.

Example: an average of 15 Nasi Lemak portions becomes a recommendation to prepare 17.

### How to demo it

Before presenting, create sales across at least three previous occurrences of the weekday after the demo date. Ensure two or three products have a clear repeated pattern. Open **Analitik**, point to **Prepare for [tomorrow's weekday]**, then explain that the recommendation is calculated from the stall's own history without a paid AI API.

## Feature log — Daily Closing Summary

### What changed

- Added a Daily Closing card to Ringkasan.
- It combines today's sales, net profit, Cash/QR split, top seller, and WhatsApp sharing in one presentation-ready card.

### How it works

It reads the same existing dashboard data already used elsewhere in the app. No new database columns, services, or APIs are required.

### How to demo it

Record one Busy Mode sale and one expense, then open Ringkasan. Point out the closing card and share it through the WhatsApp button. Explain that this gives a stall owner an end-of-day business check in seconds.

## Feature log — Actionable Low-Stock Warning

### What changed

- Added low-stock products to the Daily Closing card.
- Added an **Manage stock** action that opens the existing Inventory screen.

### How it works

The app reuses the current low-stock calculation and product editor. No database change is needed.

### How to demo it

Set a product's stock at or below its warning threshold, then open Ringkasan. Use **Manage stock** to jump to Inventory and show where the owner can correct the stock level.

## Feature log — OCR Review Flags

### What changed

- Sales-receipt rows without a product match, quantity, or valid amount are highlighted before saving.
- The review screen reports how many included rows need checking.

### How it works

The OCR parser still produces a draft. The interface marks uncertain rows and removes the warning once the user selects a valid product. The user remains in control; nothing is saved automatically.

### How to demo it

Scan a receipt with one unmatched product name. Point out the highlighted row and the review count, then select the correct product and save. Explain that WarungAI protects financial records from OCR mistakes.

## Feature log — Profit-Leak Insight

### What changed

- Added a **Protect your profit** card to Weekly Insights in Analitik.
- It flags products sold below their recorded cost before products that have a thin (15% or lower) profit margin.
- Added the wording in BM, BI, and BC and a focused automated calculation test.

### How it works

For each product sold this week, WarungAI uses the existing sale snapshots for revenue, unit cost, and gross profit. It calculates the average selling price, average cost, and profit margin locally, then highlights up to three products needing attention. This does not add or alter any database field, service, or external setting.

### How to demo it

Before the presentation, make one sale where a product's recorded selling price is below its cost price, or make a low-margin product sale. Open **Analitik** and point out the card. Explain: “Revenue can look healthy while this item loses money; WarungAI makes that visible before the owner repeats the mistake.”

## Feature log — Weekly Business Story

### What changed

- Added a prominent **This week's business story** card to Analitik.
- It turns the current and previous weeks' revenue, profit, and expenses into one short, explainable takeaway.
- Added BM, BI, and BC wording plus an automated rule test.

### How it works

The card uses the same existing weekly sales and expense calculations. Its rules explain one of five states: sales rose but expenses held profit back, profit improved, sales declined, expenses exceed gross profit, or there is not enough prior history yet. It does not call an AI service or change any database or deployment setting.

### How to demo it

Prepare two weeks of sales. For the clearest story, make the current week's sales higher than the previous week's, then add a large expense such as gas. Open **Analitik** and read the sentence aloud: it shows the judge that WarungAI explains *why* a result happened, not just charts and totals.

## Tomorrow Preparation Suggestion

### What it should do

Look at sales from the same weekday over previous weeks, then recommend what to prepare for tomorrow.

Example:

```text
Prepare for Friday

Nasi Lemak usually sells around 17 portions on Fridays.
Prepare 20 portions.

Teh Tarik usually sells around 22 cups on Fridays.
Prepare 25 cups.
```

### How it works

1. Identify tomorrow's weekday.
2. Read existing historical sales for that weekday.
3. Group sales by product.
4. Calculate a simple average quantity per product.
5. Recommend a rounded-up preparation quantity.
6. Show only products with meaningful history.

This is deterministic business logic, not a paid AI API. It uses records the stall owner already has and needs no Supabase dashboard, Vercel, external API, or database-schema change.

## How to prepare for the judges

### Before the presentation

1. Start the local app and confirm it opens at `localhost:5173`.
2. Use one demo account consistently.
3. Prepare realistic data across at least three weeks:
   - 5–8 products
   - sales on several different weekdays
   - a clear Friday or weekend pattern for 2–3 products
   - a few expenses in different categories
   - one low-stock product
4. Make sure at least one product has zero sales this week, so Slow Movers can demonstrate its value.
5. Keep the receipt image and a clear sample OCR result ready as backup.
6. Test the BM, BI, and BC language button before presenting.

> Note: a local Demo Stall data loader is a suggested future improvement, not yet built. Until then, prepare the records manually in the existing app account before the presentation.

### Suggested judge demo flow

```text
1. Explain the problem
   "Small stall owners often track sales in memory, notes, or WhatsApp."

2. Show Busy Mode
   Tap products, increase quantity, choose Cash or QR, and save a sale.

3. Show safe AI-assisted entry
   Type or scan a receipt, then point out that WarungAI asks for review before saving.

4. Show the daily business picture
   Open Ringkasan for sales, profit, cash/QR, and low-stock information.

5. Show Weekly Insights
   Open Analitik and point out top products, zero-sale slow movers, expenses, and profit trend.

6. Explain Tomorrow Preparation
   "The next feature uses these same weekly records to recommend what to prepare tomorrow—without a paid AI service."

7. End with impact
   "WarungAI turns ordinary sales records into daily decisions for a busy food-stall owner."
```

## Judge-facing talking points

- Built for Malaysian warung and hawker workflows, not generic accounting software.
- Three language options: BM, BI, and BC.
- Data is reviewed before it becomes a financial record.
- Insights are explainable and calculated from real business data.
- Busy Mode makes recording a sale practical during peak hours.
- The planned preparation suggestion is inexpensive, transparent, and does not depend on an external AI API.

## Scope boundaries respected

The current work did not require changes to:

- Supabase dashboard configuration
- database schema
- database RPCs or row-level-security policies
- Vercel settings
- external API keys or services

The app continues to use its existing Supabase connection for normal authenticated data reads and saves.

## Feature log — Demo Stall Mode

### What changed

- Added a **Try the Demo Stall** button on the login screen.
- It loads a realistic warung with five weeks of food-and-drink sales, varied expenses, low-stock items, a profit leak, and preparation patterns.
- A persistent banner makes it clear that this is presentation data, with an Exit demo control.

### How it works

Demo Stall Mode is entirely browser-local. It switches the app's existing data layer to a temporary local dataset, so normal screens—including Busy Mode, records, stock, Daily Closing, and Analytics—work without reading or writing a real Supabase account. Starting a new demo resets the sample data; exiting clears it.

### How to demo it

At the login screen, choose **Try the Demo Stall**. Then go straight to Ringkasan and Analitik: all key cards already have a clear story. Record one Busy Mode sale if useful; it changes only the local demo data. End by pointing to the green Demo Stall banner and explain that the live presentation cannot contaminate a real vendor's records.

## Feature log — Print-Friendly Weekly Report

### What changed

- Added a **Print / Save PDF** action to Analitik.
- The Weekly Insights layout switches to a clean, print-friendly report with only the report content visible.

### How it works

The action uses the browser's native print dialog. The owner can print the report or choose **Save as PDF** without a PDF service, server upload, or extra account permission.

### How to demo it

Open **Analitik** in Demo Stall Mode, click **Print / Save PDF**, and show the print preview. Explain that a stall owner can keep a weekly record or share it with an accountant using the same insights they already see in WarungAI.

## Feature log — Judge Demo Walkthrough

### What changed

- Added a **Demo guide** control in Demo Stall Mode.
- It opens a compact, step-by-step presentation panel with the exact screen to open and a short speaking prompt for each moment.

### How it works

Each walkthrough step opens the relevant existing screen: Busy Mode, receipt review, Daily Closing, Analytics, and the weekly report. It is only a local presentation aid; it does not create records or communicate with an external service.

### How to demo it

Start Demo Stall Mode and leave the walkthrough panel open. Click **Next step** as you present, reading the short prompt in your own words. The panel can be closed at any time, then reopened from the Demo Stall banner.

## Feature log — Daily Business Health

### What changed

- Added a 0–100 Business Health indicator to Daily Closing.

### How it works

It combines today's sales, profit, target progress, and low-stock warnings using transparent local rules. It labels the day as healthy, needing attention, or needing action—without any external AI or service.

### How to demo it

In Demo Stall Mode, open Ringkasan and point to Business Health in Daily Closing. Explain that the owner gets a quick operational signal, then can inspect the underlying sales, profit, and stock details.

## Feature log — Analytics Low Stock Count

### What changed

- Added a Low Stock Count card to Analytics, listing every product at or below its warning level.
- Updated the Demo Stall data so every sample sale uses a price above that product's recorded cost.

### How it works

Low Stock Count compares the existing current-stock and warning-threshold values. The card shows both the number of affected products and how many units remain for each one.

### How to demo it

Open Analitik in Demo Stall Mode and point to Low Stock Count. Explain that the owner can see stock risk alongside weekly performance, rather than noticing a shortage only when a customer orders the item.

## Feature log — 10-Minute Undo Sale Safeguard

### What changed

- Added an **Undo this sale** action after a sale is saved.
- The action remains available for 10 minutes and works in both normal accounts and Demo Stall Mode.
- Multi-item saves from Busy Mode and receipt scanning are treated as one temporary undo batch.

### How it works

WarungAI remembers the saved sale IDs in the browser for 10 minutes. Tapping Undo deletes every saved item in that batch through the existing delete flow. Each deletion restores the relevant stock, then Overview, Records, Daily Closing, and Analytics refresh from the updated data. If one item cannot be reversed, the app keeps the action available so the owner can retry rather than claiming the whole undo succeeded.

This is a speed-and-correction safeguard for recent entry mistakes. It does not add customer tracking, change the Supabase schema, or turn historical item lines into permanent grouped orders.

### How to demo it

In Demo Stall Mode, use Busy Mode to save two or more products. Point to the **Undo this sale** action at the bottom of the screen. Tap it, then open Inventory and Analytics to show that stock and totals have returned to their previous values. Explain that a stall owner can correct a rushed entry in one action without hunting down each line item.
