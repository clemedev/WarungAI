import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Tesseract from 'tesseract.js';
import { parseReceiptText } from '../../lib/ocrParser';
import { saveExpense } from '../../lib/supabaseExpenses.js';
import { todayISO } from '../../lib/dates';
import styles from './ReceiptScanner.module.css';

/** Values are the DB's category enum; labels come from the locales. */
const CATEGORIES = [
  { value: 'bahan', key: 'scanner.catBahan' },
  { value: 'gas', key: 'scanner.catGas' },
  { value: 'pembungkusan', key: 'scanner.catPembungkusan' },
  { value: 'sewa', key: 'scanner.catSewa' },
  { value: 'lain', key: 'scanner.catLain' },
];

/**
 * Receipt photo → Tesseract OCR → parseReceiptText → review → one expense.
 *
 * This used to save *sales*: each receipt row was fuzzy-matched to a product
 * the stall sells and saved as a cash sale. But paper receipts flow the other
 * way — they come from suppliers when buying stock — so the scanner now
 * feeds the expenses ledger (source: 'receipt'). Line items are shown for
 * checking against the paper, and their sum (or the printed total when OCR
 * finds one) becomes the expense amount.
 *
 * `capture="environment"` opens the camera on mobile; on desktop the same
 * input is a normal file picker.
 */
export default function ReceiptScanner({ onSaved }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | ocr | review | error
  const [progress, setProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState([]);
  const [category, setCategory] = useState('bahan');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Sum of the rows still ticked — offered as a hint under the amount field
  // so the user can cross-check against what OCR read.
  //
  // `price` is the LINE total (quantity is already baked in — see
  // parseReceiptText), so do NOT multiply by row.quantity here: that would
  // double-count every multi-item line.
  const includedTotal = useMemo(
    () =>
      rows.reduce(
        (sum, row) =>
          row.include && Number.isFinite(Number(row.price))
            ? sum + Number(row.price)
            : sum,
        0,
      ),
    [rows],
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

      if (items.length === 0 && total === null) {
        setStatus('error');
        setError(t('scanner.expenseNothing'));
        return;
      }

      setRows(
        items.map((it) => ({
          include: true,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
        })),
      );

      // Prefer the printed total; fall back to the sum of parsed lines.
      const suggested =
        total ??
        items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

      setAmount(suggested > 0 ? suggested.toFixed(2) : '');
      setNote('');
      setStatus('review');
    } catch (err) {
      console.error('OCR failed:', err);
      setStatus('error');
      setError(t('scanner.ocrFailed'));
    }
  }

  function updateRow(i, patch) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    const numericAmount = Number(amount);

    if (saving || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await saveExpense({
        date: todayISO(),
        category,
        amount: numericAmount,
        note: note.trim(),
        source: 'receipt',
      });

      reset();
      onSaved?.();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t('scanner.expenseSaveFailed'),
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
    setCategory('bahan');
    setAmount('');
    setNote('');
    setError('');
  }

  const canSave =
    Number.isFinite(Number(amount)) && Number(amount) > 0 && !saving;

  return (
    <div className={styles.wrap}>
      {status === 'idle' && (
        <>
          <p className={styles.hint}>
            {t('scanner.expenseHint')}
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
            className={styles.bigButton}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('scanner.scanButton')}
          </button>
        </>
      )}

      {status === 'ocr' && (
        <div className={styles.progressWrap}>
          <p>
            {t('scanner.reading', {
              percent: Math.round(progress * 100),
            })}
          </p>
          <progress value={progress} max="1" />
          {imageUrl && <img className={styles.preview} src={imageUrl} alt="resit" />}
        </div>
      )}

      {status === 'error' && (
        <div>
          <p className={styles.error}>{error}</p>
          {rawText && (
            <details>
              <summary>{t('scanner.rawText')}</summary>
              <pre className={styles.rawText}>{rawText}</pre>
            </details>
          )}
          <button className={styles.bigButton} onClick={reset}>
            {t('scanner.tryAgain')}
          </button>
        </div>
      )}

      {status === 'review' && (
        <div className={styles.review}>
          <h3 className={styles.title}>
            {t('scanner.expenseReview')}
          </h3>

          {rows.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>{t('scanner.expenseItemCol')}</th>
                  <th>{t('scanner.qtyCol')}</th>
                  <th>RM</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.include ? '' : styles.excluded}>
                    <td>
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) =>
                          updateRow(i, { include: e.target.checked })
                        }
                      />
                    </td>
                    <td className={styles.ocrName}>{r.name}</td>
                    {/* Read-only: an expense stores a category/amount/note,
                        so there is nowhere for a per-item quantity to
                        persist. It is shown to check the read against the
                        paper, not to edit. */}
                    <td>{r.quantity}</td>
                    <td>
                      {Number.isFinite(Number(r.price))
                        ? Number(r.price).toFixed(2)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <label className={styles.field}>
            {t('scanner.category')}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {t(c.key)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            {t('scanner.amount')}
            <input
              className={styles.numInput}
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          {rows.length > 0 && (
            <p className={styles.hint}>
              {t('scanner.tickedTotal', {
                amount: `RM${includedTotal.toFixed(2)}`,
              })}
              {' — '}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setAmount(includedTotal.toFixed(2))}
              >
                {t('scanner.useTotal')}
              </button>
            </p>
          )}

          <label className={styles.field}>
            {t('scanner.note')}
            <input
              type="text"
              placeholder={t('scanner.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <details>
            <summary>{t('scanner.rawText')}</summary>
            <pre className={styles.rawText}>{rawText}</pre>
          </details>

          <div className={styles.actions}>
            <button
              className={styles.saveButton}
              disabled={!canSave}
              onClick={handleSave}
            >
              {saving
                ? t('scanner.saving')
                : t('scanner.saveExpense')}
            </button>
            <button className={styles.cancelButton} onClick={reset}>
              {t('scanner.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
