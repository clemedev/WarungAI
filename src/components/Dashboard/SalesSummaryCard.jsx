import {
  Trans,
  useTranslation,
} from 'react-i18next';

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
  const { t } = useTranslation();

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
            {t('summaryCard.eyebrow')}
          </p>

          <h2 className={styles.title}>
            {t('summaryCard.title')}
          </h2>

          <p className={styles.subtitle}>
            {t('summaryCard.subtitle')}
          </p>
        </div>

        <div className={styles.liveBadge}>
          <span
            className={styles.liveDot}
            aria-hidden="true"
          />

          {t('summaryCard.live')}
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
              {t('summaryCard.salesLabel')}
            </span>
          </div>

          <strong className={styles.metricValue}>
            {formatCurrency(sales)}
          </strong>

          <span className={styles.metricHint}>
            {t('summaryCard.salesHint')}
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
              {t('summaryCard.profitLabel')}
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
            <Trans
              i18nKey="summaryCard.margin"
              values={{
                value:
                  profitMargin.toFixed(1),
              }}
              components={{
                bold: <strong />,
              }}
            />
          </span>
        </article>
      </div>

      <div className={styles.targetPanel}>
        <div className={styles.targetHeader}>
          <div>
            <span className={styles.targetLabel}>
              {t('summaryCard.targetLabel')}
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
                aria-label={t(
                  'summaryCard.targetAria',
                )}
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
                ? t(
                    'summaryCard.targetReached',
                  )
                : t(
                    'summaryCard.targetAchieved',
                  )}
            </span>
          </div>
        </div>

        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={t(
            'summaryCard.progressAria',
          )}
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
            {t('summaryCard.recorded', {
              amount:
                formatCurrency(sales),
            })}
          </span>

          <span>
            {percentage >= 100
              ? t('summaryCard.over', {
                  amount: formatCurrency(
                    Math.max(
                      0,
                      sales -
                        Number(
                          dailyTarget ??
                            0,
                        ),
                    ),
                  ),
                })
              : t(
                  'summaryCard.remaining',
                  {
                    amount:
                      formatCurrency(
                        Math.max(
                          0,
                          Number(
                            dailyTarget ??
                              0,
                          ) - sales,
                        ),
                      ),
                  },
                )}
          </span>
        </div>
      </div>

      <div className={styles.paymentSection}>
        <div className={styles.paymentHeading}>
          <div>
            <span className={styles.sectionLabel}>
              {t('summaryCard.paymentLabel')}
            </span>

            <p>
              {t('summaryCard.paymentHint')}
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
              <span>
                {t('summaryCard.cash')}
              </span>

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
              <span>
                {t('summaryCard.qr')}
              </span>

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
