import {
  getSales,
} from './supabaseSales.js';

import {
  getExpenses,
} from './supabaseExpenses.js';

import {
  getProducts,
} from './supabaseProducts.js';

import {
  lastNDates,
  todayISO,
} from './dates.js';

import {
  createWeeklyInsights,
} from './weeklyInsights.js';

import {
  createTomorrowPreparation,
} from './tomorrowPreparation.js';

function round2(value) {
  return Math.round(
    (Number(value) + Number.EPSILON) * 100,
  ) / 100;
}

function calculateTopItems(
  sales,
  dates,
  limit = 3,
) {
  const dateSet = new Set(dates);
  const totals = new Map();

  for (const sale of sales) {
    if (!dateSet.has(sale.date)) {
      continue;
    }

    const key =
      sale.productId ??
      sale.productName;

    const current = totals.get(key) ?? {
      productId:
        sale.productId ?? null,
      name:
        sale.productName ??
        'Produk tidak dikenali',
      quantity: 0,
    };

    current.quantity +=
      Number(sale.quantity) || 0;

    totals.set(key, current);
  }

  return [...totals.values()]
    .sort(
      (first, second) =>
        second.quantity -
        first.quantity,
    )
    .slice(0, limit);
}

function calculatePaymentSplit(
  sales,
  date,
) {
  const split = {
    cash: 0,
    qr: 0,
  };

  for (const sale of sales) {
    if (sale.date !== date) {
      continue;
    }

    const key =
      sale.paymentMethod === 'qr'
        ? 'qr'
        : 'cash';

    split[key] +=
      Number(sale.total) || 0;
  }

  return {
    cash: round2(split.cash),
    qr: round2(split.qr),
  };
}

/**
 * Returns the numbers behind the daily summary, NOT a sentence — the
 * wording and currency formatting are the view's job, so the text can
 * follow the language picker. See `dashboard.summary*` in the locales.
 */
function createDailySummary({
  date,
  sales,
  expenses,
  topItem,
  totalSales,
  netProfit,
}) {
  const daySales = sales.filter(
    (sale) => sale.date === date,
  );

  if (daySales.length === 0) {
    return { hasSales: false };
  }

  const expenseTotal = expenses
    .filter(
      (expense) =>
        expense.date === date,
    )
    .reduce(
      (sum, expense) =>
        sum +
        (Number(expense.amount) || 0),
      0,
    );

  return {
    hasSales: true,
    totalSales,
    transactionCount: daySales.length,
    netProfit,
    topItem: topItem
      ? {
          name: topItem.name,
          quantity: topItem.quantity,
        }
      : null,
    expenseTotal,
  };
}

/**
 * Rule-based tip as `{ type, ...params }` rather than prose, so the view
 * can translate it and style it off `type` instead of sniffing the text
 * for a warning emoji. See `dashboard.insight*` in the locales.
 */
function createInsight({
  sales,
  week,
  topItem,
}) {
  const today = todayISO();

  const todaySales = sales.filter(
    (sale) => sale.date === today,
  );

  const scope =
    todaySales.length > 0
      ? todaySales
      : sales.filter((sale) =>
          week.includes(sale.date),
        );

  const productTotals = new Map();

  for (const sale of scope) {
    const key =
      sale.productId ??
      sale.productName;

    const current =
      productTotals.get(key) ?? {
        name:
          sale.productName ??
          'Produk tidak dikenali',
        quantity: 0,
        revenue: 0,
        cost: 0,
      };

    current.quantity +=
      Number(sale.quantity) || 0;

    current.revenue +=
      Number(sale.total) || 0;

    current.cost +=
      Number(sale.totalCost) || 0;

    productTotals.set(key, current);
  }

  for (const item of productTotals.values()) {
    if (item.quantity <= 0) {
      continue;
    }

    const averagePrice =
      item.revenue /
      item.quantity;

    const averageCost =
      item.cost /
      item.quantity;

    if (averagePrice < averageCost) {
      return {
        type: 'belowCost',
        name: item.name,
        averagePrice,
        averageCost,
      };
    }
  }

  if (topItem) {
    return {
      type: 'topSeller',
      name: topItem.name,
      quantity: topItem.quantity,
    };
  }

  return null;
}

