import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useTranslation } from 'react-i18next';

import {
  getDashboardData,
} from '../../lib/supabaseDashboard.js';

import { getDateLocale } from '../../i18n/config.js';

import {
  getSettings,
  saveSettings,
} from '../../lib/storage.js';

import SalesSummaryCard from './SalesSummaryCard';
import SevenDayChart from './SevenDayChart';
import TopItemsList from './TopItemsList';
import InsightOfTheDay from './InsightOfTheDay';
import LowStockCard from './LowStockCard';

import styles from './Dashboard.module.css';

const EMPTY_DATA = {
  stats: {
    todayTotal: 0,
    todaySpend: 0,
    todayProfit: 0,
    sevenDayTrend: [],
    topItems: [],
    targetProgress: 0,
  },
  summary: { hasSales: false },
  insight: null,
  lowStockItems: [],
  split: {
    cash: 0,
    qr: 0,
  },
  dailyTarget: 200,
};

function formatRM(value) {
  return `RM${Number(value ?? 0).toFixed(2)}`;
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();

  const [data, setData] =
    useState(EMPTY_DATA);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const loadDashboard = useCallback(
    async (
      target =
        getSettings().dailyTarget,
    ) => {
      setLoading(true);
      setError('');

      try {
        const nextData =
          await getDashboardData(
            target,
          );

        setData(nextData);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : t('dashboard.loadFailed'),
        );
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleTargetChange =
    useCallback(
      async (dailyTarget) => {
        if (
          !Number.isFinite(
            dailyTarget,
          ) ||
          dailyTarget <= 0
        ) {
          return;
        }

        saveSettings({
          dailyTarget,
        });

        await loadDashboard(
          dailyTarget,
        );
      },
      [loadDashboard],
    );

  if (loading) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>
          {t('dashboard.loading')}
        </p>
      </div>
    );
  }

  const {
    stats,
    summary,
    insight,
    lowStockItems,
    split,
    dailyTarget,
  } = data;

  const hasAnyData =
    stats.sevenDayTrend.some(
      (day) => day.total > 0,
    );

  // The lib hands back numbers; the sentence is assembled here so it can
  // follow the language picker.
  const summaryText = !summary?.hasSales
    ? t('dashboard.summaryNone')
    : [
        t('dashboard.summarySales', {
          amount: formatRM(
            summary.totalSales,
          ),
          count:
            summary.transactionCount,
        }),
        t('dashboard.summaryProfit', {
          amount: formatRM(
            summary.netProfit,
          ),
        }),
        summary.topItem &&
          t('dashboard.summaryTop', {
            name: summary.topItem.name,
            count:
              summary.topItem.quantity,
          }),
        summary.expenseTotal > 0 &&
          t(
            'dashboard.summaryExpense',
            {
              amount: formatRM(
                summary.expenseTotal,
              ),
            },
          ),
      ]
        .filter(Boolean)
        .join(' ');

  const whatsappText =
    `📊 WarungAI — ` +
    `${new Date().toLocaleDateString(
      getDateLocale(i18n.language),
    )}\n` +
    summaryText;

  const whatsappUrl =
    `https://wa.me/?text=` +
    encodeURIComponent(
      whatsappText,
    );

  return (
    <div className={styles.wrap}>
      {error && (
        <div
          className={
            styles.emptyArea
          }
        >
          <p className={styles.empty}>
            {error}
          </p>
        </div>
      )}

      <div
        className={
          styles.summaryArea
        }
      >
        <SalesSummaryCard
          stats={stats}
          split={split}
          dailyTarget={dailyTarget}
          onTargetChange={
            handleTargetChange
          }
        />
      </div>

      {!hasAnyData && (
        <div
          className={
            styles.emptyArea
          }
        >
          <p className={styles.empty}>
            {t('dashboard.noSalesWeek')}
          </p>
        </div>
      )}

      {lowStockItems?.length > 0 && (
        <div
          className={
            styles.lowStockArea
          }
        >
          <LowStockCard
            items={lowStockItems}
          />
        </div>
      )}

      <div
        className={styles.chartArea}
      >
        <SevenDayChart
          trend={
            stats.sevenDayTrend
          }
        />
      </div>

      <div
        className={styles.topArea}
      >
        <TopItemsList
          items={stats.topItems}
        />
      </div>

      <div
        className={
          styles.insightArea
        }
      >
        <InsightOfTheDay
          insight={insight}
        />
      </div>

      <div
        className={
          styles.footerArea
        }
      >
        <div
          className={
            styles.summaryCard
          }
        >
          <h3
            className={
              styles.summaryTitle
            }
          >
            {t('dashboard.summaryTitle')}
          </h3>

          <p
            className={
              styles.summaryText
            }
          >
            {summaryText}
          </p>

          <a
            className={styles.waButton}
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('dashboard.shareWhatsApp')}
          </a>
        </div>
      </div>
    </div>
  );
}
