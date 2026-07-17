import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { todayISO } from '../../lib/dates.js';
import { saveSale } from '../../lib/supabaseSales.js';

import styles from './QuickSaleGrid.module.css';

function formatRM(value) {
  return `RM${Number(value ?? 0).toFixed(2)}`;
}

export default function QuickSaleGrid({ products, onSaved }) {
  const { t } = useTranslation();
  const [quantities, setQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const items = useMemo(
    () => products
      .filter((product) => quantities[product.id] > 0)
      .map((product) => ({
        ...product,
        quantity: quantities[product.id],
      })),
    [products, quantities],
  );

  const total = items.reduce(
    (sum, item) => sum + item.sellPrice * item.quantity,
    0,
  );

  function changeQuantity(product, delta) {
    setError('');
    setQuantities((current) => {
      const next = Math.min(
        Math.max(0, (current[product.id] || 0) + delta),
        Number(product.currentStock) || 0,
      );
      if (next === 0) {
        const { [product.id]: removed, ...remaining } = current;
        return remaining;
      }

      return { ...current, [product.id]: next };
    });
  }

  async function handleSave() {
    if (saving || items.length === 0) {
      return;
    }

    setSaving(true);
    setError('');
    const savedIds = [];

    try {
      for (const item of items) {
        await saveSale({
          date: todayISO(),
          productId: item.id,
          quantity: item.quantity,
          total: item.sellPrice * item.quantity,
          paymentMethod,
          source: 'manual',
        });
        savedIds.push(item.id);
      }

      setQuantities({});
      await onSaved?.(savedIds.length);
    } catch (caughtError) {
      setQuantities((current) => {
        const remaining = { ...current };
        savedIds.forEach((id) => delete remaining[id]);
        return remaining;
      });
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t('busy.saveFailed'),
      );
      if (savedIds.length > 0) {
        await onSaved?.(savedIds.length);
      }
    } finally {
      setSaving(false);
    }
  }

  if (products.length === 0) {
    return <p className={styles.state}>{t('busy.noProducts')}</p>;
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>{t('busy.hint')}</p>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.grid}>
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            className={styles.product}
            onClick={() => changeQuantity(product, 1)}
            disabled={saving || product.currentStock <= 0}
            aria-label={t('busy.addProduct', { name: product.name })}
          >
            <strong>{product.name}</strong>
            <span>{formatRM(product.sellPrice)}</span>
            <small>{t('busy.stock', { count: product.currentStock })}</small>
          </button>
        ))}
      </div>

      <section className={styles.cart} aria-live="polite">
        <div className={styles.cartHeader}>
          <h3>{t('busy.cart')}</h3>
          <strong>{formatRM(total)}</strong>
        </div>

        {items.length === 0 ? (
          <p className={styles.state}>{t('busy.emptyCart')}</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <div className={styles.quantity}>
                  <button
                    type="button"
                    onClick={() => changeQuantity(item, -1)}
                    disabled={saving}
                    aria-label={t('busy.removeProduct', { name: item.name })}
                  >
                    −
                  </button>
                  <strong>{item.quantity}</strong>
                  <button
                    type="button"
                    onClick={() => changeQuantity(item, 1)}
                    disabled={saving || item.quantity >= item.currentStock}
                    aria-label={t('busy.addProduct', { name: item.name })}
                  >
                    +
                  </button>
                </div>
                <strong>{formatRM(item.sellPrice * item.quantity)}</strong>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.payment} aria-label={t('busy.paymentAria')}>
          <button
            type="button"
            className={paymentMethod === 'cash' ? styles.active : ''}
            onClick={() => setPaymentMethod('cash')}
            disabled={saving}
            aria-pressed={paymentMethod === 'cash'}
          >
            {t('busy.cash')}
          </button>
          <button
            type="button"
            className={paymentMethod === 'qr' ? styles.active : ''}
            onClick={() => setPaymentMethod('qr')}
            disabled={saving}
            aria-pressed={paymentMethod === 'qr'}
          >
            {t('busy.qr')}
          </button>
        </div>

        <button
          type="button"
          className={styles.save}
          disabled={saving || items.length === 0}
          onClick={handleSave}
        >
          {saving ? t('busy.saving') : t('busy.save', { count: items.length })}
        </button>
      </section>
    </div>
  );
}
