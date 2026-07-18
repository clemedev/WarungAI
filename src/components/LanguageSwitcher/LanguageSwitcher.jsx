import { useTranslation } from 'react-i18next';

import {
  changeLanguage,
  getCurrentLanguage,
  getNextLanguage,
  LANGUAGES,
} from '../../i18n/config.js';

import styles from './LanguageSwitcher.module.css';

const SHORT_NAMES = {
  ms: 'BM',
  en: 'BI',
  zh: 'BC',
};

/**
 * One-tap language cycle:
 * BM -> BI -> BC -> BM
 */
export default function LanguageSwitcher({
  darkSurface = false,
}) {
  const { t, i18n } = useTranslation();

  // Referencing i18n.language subscribes this component
  // to language changes from react-i18next.
  const languageVersion =
    i18n.resolvedLanguage ??
    i18n.language;

  const activeLanguage =
    getCurrentLanguage(
      languageVersion,
    );

  const currentLanguage =
    LANGUAGES.find(
      (language) =>
        language.code ===
        activeLanguage,
    ) ?? LANGUAGES[0];

  const nextLanguageCode =
    getNextLanguage(
      currentLanguage.code,
    );

  const currentShortName =
    SHORT_NAMES[
      currentLanguage.code
    ] ?? 'BM';

  const nextShortName =
    SHORT_NAMES[
      nextLanguageCode
    ] ?? 'BM';

  const label = t(
    'lang.toggle',
    {
      current: currentShortName,
      next: nextShortName,
    },
  );

  async function handleChange() {
    await changeLanguage(
      nextLanguageCode,
    );
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={`${styles.toggle} ${
          darkSurface
            ? styles.darkSurface
            : ''
        }`}
        onClick={handleChange}
        aria-label={label}
        title={label}
      >
        <span
          className={styles.icon}
          aria-hidden="true"
        >
          🌐
        </span>

        <span>
          {currentShortName}
        </span>
      </button>
    </div>
  );
}
