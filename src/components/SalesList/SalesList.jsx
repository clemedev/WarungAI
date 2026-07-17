import {
  useEffect,
  useState,
} from 'react';

import { useTranslation } from 'react-i18next';

import {
  deleteSale,
  getSales,
} from '../../lib/supabaseSales.js';

import {
  lastNDates,
  todayISO,
} from '../../lib/dates.js';

import styles from './SalesList.module.css';

/** Maps a stored source value to its locale key. */
const SOURCE_KEY = {
  manual: 'salesList.srcManual',
  chat: 'salesList.srcChat',
  voice: 'salesList.srcVoice',
  ocr: 'salesList.srcReceipt',
  receipt: 'salesList.srcReceipt',
};

/** Date-window presets; fromDate undefined = the whole ledger. */
const RANGES = [
  {
    id: 'today',
    labelKey: 'salesList.rangeToday',
    fromDate: () => todayISO(),
  },
  {
    id: 'week',
    labelKey: 'salesList.rangeWeek',
    fromDate: () => lastNDates(7)[0],
  },
  {
    id: 'all',
    labelKey: 'salesList.rangeAll',
    fromDate: () => undefined,
  },
];

export default function SalesList({
  refreshKey,
  onChange,
}) {
  const { t } = useTranslation();

  const [sales, setSales] =
    useState([]);

  const [range, setRange] =
    useState('today');

  const [loading, setLoading] =
    useState(true);

  const [deletingId, setDeletingId] =
    useState(null);

  const [error, setError] =
    useState('');

  const today = todayISO();

  async function loadSales(
    rangeId = range,
  ) {
    setLoading(true);
    setError('');

    const preset =
      RANGES.find(
        (item) => item.id === rangeId,
      ) ?? RANGES[0];

    try {
      const nextSales =
        await getSales({
          fromDate: preset.fromDate(),
        });

      setSales(nextSales);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t('salesList.loadFailed'),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, [refreshKey, range]);

  function handleRange(rangeId) {
    if (rangeId !== range) {
      setRange(rangeId);
    }
  }

  async function handleDelete(sale) {
    const confirmed =
      window.confirm(
        t('salesList.confirmDelete', {
          name: sale.productName,
        }),
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(sale.id);
    setError('');

    try {
      await deleteSale(sale.id);
      await loadSales();
      await onChange?.();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t('salesList.deleteFailed'),
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className={styles.card}>
        <h3 className={styles.title}>
          {t('salesList.title')}
        </h3>

        <p className={styles.empty}>
          {t('salesList.loading')}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          {t('salesList.title')}
        </h3>

        <div
          className={styles.ranges}
          role="group"
          aria-label={t('salesList.rangeAria')}
        >
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                range === item.id
                  ? styles.rangeActive
                  : styles.range
              }
              onClick={() =>
                handleRange(item.id)
              }
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className={styles.empty}>
          {error}
        </p>
      )}

      {sales.length === 0 ? (
        <p className={styles.empty}>
          {t('salesList.emptyRange')}
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
                    {SOURCE_KEY[
                      sale.source
                    ]
                      ? t(
                          SOURCE_KEY[
                            sale.source
                          ],
                        )
                      : sale.source}

                    {' · '}
                    {sale.paymentMethod ===
                    'qr'
                      ? t('salesList.qr')
                      : t('salesList.cash')}

                    {sale.date !== today
                      ? ` · ${sale.date}`
                      : ''}
                  </span>

                  <span
                    className={styles.meta}
                  >
                    {t('salesList.cost', {
                      amount: `RM${sale.totalCost.toFixed(
                        2,
                      )}`,
                    })}
                    {' · '}
                    {t('salesList.profit', {
                      amount: `RM${sale.grossProfit.toFixed(
                        2,
                      )}`,
                    })}
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
                  aria-label={t(
                    'salesList.deleteAria',
                    { name: sale.productName },
                  )}
                  title={t(
                    'salesList.deleteTitle',
                  )}
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
