import { useState } from 'react';
import { register, signIn, hasAnyUser } from '../../lib/auth';
import styles from './LoginScreen.module.css';

/**
 * Vendor sign-in / registration gate. The app renders only after a vendor
 * is signed in; each vendor's data is fully separate (storage.js namespaces
 * every key by vendor id).
 */
export default function LoginScreen({ onAuthed }) {
  const [mode, setMode] = useState(hasAnyUser() ? 'signin' : 'register');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user =
        mode === 'register' ? await register(name, pin) : await signIn(name, pin);
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.logo}>🍛 WarungAI</h1>
        <p className={styles.tagline}>Rekod jualan dalam beberapa saat</p>

        <div className={styles.modeTabs}>
          <button
            className={mode === 'signin' ? styles.modeActive : styles.mode}
            onClick={() => { setMode('signin'); setError(''); }}
            type="button"
          >
            Log masuk
          </button>
          <button
            className={mode === 'register' ? styles.modeActive : styles.mode}
            onClick={() => { setMode('register'); setError(''); }}
            type="button"
          >
            Daftar baru
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            Nama kedai / penjual
            <input
              type="text"
              placeholder="cth: Warung Pak Ali"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className={styles.field}>
            PIN (4–8 digit)
            <input
              type="password"
              inputMode="numeric"
              placeholder="cth: 1234"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submit} type="submit" disabled={busy}>
            {mode === 'register' ? 'Daftar & mula' : 'Log masuk'}
          </button>
        </form>

        <p className={styles.note}>
          Data anda disimpan pada peranti ini sahaja — setiap penjual ada rekod
          berasingan. (Data stays on this device; each vendor's records are
          separate.)
        </p>
      </div>
    </div>
  );
}
