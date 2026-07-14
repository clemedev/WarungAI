# WarungAI — Backend / Logic Layer Guide

For Engineer A and Engineer B. This is the working doc for the data + parsing +
insights layer — not the UI. See `PLANNING.md` for the full project plan.

There's no server backend here — everything runs in the browser (OCR, parsing,
storage, insights). "Backend" in this project means the logic/data layer, as
opposed to the visual dashboard.

---

## 1. Shared data shapes

Both of you build against these. **Do not change a field without telling the
other engineer** — the parser, storage, and dashboard all depend on these
matching exactly. Full version with types lives in `lib/types.js`.

**Product**
```js
{ id, name, sellPrice, costPrice }
```

**Sale**
```js
{ id, date, productId, quantity, total, source /* 'ocr' | 'chat' | 'voice' */, paymentMethod /* optional */ }
```

**Expense**
```js
{ id, date, category, amount, note /* optional */ }
```

**DashboardStats** (what the dashboard reads)
```js
{ todayTotal, todayProfit, sevenDayTrend, topItems, targetProgress }
```

---

## 2. Function contracts

These are the function signatures each side calls. Stub files with these
already written are in `lib/` — start coding directly inside them.

| Function | File | Owner | In → Out |
|---|---|---|---|
| `parseReceiptText(rawText)` | `ocrParser.js` | Engineer A | raw OCR string → `{ items, total }` |
| `parseNaturalLanguageEntry(text, products)` | `nlEntryParser.js` | Engineer A | typed/spoken text + product list → partial `Sale` |
| `getProducts()` / `saveProduct()` / `deleteProduct()` | `storage.js` | Engineer B | localStorage CRUD for products |
| `getSales()` / `saveSale()` | `storage.js` | Engineer B | localStorage CRUD for sales |
| `getExpenses()` / `saveExpense()` | `storage.js` | Engineer B | localStorage CRUD for expenses |
| `calculateProfit(date?)` | `insights.js` | Engineer B | date → `{ totalSales, totalCost, profit }` |
| `getDailySummary(date?)` | `insights.js` | Engineer B | date → BM summary string |
| `getInsightOfTheDay()` | `insights.js` | Engineer B | none → insight string or null |
| `getDashboardStats()` | `insights.js` | Engineer B | none → `DashboardStats` |
| `getLowStockAlerts()` | `insights.js` | Engineer B | none → array of low-stock products (supporting feature) |

The frontend/dashboard person only ever calls these functions — they never
touch OCR text or localStorage directly.

---

## 3. Task list

### Engineer A — Input & parsing pipeline
1. Set up Tesseract.js, get basic image-to-text working in a test component
2. Build receipt image capture/upload flow (camera on mobile, file picker on desktop)
3. Implement `parseReceiptText()` in `ocrParser.js`
   - Test against several real warung receipt photos early — formats vary a lot
4. Implement `parseNaturalLanguageEntry()` in `nlEntryParser.js`
   - Extract quantity + RM amount, fuzzy-match item name against products
5. Build voice input (mic button + Web Speech API) → feeds transcribed text into `parseNaturalLanguageEntry()`
6. Build the confirm/edit step after parsing (user reviews/corrects before saving)
7. Handle edge cases: blurry photos, ambiguous typed input, no match found

### Engineer B — Data, calculations & insights
1. [x] Implement `storage.js` — all localStorage CRUD functions (+ settings, deleteSale/deleteExpense)
2. [x] Wire up Product List logic (add/edit/delete, persisted)
3. [x] Wire up Expense Tracker logic (persisted)
4. [x] Implement `calculateProfit()` — sales − (cost of goods + expenses)
5. [x] Implement `getDailySummary()`, `getInsightOfTheDay()` in `insights.js`
6. [x] Implement `getDashboardStats()` — feeds the dashboard's numbers (not chart rendering)
7. Partially: `getPaymentSplit()` (cash vs QR) done; `getLowStockAlerts()` stub (needs stock field — post-MVP)

### Both, before diverging (Day 1)
- [x] Data shapes agreed (see section 1)
- [x] Function contracts agreed (see section 2)
- [x] Stub files created in `lib/` (in `src/lib/` — types, storage, insights, both parsers)
- [x] Engineer A runs the project locally (`npm install && npm run dev`); Engineer B to confirm on their machine

---

## 4. Git branching

```
main                        ← always deployable, this is what gets demoed
 ├── feature/ocr-parser      (Engineer A)
 ├── feature/nl-voice-parser (Engineer A)
 ├── feature/storage-model   (Engineer B)
 ├── feature/insights-calc   (Engineer B)
 └── feature/dashboard-ui    (frontend person)
```

