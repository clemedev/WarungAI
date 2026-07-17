import { useTranslation } from 'react-i18next';

import {
  useTheme,
} from '../../theme/ThemeContext.jsx';

import styles from './ThemeToggle.module.css';

export default function ThemeToggle({
  darkSurface = false,
  compact = false,
}) {
  const { t } = useTranslation();

  const {
    isDark,
    toggleTheme,
  } = useTheme();

  const label = isDark
    ? t('theme.useLight')
    : t('theme.useDark');

  return (
    <button
      type="button"
      className={`${styles.toggle} ${
        isDark ? styles.darkMode : ''
      } ${
        darkSurface
          ? styles.darkSurface
          : ''
      } ${
        compact ? styles.compact : ''
      }`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
    >
      <span
        className={styles.track}
        aria-hidden="true"
      >
        <span className={styles.sun}>
          ☀
        </span>

        <span className={styles.moon}>
          ◐
        </span>

        <span className={styles.thumb}>
          {isDark ? '◐' : '☀'}
        </span>
      </span>

      {!compact && (
        <span className={styles.label}>
          {isDark
            ? t('theme.dark')
            : t('theme.light')}
        </span>
      )}
    </button>
  );
}
