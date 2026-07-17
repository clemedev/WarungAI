import { useTranslation } from 'react-i18next';
import { changeLanguage, LANGUAGES } from '../../i18n/config.js';
import styles from './LanguageSwitcher.module.css';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  return (
    <div className={styles.wrap}>
      <label htmlFor="lang-select" className={styles.label}>
        🌐
      </label>
      <select
        id="lang-select"
        className={styles.select}
        value={currentLang}
        onChange={(e) => changeLanguage(e.target.value)}
        aria-label="Select language"
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
