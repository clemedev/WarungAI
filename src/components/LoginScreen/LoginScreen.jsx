import { useState } from 'react';
import {
  signIn,
  signUp,
} from '../../lib/supabaseAuth.js';
import styles from './LoginScreen.module.css';

export default function LoginScreen({ onAuthed }) {
  const [mode, setMode] = useState('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    const cleanDisplayName = displayName.trim();

    if (!cleanEmail) {
      setError('Sila masukkan alamat e-mel.');
      return;
    }

    if (password.length < 8) {
      setError('Kata laluan mesti sekurang-kurangnya 8 aksara.');
      return;
    }

    if (mode === 'register' && !cleanDisplayName) {
      setError('Sila masukkan nama kedai atau penjual.');
      return;
    }

    setBusy(true);

    try {
      const result =
        mode === 'register'
          ? await signUp(
              cleanEmail,
              password,
              cleanDisplayName,
            )
          : await signIn(
              cleanEmail,
              password,
            );

      const user = result.user;

      if (!user) {
        throw new Error(
          'Akaun dicipta. Sila semak e-mel anda sebelum log masuk.',
        );
      }

      onAuthed({
        id: user.id,
        email: user.email,
        name:
          user.user_metadata?.display_name ??
          cleanDisplayName ??
          user.email,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Log masuk gagal. Sila cuba lagi.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.logo}>
          🍛 WarungAI
        </h1>

        <p className={styles.tagline}>
          Rekod jualan dalam beberapa saat
        </p>

        <div className={styles.modeTabs}>
          <button
            type="button"
            className={
              mode === 'signin'
                ? styles.modeActive
                : styles.mode
            }
            onClick={() => changeMode('signin')}
            disabled={busy}
          >
            Log masuk
          </button>

          <button
            type="button"
            className={
              mode === 'register'
                ? styles.modeActive
                : styles.mode
            }
            onClick={() => changeMode('register')}
            disabled={busy}
          >
            Daftar baru
          </button>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          {mode === 'register' && (
            <label className={styles.field}>
              Nama kedai / penjual
              <input
                type="text"
                placeholder="cth: Warung Pak Ali"
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                autoComplete="organization"
                disabled={busy}
                autoFocus
              />
            </label>
          )}

          <label className={styles.field}>
            Alamat e-mel
            <input
              type="email"
              placeholder="cth: anda@email.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              disabled={busy}
              autoFocus={mode === 'signin'}
              required
            />
          </label>

          <label className={styles.field}>
            Kata laluan
            <input
              type="password"
              placeholder="Sekurang-kurangnya 8 aksara"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete={
                mode === 'register'
                  ? 'new-password'
                  : 'current-password'
              }
              minLength={8}
              disabled={busy}
              required
            />
          </label>

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          <button
            className={styles.submit}
            type="submit"
            disabled={busy}
          >
            {busy
              ? 'Sila tunggu...'
              : mode === 'register'
                ? 'Daftar & mula'
                : 'Log masuk'}
          </button>
        </form>

        <p className={styles.note}>
          Akaun anda dilindungi oleh Supabase Authentication.
          Data perniagaan akan dipisahkan mengikut pengguna.
        </p>
      </div>
    </div>
  );
}
