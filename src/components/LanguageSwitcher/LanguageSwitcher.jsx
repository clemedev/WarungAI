import { useTranslation } from 'react-i18next';

import {
  changeLanguage,
  getNextLanguage,
  LANGUAGES,
} from '../../i18n/config.js';

import styles from './LanguageSwitcher.module.css';

const SHORT_NAMES = {
  ms: 'BM',
  en: 'BI',
  zh: 'BC',
};

/** A one-tap language cycle: BM → BI → BC. */
export default function LanguageSwitcher({ darkSurface = false }) {
  const { i18n, t } = useTranslation();

  const currentLanguage =
    LANGUAGES.find(
      (language) => language.code === i18n.language,
    ) ?? LANGUAGES[0];

  const nextLanguageCode = getNextLanguage(
    currentLanguage.code,
  );

  const currentShortName =
    SHORT_NAMES[currentLanguage.code] ?? 'BM';

  const nextShortName =
    SHORT_NAMES[nextLanguageCode] ?? 'BM';

  const label = t('lang.toggle', {
    current: currentShortName,
    next: nextShortName,
  });

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={`${styles.toggle} ${
          darkSurface ? styles.darkSurface : ''
        }`}
        onClick={() => changeLanguage(nextLanguageCode)}
        aria-label={label}
        title={label}
      >
        <span className={styles.icon} aria-hidden="true">🌐</span>
        <span>{currentShortName}</span>
      </button>
    </div>
  );
}
