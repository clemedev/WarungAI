import {
  useEffect,
  useState,
} from 'react';

import {
  deleteExpense,
  getExpenses,
  saveExpense,
} from '../../lib/supabaseExpenses.js';

import {
  todayISO,
} from '../../lib/dates.js';

import ReceiptScanner from '../ReceiptScanner/ReceiptScanner';

import styles from './ExpenseTracker.module.css';

const CATEGORIES = [
  {
    value: 'bahan',
    label: 'Bahan mentah (ingredients)',
  },
  {
    value: 'gas',
    label: 'Gas',
  },
  {
    value: 'pembungkusan',
    label: 'Pembungkusan (packaging)',
  },
  {
    value: 'sewa',
    label: 'Sewa / utiliti',
  },
  {
    value: 'lain',
    label: 'Lain-lain',
  },
];

function categoryLabel(value) {
  return (
    CATEGORIES.find(
      (category) =>
        category.value === value,
    )?.label ?? value
  );
}

export default function ExpenseTracker({
  onChange,
}) {
  const [expenses, setExpenses] =
    useState([]);

  const [category, setCategory] =
    useState('bahan');

  const [amount, setAmount] =
    useState('');

  const [note, setNote] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const today = todayISO();

  const numericAmount =
    Number(amount);

  const canSave =
    Number.isFinite(numericAmount) &&
    numericAmount > 0;

  async function loadExpenses() {
    setLoading(true);
    setError('');

    try {
      const nextExpenses =
        await getExpenses();

      setExpenses(nextExpenses);
      onChange?.(nextExpenses);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Gagal mendapatkan perbelanjaan.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSave || saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await saveExpense({
        date: today,
        category,
        amount: numericAmount,
        note: note.trim(),
      });

      setAmount('');
      setNote('');

      await loadExpenses();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Gagal menyimpan perbelanjaan.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense) {
    const confirmed =
      window.confirm(
        `Padam perbelanjaan RM${expense.amount.toFixed(2)}?`,
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await deleteExpense(expense.id);
      await loadExpenses();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Gagal memadam perbelanjaan.',
      );
    } finally {
      setSaving(false);
    }
  }

  const recent = [...expenses]
    .sort((first, second) => {
      const dateComparison =
        second.date.localeCompare(
          first.date,
        );

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return String(
        second.createdAt ?? '',
      ).localeCompare(
        String(first.createdAt ?? ''),
      );
    })
    .slice(0, 20);

  const todayTotal = expenses
    .filter(
      (expense) =>
        expense.date === today,
    )
    .reduce(
      (sum, expense) =>
        sum + expense.amount,
      0,
    );

  return (
    <div className={styles.wrap}>
      {/* Supplier receipts are expenses — the scanner lives here and
          refreshes the ledger below after each save. */}
      <div className={styles.scanCard}>
        <ReceiptScanner
          onSaved={loadExpenses}
        />
      </div>

      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <h3 className={styles.title}>
          Tambah perbelanjaan hari ini
        </h3>

        <label className={styles.field}>
          Kategori

          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value,
              )
            }
            disabled={saving}
          >
            {CATEGORIES.map(
              (categoryOption) => (
                <option
                  key={
                    categoryOption.value
                  }
                  value={
                    categoryOption.value
                  }
                >
                  {
                    categoryOption.label
                  }
                </option>
              ),
            )}
          </select>
        </label>

        <label className={styles.field}>
          Jumlah (RM)

          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="20.00"
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target.value,
              )
            }
            disabled={saving}
            required
          />
        </label>

        <label className={styles.field}>
          Nota (pilihan)

          <input
            type="text"
            placeholder="cth: tong gas baru"
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
            disabled={saving}
          />
        </label>

        {error && (
          <p className={styles.empty}>
            {error}
          </p>
        )}

        <button
          className={styles.save}
          type="submit"
          disabled={
            !canSave || saving
          }
        >
          {saving
            ? 'Menyimpan...'
            : '+ Simpan perbelanjaan'}
        </button>
      </form>

      <p className={styles.todayTotal}>
        Perbelanjaan hari ini:{' '}
        <strong>
          RM{todayTotal.toFixed(2)}
        </strong>
      </p>

      {loading ? (
        <p className={styles.empty}>
          Memuatkan perbelanjaan...
        </p>
      ) : recent.length === 0 ? (
        <p className={styles.empty}>
          Tiada perbelanjaan direkod
          lagi.
        </p>
      ) : (
        <ul className={styles.list}>
          {recent.map((expense) => (
            <li
              key={expense.id}
              className={styles.item}
            >
              <div
                className={
                  styles.itemInfo
                }
              >
                <strong>
                  RM
                  {expense.amount.toFixed(
                    2,
                  )}
                </strong>

                <span
                  className={styles.meta}
                >
                  {categoryLabel(
                    expense.category,
                  )}

                  {expense.note
                    ? ` — ${expense.note}`
                    : ''}

                  {expense.date !== today
                    ? ` · ${expense.date}`
                    : ''}
                </span>
              </div>

              <button
                type="button"
                className={styles.delete}
                onClick={() =>
                  handleDelete(expense)
                }
                disabled={saving}
                aria-label={`Padam perbelanjaan RM${expense.amount.toFixed(2)}`}
                title="Padam perbelanjaan"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
