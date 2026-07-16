import {
  useEffect,
  useState,
} from 'react';

import {
  deleteSale,
  getSales,
} from '../../lib/supabaseSales.js';

import {
  todayISO,
} from '../../lib/dates.js';

import styles from './SalesList.module.css';

const SOURCE_LABEL = {
  manual: '✍️ Manual',
  chat: '💬 Taip',
  voice: '🎤 Suara',
  ocr: '📷 Resit',
  receipt: '📷 Resit',
};

export default function SalesList({
  refreshKey,
  onChange,
}) {
  const [sales, setSales] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [deletingId, setDeletingId] =
    useState(null);

  const [error, setError] =
    useState('');

  const today = todayISO();

  async function loadSales() {
    setLoading(true);
    setError('');

    try {
      const nextSales =
        await getSales();

      setSales(nextSales);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Gagal mendapatkan sejarah jualan.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, [refreshKey]);

  async function handleDelete(sale) {
    const confirmed =
      window.confirm(
        `Padam jualan ${sale.productName}?`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(sale.id);
    setError('');

    try {
      await deleteSale(sale.id);
      await loadSales();
      onChange?.();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Gagal memadam jualan.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>
          Sejarah jualan
        </h3>

        <p className={styles.empty}>
          Memuatkan jualan...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>
        Sejarah jualan
      </h3>

      {error && (
        <p className={styles.empty}>
          {error}
        </p>
      )}

      {sales.length === 0 ? (
        <p className={styles.empty}>
          Tiada jualan direkod lagi.
        </p>
      ) : (
        <ul className={styles.list}>
          {sales
            .slice(0, 50)
            .map((sale) => (
              <li
                key={sale.id}
                className={styles.item}
              >
                <div
                  className={
                    styles.itemInfo
                  }
                >
                  <strong>
                    {sale.quantity} ×{' '}
                    {sale.productName}
                  </strong>

                  <span
                    className={styles.meta}
                  >
                    RM
                    {sale.total.toFixed(2)}
                    {' · '}
                    {SOURCE_LABEL[
                      sale.source
                    ] ?? sale.source}

                    {' · '}
                    {sale.paymentMethod ===
                    'qr'
                      ? 'QR'
                      : 'Tunai'}

                    {sale.date !== today
                      ? ` · ${sale.date}`
                      : ''}
                  </span>

                  <span
                    className={styles.meta}
                  >
                    Kos RM
                    {sale.totalCost.toFixed(
                      2,
                    )}
                    {' · '}
                    Untung RM
                    {sale.grossProfit.toFixed(
                      2,
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.delete}
                  onClick={() =>
                    handleDelete(sale)
                  }
                  disabled={
                    deletingId === sale.id
                  }
                  aria-label={`Padam jualan ${sale.productName}`}
                  title="Padam jualan"
                >
                  {deletingId === sale.id
                    ? '...'
                    : '🗑️'}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
