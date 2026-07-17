import { useEffect, useState } from 'react';

import Dashboard from './components/Dashboard/Dashboard';
import ChatEntry from './components/ChatEntry/ChatEntry';
import SaleReceiptScanner from './components/ReceiptScanner/SaleReceiptScanner';
import ProductList from './components/ProductList/ProductList';
import ExpenseTracker from './components/ExpenseTracker/ExpenseTracker';
import LoginScreen from './components/LoginScreen/LoginScreen';
import SalesList from './components/SalesList/SalesList';
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';

import { getProducts } from './lib/storage';

import {
  getCurrentUser,
  onAuthStateChange,
  signOut,
} from './lib/supabaseAuth.js';

import styles from './App.module.css';

/**
 * Navigation model shared by the desktop sidebar and the mobile bottom
 * bar. `fab: true` marks the centre "Imbas" (scan) action — the raised
 * orange button on mobile, hidden from the desktop sidebar. Receipts
 * come from suppliers, so scanning records an *expense*: the FAB is a
 * shortcut into the Belanja tab, where the scanner lives.
 */
const NAV = [
  {
    id: 'dashboard',
    label: 'Papan',
    icon: '📊',
    title: 'Papan pemuka',
  },
  {
    id: 'sale',
    label: 'Jualan',
    icon: '➕',
    title: 'Rekod jualan',
  },
  {
    id: 'scan',
    label: 'Imbas',
    icon: '📷',
    title: 'Imbas resit perbelanjaan',
    fab: true,
  },
  {
    id: 'products',
    label: 'Produk',
    icon: '🍜',
    title: 'Senarai produk',
  },
  {
    id: 'expenses',
    label: 'Belanja',
    icon: '🧾',
    title: 'Perbelanjaan',
  },
];

const PAGE_TITLES = {
  dashboard: 'Papan pemuka',
  sale: 'Rekod jualan',
  products: 'Senarai produk',
  expenses: 'Perbelanjaan',
};

function formatToday() {
  return new Date().toLocaleDateString('ms-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const THEME_KEY = 'warungai.theme';

/**
 * Saved choice wins; otherwise follow the OS. Applied to <html> as a
 * data-theme attribute so the CSS variables in index.css can switch —
 * done at module load (before first paint) to avoid a light flash for
 * dark-theme users.
 */
function initialTheme() {
  try {
    const saved =
      localStorage.getItem(THEME_KEY);

    if (
      saved === 'light' ||
      saved === 'dark'
    ) {
      return saved;
    }
  } catch {
    // storage unavailable — fall through to the OS preference
  }

  return window.matchMedia?.(
    '(prefers-color-scheme: dark)',
  )?.matches
    ? 'dark'
    : 'light';
}

document.documentElement.dataset.theme =
  initialTheme();

/** Time-of-day greeting for the desktop top bar. */
function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Selamat pagi';
  }

  if (hour < 19) {
    return 'Selamat petang';
  }

  return 'Selamat malam';
}

function mapSupabaseUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name:
      user.user_metadata?.display_name ??
      user.email ??
      'Pengguna WarungAI',
  };
}

/**
 * Temporary compatibility bridge.
 *
 * Products, sales, expenses, and settings still use the existing synchronous
 * localStorage adapter. That adapter expects a local vendor session ID.
 *
 * Until each data domain is migrated to Supabase, use the authenticated
 * Supabase user ID as the localStorage namespace. Supabase remains the actual
 * authentication system.
 */
