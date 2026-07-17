import styles from './TopItemsList.module.css';

/** Top selling items over the last 7 days, ranked with relative-volume bars. */
export default function TopItemsList({ items }) {
  const maxQuantity = items.reduce(
    (max, item) => Math.max(max, item.quantity),
    0,
  ) || 1;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Paling laris (7 hari)</h3>
      {items.length === 0 ? (
        <p className={styles.empty}>Belum ada jualan minggu ini.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item, i) => (
            <li key={item.productId} className={styles.item}>
              <span
                className={`${styles.rank} ${
                  i === 0 ? styles.rankTop : ''
                }`}
              >
                {i + 1}
              </span>
              <div className={styles.body}>
                <div className={styles.row}>
                  <span className={styles.name}>{item.name}</span>
                  <span className={styles.qty}>{item.quantity} unit</span>
                </div>
                <div className={styles.bar}>
                  <div
                    className={styles.fill}
                    style={{
                      width: `${(item.quantity / maxQuantity) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
