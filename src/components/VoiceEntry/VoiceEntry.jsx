import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './VoiceEntry.module.css';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/**
 * Mic button — Web Speech API. Emits the final transcript via onTranscript;
 * the parent (ChatEntry) feeds it into parseNaturalLanguageEntry, so voice
 * shares the exact same parse/confirm pipeline as typed entry.
 *
 * Not supported in all browsers (works in Chrome/Edge/Safari; not Firefox) —
 * the button hides itself when unavailable.
 */
export default function VoiceEntry({ onTranscript }) {
  const { i18n } = useTranslation();
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');

  // Map i18n language codes to Web Speech API language tags
  function getSpeechLang(lang) {
    const map = {
      ms: 'ms-MY',
      en: 'en-US',
      zh: 'zh-CN',
    };
    return map[lang] || 'ms-MY';
  }

  useEffect(() => {
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = getSpeechLang(i18n.language);
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript?.(transcript);
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError('Mikrofon tidak dibenarkan — semak kebenaran pelayar. (Mic permission denied.)');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(`Suara gagal: ${event.error}`);
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => rec.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  if (!SpeechRecognition) return null;

  function toggle() {
    setError('');
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setListening(true);
      } catch {
        /* start() throws if already started — safe to ignore */
      }
    }
  }

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={`${styles.mic} ${listening ? styles.listening : ''}`}
        onClick={toggle}
        title={listening ? 'Berhenti mendengar' : 'Cakap jualan (speak the sale)'}
      >
        {listening ? '⏹' : '🎤'}
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </span>
  );
}
