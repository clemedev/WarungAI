// insights.js — calculations & rule-based insight generators (BACKEND.md §2).
// Pure reads: everything derives from storage.js on each call, so the
// dashboard just re-calls these after any save.

import { getProducts, getSales, getExpenses, getSettings } from './storage.js';
import { todayISO, lastNDates } from './dates.js';

function round2(n) {
  return Math.round(n * 100) / 100;
}

function fmtRM(n) {
  return `RM${round2(n).toFixed(2)}`;
}

function productMap() {
  return new Map(getProducts().map((p) => [p.id, p]));
}

/**
 * @param {string} [date] local ISO date, defaults to today
 * @returns {{ totalSales: number, totalCost: number, profit: number }}
 * totalCost = cost of goods sold (costPrice × qty) + that day's expenses.
 */
export function calculateProfit(date = todayISO()) {
  const products = productMap();
  const sales = getSales().filter((s) => s.date === date);

  const totalSales = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const costOfGoods = sales.reduce((sum, s) => {
    const p = products.get(s.productId);
    return sum + (p ? p.costPrice * s.quantity : 0);
  }, 0);
  const expenseTotal = getExpenses()
    .filter((e) => e.date === date)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalCost = round2(costOfGoods + expenseTotal);
  return {
    totalSales: round2(totalSales),
    totalCost,
    profit: round2(totalSales - totalCost),
  };
}

/** Top-selling items by quantity over the given dates. */
function topItemsForDates(dates, limit = 3) {
  const dateSet = new Set(dates);
  const products = productMap();
  const byProduct = new Map();

  for (const s of getSales()) {
    if (!dateSet.has(s.date)) continue;
    const prev = byProduct.get(s.productId) ?? 0;
    byProduct.set(s.productId, prev + (Number(s.quantity) || 0));
  }

  return [...byProduct.entries()]
    .map(([productId, quantity]) => ({
      productId,
      name: products.get(productId)?.name ?? 'Produk tidak dikenali',
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

/**
 * @param {string} [date]
 * @returns {string} plain Bahasa Malaysia summary of the day
 */
export function getDailySummary(date = todayISO()) {
  const isToday = date === todayISO();
  const label = isToday ? 'hari ini' : `pada ${date}`;

  const sales = getSales().filter((s) => s.date === date);
  if (sales.length === 0) {
    return `Tiada jualan direkod ${label} lagi.`;
  }

  const { totalSales, profit } = calculateProfit(date);
  const [top] = topItemsForDates([date], 1);
  const expenseTotal = getExpenses()
    .filter((e) => e.date === date)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const parts = [
    `Jualan ${label}: ${fmtRM(totalSales)} (${sales.length} transaksi).`,
    `Untung bersih: ${fmtRM(profit)}.`,
  ];
  if (top) parts.push(`Paling laris: ${top.name} (${top.quantity} unit).`);
  if (expenseTotal > 0) parts.push(`Perbelanjaan: ${fmtRM(expenseTotal)}.`);

  return parts.join(' ');
}

/**
 * One rule-based insight, highest-priority rule wins:
 *   1. an item is selling below cost (today, else last 7 days)
 *   2. today's sales are well above/below the week's average
 *   3. the week's best seller
 * @returns {string|null}
 */
export function getInsightOfTheDay() {
  const products = productMap();
  const allSales = getSales();
  const today = todayISO();
  const week = lastNDates(7);
  const weekSet = new Set(week);

  // 1. below-cost check: average unit price < cost price
  const scope = allSales.some((s) => s.date === today)
    ? allSales.filter((s) => s.date === today)
    : allSales.filter((s) => weekSet.has(s.date));
  const perProduct = new Map();
  for (const s of scope) {
    const agg = perProduct.get(s.productId) ?? { qty: 0, revenue: 0 };
    agg.qty += Number(s.quantity) || 0;
    agg.revenue += Number(s.total) || 0;
    perProduct.set(s.productId, agg);
  }
  for (const [productId, { qty, revenue }] of perProduct) {
    const p = products.get(productId);
    if (!p || qty === 0) continue;
    const avgUnit = revenue / qty;
    if (avgUnit < p.costPrice) {
      return `⚠️ ${p.name} dijual bawah kos — purata ${fmtRM(avgUnit)} seunit berbanding kos ${fmtRM(p.costPrice)}. Semak harga jual anda.`;
    }
  }

  // 2. trend vs the previous 6 days' average
  const todayTotal = allSales
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const prevDays = week.slice(0, 6);
  const prevTotals = prevDays.map((d) =>
    allSales.filter((s) => s.date === d).reduce((sum, s) => sum + (Number(s.total) || 0), 0),
  );
  const activePrev = prevTotals.filter((t) => t > 0);
  if (todayTotal > 0 && activePrev.length >= 2) {
    const avg = activePrev.reduce((a, b) => a + b, 0) / activePrev.length;
    const change = ((todayTotal - avg) / avg) * 100;
    if (change >= 20) {
      return `📈 Jualan hari ini ${fmtRM(todayTotal)} — ${Math.round(change)}% lebih tinggi dari purata minggu ini. Teruskan!`;
    }
    if (change <= -20) {
      return `📉 Jualan hari ini ${fmtRM(todayTotal)} — ${Math.round(Math.abs(change))}% lebih rendah dari purata minggu ini.`;
    }
  }

  // 3. week's best seller
  const [top] = topItemsForDates(week, 1);
  if (top) {
    return `🔥 ${top.name} paling laris minggu ini (${top.quantity} unit). Pastikan stok mencukupi.`;
  }

  return null;
}

/**
 * @returns {import('./types').DashboardStats}
 */
export function getDashboardStats() {
  const week = lastNDates(7);
  const allSales = getSales();
  const { totalSales: todayTotal, profit: todayProfit } = calculateProfit();

  const sevenDayTrend = week.map((date) => ({
    date,
    total: round2(
      allSales
        .filter((s) => s.date === date)
        .reduce((sum, s) => sum + (Number(s.total) || 0), 0),
    ),
  }));

  const { dailyTarget } = getSettings();
  const targetProgress =
    dailyTarget > 0 ? Math.min(1, round2(todayTotal / dailyTarget)) : 0;

  return {
    todayTotal,
    todayProfit,
    sevenDayTrend,
    topItems: topItemsForDates(week, 3),
    targetProgress,
  };
}

/**
 * Cash vs QR split for a day (supporting feature #14).
 * @param {string} [date]
 * @returns {{ cash: number, qr: number }}
 */
export function getPaymentSplit(date = todayISO()) {
  const split = { cash: 0, qr: 0 };
  for (const s of getSales()) {
    if (s.date !== date) continue;
    const key = s.paymentMethod === 'qr' ? 'qr' : 'cash';
    split[key] = round2(split[key] + (Number(s.total) || 0));
  }
  return split;
}

/**
 * @returns {Array<import('./types').Product>} products flagged as low stock
 * Needs a stock-count field on products — post-MVP, kept for the contract.
 */
export function getLowStockAlerts() {
  return [];
}
