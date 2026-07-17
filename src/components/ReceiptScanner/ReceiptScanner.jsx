import { useMemo, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { parseReceiptText } from '../../lib/ocrParser';
import { saveExpense } from '../../lib/supabaseExpenses.js';
import { todayISO } from '../../lib/dates';
import styles from './ReceiptScanner.module.css';

const CATEGORIES = [
  { value: 'bahan', label: 'Bahan mentah (ingredients)' },
  { value: 'gas', label: 'Gas' },
  { value: 'pembungkusan', label: 'Pembungkusan (packaging)' },
  { value: 'sewa', label: 'Sewa / utiliti' },
  { value: 'lain', label: 'Lain-lain' },
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
        setError(
          'Tak dapat baca apa-apa dari resit ini — cuba gambar lebih jelas/terang, atau rekod perbelanjaan secara manual di bawah. (Could not read anything — try a clearer photo, or add the expense manually.)',
        );
        return;
      }

      setRows(
        items.map((it) => ({
          include: true,
          name: it.name,
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
      setError(
        'OCR gagal — sila cuba lagi. (OCR failed — check your connection and try again; Tesseract downloads language data on first use.)',
      );
    }
  }

  function toggleRow(i, include) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, include } : r)));
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
          : 'Gagal menyimpan perbelanjaan daripada resit.',
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
            Ambil gambar resit pembekal — jumlahnya disimpan sebagai
            perbelanjaan. (Snap a supplier receipt; its total is recorded as
            an expense.)
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
            📷 Imbas Resit
          </button>
        </>
      )}

      {status === 'ocr' && (
        <div className={styles.progressWrap}>
          <p>Membaca resit… {Math.round(progress * 100)}%</p>
          <progress value={progress} max="1" />
          {imageUrl && <img className={styles.preview} src={imageUrl} alt="resit" />}
        </div>
      )}

      {status === 'error' && (
        <div>
          <p className={styles.error}>{error}</p>
          {rawText && (
            <details>
              <summary>Teks OCR mentah (raw OCR text)</summary>
              <pre className={styles.rawText}>{rawText}</pre>
            </details>
          )}
          <button className={styles.bigButton} onClick={reset}>
            Cuba lagi
          </button>
        </div>
      )}

      {status === 'review' && (
        <div className={styles.review}>
          <h3 className={styles.title}>Semak perbelanjaan (review expense)</h3>

          {rows.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Item dari resit</th>
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
                        onChange={(e) => toggleRow(i, e.target.checked)}
                      />
                    </td>
                    <td className={styles.ocrName}>{r.name}</td>
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
            Kategori
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Jumlah (RM)
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
              Jumlah item bertanda: RM{includedTotal.toFixed(2)}
              {' — '}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setAmount(includedTotal.toFixed(2))}
              >
                guna jumlah ini
              </button>
            </p>
          )}

          <label className={styles.field}>
            Nota (pilihan)
            <input
              type="text"
              placeholder="cth: barang dapur mingguan"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <details>
            <summary>Teks OCR mentah (raw OCR text)</summary>
            <pre className={styles.rawText}>{rawText}</pre>
          </details>

          <div className={styles.actions}>
            <button
              className={styles.saveButton}
              disabled={!canSave}
              onClick={handleSave}
            >
              {saving ? 'Menyimpan...' : 'Simpan perbelanjaan'}
            </button>
            <button className={styles.cancelButton} onClick={reset}>
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
