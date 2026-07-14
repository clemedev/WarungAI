import { useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { parseReceiptText } from '../../lib/ocrParser';
import { matchProduct } from '../../lib/nlEntryParser';
import { saveSale } from '../../lib/storage';
import { todayISO } from '../../lib/dates';
import styles from './ReceiptScanner.module.css';

/**
 * Receipt photo → Tesseract OCR → parseReceiptText → editable item table →
 * one Sale saved per confirmed row. `capture="environment"` opens the camera
 * on mobile; on desktop the same input is a normal file picker.
 */
export default function ReceiptScanner({ products, onSaved }) {
  const fileInputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | ocr | review | error
  const [progress, setProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState([]);
  const [receiptTotal, setReceiptTotal] = useState(null);
  const [error, setError] = useState('');

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
          'Tak dapat baca item dari resit ini — cuba gambar lebih jelas/terang, atau taip jualan di tab Chat. (Could not read any items — try a clearer photo, or type the sale instead.)',
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
          };
        }),
      );
      setStatus('review');
    } catch (err) {
      console.error('OCR failed:', err);
      setStatus('error');
      setError(
        'OCR gagal — sila cuba lagi. (OCR failed — check your connection and try again; Tesseract downloads language data on first use.)',
      );
    }
  }

  function updateRow(i, patch) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function handleSaveAll() {
    const good = rows.filter((r) => r.include && r.productId && r.total > 0);
    for (const r of good) {
      saveSale({
        date: todayISO(),
        productId: r.productId,
        quantity: Number(r.quantity) || 1,
        total: Number(r.total),
        source: 'ocr',
        paymentMethod: 'cash',
      });
    }
    reset();
    onSaved?.(good.length);
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

  return (
    <div className={styles.wrap}>
      {status === 'idle' && (
        <>
          <p className={styles.hint}>
            Ambil gambar resit atau pilih fail. (Snap a receipt photo, or pick a
            file on desktop.)
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
          <h3 className={styles.title}>Semak item (review items)</h3>
          {receiptTotal !== null && (
            <p className={styles.hint}>Jumlah resit dikesan: RM{receiptTotal.toFixed(2)}</p>
          )}
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Dari resit</th>
                <th>Produk</th>
                <th>Kuantiti</th>
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
                      onChange={(e) => updateRow(i, { include: e.target.checked })}
                    />
                  </td>
                  <td className={styles.ocrName}>{r.ocrName}</td>
                  <td>
                    <select
                      value={r.productId}
                      onChange={(e) => updateRow(i, { productId: e.target.value })}
                    >
                      <option value="">— pilih —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
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
            <summary>Teks OCR mentah (raw OCR text)</summary>
            <pre className={styles.rawText}>{rawText}</pre>
          </details>
          <div className={styles.actions}>
            <button
              className={styles.saveButton}
              disabled={savableCount === 0}
              onClick={handleSaveAll}
            >
              Simpan {savableCount} item
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
