import { useTranslation } from 'react-i18next';
import styles from './LowStockCard.module.css';

/**
 * Products at or below their low-stock threshold. Renders nothing when
 * everything is well stocked — an empty "all good" card is just noise on a
 * dashboard the vendor checks mid-service.
 */
export default function LowStockCard({ items }) {
  const { t } = useTranslation();

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>
        {t('dashboard.lowStockTitle')} ({items.length})
      </h3>

      <ul className={styles.list}>
        {items.map((item) => (
          <li
            key={item.id}
            className={styles.item}
          >
            <span className={styles.name}>
              {item.name}
            </span>

            <span
              className={
                item.currentStock === 0
                  ? styles.countOut
                  : styles.count
              }
            >
              {item.currentStock === 0
                ? t('dashboard.lowStockOut')
                : t('dashboard.lowStockLeft', {
                    count: item.currentStock,
                  })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
