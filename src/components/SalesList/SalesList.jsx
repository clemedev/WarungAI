import { useState } from 'react';
import { getSales, deleteSale } from '../../lib/storage';
import { todayISO } from '../../lib/dates';
import styles from './SalesList.module.css';

const SOURCE_LABEL = {
  chat: '💬 Taip',
  voice: '🎤 Suara',
  ocr: '📷 Resit',
};

/**
 * Full sales history, newest first — reads directly from storage so it
 * survives refresh and shows entries from every source (chat/voice/OCR),
 * not just what was saved this session.
 */
export default function SalesList({ products, refreshKey, onChange }) {
  const [sales, setSales] = useState(getSales);

  // re-read from storage whenever the parent bumps refreshKey (after a save)
  const [lastKey, setLastKey] = useState(refreshKey);
  if (refreshKey !== lastKey) {
    setLastKey(refreshKey);
    setSales(getSales());
  }

  function productName(id) {
    return products.find((p) => p.id === id)?.name ?? 'Produk dipadam';
  }

  function handleDelete(sale) {
    if (!window.confirm(`Padam jualan ${productName(sale.productId)}?`)) return;
    deleteSale(sale.id);
    setSales(getSales());
    onChange?.();
  }

  const today = todayISO();
  // newest first: sort by date desc, keep insertion order within a day (reversed)
  const sorted = [...sales].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>Sejarah jualan (sales history)</h3>
        <p className={styles.empty}>Tiada jualan direkod lagi.</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Sejarah jualan (sales history)</h3>
      <ul className={styles.list}>
        {sorted.slice(0, 50).map((s) => (
          <li key={s.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <strong>
                {s.quantity} × {productName(s.productId)}
              </strong>
              <span className={styles.meta}>
                RM{Number(s.total).toFixed(2)} · {SOURCE_LABEL[s.source] ?? s.source}
                {s.paymentMethod ? ` · ${s.paymentMethod === 'qr' ? 'QR' : 'Tunai'}` : ''}
                {s.date !== today ? ` · ${s.date}` : ''}
              </span>
            </div>
            <button className={styles.delete} onClick={() => handleDelete(s)}>
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
