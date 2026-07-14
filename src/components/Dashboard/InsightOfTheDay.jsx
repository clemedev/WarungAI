import styles from './InsightOfTheDay.module.css';

/** One rule-based recommendation from insights.getInsightOfTheDay(). */
export default function InsightOfTheDay({ insight }) {
  if (!insight) return null;
  const isWarning = insight.startsWith('⚠️');
  return (
    <div className={`${styles.card} ${isWarning ? styles.warning : ''}`}>
      <h3 className={styles.title}>💡 Cadangan hari ini</h3>
      <p className={styles.text}>{insight}</p>
    </div>
  );
}
