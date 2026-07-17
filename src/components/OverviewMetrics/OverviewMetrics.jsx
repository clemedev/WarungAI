import {
  useEffect,
  useState,
} from 'react';

import { useTranslation } from 'react-i18next';

import {
  getDashboardData,
} from '../../lib/supabaseDashboard.js';

import styles from './OverviewMetrics.module.css';

const EMPTY_METRICS = {
  sales: 0,
  profit: 0,
  expenses: 0,
  transactions: 0,
};

function formatCurrency(value) {
  return `RM${Number(value ?? 0).toFixed(2)}`;
}

export default function OverviewMetrics({
  refreshKey,
}) {
  const { t } = useTranslation();

  const [metrics, setMetrics] =
    useState(EMPTY_METRICS);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      setLoading(true);
      setError('');

      try {
        const data =
          await getDashboardData();

        if (!active) {
          return;
        }

        setMetrics({
          sales:
            data.stats.todayTotal,
          profit:
            data.stats.todayProfit,
          expenses:
            data.stats
              .todayExpenseTotal,
          transactions:
            data.stats
              .todayTransactionCount,
        });
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Gagal memuatkan ringkasan.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <section
        className={styles.grid}
        aria-label="Memuatkan ringkasan hari ini"
      >
        {[0, 1, 2, 3].map(
          (item) => (
            <article
              key={item}
              className={styles.skeleton}
            >
              <span />
              <strong />
              <small />
            </article>
          ),
        )}
      </section>
    );
  }

  if (error) {
    return (
      <div
        className={styles.error}
        role="alert"
      >
        {error}
      </div>
    );
  }

  const cards = [
    {
      id: 'sales',
      icon: '↗',
      label: t('metrics.salesLabel'),
      value: formatCurrency(
        metrics.sales,
      ),
      detail: t(
        'metrics.salesDetail',
      ),
      tone: 'sales',
    },
    {
      id: 'profit',
      icon: '◆',
      label: t('metrics.profitLabel'),
      value: formatCurrency(
        metrics.profit,
      ),
      detail:
        metrics.profit >= 0
          ? t('metrics.profitDetail')
          : t('metrics.lossDetail'),
      tone:
        metrics.profit >= 0
          ? 'profit'
          : 'loss',
    },
    {
      id: 'expenses',
      icon: '−',
      label: t('metrics.expensesLabel'),
      value: formatCurrency(
        metrics.expenses,
      ),
      detail: t(
        'metrics.expensesDetail',
      ),
      tone: 'expense',
    },
    {
      id: 'transactions',
      icon: '≡',
      label: t(
        'metrics.transactionsLabel',
      ),
      value: String(
        metrics.transactions,
      ),
      detail: t(
        'metrics.transactionsDetail',
      ),
      tone: 'transactions',
    },
  ];

  return (
    <section
      className={styles.grid}
      aria-label="Ringkasan hari ini"
    >
      {cards.map((card) => (
        <article
          key={card.id}
          className={`${styles.card} ${
            styles[card.tone]
          }`}
        >
          <div className={styles.cardTop}>
            <span
              className={styles.icon}
              aria-hidden="true"
            >
              {card.icon}
            </span>

            <span className={styles.label}>
              {card.label}
            </span>
          </div>

          <strong className={styles.value}>
            {card.value}
          </strong>

          <span className={styles.detail}>
            {card.detail}
          </span>
        </article>
      ))}
    </section>
  );
}
