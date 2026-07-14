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
1. Implement `storage.js` — all localStorage CRUD functions
2. Wire up Product List logic (add/edit/delete, persisted)
3. Wire up Expense Tracker logic (persisted)
4. Implement `calculateProfit()`
5. Implement `getDailySummary()`, `getInsightOfTheDay()` in `insights.js`
6. Implement `getDashboardStats()` — feeds the dashboard's numbers (not chart rendering)
7. If time allows: `getLowStockAlerts()`, best selling day/time insight

### Both, before diverging (Day 1)
- [x] Data shapes agreed (see section 1)
- [x] Function contracts agreed (see section 2)
- [x] Stub files created in `lib/`
- [ ] Confirm both of you can run the project locally and import from `lib/`

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

## 5. Notes / open questions

_(use this space during the hackathon to flag anything that needs the other engineer's input)_

-