import assert from 'node:assert/strict';

import {
  createWeeklyInsights,
} from '../src/lib/weeklyInsights.js';

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

const previousWeek = [
  '2026-07-01',
  '2026-07-02',
  '2026-07-03',
  '2026-07-04',
  '2026-07-05',
  '2026-07-06',
  '2026-07-07',
];

const currentWeek = [
  '2026-07-08',
  '2026-07-09',
  '2026-07-10',
  '2026-07-11',
  '2026-07-12',
  '2026-07-13',
  '2026-07-14',
];

const products = [
  { id: 'nasi', name: 'Nasi Lemak' },
  { id: 'teh', name: 'Teh Tarik' },
  { id: 'roti', name: 'Roti Canai' },
  { id: 'kopi', name: 'Kopi O' },
];

const sales = [
  {
    date: '2026-07-01', productId: 'nasi', productName: 'Nasi Lemak',
    quantity: 4, total: 20, grossProfit: 8, paymentMethod: 'cash',
  },
  {
    date: '2026-07-08', productId: 'nasi', productName: 'Nasi Lemak',
    quantity: 6, total: 30, grossProfit: 12, paymentMethod: 'cash',
  },
  {
    date: '2026-07-10', productId: 'teh', productName: 'Teh Tarik',
    quantity: 2, total: 6, grossProfit: 3, paymentMethod: 'qr',
  },
];

const expenses = [
  { date: '2026-07-01', category: 'bahan', amount: 2 },
  { date: '2026-07-09', category: 'bahan', amount: 4 },
  { date: '2026-07-10', category: 'gas', amount: 7 },
];

test('weekly: slow movers include products with zero sales', () => {
  const result = createWeeklyInsights({
    sales,
    expenses,
    products,
    currentWeek,
    previousWeek,
  });

  assert.equal(result.current.slowMovers[0].name, 'Roti Canai');
  assert.equal(result.current.slowMovers[0].quantity, 0);
  assert.equal(result.current.slowMovers[0].revenue, 0);
  assert.deepEqual(result.current.lowStockItems, []);
});

test('weekly: compares margin, expenses, payments, and daily profit', () => {
  const result = createWeeklyInsights({
    sales,
    expenses,
    products,
    currentWeek,
    previousWeek,
  });

  assert.equal(result.current.revenue, 36);
  assert.equal(result.current.netProfit, 4);
  assert.equal(result.current.margin, 11.11);
  assert.equal(result.previous.margin, 30);
  assert.equal(result.marginDelta, -18.89);
  assert.deepEqual(result.current.paymentSplit, { cash: 30, qr: 6 });
  assert.deepEqual(result.current.expenseBreakdown, [
    { category: 'gas', amount: 7 },
    { category: 'bahan', amount: 4 },
  ]);
  assert.equal(result.current.largestExpense.amount, 7);
  assert.equal(result.current.dailyProfitTrend[0].profit, 12);
  assert.equal(result.current.dailyProfitTrend[1].profit, -4);
  assert.deepEqual(result.current.businessStory, {
    type: 'salesUpExpenses',
    revenueChange: 16,
    profitChange: -2,
    expenseCategory: 'gas',
    expenseAmount: 7,
  });
});

test('weekly: flags below-cost sales before thin-margin products', () => {
  const result = createWeeklyInsights({
    sales: [
      ...sales,
      {
        date: '2026-07-12', productId: 'roti', productName: 'Roti Canai',
        quantity: 3, total: 9, totalCost: 12, grossProfit: -3,
        paymentMethod: 'cash',
      },
      {
        date: '2026-07-13', productId: 'kopi', productName: 'Kopi O',
        quantity: 5, total: 20, totalCost: 18, grossProfit: 2,
        paymentMethod: 'cash',
      },
    ],
    expenses,
    products,
    currentWeek,
    previousWeek,
  });

  assert.equal(result.current.profitLeaks[0].name, 'Roti Canai');
  assert.equal(result.current.profitLeaks[0].type, 'belowCost');
  assert.equal(result.current.profitLeaks[0].averagePrice, 3);
  assert.equal(result.current.profitLeaks[0].averageCost, 4);
  assert.equal(result.current.profitLeaks[1].name, 'Kopi O');
  assert.equal(result.current.profitLeaks[1].type, 'lowMargin');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
