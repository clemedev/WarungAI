// Insights/storage tests — run with `npm test` (plain node, no framework).
// localStorage shim must exist before storage.js is imported, hence the
// dynamic imports below.
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const storage = await import('../src/lib/storage.js');
const insights = await import('../src/lib/insights.js');
const { todayISO, lastNDates } = await import('../src/lib/dates.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${name}\n      ${err.message}`);
  }
}

const today = todayISO();
const yesterday = lastNDates(2)[0];

// ---- seed data ----
const nasi = storage.saveProduct({ name: 'Nasi Lemak', sellPrice: 4.0, costPrice: 2.0 });
const teh = storage.saveProduct({ name: 'Teh Tarik', sellPrice: 3.0, costPrice: 1.0 });

storage.saveSale({ date: today, productId: nasi.id, quantity: 3, total: 12, source: 'chat', paymentMethod: 'cash' });
storage.saveSale({ date: today, productId: teh.id, quantity: 2, total: 6, source: 'voice', paymentMethod: 'qr' });
storage.saveSale({ date: yesterday, productId: nasi.id, quantity: 5, total: 20, source: 'ocr', paymentMethod: 'cash' });
storage.saveExpense({ date: today, category: 'gas', amount: 5, note: 'tong gas' });

test('storage: products persist and update in place', () => {
  assert.equal(storage.getProducts().length, 2);
  storage.saveProduct({ ...nasi, sellPrice: 4.5 });
  assert.equal(storage.getProducts().length, 2);
  assert.equal(storage.getProducts().find((p) => p.id === nasi.id).sellPrice, 4.5);
  storage.saveProduct({ ...nasi, sellPrice: 4.0 }); // restore
});

test('storage: settings default + override', () => {
  assert.equal(storage.getSettings().dailyTarget, 200);
  storage.saveSettings({ dailyTarget: 100 });
  assert.equal(storage.getSettings().dailyTarget, 100);
});

test('calculateProfit: sales - (cost of goods + expenses)', () => {
  const r = insights.calculateProfit(today);
  // sales 12+6=18; COGS 3*2 + 2*1 = 8; expenses 5 → cost 13, profit 5
  assert.equal(r.totalSales, 18);
  assert.equal(r.totalCost, 13);
  assert.equal(r.profit, 5);
});

test('calculateProfit: day with no data is all zeros', () => {
  const r = insights.calculateProfit('2000-01-01');
  assert.deepEqual(r, { totalSales: 0, totalCost: 0, profit: 0 });
});

test('getDashboardStats: shape and values', () => {
  const s = insights.getDashboardStats();
  assert.equal(s.todayTotal, 18);
  assert.equal(s.todayProfit, 5);
  assert.equal(s.sevenDayTrend.length, 7);
  assert.equal(s.sevenDayTrend[6].date, today);
  assert.equal(s.sevenDayTrend[6].total, 18);
  assert.equal(s.sevenDayTrend[5].total, 20); // yesterday
  assert.equal(s.topItems[0].name, 'Nasi Lemak'); // 8 units across the week
  assert.equal(s.topItems[0].quantity, 8);
  assert.equal(s.targetProgress, 0.18); // 18 / target 100
});

test('getDailySummary: BM string with totals and top item', () => {
  const s = insights.getDailySummary(today);
  assert.match(s, /hari ini/);
  assert.match(s, /RM18\.00/);
  assert.match(s, /RM5\.00/);
  assert.match(s, /Nasi Lemak/);
  assert.match(s, /Perbelanjaan: RM5\.00/);
});

test('getDailySummary: empty day says tiada jualan', () => {
  assert.match(insights.getDailySummary('2000-01-01'), /Tiada jualan/);
});

test('getPaymentSplit: cash vs qr', () => {
  assert.deepEqual(insights.getPaymentSplit(today), { cash: 12, qr: 6 });
});

test('getInsightOfTheDay: flags below-cost selling first', () => {
  // 20 nasi lemak for RM10 → today's avg unit price (12+10)/(3+20) ≈ RM0.96,
  // below the RM2 cost — the rule works on the day's average, so one small
  // discounted sale alone should NOT trigger it
  const bad = storage.saveSale({ date: today, productId: nasi.id, quantity: 20, total: 10, source: 'chat' });
  const insight = insights.getInsightOfTheDay();
  assert.match(insight, /bawah kos/);
  assert.match(insight, /Nasi Lemak/);
  storage.deleteSale(bad.id);
});

test('getInsightOfTheDay: falls back to best seller', () => {
  const insight = insights.getInsightOfTheDay();
  assert.match(insight, /paling laris/);
  assert.match(insight, /Nasi Lemak/);
});

test('getInsightOfTheDay: null with no data at all', () => {
  store.clear();
  assert.equal(insights.getInsightOfTheDay(), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
