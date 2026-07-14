# WarungAI — Project Plan

**AI Bookkeeping Assistant for Malaysian Warung Owners & Hawkers**
Codex Hackathon Submission

---

## 1. Problem Statement

Malaysian warung owners and hawkers track sales and costs manually (or not at all), making it hard to know their real daily profit, which items are underpriced, or how their business trends week to week. WarungAI turns a receipt photo, a typed sentence, or a spoken sentence into structured sales data — then surfaces plain-Bahasa-Malaysia insights a busy trader can act on in seconds.

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React (Vite) | Fast dev server, easy GitHub Pages deploy |
| OCR | Tesseract.js | Runs in-browser, no backend/API key needed |
| Charts | Chart.js (via `react-chartjs-2`) | 7-day trend, top items |
| Storage | `localStorage` | No backend, no server cost |
| Voice input | Web Speech API (`SpeechRecognition`) | Browser-native, no key needed |
| Deployment | GitHub Pages | Static hosting, matches "no backend" constraint |
| Styling | CSS Modules | One `.module.css` file per component, scoped class names |

**Why React instead of the original pure HTML/CSS/JS plan:** submission requirements need a React app. Tesseract.js, Chart.js, and the Web Speech API all work fine inside React components — the "no backend" and "no API key" properties of the original plan are unaffected.

## 3. Core User Workflow

**Note:** WarungAI is a responsive web app — it works on both desktop and mobile browsers, not mobile-only. Owners can use it on a phone at the stall or on a laptop/desktop at home for review, so layout should adapt cleanly across screen sizes.

```
1. Owner opens WarungAI in browser (desktop or mobile)
2. Owner sets up Product List (name, sell price, cost price) — one-time/editable
3. Daily sales entry via ONE of:
     a) Snap receipt photo → Tesseract.js OCR → parser extracts items/totals → confirm/edit → save
     b) Type in chat box: "Sold 3 nasi lemak RM12" → parser matches product → confirm/edit → save
     c) Tap mic → speak sale → same parse/confirm flow
4. Expense entry: log daily costs (ingredients, gas, packaging)
5. Dashboard auto-updates:
     - Daily total sales / profit
     - 7-day trend chart
     - Top-selling items
     - Live progress toward a daily target
     - AI insight of the day (rule-based first, real "AI" later)
     - Plain-BM daily summary
6. Owner can share daily summary to WhatsApp in one tap
```

## 4. Feature List & Priority

### Core (must ship for demo)
1. Product listing page — add item name, selling price, cost price
2. OCR receipt scan — photo → sales record
3. Chat-style typed sales entry ("Sold 3 nasi lemak RM12")
4. Voice input — mic button to speak sales entries
5. Expense tracker — daily costs (ingredients, gas, packaging)
6. Profit calculation — gross sales minus costs, per item and per day
7. Daily sales summary in Bahasa Malaysia
8. "Insight of the day" — one flag/recommendation (e.g. "Mee goreng dijual bawah kos")
9. Dashboard — daily total, 7-day chart, top items, live target progress

### Supporting (ship if time allows)
10. Low stock alert (sales vs starting quantity)
11. Multi-item quick-add (tap preset items instead of typing)
12. Best selling day/time insight
13. WhatsApp share (one-tap daily summary)
14. Cash vs QR payment split tracker
15. Customer count tracker (total + average spend)

### Post-hackathon (not for demo)
16. Monthly sales invoice generation
17. Tax document preparation
18. Wake-word voice assistant
19. Multi-user/team access

## 5. Suggested Folder Structure

```
warungai/
├── public/
├── src/
│   ├── components/                # each component: ComponentName.jsx + ComponentName.module.css
│   │   ├── ProductList/
│   │   ├── ReceiptScanner/       # Tesseract.js OCR flow
│   │   ├── ChatEntry/            # typed sales entry + parser
│   │   ├── VoiceEntry/           # mic button + Web Speech API
│   │   ├── ExpenseTracker/
│   │   ├── Dashboard/
│   │   │   ├── SalesSummaryCard.jsx
│   │   │   ├── SalesSummaryCard.module.css
│   │   │   ├── SevenDayChart.jsx
│   │   │   ├── TopItemsList.jsx
│   │   │   └── InsightOfTheDay.jsx
│   │   └── shared/                # buttons, modals, layout
│   ├── lib/
│   │   ├── ocrParser.js          # turns OCR text -> {items, total}
│   │   ├── nlEntryParser.js      # turns "Sold 3 nasi lemak RM12" -> record
│   │   ├── insights.js           # rule-based insight/summary generators
│   │   └── storage.js            # localStorage read/write helpers
│   ├── pages/
│   │   ├── Home.jsx / Dashboard.jsx
│   │   ├── Products.jsx
│   │   ├── AddSale.jsx
│   │   └── Expenses.jsx
│   ├── App.jsx
│   └── main.jsx
├── PLANNING.md
├── README.md
└── package.json
```

## 6. Core Data Model (localStorage)

```js
// products
{ id, name, sellPrice, costPrice }

// sales
{ id, date, productId, quantity, total, source: 'ocr' | 'chat' | 'voice', paymentMethod: 'cash' | 'qr' }

// expenses
{ id, date, category, amount, note }
```

## 7. Demo Script (for judges)

1. Show empty dashboard → add 3–4 products with prices.
2. Snap/upload a sample receipt → OCR extracts items → confirm → sale logged.
3. Type a sale in chat: "Sold 2 teh tarik RM6".
4. Speak a sale via mic.
5. Add an expense (e.g. gas RM20).
6. Show dashboard: today's profit, 7-day chart, top item, insight of the day, BM summary.
7. Tap WhatsApp share (if built).

## 8. Immediate Next Steps

- [x] Scaffold Vite + React project (with CSS Modules)
- [x] Build Product List page first (everything else depends on it)
- [x] Build OCR flow + parser (highest risk item — test early)
- [x] Build chat + voice entry (share the same parser/record logic)
- [x] Build Dashboard last, once sales/expense data exists to visualize

## 9. Running the project

```bash
npm install
npm run dev      # local dev server
npm test         # 27 parser + insights tests
npm run build    # production build (dist/), GitHub Pages ready (base: './')
```

Remaining before submission: push to a GitHub repo, enable Pages on the
`dist/` build (e.g. via an Actions workflow or `gh-pages` branch), and test
voice input + real receipt photos on a physical phone.