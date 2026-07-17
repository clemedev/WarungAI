import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import Tesseract from 'tesseract.js';
import { parseReceiptText } from '../../lib/ocrParser';
import { matchProduct } from '../../lib/nlEntryParser';
import { saveSale } from '../../lib/supabaseSales.js';
import { todayISO } from '../../lib/dates';
import styles from './ReceiptScanner.module.css';

/**
 * Sale-recording variant of the receipt scanner (Jualan tab): photo →
 * Tesseract OCR → parseReceiptText → editable item table, each row fuzzy-
 * matched to a product and saved as its own cash sale. For scanning a
 * *supplier* receipt into the expenses ledger, use ReceiptScanner in the
 * Belanja tab instead — same OCR pipeline, different destination.
 * `capture="environment"` opens the camera on mobile; on desktop the same
 * input is a normal file picker.
 */
export default function SaleReceiptScanner({ products, onSaved }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | ocr | review | error
  const [progress, setProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState([]);
  const [receiptTotal, setReceiptTotal] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(
    () => () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    },
    [imageUrl],
  );

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-picking the same file

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStatus('ocr');
    setProgress(0);
    setError('');

    try {
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(m.progress);
        },
      });
      setRawText(data.text);

      const { items, total } = parseReceiptText(data.text);
      setReceiptTotal(total);

      if (items.length === 0) {
        setStatus('error');
        setError(
          t('scanner.saleNothing'),
        );
        return;
      }

      // pre-map each OCR item to a product via fuzzy match; user fixes the rest
      setRows(
        items.map((it) => {
          const { product } = matchProduct(it.name, products);
          return {
            include: true,
            ocrName: it.name,
            productId: product?.id ?? '',
            quantity: it.quantity,
            total: it.price,
            needsAttention:
              !product ||
              !Number.isInteger(Number(it.quantity)) ||
              Number(it.quantity) <= 0 ||
              !Number.isFinite(Number(it.price)) ||
              Number(it.price) <= 0,
          };
        }),
      );
      setStatus('review');
    } catch (err) {
      console.error('OCR failed:', err);
      setStatus('error');
      setError(
        t('scanner.ocrFailed'),
      );
    }
  }

  function updateRow(i, patch) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function handleSaveAll() {
    if (saving) {
      return;
    }

    const good = rows.filter(
      (row) =>
        row.include &&
        row.productId &&
        Number.isInteger(Number(row.quantity)) &&
        Number(row.quantity) > 0 &&
        Number.isFinite(Number(row.total)) &&
        Number(row.total) > 0,
    );

    if (good.length === 0) {
      setError(
        t('scanner.noValidItems'),
      );
      return;
    }

    setSaving(true);
    setError('');

    const savedSaleIds = [];

    try {
      for (const row of good) {
        const savedSale = await saveSale({
            date: todayISO(),
            productId: row.productId,
            quantity: Number(row.quantity),
            total: Number(row.total),
            source: 'ocr',
            paymentMethod: 'cash',
          });
        savedSaleIds.push(savedSale.id);
      }

      reset();
      await onSaved?.({
        count: savedSaleIds.length,
        saleIds: savedSaleIds,
      });
    } catch (caughtError) {
      if (savedSaleIds.length > 0) {
        await onSaved?.({
          count: savedSaleIds.length,
          saleIds: savedSaleIds,
        });
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t('scanner.saleSaveFailed'),
      );
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setStatus('idle');
    setRows([]);
    setRawText('');
    setReceiptTotal(null);
    setError('');
  }

  const savableCount = rows.filter((r) => r.include && r.productId && r.total > 0).length;
  const attentionCount = rows.filter(
    (row) => row.include && (row.needsAttention || !row.productId),
  ).length;

  return (
    <div className={styles.wrap}>
      {status === 'idle' && (
        <>
          <p className={styles.hint}>
            {t('scanner.saleHint')}
          </p>
          <input
            ref={fileInputRef}
            className={styles.hiddenInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
          />
          <button
            type="button"
            className={styles.bigButton}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('scanner.scanButton')}
          </button>
        </>
      )}

      {status === 'ocr' && (
        <div
          className={styles.progressWrap}
          role="status"
          aria-live="polite"
        >
          <p>
            {t('scanner.reading', {
              percent: Math.round(progress * 100),
            })}
          </p>
          <progress value={progress} max="1" />
          {imageUrl && (
            <img
              className={styles.preview}
              src={imageUrl}
              alt={t('scanner.saleHint')}
            />
          )}
        </div>
      )}

      {status === 'error' && (
        <div>
          <p className={styles.error} role="alert">{error}</p>
          {rawText && (
            <details>
              <summary>{t('scanner.rawText')}</summary>
              <pre className={styles.rawText}>{rawText}</pre>
            </details>
          )}
          <button
            type="button"
            className={styles.bigButton}
            onClick={reset}
          >
            {t('scanner.tryAgain')}
          </button>
        </div>
      )}

      {status === 'review' && (
        <div className={styles.review}>
          <h3 className={styles.title}>{t('scanner.saleReview')}</h3>
          {attentionCount > 0 && (
            <p className={styles.attention} role="status">
              {t('scanner.attentionCount', { count: attentionCount })}
            </p>
          )}
          {receiptTotal !== null && (
            <p className={styles.hint}>
              {t('scanner.detectedTotal', {
                amount: `RM${receiptTotal.toFixed(2)}`,
              })}
            </p>
          )}
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>{t('scanner.fromReceipt')}</th>
                <th>{t('scanner.productCol')}</th>
                <th>{t('scanner.qtyCol')}</th>
                <th>RM</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={r.include ? r.needsAttention ? styles.attentionRow : '' : styles.excluded}>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => updateRow(i, { include: e.target.checked })}
                      aria-label={`${t('scanner.fromReceipt')}: ${r.ocrName}`}
                    />
                  </td>
                  <td className={styles.ocrName}>{r.ocrName}</td>
                  <td>
                    <select
                      value={r.productId}
                      onChange={(e) => updateRow(i, {
                        productId: e.target.value,
                        needsAttention: !e.target.value,
                      })}
                    >
                      <option value="">{t('scanner.pick')}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {r.needsAttention && (
                      <small className={styles.attentionTag}>
                        {t('scanner.needsAttention')}
                      </small>
                    )}
                  </td>
                  <td>
                    <input
                      className={styles.numInput}
                      type="number"
                      min="1"
                      value={r.quantity}
                      onChange={(e) => updateRow(i, { quantity: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.numInput}
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.total}
                      onChange={(e) => updateRow(i, { total: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <details>
            <summary>{t('scanner.rawText')}</summary>
            <pre className={styles.rawText}>{rawText}</pre>
          </details>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.saveButton}
              disabled={savableCount === 0 || saving}
              onClick={handleSaveAll}
            >
              {saving
                ? t('scanner.saving')
                : t('scanner.saveItems', {
                    count: savableCount,
                  })}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={reset}
              disabled={saving}
            >
              {t('scanner.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
