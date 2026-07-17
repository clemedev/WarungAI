import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '../../i18n/config.js';
import { getDashboardData } from '../../lib/supabaseDashboard.js';
import { getSettings } from '../../lib/storage.js';
import { createBusinessHealth } from '../../lib/businessHealth.js';
import styles from './DailyClosing.module.css';

function formatRM(value) { return `RM${Number(value ?? 0).toFixed(2)}`; }

export default function DailyClosing({
  refreshKey = 0,
  onManageStock,
}) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    getDashboardData(getSettings().dailyTarget)
      .then((next) => active && setData(next))
      .catch(() => active && setData(null));
    return () => { active = false; };
  }, [refreshKey]);

  if (!data) return null;
  const { stats, split, summary, lowStockItems } = data;
  const health = createBusinessHealth({ stats, lowStockItems });
  const text = summary?.hasSales
    ? `${t('closing.sales', { amount: formatRM(stats.todayTotal) })} ${t('closing.profit', { amount: formatRM(stats.todayProfit) })}`
    : t('closing.empty');
  const date = new Date().toLocaleDateString(getDateLocale(i18n.language));
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${t('closing.title')} — ${date}\n${text}`)}`;

  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <div><p>{t('closing.eyebrow')}</p><h2>{t('closing.title')}</h2></div>
        <span aria-hidden="true">✓</span>
      </div>
      <div className={styles.metrics}>
        <div><small>{t('closing.salesLabel')}</small><strong>{formatRM(stats.todayTotal)}</strong></div>
        <div><small>{t('closing.profitLabel')}</small><strong>{formatRM(stats.todayProfit)}</strong></div>
        <div><small>{t('closing.cash')}</small><strong>{formatRM(split.cash)}</strong></div>
        <div><small>{t('closing.qr')}</small><strong>{formatRM(split.qr)}</strong></div>
      </div>
      <div className={`${styles.health} ${styles[health.type]}`}>
        <span>{t('closing.health')}</span><strong>{health.score}/100</strong>
        <small>{t(`closing.health${health.type[0].toUpperCase()}${health.type.slice(1)}`)}</small>
      </div>
      <p className={styles.summary}>{text}</p>
      {summary?.topItem && <p className={styles.top}>{t('closing.top', { name: summary.topItem.name, count: summary.topItem.quantity })}</p>}
      {lowStockItems?.length > 0 && (
        <div className={styles.lowStock}>
          <strong>{t('closing.lowStock')}</strong>
          <span>{lowStockItems.slice(0, 3).map((item) => item.name).join(', ')}</span>
          <button type="button" onClick={onManageStock}>
            {t('closing.manageStock')}
          </button>
        </div>
      )}
      <a className={styles.share} href={whatsappUrl} target="_blank" rel="noreferrer">{t('closing.share')}</a>
    </section>
  );
}