export async function getDashboardData(
  dailyTarget = 200,
) {
  const today = todayISO();
  const week = lastNDates(7);

  // Everything on the dashboard is derived from the last 7 days — scope
  // the queries to that window instead of downloading the whole ledger.
  // lastNDates is oldest-first, so week[0] is the window start.
  const [sales, expenses, products] =
    await Promise.all([
      getSales({
        fromDate: week[0],
      }),
      getExpenses({
        fromDate: week[0],
      }),
      getProducts(),
    ]);

  const todaySales = sales.filter(
    (sale) => sale.date === today,
  );

  const todayExpenses =
    expenses.filter(
      (expense) =>
        expense.date === today,
    );

  const todayTotal =
    todaySales.reduce(
      (sum, sale) =>
        sum +
        (Number(sale.total) || 0),
      0,
    );

  const todayGrossProfit =
    todaySales.reduce(
      (sum, sale) =>
        sum +
        (Number(
          sale.grossProfit,
        ) || 0),
      0,
    );

  const todayExpenseTotal =
    todayExpenses.reduce(
      (sum, expense) =>
        sum +
        (Number(
          expense.amount,
        ) || 0),
      0,
    );

  const todayProfit = round2(
    todayGrossProfit -
      todayExpenseTotal,
  );

  const sevenDayTrend =
    week.map((date) => ({
      date,
      total: round2(
        sales
          .filter(
            (sale) =>
              sale.date === date,
          )
          .reduce(
            (sum, sale) =>
              sum +
              (Number(
                sale.total,
              ) || 0),
            0,
          ),
      ),
    }));

  const topItems =
    calculateTopItems(
      sales,
      week,
      3,
    );

  const [todayTopItem] =
    calculateTopItems(
      sales,
      [today],
      1,
    );

  const split =
    calculatePaymentSplit(
      sales,
      today,
    );

  // Deliberately uncapped. Clamping at 1 hid the best news the app has to
  // report — a 140% day rendered as a flat "100%". The progress *bar* still
  // clamps its width; the number tells the truth.
  const targetProgress =
    dailyTarget > 0
      ? round2(
          todayTotal / dailyTarget,
        )
      : 0;

  // The low-stock threshold was stored, edited, and displayed but never
  // compared against anything — so a vendor could sell out and still read
  // "Stok: 12". This is that comparison.
  const lowStockItems = products
    .filter(
      (product) =>
        product.currentStock <=
        product.lowStockThreshold,
    )
    .sort(
      (first, second) =>
        first.currentStock -
        second.currentStock,
    );

  const summary =
    createDailySummary({
      date: today,
      sales,
      expenses,
      topItem: todayTopItem,
      totalSales: round2(todayTotal),
      netProfit: todayProfit,
    });

  const insight =
    createInsight({
      sales,
      week,
      topItem: topItems[0],
    });

  return {
    stats: {
      todayTotal:
        round2(todayTotal),
      todaySpend: round2(
        todayExpenseTotal,
      ),
      todayProfit,
      todayExpenseTotal:
        round2(todayExpenseTotal),
      todayTransactionCount:
        todaySales.length,
      sevenDayTrend,
      topItems,
      targetProgress,
    },
    summary,
    insight,
    lowStockItems,
    split,
    dailyTarget,
  };
}

/**
 * Loads the last two calendar weeks using the existing date-scoped queries.
 * No schema changes are required: all insight values are calculated from
 * current sales, expenses, and active products.
 */
export async function getWeeklyInsights() {
  const fortnight = lastNDates(14);
  const previousWeek = fortnight.slice(0, 7);
  const currentWeek = fortnight.slice(7);

  const [sales, expenses, products] = await Promise.all([
    getSales({
      fromDate: fortnight[0],
      toDate: fortnight[fortnight.length - 1],
    }),
    getExpenses({
      fromDate: fortnight[0],
      toDate: fortnight[fortnight.length - 1],
    }),
    getProducts(),
  ]);

  return createWeeklyInsights({
    sales,
    expenses,
    products,
    currentWeek,
    previousWeek,
  });
}

export async function getTomorrowPreparation() {
  const history = lastNDates(57);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowWeekday = tomorrow.getDay();
  const matchingDates = history.filter((date) =>
    new Date(`${date}T00:00:00`).getDay() === tomorrowWeekday,
  );

  const [sales, products] = await Promise.all([
    getSales({ fromDate: history[0], toDate: history[history.length - 1] }),
    getProducts(),
  ]);

  return {
    ...createTomorrowPreparation({ sales, products, matchingDates }),
    tomorrowDate: tomorrow,
  };
}
