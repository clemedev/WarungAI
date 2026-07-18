import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  signIn,
  signUp,
} from '../../lib/supabaseAuth.js';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import ThemeToggle from '../ThemeToggle/ThemeToggle.jsx';
import styles from './LoginScreen.module.css';

export default function LoginScreen({ onAuthed, onTryDemo }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [busy, setBusy] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setVerificationEmail('');
  }

  function returnToSignIn() {
    setMode('signin');
    setError('');
    setNotice('');
    setVerificationEmail('');
    setPassword('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setVerificationEmail('');

    const cleanEmail = email.trim();
    const cleanDisplayName = displayName.trim();

    if (!cleanEmail) {
      setError(t('login.errEmail'));
      return;
    }

    if (password.length < 8) {
      setError(t('login.errPassword'));
      return;
    }

    if (mode === 'register' && !cleanDisplayName) {
      setError(t('login.errName'));
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

      // With Supabase email confirmation enabled, signUp returns a user but
      // intentionally no session until the verification link is opened.
      // Do not let that unverified account enter the workspace.
      if (
        mode === 'register' &&
        (!user?.email_confirmed_at || !result.session)
      ) {
        setVerificationEmail(cleanEmail);
        return;
      }

      if (!user || !result.session) {
        throw new Error(
          t('login.errGeneric'),
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
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : '';

      if (
        /email.*not.*confirmed|email_not_confirmed/i.test(
          message,
        )
      ) {
        setNotice(t('login.verifyRequired'));
      } else {
        setError(message || t('login.errGeneric'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        {/* Language must be changeable before sign-in, otherwise a
            non-Malay speaker cannot read the form they need to fill. */}
        <div className={styles.langRow}>
          <LanguageSwitcher />
          <ThemeToggle compact />
        </div>

        <h1 className={styles.logo}>
          🍛 WarungAI
        </h1>

        <p className={styles.tagline}>
          {t('login.tagline')}
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
            {t('login.signin')}
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
            {t('login.register')}
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {verificationEmail ? (
            <section
              className={styles.verificationBox}
              role="status"
              aria-live="polite"
            >
              <span className={styles.verificationIcon} aria-hidden="true">
                ✉
              </span>
              <div>
                <h2>{t('login.checkEmailTitle')}</h2>
                <p>
                  {t('login.checkEmailDescription', {
                    email: verificationEmail,
                  })}
                </p>
                <p className={styles.verificationNext}>
                  {t('login.checkEmailNext')}
                </p>
              </div>
              <button
                className={styles.returnButton}
                type="button"
                onClick={returnToSignIn}
              >
                {t('login.backToLogin')}
              </button>
            </section>
          ) : (
            <>
              {mode === 'register' && (
                <label className={styles.field}>
                  {t('login.nameLabel')}
                  <input
                    type="text"
                    placeholder={t('login.namePlaceholder')}
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
                {t('login.emailLabel')}
                <input
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  disabled={busy}
                  autoFocus={mode === 'signin'}
                  required
                />
              </label>

              <label className={styles.field}>
                {t('login.passwordLabel')}
                <input
                  type="password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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

              {error && <p className={styles.error}>{error}</p>}

              {notice && (
                <div className={styles.notice} role="status" aria-live="polite">
                  <strong>{t('login.verifyNoticeTitle')}</strong>
                  <span>{notice}</span>
                </div>
              )}

              <button
                className={styles.submit}
                type="submit"
                disabled={busy}
              >
                {busy
                  ? t('login.busy')
                  : mode === 'register'
                    ? t('login.submitRegister')
                    : t('login.signin')}
              </button>
            </>
          )}
        </form>

        <p className={styles.note}>
          {t('login.note')}
        </p>

        <button
          type="button"
          className={styles.demoButton}
          onClick={onTryDemo}
          disabled={busy}
        >
          {t('demo.try')}
        </button>

        <p className={styles.demoNote}>{t('demo.note')}</p>
      </div>
    </div>
  );
}
