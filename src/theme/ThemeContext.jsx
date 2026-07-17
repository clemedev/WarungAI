import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'warungai.theme';

const ThemeContext = createContext(null);

function getDeviceTheme() {
  return window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches
    ? 'dark'
    : 'light';
}

function getInitialTheme() {
  try {
    const savedTheme =
      localStorage.getItem(STORAGE_KEY);

    if (
      savedTheme === 'light' ||
      savedTheme === 'dark'
    ) {
      return savedTheme;
    }
  } catch {
    // Use device preference.
  }

  return getDeviceTheme();
}

function updateThemeColor(theme) {
  let meta = document.querySelector(
    'meta[name="theme-color"]',
  );

  if (!meta) {
    meta = document.createElement('meta');

    meta.setAttribute(
      'name',
      'theme-color',
    );

    document.head.appendChild(meta);
  }

  meta.setAttribute(
    'content',
    theme === 'dark'
      ? '#071c12'
      : '#176b43',
  );
}

export function ThemeProvider({
  children,
}) {
  const [theme, setThemeState] =
    useState(getInitialTheme);

  useEffect(() => {
    const root =
      document.documentElement;

    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    updateThemeColor(theme);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        theme,
      );
    } catch {
      // Theme remains active for this session.
    }
  }, [theme]);

  function setTheme(nextTheme) {
    if (
      nextTheme !== 'light' &&
      nextTheme !== 'dark'
    ) {
      return;
    }

    setThemeState(nextTheme);
  }

  function toggleTheme() {
    setThemeState(
      (currentTheme) =>
        currentTheme === 'dark'
          ? 'light'
          : 'dark',
    );
  }

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider.',
    );
  }

  return context;
}
