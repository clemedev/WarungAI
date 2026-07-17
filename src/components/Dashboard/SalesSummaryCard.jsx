import styles from './SalesSummaryCard.module.css';

/**
 * Today's headline numbers, laid out as the mockup's stat row:
 * revenue and spend on cream cards, profit on a dark card, with the
 * daily-target progress and cash/QR split in a card beneath.
 *
 * Mobile stacks revenue full-width with spend + profit side by side;
 * desktop puts all three in one row.
 */
export default function SalesSummaryCard({ stats, split, dailyTarget, onTargetChange }) {
  const pct = Math.round(stats.targetProgress * 100);
  const profitPositive = stats.todayProfit >= 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.statRow}>
        <div className={`${styles.stat} ${styles.statRevenue}`}>
          <span className={styles.label}>Jualan hari ini</span>
          <span className={styles.value}>
            RM{stats.todayTotal.toFixed(2)}
          </span>
          <span className={styles.meta}>
            {pct}% daripada sasaran
          </span>
        </div>

        <div className={styles.stat}>
          <span className={styles.label}>Belanja</span>
          <span className={styles.value}>
            RM{(stats.todaySpend ?? 0).toFixed(2)}
          </span>
          <span className={styles.meta}>Perbelanjaan hari ini</span>
        </div>

        <div className={`${styles.stat} ${styles.statDark}`}>
          <span
            className={`${styles.label} ${styles.labelAccent}`}
          >
            Untung bersih
          </span>
          <span
            className={`${styles.value} ${
              profitPositive ? styles.profit : styles.loss
            }`}
          >
            RM{stats.todayProfit.toFixed(2)}
          </span>
          <span className={styles.metaDark}>
            {profitPositive ? 'Selepas belanja' : 'Rugi hari ini'}
          </span>
        </div>
      </div>

      <div className={styles.targetCard}>
        <div className={styles.targetHead}>
          <span className={styles.targetLabel}>
            Sasaran harian: RM
            <input
              className={styles.targetInput}
              type="number"
              min="1"
              value={dailyTarget}
              onChange={(e) => onTargetChange(Number(e.target.value))}
            />
          </span>
          <span className={styles.pct}>{pct}%</span>
        </div>

        <div className={styles.bar}>
          <div
            className={styles.fill}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>

        <p className={styles.split}>
          Tunai <strong>RM{split.cash.toFixed(2)}</strong> · QR{' '}
          <strong>RM{split.qr.toFixed(2)}</strong>
        </p>
      </div>
    </div>
  );
}