function setLocalStorageIdentity(user) {
  if (!user) {
    localStorage.removeItem(
      'warungai.sessionUserId',
    );

    return;
  }

  const mappedUser =
    mapSupabaseUser(user);

  let existingUsers = [];

  try {
    const storedUsers = JSON.parse(
      localStorage.getItem(
        'warungai.users',
      ),
    );

    if (Array.isArray(storedUsers)) {
      existingUsers = storedUsers;
    }
  } catch {
    existingUsers = [];
  }

  const localUser = {
    id: mappedUser.id,
    name: mappedUser.name,
    email: mappedUser.email,
    authProvider: 'supabase',
  };

  const existingIndex =
    existingUsers.findIndex(
      (item) =>
        item.id === localUser.id,
    );

  if (existingIndex >= 0) {
    existingUsers[existingIndex] = {
      ...existingUsers[existingIndex],
      ...localUser,
    };
  } else {
    existingUsers.push(localUser);
  }

  localStorage.setItem(
    'warungai.users',
    JSON.stringify(existingUsers),
  );

  localStorage.setItem(
    'warungai.sessionUserId',
    localUser.id,
  );
}

export default function App() {
  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [tab, setTab] =
    useState('dashboard');

  // Jualan entry mode: 'chat' (type/voice) or 'scan' (order-chit OCR).
  const [entryMode, setEntryMode] =
    useState('chat');

  const [products, setProducts] =
    useState([]);

  const [toast, setToast] =
    useState('');

  const [
    salesVersion,
    setSalesVersion,
  ] = useState(0);

  const [theme, setTheme] = useState(
    () =>
      document.documentElement.dataset
        .theme ?? 'light',
  );

  function toggleTheme() {
    const nextTheme =
      theme === 'dark'
        ? 'light'
        : 'dark';

    document.documentElement.dataset.theme =
      nextTheme;

    try {
      localStorage.setItem(
        THEME_KEY,
        nextTheme,
      );
    } catch {
      // storage unavailable — theme still applies for this session
    }

    setTheme(nextTheme);
  }

  useEffect(() => {
    let active = true;

    async function restoreUser() {
      const currentUser =
        await getCurrentUser();

      if (!active) {
        return;
      }

      setLocalStorageIdentity(
        currentUser,
      );

      setUser(
        mapSupabaseUser(
          currentUser,
        ),
      );

      if (currentUser) {
        setProducts(getProducts());
      }

      setAuthLoading(false);
    }

    restoreUser();

    const unsubscribe =
      onAuthStateChange(
        (nextUser) => {
          if (!active) {
            return;
          }

          setLocalStorageIdentity(
            nextUser,
          );

          setUser(
            mapSupabaseUser(
              nextUser,
            ),
          );

          setProducts(
            nextUser
              ? getProducts()
              : [],
          );

          setAuthLoading(false);
        },
      );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  function handleAuthed(
    authedUser,
  ) {
    setUser(authedUser);
    setProducts(getProducts());
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : 'Log keluar gagal.',
      );

      return;
    }

    setLocalStorageIdentity(null);
    setUser(null);
    setProducts([]);
    setTab('dashboard');
    setSalesVersion(0);
  }

  function refreshProducts(nextProducts) {
    setProducts(
      Array.isArray(nextProducts)
        ? nextProducts
        : [],
    );
  }

  function handleSaved(count) {
    setToast(
      `✅ ${count} jualan disimpan`,
    );

    window.setTimeout(() => {
      setToast('');
    }, 3000);

    setSalesVersion(
      (version) => version + 1,
    );
  }

  function navigate(item) {
    // The scan FAB is a shortcut to the expense scanner in Belanja.
    setTab(
      item.id === 'scan'
        ? 'expenses'
        : item.id,
    );
  }

  function isActive(item) {
    if (item.id === 'scan') {
      // The FAB is an action button, never shown as "current tab".
      return false;
    }

    return tab === item.id;
  }

  if (authLoading) {
    return (
      <div className={styles.app}>
        <main className={styles.main}>
          <p>
            Memeriksa sesi pengguna...
          </p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onAuthed={handleAuthed}
      />
    );
  }

  const sidebarItems = NAV.filter(
    (item) => !item.fab,
  );

  return (
    <div className={styles.app}>
      {/*
        Top bar. On mobile it is a cream strip holding just the brand
        and a sign-out button. On desktop it turns dark and splits into
        a 248px brand block (sitting directly above the sidebar) plus a
        meta strip carrying the date and greeting — the two dark blocks
        and the sidebar form the mockup's L around the content.
      */}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span
            className={styles.brandMark}
          >
            🍛
          </span>

          <span
            className={styles.brandName}
          >
            WarungAI
          </span>
        </div>

        <div className={styles.topMeta}>
          <span
            className={styles.topMetaText}
          >
            <span
              className={styles.topDate}
            >
              {formatToday()}
            </span>

            <span
              className={styles.topGreeting}
            >
              {greeting()}, {user.name}
            </span>
          </span>
        </div>

        <div
          className={styles.topActions}
        >
          <LanguageSwitcher />

          <button
            type="button"
            className={
              styles.themeToggle
            }
            onClick={toggleTheme}
            title={
              theme === 'dark'
                ? 'Mod cerah'
                : 'Mod gelap'
            }
            aria-label={
              theme === 'dark'
                ? 'Tukar ke mod cerah'
                : 'Tukar ke mod gelap'
            }
          >
            {theme === 'dark'
              ? '☀️'
              : '🌙'}
          </button>

          <button
            type="button"
            className={
              styles.signOutIcon
            }
            onClick={handleSignOut}
            title="Log keluar"
            aria-label="Log keluar"
          >
            ⎋
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {/* Desktop-only sidebar (hidden < 880px) */}
        <aside
          className={styles.sidebar}
        >
          <nav
            className={styles.tabs}
          >
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  isActive(item)
                    ? styles.tabActive
                    : styles.tab
                }
                onClick={() =>
                  navigate(item)
                }
                title={item.title}
              >
                <span
                  className={styles.tabIcon}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className={styles.signOut}
            onClick={handleSignOut}
          >
            ⎋ Log keluar
          </button>
        </aside>

        <main className={styles.main}>
        <div className={styles.pageHead}>
          <h2
            className={styles.pageTitle}
          >
            {PAGE_TITLES[tab] ??
              'Papan pemuka'}
          </h2>

          <span
            className={styles.pageDate}
          >
            {formatToday()}
          </span>
        </div>

        {tab === 'dashboard' && (
          <div
            className={
              styles.wideContent
            }
          >
            <Dashboard />
          </div>
        )}

        {tab === 'sale' && (
          <div
            className={
              styles.narrowContent
            }
          >
            <div
              className={
                styles.saleWrap
              }
            >
              <ChatEntry
                products={products}
                onSaved={handleSaved}
              />

              <SalesList
                products={products}
                refreshKey={
                  salesVersion
                }
                onChange={() =>
                  setSalesVersion(
                    (version) =>
                      version + 1,
                  )
                }
              />
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div
            className={
              styles.narrowContent
            }
          >
            <ProductList
              onChange={
                refreshProducts
              }
            />
          </div>
        )}

        {tab === 'expenses' && (
          <div
            className={
              styles.narrowContent
            }
          >
            <ExpenseTracker />
          </div>
        )}
        </main>
      </div>

      {/* Mobile-only bottom navigation (hidden ≥ 880px) */}
      <nav
        className={styles.bottomNav}
      >
        {NAV.map((item) =>
          item.fab ? (
            <button
              key={item.id}
              type="button"
              className={styles.fab}
              onClick={() =>
                navigate(item)
              }
              title={item.title}
              aria-label={item.title}
            >
              <span
                className={
                  styles.fabIcon
                }
              >
                {item.icon}
              </span>
              <span
                className={
                  styles.fabLabel
                }
              >
                {item.label}
              </span>
            </button>
          ) : (
            <button
              key={item.id}
              type="button"
              className={
                isActive(item)
                  ? styles.navItemActive
                  : styles.navItem
              }
              onClick={() =>
                navigate(item)
              }
              title={item.title}
            >
              <span
                className={
                  styles.navIcon
                }
              >
                {item.icon}
              </span>
              <span
                className={
                  styles.navLabel
                }
              >
                {item.label}
              </span>
            </button>
          ),
        )}
      </nav>

      {toast && (
        <div
          className={styles.toast}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
