import {
  useEffect,
  useState,
} from 'react';

import {
  parseNaturalLanguageEntry,
} from '../../lib/nlEntryParser.js';

import {
  saveSale,
} from '../../lib/supabaseSales.js';

import ConfirmSale from '../ConfirmSale/ConfirmSale';
import VoiceEntry from '../VoiceEntry/VoiceEntry';

import styles from './ChatEntry.module.css';

export default function ChatEntry({
  products,
  onSaved,
}) {
  const [text, setText] =
    useState('');

  const [draft, setDraft] =
    useState(null);

  const [source, setSource] =
    useState('chat');

  const [history, setHistory] =
    useState([]);

  const [voiceText, setVoiceText] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!voiceText) {
      return;
    }

    setText(voiceText);

    setDraft(
      parseNaturalLanguageEntry(
        voiceText,
        products,
      ),
    );

    setSource('voice');
    setVoiceText(null);
    setError('');
  }, [voiceText, products]);

  function handleSubmit(event) {
    event.preventDefault();

    const cleanText = text.trim();

    if (
      !cleanText ||
      saving
    ) {
      return;
    }

    setError('');

    setDraft(
      parseNaturalLanguageEntry(
        cleanText,
        products,
      ),
    );

    setSource('chat');
  }

  async function handleSave(sale) {
    if (saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const saved =
        await saveSale(sale);

      const productName =
        saved.productName ??
        products.find(
          (product) =>
            product.id ===
            saved.productId,
        )?.name ??
        'Produk tidak dikenali';

      const label =
        `${saved.quantity} × ` +
        `${productName} — ` +
        `RM${saved.total.toFixed(2)} ` +
        `(${saved.source})`;

      setHistory(
        (currentHistory) => [
          {
            id: saved.id,
            label,
          },
          ...currentHistory,
        ],
      );

      setDraft(null);
      setText('');

      onSaved?.(1);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Gagal menyimpan jualan.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (saving) {
      return;
    }

    setDraft(null);
    setError('');
  }

  return (
    <div className={styles.wrap}>
      {products.length === 0 && (
        <p className={styles.notice}>
          Tiada produk lagi — tambah produk
          dulu supaya jualan boleh
          dipadankan.
        </p>
      )}

      {error && (
        <p className={styles.notice}>
          {error}
        </p>
      )}

      <form
        className={styles.inputRow}
        onSubmit={handleSubmit}
      >
        <input
          className={styles.input}
          type="text"
          placeholder='cth: "Jual 3 nasi lemak RM12"'
          value={text}
          onChange={(event) =>
            setText(event.target.value)
          }
          disabled={saving}
        />

        <VoiceEntry
          onTranscript={setVoiceText}
        />

        <button
          className={styles.send}
          type="submit"
          disabled={
            !text.trim() ||
            saving ||
            products.length === 0
          }
        >
          {saving
            ? 'Menyimpan...'
            : 'Hantar'}
        </button>
      </form>

      {draft && (
        <ConfirmSale
          draft={draft}
          products={products}
          source={source}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={saving}
        />
      )}

      {history.length > 0 && (
        <div className={styles.history}>
          <h4
            className={
              styles.historyTitle
            }
          >
            Disimpan sesi ini
          </h4>

          <ul>
            {history.map(
              (historyItem) => (
                <li
                  key={historyItem.id}
                >
                  ✅ {historyItem.label}
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
