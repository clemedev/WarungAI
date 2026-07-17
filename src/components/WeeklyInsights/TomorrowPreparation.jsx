import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '../../i18n/config.js';
import { getTomorrowPreparation } from '../../lib/supabaseDashboard.js';
import styles from './TomorrowPreparation.module.css';

export default function TomorrowPreparation() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getTomorrowPreparation()
      .then((result) => active && setData(result))
      .catch(() => active && setError(t('prepare.loadFailed')));
    return () => { active = false; };
  }, [t]);

  if (error) return <p className={styles.error} role="alert">{error}</p>;
  if (!data) return <p className={styles.loading}>{t('prepare.loading')}</p>;
  if (data.items.length === 0) return null;

  const weekday = new Intl.DateTimeFormat(getDateLocale(i18n.language), {
    weekday: 'long',
  }).format(data.tomorrowDate);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <p>{t('prepare.eyebrow')}</p>
          <h2>{t('prepare.title', { weekday })}</h2>
        </div>
        <span aria-hidden="true">☀</span>
      </div>
      <p className={styles.hint}>
        {t('prepare.hint', {
          count: data.sampleSize,
          weekday,
        })}
      </p>
      <ul>
        {data.items.map((item) => (
          <li key={item.productId}>
            <span><strong>{item.name}</strong><small>{t('prepare.average', { count: item.average })}</small></span>
            <b>{t('prepare.recommend', { count: item.recommended })}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
