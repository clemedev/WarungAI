import styles from './SalesSummaryCard.module.css';

function formatCurrency(value) {
  return `RM${Number(value ?? 0).toFixed(2)}`;
}

export default function SalesSummaryCard({
  stats,
  split,
  dailyTarget,
  onTargetChange,
}) {
  const sales = Number(
    stats.todayTotal ?? 0,
  );

  const profit = Number(
    stats.todayProfit ?? 0,
  );

  const cash = Number(
    split.cash ?? 0,
  );

  const qr = Number(
    split.qr ?? 0,
  );

  const percentage = Math.max(
    0,
    Math.round(
      Number(
        stats.targetProgress ?? 0,
      ) * 100,
    ),
  );

  const progressWidth = Math.min(
    percentage,
    100,
  );

  const profitMargin =
    sales > 0
      ? (profit / sales) * 100
      : 0;

  const paymentTotal = cash + qr;

  const cashPercentage =
    paymentTotal > 0
      ? Math.round(
          (cash / paymentTotal) * 100,
        )
      : 0;

  const qrPercentage =
    paymentTotal > 0
      ? Math.round(
          (qr / paymentTotal) * 100,
        )
      : 0;

  return (
    <section className={styles.card}>
      <div className={styles.glow} />

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Prestasi hari ini
          </p>

          <h2 className={styles.title}>
            Ringkasan perniagaan
          </h2>

          <p className={styles.subtitle}>
            Angka terkini berdasarkan jualan
            dan perbelanjaan yang disahkan.
          </p>
        </div>

        <div className={styles.liveBadge}>
          <span
            className={styles.liveDot}
            aria-hidden="true"
          />

          Data langsung
        </div>
      </header>

      <div className={styles.metrics}>
        <article className={styles.metric}>
          <div className={styles.metricTop}>
            <span
              className={styles.metricIcon}
              aria-hidden="true"
            >
              ↗
            </span>

            <span className={styles.metricLabel}>
              Jualan hari ini
            </span>
          </div>

          <strong className={styles.metricValue}>
            {formatCurrency(sales)}
          </strong>

          <span className={styles.metricHint}>
            Jumlah hasil yang direkod
          </span>
        </article>

        <article
          className={`${styles.metric} ${
            profit >= 0
              ? styles.profitMetric
              : styles.lossMetric
          }`}
        >
          <div className={styles.metricTop}>
            <span
              className={styles.metricIcon}
              aria-hidden="true"
            >
              ◈
            </span>

            <span className={styles.metricLabel}>
              Untung bersih
            </span>
          </div>

          <strong
            className={`${styles.metricValue} ${
              profit >= 0
                ? styles.profit
                : styles.loss
            }`}
          >
            {formatCurrency(profit)}
          </strong>

          <span className={styles.metricHint}>
            Margin{' '}
            <strong>
              {profitMargin.toFixed(1)}%
            </strong>{' '}
            daripada jualan
          </span>
        </article>
      </div>

      <div className={styles.targetPanel}>
        <div className={styles.targetHeader}>
          <div>
            <span className={styles.targetLabel}>
              Sasaran jualan harian
            </span>

            <div className={styles.targetAmount}>
              <span>RM</span>

              <input
                className={styles.targetInput}
                type="number"
                min="1"
                step="1"
                inputMode="decimal"
                value={dailyTarget}
                aria-label="Sasaran jualan harian"
                onChange={(event) =>
                  onTargetChange(
                    Number(
                      event.target.value,
                    ),
                  )
                }
              />
            </div>
          </div>

          <div className={styles.targetResult}>
            <strong>{percentage}%</strong>

            <span>
              {percentage >= 100
                ? 'Sasaran dicapai'
                : 'Telah dicapai'}
            </span>
          </div>
        </div>

        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Kemajuan sasaran harian"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progressWidth}
        >
          <div
            className={styles.progressFill}
            style={{
              width: `${progressWidth}%`,
            }}
          >
            <span
              className={styles.progressGlow}
            />
          </div>
        </div>

        <div className={styles.progressFooter}>
          <span>
            {formatCurrency(sales)} direkod
          </span>

          <span>
            {percentage >= 100
              ? `Lebih ${formatCurrency(
                  Math.max(
                    0,
                    sales -
                      Number(
                        dailyTarget ?? 0,
                      ),
                  ),
                )}`
              : `Baki ${formatCurrency(
                  Math.max(
                    0,
                    Number(
                      dailyTarget ?? 0,
                    ) - sales,
                  ),
                )}`}
          </span>
        </div>
      </div>

      <div className={styles.paymentSection}>
        <div className={styles.paymentHeading}>
          <div>
            <span className={styles.sectionLabel}>
              Kaedah bayaran
            </span>

            <p>
              Pecahan hasil tunai dan QR
              hari ini
            </p>
          </div>

          <span className={styles.transactionTotal}>
            {formatCurrency(paymentTotal)}
          </span>
        </div>

        <div className={styles.paymentGrid}>
          <article className={styles.paymentCard}>
            <div
              className={
                styles.paymentIconCash
              }
              aria-hidden="true"
            >
              RM
            </div>

            <div className={styles.paymentInfo}>
              <span>Tunai</span>

              <strong>
                {formatCurrency(cash)}
              </strong>
            </div>

            <span className={styles.paymentPercent}>
              {cashPercentage}%
            </span>
          </article>

          <article className={styles.paymentCard}>
            <div
              className={
                styles.paymentIconQr
              }
              aria-hidden="true"
            >
              QR
            </div>

            <div className={styles.paymentInfo}>
              <span>Bayaran QR</span>

              <strong>
                {formatCurrency(qr)}
              </strong>
            </div>

            <span className={styles.paymentPercent}>
              {qrPercentage}%
            </span>
          </article>
        </div>
      </div>
    </section>
  );
}
