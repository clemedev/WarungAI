// storage.js — all localStorage CRUD (BACKEND.md §2).
//
// Rule for everyone: NEVER touch localStorage directly from a component.
// Always go through these functions — this is what keeps the Firebase
// migration in BACKEND.md §6 possible later.
//
// Every key is namespaced by the signed-in vendor (auth.js), so each
// vendor on a device has fully separate products/sales/expenses/settings.
// The UI only renders behind the login gate, so reads while signed out
// just return empty defaults.

import { getCurrentUserId } from './auth.js';

const DEFAULT_SETTINGS = {
  dailyTarget: 200, // RM sales target per day, editable on the dashboard
};

const KEYS = {
  products: 'products',
  sales: 'sales',
  expenses: 'expenses',
  settings: 'settings',
};

function userKey(base) {
  const uid = getCurrentUserId();
  return uid ? `warungai.${uid}.${base}` : null;
}

function readList(base) {
  const key = userKey(base);
  if (!key) return [];
  try {
    return JSON.parse(localStorage.getItem(key)) ?? [];
  } catch {
    return [];
  }
}

function writeList(base, list) {
  const key = userKey(base);
  if (!key) throw new Error('storage: no vendor signed in');
  localStorage.setItem(key, JSON.stringify(list));
}

export function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

// ---- Products ----

export function getProducts() {
  return readList(KEYS.products);
}

export function saveProduct(product) {
  const products = readList(KEYS.products);
  const record = { ...product, id: product.id ?? newId() };
  const i = products.findIndex((p) => p.id === record.id);
  if (i >= 0) products[i] = record;
  else products.push(record);
  writeList(KEYS.products, products);
  return record;
}

export function deleteProduct(id) {
  writeList(KEYS.products, readList(KEYS.products).filter((p) => p.id !== id));
}

// ---- Sales ----

export function getSales() {
  return readList(KEYS.sales);
}

export function saveSale(sale) {
  const sales = readList(KEYS.sales);
  const record = { ...sale, id: sale.id ?? newId() };
  sales.push(record);
  writeList(KEYS.sales, sales);
  return record;
}

export function deleteSale(id) {
  writeList(KEYS.sales, readList(KEYS.sales).filter((s) => s.id !== id));
}

// ---- Expenses ----

export function getExpenses() {
  return readList(KEYS.expenses);
}

export function saveExpense(expense) {
  const expenses = readList(KEYS.expenses);
  const record = { ...expense, id: expense.id ?? newId() };
  expenses.push(record);
  writeList(KEYS.expenses, expenses);
  return record;
}

export function deleteExpense(id) {
  writeList(KEYS.expenses, readList(KEYS.expenses).filter((e) => e.id !== id));
}

// ---- Settings ----

export function getSettings() {
  const key = userKey(KEYS.settings);
  if (!key) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(key)) ?? {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(partial) {
  const key = userKey(KEYS.settings);
  if (!key) throw new Error('storage: no vendor signed in');
  const next = { ...getSettings(), ...partial };
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}
