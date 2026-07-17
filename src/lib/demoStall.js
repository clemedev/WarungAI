import { lastNDates, todayISO } from './dates.js';

const MODE_KEY = 'warungai.demo-stall.enabled';
const DATA_KEY = 'warungai.demo-stall.data';

const products = [
  { id: 'demo-nasi', name: 'Nasi Lemak', sellPrice: 5, costPrice: 2.7, currentStock: 8, lowStockThreshold: 10, isActive: true },
  { id: 'demo-mee', name: 'Mee Goreng', sellPrice: 6.5, costPrice: 4.1, currentStock: 15, lowStockThreshold: 8, isActive: true },
  { id: 'demo-roti', name: 'Roti Canai', sellPrice: 2.2, costPrice: 1.25, currentStock: 4, lowStockThreshold: 6, isActive: true },
  { id: 'demo-burger', name: 'Burger Daging', sellPrice: 7, costPrice: 4.25, currentStock: 13, lowStockThreshold: 8, isActive: true },
  { id: 'demo-sandwich', name: 'Fried Chicken Sandwich', sellPrice: 8.5, costPrice: 5.2, currentStock: 11, lowStockThreshold: 6, isActive: true },
  { id: 'demo-teh', name: 'Teh Tarik', sellPrice: 3, costPrice: 1.1, currentStock: 24, lowStockThreshold: 8, isActive: true },
  { id: 'demo-kopi', name: 'Kopi O', sellPrice: 2.5, costPrice: 1.35, currentStock: 18, lowStockThreshold: 7, isActive: true },
  { id: 'demo-100plus', name: '100PLUS', sellPrice: 3.5, costPrice: 2.1, currentStock: 6, lowStockThreshold: 8, isActive: true },
  { id: 'demo-sirap', name: 'Sirap Limau', sellPrice: 3, costPrice: 0.85, currentStock: 26, lowStockThreshold: 8, isActive: true },
];

function makeSale(id, date, product, quantity, paymentMethod = 'cash', price = product.sellPrice) {
  const total = quantity * price;
  const totalCost = quantity * product.costPrice;
  return { id, date, productId: product.id, productName: product.name, quantity, unitPrice: price, unitCost: product.costPrice, total, totalCost, grossProfit: total - totalCost, paymentMethod, source: 'manual', createdAt: `${date}T09:00:00` };
}

function createData() {
  const dates = lastNDates(35);
  const sales = [];
  dates.forEach((date, index) => {
    const weekday = new Date(`${date}T00:00:00`).getDay();
    const weekendBoost = weekday === 5 || weekday === 6 ? 7 : 0;
    const fridayBoost = weekday === 5 ? 4 : 0;
    sales.push(makeSale(`demo-nasi-${date}`, date, products[0], 9 + (index % 6) + weekendBoost, index % 3 ? 'cash' : 'qr'));
    sales.push(makeSale(`demo-teh-${date}`, date, products[5], 11 + (index % 7) + weekendBoost, index % 2 ? 'qr' : 'cash'));
    sales.push(makeSale(`demo-kopi-${date}`, date, products[6], 5 + ((index * 2) % 5), 'cash'));
    sales.push(makeSale(`demo-sirap-${date}`, date, products[8], 3 + (index % 4) + fridayBoost, 'qr'));
    if (index % 2 === 0) sales.push(makeSale(`demo-mee-${date}`, date, products[1], 4 + (index % 5) + weekendBoost, 'cash'));
    if (index % 3 !== 1) sales.push(makeSale(`demo-burger-${date}`, date, products[3], 2 + (index % 4) + fridayBoost, 'qr'));
    if (weekday === 5 || weekday === 6) sales.push(makeSale(`demo-sandwich-${date}`, date, products[4], 3 + (index % 4), 'cash'));
    if (index % 4 === 0) sales.push(makeSale(`demo-100plus-${date}`, date, products[7], 2 + (index % 3), 'qr'));
  });
  const today = todayISO();
  sales.push(makeSale('demo-roti-today', today, products[2], 4, 'cash'));
  return {
    products: products.map((item) => ({ ...item })),
    sales,
    expenses: [
      { id: 'demo-gas', date: today, category: 'gas', amount: 42, note: 'Gas cylinder', source: 'manual' },
      { id: 'demo-ingredients-1', date: dates[dates.length - 2], category: 'bahan', amount: 86, note: 'Fresh ingredients', source: 'manual' },
      { id: 'demo-packaging-1', date: dates[dates.length - 5], category: 'pembungkusan', amount: 24, note: 'Food containers', source: 'manual' },
      { id: 'demo-ingredients-2', date: dates[dates.length - 9], category: 'bahan', amount: 74, note: 'Morning market supplies', source: 'receipt' },
      { id: 'demo-rent', date: dates[dates.length - 15], category: 'sewa', amount: 120, note: 'Stall utilities', source: 'manual' },
      { id: 'demo-packaging-2', date: dates[dates.length - 21], category: 'pembungkusan', amount: 19, note: 'Takeaway packaging', source: 'manual' },
    ],
  };
}

