import { useCallback, useState } from 'react';
import {
  getDashboardStats,
  getDailySummary,
  getInsightOfTheDay,
  getPaymentSplit,
} from '../../lib/insights';
import { getSettings, saveSettings } from '../../lib/storage';
import SalesSummaryCard from './SalesSummaryCard';
import SevenDayChart from './SevenDayChart';
import TopItemsList from './TopItemsList';
import InsightOfTheDay from './InsightOfTheDay';
import styles from './Dashboard.module.css';

function compute() {
  return {
    stats: getDashboardStats(),
    summary: getDailySummary(),
    insight: getInsightOfTheDay(),
    split: getPaymentSplit(),
    dailyTarget: getSettings().dailyTarget,
  };
}

/**
 * Main dashboard — everything comes from insights.js, per the contract.
 * Layout: on mobile this is one stacked column (source order below).
 * On desktop (≥ 880px, see Dashboard.module.css) the same elements are
 * placed onto a named CSS grid — summary spans the top, the chart and
 * top-items sit side by side, insight and the share card close it out —
 * so the wrapper divs below exist purely to carry grid-area names.
 */
export default function Dashboard() {
  const [data, setData] = useState(compute);

  const handleTargetChange = useCallback((dailyTarget) => {
    if (dailyTarget > 0) saveSettings({ dailyTarget });
    setData(compute());
  }, []);

  const { stats, summary, insight, split, dailyTarget } = data;
  const hasAnyData = stats.sevenDayTrend.some((d) => d.total > 0);

  const waText = `📊 WarungAI — ${new Date().toLocaleDateString('ms-MY')}\n${summary}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  return (
    <div className={styles.wrap}>
      <div className={styles.summaryArea}>
        <SalesSummaryCard
          stats={stats}
          split={split}
          dailyTarget={dailyTarget}
          onTargetChange={handleTargetChange}
        />
      </div>

      {!hasAnyData && (
        <div className={styles.emptyArea}>
          <p className={styles.empty}>
            Belum ada jualan minggu ini. Rekod jualan pertama anda di tab
            “➕ Jualan”! (No sales yet this week — log your first sale.)
          </p>
        </div>
      )}

      <div className={styles.chartArea}>
        <SevenDayChart trend={stats.sevenDayTrend} />
      </div>

      <div className={styles.topArea}>
        <TopItemsList items={stats.topItems} />
      </div>

      <div className={styles.insightArea}>
        <InsightOfTheDay insight={insight} />
      </div>

      <div className={styles.footerArea}>
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>Ringkasan hari ini</h3>
          <p className={styles.summaryText}>{summary}</p>
          <a
            className={styles.waButton}
            href={waHref}
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
