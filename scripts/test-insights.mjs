// Insights/storage tests — run with `npm test`.
//
// localStorage must exist before storage.js and auth.js are imported,
// so the application modules are loaded dynamically after the test setup.

import assert from "node:assert/strict";

// -----------------------------------------------------------------------------
// localStorage test implementation
// -----------------------------------------------------------------------------

const store = new Map();

globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },

  setItem(key, value) {
    store.set(key, String(value));
  },

  removeItem(key) {
    store.delete(key);
  },

  clear() {
    store.clear();
  },
};

// -----------------------------------------------------------------------------
// Test vendor session
// -----------------------------------------------------------------------------
//
// WarungAI namespaces products, sales, expenses, and settings by the currently
// signed-in vendor ID. These tests therefore need a local vendor and session
// before calling any storage write functions.

const TEST_USER = {
  id: "test-vendor-001",
  name: "Warung Test",
  pinHash: "not-required-for-this-test",
};

function signInTestVendor() {
  localStorage.setItem("warungai.users", JSON.stringify([TEST_USER]));

  localStorage.setItem("warungai.sessionUserId", TEST_USER.id);
}

function resetTestStorage() {
  localStorage.clear();
  signInTestVendor();
}

signInTestVendor();

// Dynamic imports must remain below the localStorage and session setup.
const storage = await import("../src/lib/storage.js");
const insights = await import("../src/lib/insights.js");
const { todayISO, lastNDates } = await import("../src/lib/dates.js");

// -----------------------------------------------------------------------------
// Lightweight test runner
// -----------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}\n      ${error.message}`);
  }
}

// -----------------------------------------------------------------------------
// Seed data
// -----------------------------------------------------------------------------

const today = todayISO();
const yesterday = lastNDates(2)[0];

const nasi = storage.saveProduct({
  name: "Nasi Lemak",
  sellPrice: 4.0,
  costPrice: 2.0,
});

const teh = storage.saveProduct({
  name: "Teh Tarik",
  sellPrice: 3.0,
  costPrice: 1.0,
});

storage.saveSale({
  date: today,
  productId: nasi.id,
  quantity: 3,
  total: 12,
  source: "chat",
  paymentMethod: "cash",
});

storage.saveSale({
  date: today,
  productId: teh.id,
  quantity: 2,
  total: 6,
  source: "voice",
  paymentMethod: "qr",
});

storage.saveSale({
  date: yesterday,
  productId: nasi.id,
  quantity: 5,
  total: 20,
  source: "ocr",
  paymentMethod: "cash",
});

storage.saveExpense({
  date: today,
  category: "gas",
  amount: 5,
  note: "tong gas",
});

// -----------------------------------------------------------------------------
// Storage tests
// -----------------------------------------------------------------------------

test("storage: products persist and update in place", () => {
  assert.equal(storage.getProducts().length, 2);

  storage.saveProduct({
    ...nasi,
    sellPrice: 4.5,
  });

  assert.equal(storage.getProducts().length, 2);

  const updatedNasi = storage
    .getProducts()
    .find((product) => product.id === nasi.id);

  assert.equal(updatedNasi.sellPrice, 4.5);

  // Restore the original price for the remaining tests.
  storage.saveProduct({
    ...nasi,
    sellPrice: 4.0,
  });
});

test("storage: settings default and override", () => {
  assert.equal(storage.getSettings().dailyTarget, 200);

  storage.saveSettings({
    dailyTarget: 100,
  });

  assert.equal(storage.getSettings().dailyTarget, 100);
});

// -----------------------------------------------------------------------------
// Profit tests
// -----------------------------------------------------------------------------

test("calculateProfit: sales minus cost of goods and expenses", () => {
  const result = insights.calculateProfit(today);

  // Sales:
  // Nasi Lemak: RM12
  // Teh Tarik: RM6
  // Total sales: RM18
  //
  // Cost of goods:
  // 3 × RM2 = RM6
  // 2 × RM1 = RM2
  // Total COGS: RM8
  //
  // Expenses:
  // Gas: RM5
  //
  // Net profit:
  // RM18 - RM8 - RM5 = RM5

  assert.equal(result.totalSales, 18);
  assert.equal(result.totalCost, 13);
  assert.equal(result.profit, 5);
});

test("calculateProfit: day with no data returns all zeros", () => {
  const result = insights.calculateProfit("2000-01-01");

  assert.deepEqual(result, {
    totalSales: 0,
    totalCost: 0,
    profit: 0,
  });
});

// -----------------------------------------------------------------------------
// Dashboard tests
// -----------------------------------------------------------------------------

test("getDashboardStats: returns expected shape and values", () => {
  const stats = insights.getDashboardStats();

  assert.equal(stats.todayTotal, 18);
  assert.equal(stats.todayProfit, 5);

  assert.equal(stats.sevenDayTrend.length, 7);

  assert.equal(stats.sevenDayTrend[6].date, today);

  assert.equal(stats.sevenDayTrend[6].total, 18);

  assert.equal(stats.sevenDayTrend[5].total, 20);

  assert.equal(stats.topItems[0].name, "Nasi Lemak");

  assert.equal(stats.topItems[0].quantity, 8);

  // RM18 sales divided by RM100 daily target.
  assert.equal(stats.targetProgress, 0.18);
});

// -----------------------------------------------------------------------------
// Daily summary tests
// -----------------------------------------------------------------------------

test("getDailySummary: returns BM summary with totals and top item", () => {
  const summary = insights.getDailySummary(today);

  assert.match(summary, /hari ini/);
  assert.match(summary, /RM18\.00/);
  assert.match(summary, /RM5\.00/);
  assert.match(summary, /Nasi Lemak/);
  assert.match(summary, /Perbelanjaan: RM5\.00/);
});

test("getDailySummary: empty day says tiada jualan", () => {
  const summary = insights.getDailySummary("2000-01-01");

  assert.match(summary, /Tiada jualan/);
});

// -----------------------------------------------------------------------------
// Payment-method tests
// -----------------------------------------------------------------------------

test("getPaymentSplit: separates cash and QR sales", () => {
  assert.deepEqual(insights.getPaymentSplit(today), {
    cash: 12,
    qr: 6,
  });
});

// -----------------------------------------------------------------------------
// Insight tests
// -----------------------------------------------------------------------------

test("getInsightOfTheDay: flags below-cost selling first", () => {
  // Existing Nasi Lemak sale:
  // 3 units for RM12
  //
  // Temporary below-cost sale:
  // 20 units for RM10
  //
  // Combined average:
  // RM22 / 23 units = approximately RM0.96 per unit.
  //
  // This is below the RM2.00 product cost.

  const badSale = storage.saveSale({
    date: today,
    productId: nasi.id,
    quantity: 20,
    total: 10,
    source: "chat",
    paymentMethod: "cash",
  });

  const insight = insights.getInsightOfTheDay();

  assert.match(insight, /bawah kos/);
  assert.match(insight, /Nasi Lemak/);

  storage.deleteSale(badSale.id);
});

test("getInsightOfTheDay: falls back to best seller", () => {
  const insight = insights.getInsightOfTheDay();

  assert.match(insight, /paling laris/);
  assert.match(insight, /Nasi Lemak/);
});

test("getInsightOfTheDay: returns null with no records", () => {
  resetTestStorage();

  assert.equal(insights.getInsightOfTheDay(), null);
});

// -----------------------------------------------------------------------------
// Results
// -----------------------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);

process.exit(failed > 0 ? 1 : 0);