function readData() {
  try { return JSON.parse(localStorage.getItem(DATA_KEY)) ?? createData(); } catch { return createData(); }
}
function writeData(data) { localStorage.setItem(DATA_KEY, JSON.stringify(data)); }

export function isDemoStallEnabled() { return localStorage.getItem(MODE_KEY) === 'true'; }
export function startDemoStall() { writeData(createData()); localStorage.setItem(MODE_KEY, 'true'); }
export function clearDemoStall() { localStorage.removeItem(MODE_KEY); localStorage.removeItem(DATA_KEY); }
export function getDemoProducts() { return readData().products.filter((item) => item.isActive); }
export function getDemoSales({ fromDate, toDate } = {}) { return readData().sales.filter((sale) => (!fromDate || sale.date >= fromDate) && (!toDate || sale.date <= toDate)); }
export function getDemoExpenses({ fromDate, toDate } = {}) { return readData().expenses.filter((expense) => (!fromDate || expense.date >= fromDate) && (!toDate || expense.date <= toDate)); }

export function saveDemoSale(sale) {
  const data = readData(); const product = data.products.find((item) => item.id === sale.productId);
  if (!product) throw new Error('Produk demo tidak ditemui.');
  const quantity = Number(sale.quantity); const total = Number(sale.total);
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > product.currentStock) {
    throw new Error(`Stok ${product.name} tidak mencukupi.`);
  }
  const record = makeSale(`demo-sale-${Date.now()}`, sale.date ?? todayISO(), product, quantity, sale.paymentMethod, total / quantity);
  data.sales.unshift(record); product.currentStock = Math.max(0, product.currentStock - quantity); writeData(data); return record;
}
export function saveDemoExpense(expense) { const data = readData(); const record = { ...expense, id: `demo-expense-${Date.now()}`, amount: Number(expense.amount), date: expense.date ?? todayISO() }; data.expenses.unshift(record); writeData(data); return record; }
export function deleteDemoSale(id) {
  const data = readData();
  const sale = data.sales.find((item) => item.id === id);
  if (sale) {
    const product = data.products.find((item) => item.id === sale.productId);
    if (product) product.currentStock += Number(sale.quantity) || 0;
  }
  data.sales = data.sales.filter((item) => item.id !== id);
  writeData(data);
}
export function deleteDemoExpense(id) { const data = readData(); data.expenses = data.expenses.filter((item) => item.id !== id); writeData(data); }
export function saveDemoProduct(product) { const data = readData(); const index = data.products.findIndex((item) => item.id === product.id); const record = { ...product, id: product.id ?? `demo-product-${Date.now()}`, isActive: true }; if (index >= 0) data.products[index] = record; else data.products.push(record); writeData(data); return record; }
export function archiveDemoProduct(id) { const data = readData(); const product = data.products.find((item) => item.id === id); if (product) product.isActive = false; writeData(data); }
export function adjustDemoStock(id, delta) { const data = readData(); const product = data.products.find((item) => item.id === id); if (!product) return null; product.currentStock = Math.max(0, product.currentStock + Number(delta)); writeData(data); return product.currentStock; }
