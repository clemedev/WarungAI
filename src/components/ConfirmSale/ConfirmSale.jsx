import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { todayISO } from '../../lib/dates';
import styles from './ConfirmSale.module.css';

/**
 * Shared confirm/edit step for every entry method (OCR, chat, voice).
 * The user reviews and corrects the parsed draft before anything is saved.
 *
 * @param {{
 *   draft: import('../../lib/types').ParsedEntry,
 *   products: Array<import('../../lib/types').Product>,
 *   source: 'ocr'|'chat'|'voice',
 *   onSave: (sale: Omit<import('../../lib/types').Sale,'id'>) => void,
 *   onCancel: () => void,
 * }} props
 */
export default function ConfirmSale({ draft, products, source, onSave, onCancel }) {
  const { t } = useTranslation();
  const [productId, setProductId] = useState(draft.productId ?? '');
  const [quantity, setQuantity] = useState(draft.quantity ?? 1);
  const [total, setTotal] = useState(draft.total ?? '');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    setProductId(draft.productId ?? '');
    setQuantity(draft.quantity ?? 1);
    setTotal(draft.total ?? '');
  }, [draft]);

  const canSave = productId && quantity > 0 && Number(total) > 0;

  function handleProductChange(id) {
    setProductId(id);
    // switching product recalculates the suggested total
    const p = products.find((x) => x.id === id);
    if (p) setTotal((p.sellPrice * quantity).toFixed(2));
  }

  function handleSave() {
    onSave({
      date: todayISO(),
      productId,
      quantity: Number(quantity),
      total: Number(total),
      source,
      paymentMethod,
    });
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{t('confirm.title')}</h3>

      {draft.needsReview && !draft.productId && (
        <p className={styles.warning}>
          {t('confirm.noMatch', {
            name: draft.productName || draft.raw,
          })}
        </p>
      )}

      <label className={styles.field}>
        {t('confirm.product')}
        <select
          value={productId}
          onChange={(e) => handleProductChange(e.target.value)}
        >
          <option value="">{t('confirm.pickProduct')}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (RM{p.sellPrice.toFixed(2)})
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        {t('confirm.quantity')}
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        {t('confirm.total')}
        <input
          type="number"
          min="0"
          step="0.01"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        {t('confirm.payment')}
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="cash">{t('confirm.cash')}</option>
          <option value="qr">{t('confirm.qr')}</option>
        </select>
      </label>

      <div className={styles.actions}>
        <button className={styles.save} disabled={!canSave} onClick={handleSave}>
          {t('confirm.save')}
        </button>
        <button className={styles.cancel} onClick={onCancel}>
          {t('confirm.cancel')}
        </button>
      </div>
    </div>
  );
}
