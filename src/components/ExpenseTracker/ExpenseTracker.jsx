import { useState } from 'react';
import { getExpenses, saveExpense, deleteExpense } from '../../lib/storage';
import { todayISO } from '../../lib/dates';
import styles from './ExpenseTracker.module.css';

const CATEGORIES = [
  { value: 'bahan', label: 'Bahan mentah (ingredients)' },
  { value: 'gas', label: 'Gas' },
  { value: 'pembungkusan', label: 'Pembungkusan (packaging)' },
  { value: 'sewa', label: 'Sewa / utiliti' },
  { value: 'lain', label: 'Lain-lain' },
];

function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/** Daily expense logging — category, amount, optional note. */
export default function ExpenseTracker({ onChange }) {
  const [expenses, setExpenses] = useState(getExpenses);
  const [category, setCategory] = useState('bahan');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const canSave = Number(amount) > 0;
  const today = todayISO();

  function refresh() {
    setExpenses(getExpenses());
    onChange?.();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSave) return;
    saveExpense({
      date: today,
      category,
      amount: Number(amount),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setAmount('');
    setNote('');
    refresh();
  }

  function handleDelete(exp) {
    if (!window.confirm(`Padam perbelanjaan RM${exp.amount.toFixed(2)}?`)) return;
    deleteExpense(exp.id);
    refresh();
  }

  // newest first, today's expenses highlighted
  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  const todayTotal = expenses
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h3 className={styles.title}>Tambah perbelanjaan hari ini</h3>
        <label className={styles.field}>
          Kategori
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Jumlah (RM)
          <input
            type="number"
            min="0"
            step="0.10"
            placeholder="20.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Nota (pilihan)
          <input
            type="text"
            placeholder="cth: tong gas baru"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button className={styles.save} type="submit" disabled={!canSave}>
          + Simpan perbelanjaan
        </button>
      </form>

      <p className={styles.todayTotal}>
        Perbelanjaan hari ini: <strong>RM{todayTotal.toFixed(2)}</strong>
      </p>

      {recent.length === 0 ? (
        <p className={styles.empty}>Tiada perbelanjaan direkod lagi.</p>
      ) : (
        <ul className={styles.list}>
          {recent.map((exp) => (
            <li key={exp.id} className={styles.item}>
              <div className={styles.itemInfo}>
                <strong>RM{exp.amount.toFixed(2)}</strong>
                <span className={styles.meta}>
                  {categoryLabel(exp.category)}
                  {exp.note ? ` — ${exp.note}` : ''}
                  {exp.date !== today ? ` · ${exp.date}` : ''}
                </span>
              </div>
              <button className={styles.delete} onClick={() => handleDelete(exp)}>
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
