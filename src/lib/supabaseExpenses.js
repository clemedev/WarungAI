import { supabase } from './supabase.js';

const VALID_CATEGORIES = [
  'bahan',
  'gas',
  'pembungkusan',
  'sewa',
  'lain',
];

function mapExpense(row) {
  return {
    id: row.id,
    date: row.expense_date,
    category: row.category,
    amount: Number(row.amount),
    note: row.note ?? '',
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(
      'Sesi pengguna tidak sah. Sila log masuk semula.',
    );
  }

  return user;
}

/**
 * Fetch expenses, optionally scoped to a date window (YYYY-MM-DD,
 * inclusive) — same contract as getSales.
 */
export async function getExpenses({
  fromDate,
  toDate,
} = {}) {
  await requireUser();

  let query = supabase
    .from('expenses')
    .select('*');

  if (fromDate) {
    query = query.gte(
      'expense_date',
      fromDate,
    );
  }

  if (toDate) {
    query = query.lte(
      'expense_date',
      toDate,
    );
  }

  const { data, error } = await query
    .order('expense_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Gagal mendapatkan perbelanjaan: ${error.message}`,
    );
  }

  return (data ?? []).map(mapExpense);
}

export async function saveExpense(expense) {
  const user = await requireUser();

  const category = String(
    expense?.category ?? '',
  ).trim();

  // The expenses table accepts 'manual' and 'receipt' (BACKEND.md,
  // "Supported sources"); receipt-scanned expenses pass the latter.
  const source =
    expense?.source === 'receipt'
      ? 'receipt'
      : 'manual';

  const amount = Number(
    expense?.amount,
  );

  const note = String(
    expense?.note ?? '',
  ).trim();

  const date = String(
    expense?.date ?? '',
  ).trim();

  if (
    !VALID_CATEGORIES.includes(category)
  ) {
    throw new Error(
      'Kategori perbelanjaan tidak sah.',
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      'Jumlah perbelanjaan mesti melebihi sifar.',
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    throw new Error(
      'Tarikh perbelanjaan tidak sah.',
    );
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      category,
      amount,
      note: note || null,
      expense_date: date,
      source,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Gagal menyimpan perbelanjaan: ${error.message}`,
    );
  }

  return mapExpense(data);
}

export async function deleteExpense(id) {
  await requireUser();

  if (!id) {
    throw new Error(
      'ID perbelanjaan diperlukan.',
    );
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(
      `Gagal memadam perbelanjaan: ${error.message}`,
    );
  }
}
