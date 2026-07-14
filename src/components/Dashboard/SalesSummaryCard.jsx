import styles from './SalesSummaryCard.module.css';

/** Today's headline numbers: sales, profit, target progress, cash/QR split. */
export default function SalesSummaryCard({ stats, split, dailyTarget, onTargetChange }) {
  const pct = Math.round(stats.targetProgress * 100);

  return (
    <div className={styles.card}>
      <div className={styles.numbers}>
        <div className={styles.stat}>
          <span className={styles.label}>Jualan hari ini</span>
          <span className={styles.value}>RM{stats.todayTotal.toFixed(2)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Untung bersih</span>
          <span
            className={`${styles.value} ${
              stats.todayProfit >= 0 ? styles.profit : styles.loss
            }`}
          >
            RM{stats.todayProfit.toFixed(2)}
          </span>
        </div>
      </div>

      <div className={styles.targetRow}>
        <div className={styles.targetHead}>
          <span className={styles.label}>
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
      </div>

      <p className={styles.split}>
        Tunai RM{split.cash.toFixed(2)} · QR RM{split.qr.toFixed(2)}
      </p>
    </div>
  );
}
