import { useEffect, useState } from 'react';
import { parseNaturalLanguageEntry } from '../../lib/nlEntryParser';
import { saveSale } from '../../lib/storage';
import ConfirmSale from '../ConfirmSale/ConfirmSale';
import VoiceEntry from '../VoiceEntry/VoiceEntry';
import styles from './ChatEntry.module.css';

/**
 * Chat-style typed sales entry, e.g. "Sold 3 nasi lemak RM12".
 * The mic button (VoiceEntry) drops its transcript into the same input, so
 * voice and text share one parse → confirm → save pipeline.
 */
export default function ChatEntry({ products, onSaved }) {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState(null);
  const [source, setSource] = useState('chat');
  const [history, setHistory] = useState([]); // this session's saved entries

  // voice transcript arrives → parse immediately as source 'voice'
  const [voiceText, setVoiceText] = useState(null);
  useEffect(() => {
    if (voiceText) {
      setText(voiceText);
      setDraft(parseNaturalLanguageEntry(voiceText, products));
      setSource('voice');
      setVoiceText(null);
    }
  }, [voiceText, products]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setDraft(parseNaturalLanguageEntry(text, products));
    setSource('chat');
  }

  function handleSave(sale) {
    const saved = saveSale(sale);
    const product = products.find((p) => p.id === saved.productId);
    setHistory((h) => [
      { id: saved.id, label: `${saved.quantity} × ${product?.name ?? '?'} — RM${saved.total.toFixed(2)} (${saved.source})` },
      ...h,
    ]);
    setDraft(null);
    setText('');
    onSaved?.(1);
  }

  return (
    <div className={styles.wrap}>
      {products.length === 0 && (
        <p className={styles.notice}>
          Tiada produk lagi — tambah produk dulu supaya jualan boleh dipadankan.
          (No products yet — add products first so sales can be matched.)
        </p>
      )}

      <form className={styles.inputRow} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          placeholder='cth: "Sold 3 nasi lemak RM12" / "jual 2 teh tarik rm6"'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <VoiceEntry onTranscript={setVoiceText} />
        <button className={styles.send} type="submit" disabled={!text.trim()}>
          Hantar
        </button>
      </form>

      {draft && (
        <ConfirmSale
          draft={draft}
          products={products}
          source={source}
          onSave={handleSave}
          onCancel={() => setDraft(null)}
        />
      )}

      {history.length > 0 && (
        <div className={styles.history}>
          <h4 className={styles.historyTitle}>Disimpan sesi ini (saved this session)</h4>
          <ul>
            {history.map((h) => (
              <li key={h.id}>✅ {h.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
