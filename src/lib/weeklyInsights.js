function round2(value) {
  return Math.round(
    (Number(value) + Number.EPSILON) * 100,
  ) / 100;
}

function sum(values) {
  return values.reduce(
    (total, value) => total + (Number(value) || 0),
    0,
  );
}

function calculatePeriod(sales, expenses, dates) {
  const dateSet = new Set(dates);
  const periodSales = sales.filter((sale) => dateSet.has(sale.date));
  const periodExpenses = expenses.filter((expense) => dateSet.has(expense.date));
  const revenue = sum(periodSales.map((sale) => sale.total));
  const grossProfit = sum(
    periodSales.map((sale) => sale.grossProfit),
  );
  const expenseTotal = sum(
    periodExpenses.map((expense) => expense.amount),
  );
  const netProfit = round2(grossProfit - expenseTotal);

  return {
    sales: periodSales,
    expenses: periodExpenses,
    revenue: round2(revenue),
    grossProfit: round2(grossProfit),
    expenseTotal: round2(expenseTotal),
    netProfit,
    margin: revenue > 0
      ? round2((netProfit / revenue) * 100)
      : null,
  };
}

function createBusinessStory({ current, previous, largestExpense }) {
  const revenueChange = round2(current.revenue - previous.revenue);
  const profitChange = round2(current.netProfit - previous.netProfit);

  if (
    previous.revenue > 0 &&
    revenueChange > 0 &&
    profitChange <= 0 &&
    largestExpense
  ) {
    return {
      type: 'salesUpExpenses',
      revenueChange,
      profitChange,
      expenseCategory: largestExpense.category || 'lain',
      expenseAmount: Number(largestExpense.amount) || 0,
    };
  }

  if (previous.revenue > 0 && profitChange > 0) {
    return { type: 'profitUp', profitChange };
  }

  if (previous.revenue > 0 && revenueChange < 0) {
    return { type: 'salesDown', revenueChange: Math.abs(revenueChange) };
  }

  if (current.expenseTotal > current.grossProfit && current.expenseTotal > 0) {
    return { type: 'expensesHigh', expenseAmount: current.expenseTotal };
  }

  return { type: 'steady' };
}

/**
 * Derive weekly business insight data only. The UI owns all wording so the
 * result works in every language and remains straightforward to test.
 */
export function createWeeklyInsights({
  sales,
  expenses,
  products,
  currentWeek,
  previousWeek,
}) {
  const current = calculatePeriod(
    sales,
    expenses,
    currentWeek,
  );

  const previous = calculatePeriod(
    sales,
    expenses,
    previousWeek,
  );

  const byProduct = new Map(
    products.map((product) => [
      product.id,
      {
        productId: product.id,
        name: product.name,
        quantity: 0,
        revenue: 0,
      },
    ]),
  );

  for (const sale of current.sales) {
    const key = sale.productId ?? sale.productName;
    const item = byProduct.get(key) ?? {
      productId: sale.productId ?? null,
      name: sale.productName ?? 'Unknown product',
      quantity: 0,
      revenue: 0,
    };

    item.quantity += Number(sale.quantity) || 0;
    item.revenue += Number(sale.total) || 0;
    byProduct.set(key, item);
  }

  const productsWithSales = [...byProduct.values()].map((item) => ({
    ...item,
    revenue: round2(item.revenue),
  }));

  const lowStockItems = products
    .filter((product) =>
      Number(product.currentStock) <= Number(product.lowStockThreshold),
    )
    .sort((first, second) =>
      Number(first.currentStock) - Number(second.currentStock),
    );

  const productProfitability = new Map();
  for (const sale of current.sales) {
    const key = sale.productId ?? sale.productName;
    const item = productProfitability.get(key) ?? {
      productId: sale.productId ?? null,
      name: sale.productName ?? 'Unknown product',
      quantity: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    };

    const revenue = Number(sale.total) || 0;
    const profit = Number.isFinite(Number(sale.grossProfit))
      ? Number(sale.grossProfit)
      : revenue - (Number(sale.totalCost) || 0);
    const reportedCost = Number(sale.totalCost);
    const cost = sale.totalCost !== null &&
      sale.totalCost !== undefined &&
      Number.isFinite(reportedCost)
      ? reportedCost
      : revenue - profit;

    item.quantity += Number(sale.quantity) || 0;
    item.revenue += revenue;
    item.cost += cost;
    item.profit += profit;
    productProfitability.set(key, item);
  }

  const profitLeaks = [...productProfitability.values()]
    .filter((item) => item.quantity > 0 && item.revenue > 0)
    .map((item) => {
      const margin = round2((item.profit / item.revenue) * 100);
      const averagePrice = round2(item.revenue / item.quantity);
      const averageCost = round2(item.cost / item.quantity);

      return {
        ...item,
        revenue: round2(item.revenue),
        cost: round2(item.cost),
        profit: round2(item.profit),
        margin,
        averagePrice,
        averageCost,
        type: item.profit < 0 ? 'belowCost' : 'lowMargin',
      };
    })
    .filter((item) => item.type === 'belowCost' || item.margin <= 15)
    .sort((first, second) => {
      if (first.type !== second.type) {
        return first.type === 'belowCost' ? -1 : 1;
      }

      if (first.margin !== second.margin) {
        return first.margin - second.margin;
      }

      return second.revenue - first.revenue;
    })
    .slice(0, 3);

  const byCategory = new Map();
  for (const expense of current.expenses) {
    const category = expense.category || 'lain';
    byCategory.set(
      category,
      round2(
        (byCategory.get(category) || 0) +
          (Number(expense.amount) || 0),
      ),
    );
  }

  const expenseBreakdown = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((first, second) => second.amount - first.amount);

  const dailyProfitTrend = currentWeek.map((date) => {
    const daySales = current.sales.filter((sale) => sale.date === date);
    const dayExpenses = current.expenses.filter(
      (expense) => expense.date === date,
    );

    return {
      date,
      profit: round2(
        sum(daySales.map((sale) => sale.grossProfit)) -
          sum(dayExpenses.map((expense) => expense.amount)),
      ),
    };
  });

  const paymentSplit = current.sales.reduce(
    (split, sale) => {
      const method = sale.paymentMethod === 'qr' ? 'qr' : 'cash';
      split[method] += Number(sale.total) || 0;
      return split;
    },
    { cash: 0, qr: 0 },
  );

  const largestExpense = current.expenses
    .slice()
    .sort(
      (first, second) =>
        (Number(second.amount) || 0) -
        (Number(first.amount) || 0),
    )[0] ?? null;

  const businessStory = createBusinessStory({
    current,
    previous,
    largestExpense,
  });

  return {
    current: {
      ...current,
      topProducts: [...productsWithSales]
        .sort((first, second) => second.revenue - first.revenue)
        .slice(0, 3),
      slowMovers: [...productsWithSales]
        .sort((first, second) => {
          if (first.revenue !== second.revenue) {
            return first.revenue - second.revenue;
          }

          return first.quantity - second.quantity;
        })
        .slice(0, 3),
      expenseBreakdown,
      largestExpense,
      businessStory,
      dailyProfitTrend,
      paymentSplit: {
        cash: round2(paymentSplit.cash),
        qr: round2(paymentSplit.qr),
      },
      profitLeaks,
      lowStockItems,
    },
    previous: {
      revenue: previous.revenue,
      netProfit: previous.netProfit,
      margin: previous.margin,
    },
    marginDelta:
      current.margin !== null && previous.margin !== null
        ? round2(current.margin - previous.margin)
        : null,
  };
}
