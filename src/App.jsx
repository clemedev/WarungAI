import { useEffect, useState } from 'react';

import Dashboard from './components/Dashboard/Dashboard';
import ReceiptScanner from './components/ReceiptScanner/ReceiptScanner';
import ChatEntry from './components/ChatEntry/ChatEntry';
import ProductList from './components/ProductList/ProductList';
import ExpenseTracker from './components/ExpenseTracker/ExpenseTracker';
import LoginScreen from './components/LoginScreen/LoginScreen';
import SalesList from './components/SalesList/SalesList';

import { getProducts } from './lib/storage';

import {
  getCurrentUser,
  onAuthStateChange,
  signOut,
} from './lib/supabaseAuth.js';

import styles from './App.module.css';

const TABS = [
  {
    id: 'dashboard',
    label: '📊 Papan',
    full: 'Papan pemuka',
  },
  {
    id: 'sale',
    label: '➕ Jualan',
    full: 'Rekod jualan',
  },
  {
    id: 'products',
    label: '🍜 Produk',
    full: 'Senarai produk',
  },
  {
    id: 'expenses',
    label: '🧾 Belanja',
    full: 'Perbelanjaan',
  },
];

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
    setEntryMode('chat');
    setSalesVersion(0);
  }

  function refreshProducts() {
    setProducts(getProducts());
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

  return (
    <div className={styles.app}>
      <aside
        className={styles.sidebar}
      >
        <header
          className={styles.header}
        >
          <h1
            className={styles.logo}
          >
            🍛 WarungAI
          </h1>

          <p
            className={styles.tagline}
          >
            Rekod jualan dalam beberapa saat
          </p>
        </header>

        <nav
          className={styles.tabs}
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                tab === item.id
                  ? styles.tabActive
                  : styles.tab
              }
              onClick={() =>
                setTab(item.id)
              }
              title={item.full}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className={styles.signOut}
          onClick={handleSignOut}
        >
          🚪 {user.name} — Log keluar
        </button>
      </aside>

      <main className={styles.main}>
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
              <div
                className={
                  styles.subTabs
                }
              >
                <button
                  type="button"
                  className={
                    entryMode === 'chat'
                      ? styles.subTabActive
                      : styles.subTab
                  }
                  onClick={() =>
                    setEntryMode('chat')
                  }
                >
                  💬 Taip / 🎤 Suara
                </button>

                <button
                  type="button"
                  className={
                    entryMode === 'scan'
                      ? styles.subTabActive
                      : styles.subTab
                  }
                  onClick={() =>
                    setEntryMode('scan')
                  }
                >
                  📷 Imbas Resit
                </button>
              </div>

              {entryMode === 'chat' && (
                <ChatEntry
                  products={products}
                  onSaved={
                    handleSaved
                  }
                />
              )}

              {entryMode === 'scan' && (
                <ReceiptScanner
                  products={products}
                  onSaved={
                    handleSaved
                  }
                />
              )}

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
