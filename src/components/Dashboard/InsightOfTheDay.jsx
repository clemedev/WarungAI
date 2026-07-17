import { useTranslation } from 'react-i18next';
import styles from './InsightOfTheDay.module.css';

function formatRM(value) {
  return `RM${Number(value ?? 0).toFixed(2)}`;
}

/**
 * One rule-based recommendation from createInsight(), which hands over
 * `{ type, ...params }` rather than a sentence — so the wording follows
 * the language picker and the warning style keys off `type` instead of
 * sniffing the text for an emoji.
 */
export default function InsightOfTheDay({ insight }) {
  const { t } = useTranslation();

  if (!insight) return null;

  const isWarning = insight.type === 'belowCost';

  const text =
    insight.type === 'belowCost'
      ? t('dashboard.insightBelowCost', {
          name: insight.name,
          averagePrice: formatRM(insight.averagePrice),
          averageCost: formatRM(insight.averageCost),
        })
      : t('dashboard.insightTopSeller', {
          name: insight.name,
          count: insight.quantity,
        });

  return (
    <div className={`${styles.card} ${isWarning ? styles.warning : ''}`}>
      <h3 className={styles.title}>
        {t('dashboard.insightTitle')}
      </h3>
      <p className={styles.text}>{text}</p>
    </div>
  );
}
