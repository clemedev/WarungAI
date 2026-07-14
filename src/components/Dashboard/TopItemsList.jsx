import styles from './TopItemsList.module.css';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Top 3 selling items over the last 7 days. */
export default function TopItemsList({ items }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Paling laris (7 hari)</h3>
      {items.length === 0 ? (
        <p className={styles.empty}>Belum ada jualan minggu ini.</p>
      ) : (
        <ol className={styles.list}>
          {items.map((item, i) => (
            <li key={item.productId} className={styles.item}>
              <span>
                {MEDALS[i] ?? '·'} {item.name}
              </span>
              <strong>{item.quantity} unit</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