- Branch off `main` per feature: `git checkout -b feature/ocr-parser`
- Commit small, working chunks — don't wait for "done"
- Open a PR into `main` early, even as a draft
- Merge often (daily minimum) — long-lived branches cause conflicts right before the demo
- Quick review before merging — since your code needs to interoperate via the shapes above
- Keep `main` deployable at all times — revert fast if something breaks, don't debug under time pressure

---

---

## 6. Stretch goal: multi-device sync (only if time remains)

**Not required for MVP.** localStorage does not sync across devices or browsers —
each device has its own separate data. This is a known, acceptable limitation
for the hackathon demo (and arguably a feature: works offline, no setup, no
API keys, no server costs).

**Only attempt this if the MVP is fully working and demo-ready with real time left.**
Don't start this in the final 30 minutes before a demo — async bugs are easy to
introduce and hard to catch under time pressure.

### Why it's realistic to bolt on later
`storage.js` is the only file that touches data persistence. The rest of the
app (parsers, insights, dashboard) only ever calls its functions
(`getSales()`, `saveSale()`, etc.) — never `localStorage` directly. Swapping
what's *inside* `storage.js` doesn't require touching OCR, voice input, or
dashboard UI code.

**This only holds if that rule is followed all the way through the hackathon —
never call `localStorage` directly from a component, always go through
`storage.js`.**

### Migration path: Firebase (Firestore), free tier
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com) (free, no card needed)
2. Enable Firestore Database (test mode is fine for a hackathon)
3. Enable Authentication → Anonymous sign-in (no login screen needed, each device gets a unique user ID)
4. `npm install firebase`
5. Add Firebase config to a new `firebase.js` file
6. Rewrite the functions inside `storage.js` to call Firestore instead of localStorage, e.g.:
   ```js
   import { collection, addDoc, getDocs } from 'firebase/firestore';
   import { db } from './firebase';

   export async function saveSale(sale) {
     await addDoc(collection(db, 'sales'), sale);
   }

   export async function getSales() {
     const snapshot = await getDocs(collection(db, 'sales'));
     return snapshot.docs.map(doc => doc.data());
   }
   ```
7. Scope data per owner using their anonymous auth UID (`where('ownerId', '==', currentUser.uid)`) so devices only see their own data
8. **Update every caller of storage functions to use `await`** — Firebase functions are async, localStorage functions were not. This is the main ripple effect to budget time for.

### Tradeoffs to weigh before doing this
- Reintroduces "needs internet" and "has an API key/config" — contradicts the original offline-friendly, no-backend pitch. Decide which story matters more for judges.
- Adds a new failure surface: auth, network errors, security rules
- Keep a fallback — don't let an unstable migration risk a working demo. Consider a separate git branch so you can revert to localStorage if it's not stable in time.

### Rough time budget
- Firebase setup + SDK install: ~20–30 min
- Rewriting `storage.js` functions: ~1–2 hours
- Updating callers to use `await`: ~30–60 min
- Testing + buffer for async bugs: ~1 hour minimum


---

## 7. Notes / open questions

_(use this space during the hackathon to flag anything that needs the other engineer's input)_

- **From Engineer A (2026-07-14):** Input/parsing pipeline is done and merged on
  `main` — OCR receipt scan, chat entry, voice entry, confirm/edit step, and
  both parsers (`src/lib/ocrParser.js`, `src/lib/nlEntryParser.js`) with tests
  (`npm test`, 16 passing).
- **(2026-07-14, later):** Engineer B layer + all UI pages are now also done
  and merged — `storage.js` (final), `insights.js` (profit, BM summary,
  insight rules, dashboard stats, payment split), Products page, Expense
  tracker, Dashboard with Chart.js 7-day trend, top items, target progress,
  and WhatsApp share. `npm test` runs 27 tests across parsers + insights.
- All dates use **local** time via `src/lib/dates.js` — never
  `toISOString().slice(0,10)`, which is UTC and lags 8 hours behind Malaysia.
- OCR language is `eng` — Tesseract downloads its traineddata from a CDN on
  first scan, so the *first* receipt scan needs internet and takes a few
  seconds longer.
- If the dev server was running while `npm install` added a package, Vite's
  dep cache can serve two React copies ("Invalid hook call" from
  react-chartjs-2). Fix: restart dev server (delete `node_modules/.vite` if
  it persists). Fresh installs never hit this.
- Still to do before submission: GitHub repo + Pages deploy; manual test of
  voice input and real receipt photos on a phone.