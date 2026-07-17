import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { getWeeklyInsights } from '../../lib/supabaseDashboard.js';
import { shortLabel } from '../../lib/dates.js';
import { useTheme } from '../../theme/ThemeContext.jsx';

import styles from './WeeklyInsights.module.css';
import TomorrowPreparation from './TomorrowPreparation.jsx';

ChartJS.register(
  CategoryScale,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

function formatRM(value) {
  return `RM${Number(value ?? 0).toFixed(2)}`;
}

function categoryKey(category) {
  return `scanner.cat${
    String(category ?? 'lain')
      .replace(/^./, (letter) => letter.toUpperCase())
  }`;
}

export default function WeeklyInsights({ refreshKey = 0 }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setData(await getWeeklyInsights());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t('weekly.loadFailed'),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights, refreshKey]);

  if (loading) {
    return <p className={styles.state}>{t('weekly.loading')}</p>;
  }

  if (error) {
    return <p className={styles.error} role="alert">{error}</p>;
  }

  const { current, previous, marginDelta } = data;
  const hasActivity =
    current.revenue > 0 || current.expenseTotal > 0;

  if (!hasActivity) {
    return <p className={styles.state}>{t('weekly.empty')}</p>;
  }

  const chartData = {
    labels: current.dailyProfitTrend.map((day) => shortLabel(day.date)),
    datasets: [
      {
        label: t('weekly.profitTrend'),
        data: current.dailyProfitTrend.map((day) => day.profit),
        borderColor: isDark ? '#79daa3' : '#176b43',
        backgroundColor: isDark
          ? 'rgba(121, 218, 163, 0.16)'
          : 'rgba(23, 107, 67, 0.13)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${formatRM(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#a8bdb0' : '#68736d' },
      },
      y: {
        ticks: {
          color: isDark ? '#a8bdb0' : '#68736d',
          callback: (value) => `RM${value}`,
        },
        grid: {
          color: isDark
            ? 'rgba(155, 188, 169, 0.12)'
            : 'rgba(104, 115, 109, 0.12)',
        },
      },
    },
  };

  const storyKey = `weekly.story${
    current.businessStory.type[0].toUpperCase()
  }${current.businessStory.type.slice(1)}`;

  return (
    <div className={styles.wrap}>
      <header className={styles.reportHeader}>
        <div>
          <p className={styles.eyebrow}>{t('weekly.reportEyebrow')}</p>
          <h1>{t('weekly.reportTitle')}</h1>
          <p>{t('weekly.reportHint')}</p>
        </div>
        <button
          type="button"
          className={styles.printButton}
          onClick={() => window.print()}
        >
          {t('weekly.print')}
        </button>
      </header>
      <div className={styles.preparationArea}>
        <TomorrowPreparation />
      </div>
      <section className={`${styles.card} ${styles.storyCard}`}>
        <p className={styles.eyebrow}>{t('weekly.businessStory')}</p>
        <p className={styles.storyText}>
          {t(storyKey, {
            revenue: formatRM(current.businessStory.revenueChange),
            profit: formatRM(current.businessStory.profitChange),
            expense: formatRM(current.businessStory.expenseAmount),
            category: t(categoryKey(current.businessStory.expenseCategory)),
          })}
        </p>
      </section>
      <section className={`${styles.card} ${styles.marginCard}`}>
        <p className={styles.eyebrow}>{t('weekly.thisWeek')}</p>
        <h2 className={styles.marginValue}>
          {current.margin === null ? '—' : `${current.margin}%`}
        </h2>
        <p className={styles.muted}>{t('weekly.netMargin')}</p>
        <p
          className={`${styles.delta} ${
            marginDelta === null
              ? styles.neutral
              : marginDelta >= 0
                ? styles.positive
                : styles.negative
          }`}
        >
          {marginDelta === null
            ? t('weekly.noPreviousWeek')
            : t('weekly.marginDelta', {
                value: `${marginDelta > 0 ? '+' : ''}${marginDelta}%`,
              })}
        </p>
        <p className={styles.muted}>
          {t('weekly.weekProfit', {
            amount: formatRM(current.netProfit),
          })}
        </p>
      </section>

      <section className={`${styles.card} ${styles.listCard}`}>
        <header className={styles.cardHeader}>
          <h2>{t('weekly.topProducts')}</h2>
          <span>{formatRM(current.revenue)}</span>
        </header>
        {current.topProducts.length === 0 ? (
          <p className={styles.empty}>{t('weekly.none')}</p>
        ) : (
          <ol className={styles.rankList}>
            {current.topProducts.map((product, index) => (
              <li key={product.productId ?? product.name}>
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.productMeta}>
                  {formatRM(product.revenue)} · {t('weekly.units', {
                    count: product.quantity,
                  })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={`${styles.card} ${styles.listCard}`}>
        <header className={styles.cardHeader}>
          <h2>{t('weekly.slowMovers')}</h2>
          <span>{t('weekly.lowestSales')}</span>
        </header>
        {current.slowMovers.length === 0 ? (
          <p className={styles.empty}>{t('weekly.none')}</p>
        ) : (
          <ul className={styles.slowList}>
            {current.slowMovers.map((product) => (
              <li key={product.productId ?? product.name}>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.productMeta}>
                  {product.quantity === 0
                    ? t('weekly.noSales')
                    : `${formatRM(product.revenue)} · ${t('weekly.units', {
                        count: product.quantity,
                      })}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${styles.card} ${styles.lowStockCard}`}>
        <header className={styles.cardHeader}>
          <h2>{t('weekly.lowStockCount')}</h2>
          <span>{t('weekly.lowStockItems', { count: current.lowStockItems.length })}</span>
        </header>
        {current.lowStockItems.length === 0 ? (
          <p className={styles.empty}>{t('weekly.stockHealthy')}</p>
        ) : (
          <ul className={styles.slowList}>
            {current.lowStockItems.map((product) => (
              <li key={product.id}>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.productMeta}>
                  {t('weekly.stockLeft', { count: product.currentStock })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {current.profitLeaks.length > 0 && (
        <section className={`${styles.card} ${styles.profitLeakCard}`}>
          <header className={styles.cardHeader}>
            <h2>{t('weekly.profitLeaks')}</h2>
            <span>{t('weekly.actionNeeded')}</span>
          </header>
          <ul className={styles.leakList}>
            {current.profitLeaks.map((product) => (
              <li key={product.productId ?? product.name}>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.leakDetail}>
                  {product.type === 'belowCost'
                    ? t('weekly.belowCost', {
                        price: formatRM(product.averagePrice),
                        cost: formatRM(product.averageCost),
                      })
                    : t('weekly.lowMargin', {
                        margin: `${product.margin}%`,
                      })}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.leakHint}>{t('weekly.profitLeakHint')}</p>
        </section>
      )}

      <section className={`${styles.card} ${styles.expenseCard}`}>
        <header className={styles.cardHeader}>
          <h2>{t('weekly.expenseBreakdown')}</h2>
          <span>{formatRM(current.expenseTotal)}</span>
        </header>
        {current.expenseBreakdown.length === 0 ? (
          <p className={styles.empty}>{t('weekly.none')}</p>
        ) : (
          <ul className={styles.expenseList}>
            {current.expenseBreakdown.map((expense) => (
              <li key={expense.category}>
                <span>{t(categoryKey(expense.category))}</span>
                <strong>{formatRM(expense.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
        {current.largestExpense && (
          <p className={styles.largestExpense}>
            {t('weekly.largestExpense', {
              category: t(categoryKey(current.largestExpense.category)),
              amount: formatRM(current.largestExpense.amount),
            })}
          </p>
        )}
      </section>

      <section className={`${styles.card} ${styles.paymentCard}`}>
        <header className={styles.cardHeader}>
          <h2>{t('weekly.paymentSplit')}</h2>
        </header>
        <div className={styles.payments}>
          <div>
            <span>{t('weekly.cash')}</span>
            <strong>{formatRM(current.paymentSplit.cash)}</strong>
          </div>
          <div>
            <span>{t('weekly.qr')}</span>
            <strong>{formatRM(current.paymentSplit.qr)}</strong>
          </div>
        </div>
      </section>

      <section className={`${styles.card} ${styles.chartCard}`}>
        <header className={styles.cardHeader}>
          <h2>{t('weekly.profitTrend')}</h2>
          <span>{t('weekly.thisWeek')}</span>
        </header>
        <div className={styles.chartBox}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </section>
    </div>
  );
}
