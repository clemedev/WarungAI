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

import { useTranslation } from 'react-i18next';

import ReceiptScanner from '../ReceiptScanner/ReceiptScanner';

import styles from './ExpenseTracker.module.css';

const CATEGORIES = [
  {
    value: 'bahan',
    key: 'scanner.catBahan',
  },
  {
    value: 'gas',
    key: 'scanner.catGas',
  },
  {
    value: 'pembungkusan',
    key: 'scanner.catPembungkusan',
  },
  {
    value: 'sewa',
    key: 'scanner.catSewa',
  },
  {
    value: 'lain',
    key: 'scanner.catLain',
  },
];

/** Locale key for a stored category value, or null if it is unknown. */
function categoryKey(value) {
  return (
    CATEGORIES.find(
      (category) =>
        category.value === value,
    )?.key ?? null
  );
}

export default function ExpenseTracker({
  onChange,
}) {
  const { t } = useTranslation();

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
          : t('expense.loadFailed'),
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
          : t('expense.saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense) {
    const confirmed =
      window.confirm(
        t('expense.confirmDelete', {
          amount: `RM${expense.amount.toFixed(2)}`,
        }),
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
          : t('expense.deleteFailed'),
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
          {t('expense.formTitle')}
        </h3>

        <label className={styles.field}>
          {t('expense.category')}

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
                    t(
                      categoryOption.key,
                    )
                  }
                </option>
              ),
            )}
          </select>
        </label>

        <label className={styles.field}>
          {t('expense.amount')}

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
          {t('expense.note')}

          <input
            type="text"
            placeholder={t(
              'expense.notePlaceholder',
            )}
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
            ? t('expense.saving')
            : t('expense.save')}
        </button>
      </form>

      <p className={styles.todayTotal}>
        {t('expense.todayTotal')}{' '}
        <strong>
          RM{todayTotal.toFixed(2)}
        </strong>
      </p>

      {loading ? (
        <p className={styles.empty}>
          {t('expense.loading')}
        </p>
      ) : recent.length === 0 ? (
        <p className={styles.empty}>
          {t('expense.empty')}
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
                  {categoryKey(
                    expense.category,
                  )
                    ? t(
                        categoryKey(
                          expense.category,
                        ),
                      )
                    : expense.category}

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
                aria-label={t(
                  'expense.deleteAria',
                  {
                    amount: `RM${expense.amount.toFixed(2)}`,
                  },
                )}
                title={t(
                  'expense.deleteTitle',
                )}
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
