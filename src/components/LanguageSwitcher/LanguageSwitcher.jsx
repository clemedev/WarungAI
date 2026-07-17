import { useTranslation } from 'react-i18next';
import { changeLanguage, LANGUAGES } from '../../i18n/config.js';
import styles from './LanguageSwitcher.module.css';

/**
 * Language picker (ms / en / zh). `darkSurface` restyles it for the dark
 * green sidebar, which stays dark in both themes — same contract as
 * ThemeToggle's prop of the same name.
 */
export default function LanguageSwitcher({ darkSurface = false }) {
  const { i18n, t } = useTranslation();

  return (
    <div className={styles.wrap}>
      <label htmlFor="lang-select" className={styles.label}>
        🌐
      </label>

      <select
        id="lang-select"
        className={`${styles.select} ${darkSurface ? styles.darkSurface : ''}`}
        value={i18n.language}
        onChange={(event) => changeLanguage(event.target.value)}
        aria-label={t('lang.select')}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
