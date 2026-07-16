import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  getDashboardData,
} from '../../lib/supabaseDashboard.js';

import {
  getSettings,
  saveSettings,
} from '../../lib/storage.js';

import SalesSummaryCard from './SalesSummaryCard';
import SevenDayChart from './SevenDayChart';
import TopItemsList from './TopItemsList';
import InsightOfTheDay from './InsightOfTheDay';

import styles from './Dashboard.module.css';

const EMPTY_DATA = {
  stats: {
    todayTotal: 0,
    todayProfit: 0,
    sevenDayTrend: [],
    topItems: [],
    targetProgress: 0,
  },
  summary:
    'Tiada jualan direkod hari ini lagi.',
  insight: null,
  split: {
    cash: 0,
    qr: 0,
  },
  dailyTarget: 200,
};

export default function Dashboard() {
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
            : 'Gagal memuatkan papan pemuka.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
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
          Memuatkan papan pemuka...
        </p>
      </div>
    );
  }

  const {
    stats,
    summary,
    insight,
    split,
    dailyTarget,
  } = data;

  const hasAnyData =
    stats.sevenDayTrend.some(
      (day) => day.total > 0,
    );

  const whatsappText =
    `📊 WarungAI — ` +
    `${new Date().toLocaleDateString('ms-MY')}\n` +
    summary;

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
            Belum ada jualan minggu ini.
            Rekod jualan pertama anda di
            tab “➕ Jualan”!
          </p>
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
            Ringkasan hari ini
          </h3>

          <p
            className={
              styles.summaryText
            }
          >
            {summary}
          </p>

          <a
            className={styles.waButton}
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            📤 Kongsi ke WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
