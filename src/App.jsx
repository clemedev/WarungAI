import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Dashboard from './components/Dashboard/Dashboard';
import ReceiptScanner from './components/ReceiptScanner/ReceiptScanner';
import ChatEntry from './components/ChatEntry/ChatEntry';
import ProductList from './components/ProductList/ProductList';
import ExpenseTracker from './components/ExpenseTracker/ExpenseTracker';
import LoginScreen from './components/LoginScreen/LoginScreen';
import SalesList from './components/SalesList/SalesList';

import {
  getProducts,
} from './lib/supabaseProducts.js';

import {
  getCurrentUser,
  onAuthStateChange,
  signOut,
} from './lib/supabaseAuth.js';

import styles from './App.module.css';

const TABS = [
  {
    id: 'dashboard',
    icon: '▦',
    label: 'Papan pemuka',
    shortLabel: 'Papan',
    description:
      'Pantau jualan, untung dan prestasi perniagaan anda.',
  },
  {
    id: 'sale',
    icon: '+',
    label: 'Rekod jualan',
    shortLabel: 'Jualan',
    description:
      'Rekod jualan melalui teks, suara atau imbasan resit.',
  },
  {
    id: 'products',
    icon: '◫',
    label: 'Produk',
    shortLabel: 'Produk',
    description:
      'Urus harga, kos, margin dan stok menu perniagaan.',
  },
  {
    id: 'expenses',
    icon: '◇',
    label: 'Perbelanjaan',
    shortLabel: 'Belanja',
    description:
      'Catat kos operasi untuk pengiraan untung yang tepat.',
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
    const value = JSON.parse(
      localStorage.getItem(
        'warungai.users',
      ),
    );

    if (Array.isArray(value)) {
      existingUsers = value;
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

  const index = existingUsers.findIndex(
    (item) => item.id === localUser.id,
  );

  if (index >= 0) {
    existingUsers[index] = {
      ...existingUsers[index],
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

function getInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'W';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Selamat pagi';
  }

  if (hour < 18) {
    return 'Selamat petang';
  }

  return 'Selamat malam';
}

function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingBrand}>
        <div className={styles.loadingLogo}>
          🍛
        </div>

        <strong>WarungAI</strong>

        <span>
          Menyediakan ruang kerja anda...
        </span>

        <div className={styles.loadingBar}>
          <span />
        </div>
      </div>
    </div>
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

  const currentTab = useMemo(
    () =>
      TABS.find(
        (item) => item.id === tab,
      ) ?? TABS[0],
    [tab],
  );

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(
        'ms-MY',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      ).format(new Date()),
    [],
  );

  async function loadProducts() {
    try {
      const nextProducts =
        await getProducts();

      setProducts(nextProducts);
    } catch {
      setProducts([]);
    }
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
        mapSupabaseUser(currentUser),
      );

      if (currentUser) {
        await loadProducts();
      }

      if (active) {
        setAuthLoading(false);
      }
    }

    restoreUser();

    const unsubscribe =
      onAuthStateChange(
        async (nextUser) => {
          if (!active) {
            return;
          }

          setLocalStorageIdentity(
            nextUser,
          );

          setUser(
            mapSupabaseUser(nextUser),
          );

          if (nextUser) {
            await loadProducts();
          } else {
            setProducts([]);
          }

          if (active) {
            setAuthLoading(false);
          }
        },
      );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function handleAuthed(
    authedUser,
  ) {
    setUser(authedUser);
    await loadProducts();
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

  function refreshProducts(
    nextProducts,
  ) {
    setProducts(
      Array.isArray(nextProducts)
        ? nextProducts
        : [],
    );
  }

  function handleSaved(count) {
    setToast(
      `✓ ${count} jualan berjaya disimpan`,
    );

    window.setTimeout(() => {
      setToast('');
    }, 3000);

    setSalesVersion(
      (version) => version + 1,
    );
  }

  function openSale(mode = 'chat') {
    setEntryMode(mode);
    setTab('sale');
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <LoginScreen
        onAuthed={handleAuthed}
      />
    );
  }

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            🍛
          </div>

          <div className={styles.brandText}>
            <strong>WarungAI</strong>
            <span>Pusat perniagaan</span>
          </div>
        </div>

        <div className={styles.navLabel}>
          Menu utama
        </div>

        <nav
          className={styles.desktopNav}
          aria-label="Navigasi utama"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                tab === item.id
                  ? styles.navItemActive
                  : styles.navItem
              }
              onClick={() =>
                setTab(item.id)
              }
            >
              <span
                className={styles.navIcon}
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarSpacer} />

        <div className={styles.accountCard}>
          <div className={styles.avatar}>
            {getInitials(user.name)}
          </div>

          <div className={styles.accountDetails}>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.signOut}
          onClick={handleSignOut}
        >
          <span aria-hidden="true">↪</span>
          Log keluar
        </button>
      </aside>

      <section className={styles.application}>
        <header className={styles.mobileHeader}>
          <div className={styles.mobileBrand}>
            <span>🍛</span>
            <strong>WarungAI</strong>
          </div>

          <div className={styles.mobileAvatar}>
            {getInitials(user.name)}
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.workspace}>
            <header className={styles.topbar}>
              <div className={styles.pageIdentity}>
                <p className={styles.greeting}>
                  {getGreeting()},{' '}
                  <strong>{user.name}</strong>
                </p>

                <h1 className={styles.pageTitle}>
                  {currentTab.label}
                </h1>

                <p className={styles.pageDescription}>
                  {currentTab.description}
                </p>
              </div>

              <div className={styles.topbarMeta}>
                <span
                  className={
                    styles.secureBadge
                  }
                >
                  <i />
                  Data diselaraskan
                </span>

                <time
                  className={styles.date}
                  dateTime={new Date()
                    .toISOString()
                    .slice(0, 10)}
                >
                  {formattedDate}
                </time>
              </div>
            </header>

            {tab === 'dashboard' && (
              <section
                className={
                  styles.quickActions
                }
                aria-label="Tindakan pantas"
              >
                <button
                  type="button"
                  className={
                    styles.primaryAction
                  }
                  onClick={() =>
                    openSale('chat')
                  }
                >
                  <span>+</span>

                  <div>
                    <strong>
                      Rekod jualan
                    </strong>
                    <small>
                      Taip atau guna suara
                    </small>
                  </div>
                </button>

                <button
                  type="button"
                  className={
                    styles.quickAction
                  }
                  onClick={() =>
                    openSale('scan')
                  }
                >
                  <span>▣</span>

                  <div>
                    <strong>
                      Imbas resit
                    </strong>
                    <small>
                      Ekstrak menggunakan OCR
                    </small>
                  </div>
                </button>

                <button
                  type="button"
                  className={
                    styles.quickAction
                  }
                  onClick={() =>
                    setTab('expenses')
                  }
                >
                  <span>◇</span>

                  <div>
                    <strong>
                      Tambah belanja
                    </strong>
                    <small>
                      Rekod kos operasi
                    </small>
                  </div>
                </button>

                <button
                  type="button"
                  className={
                    styles.quickAction
                  }
                  onClick={() =>
                    setTab('products')
                  }
                >
                  <span>◫</span>

                  <div>
                    <strong>
                      Urus produk
                    </strong>
                    <small>
                      Harga, kos dan stok
                    </small>
                  </div>
                </button>
              </section>
            )}

            <div className={styles.content}>
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
                      styles.saleWorkspace
                    }
                  >
                    <div
                      className={
                        styles.entrySelector
                      }
                    >
                      <button
                        type="button"
                        className={
                          entryMode === 'chat'
                            ? styles.entryActive
                            : styles.entryOption
                        }
                        onClick={() =>
                          setEntryMode(
                            'chat',
                          )
                        }
                      >
                        <span>✦</span>
                        <div>
                          <strong>
                            Taip atau suara
                          </strong>
                          <small>
                            Rekod jualan pantas
                          </small>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={
                          entryMode === 'scan'
                            ? styles.entryActive
                            : styles.entryOption
                        }
                        onClick={() =>
                          setEntryMode(
                            'scan',
                          )
                        }
                      >
                        <span>▣</span>
                        <div>
                          <strong>
                            Imbas resit
                          </strong>
                          <small>
                            Baca resit bercetak
                          </small>
                        </div>
                      </button>
                    </div>

                    <section
                      className={
                        styles.entryPanel
                      }
                    >
                      {entryMode ===
                        'chat' && (
                        <ChatEntry
                          products={products}
                          onSaved={
                            handleSaved
                          }
                        />
                      )}

                      {entryMode ===
                        'scan' && (
                        <ReceiptScanner
                          products={products}
                          onSaved={
                            handleSaved
                          }
                        />
                      )}
                    </section>

                    <SalesList
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
            </div>
          </div>
        </main>
      </section>

      <nav
        className={styles.mobileNav}
        aria-label="Navigasi mudah alih"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              tab === item.id
                ? styles.mobileNavActive
                : styles.mobileNavItem
            }
            onClick={() =>
              setTab(item.id)
            }
          >
            <span aria-hidden="true">
              {item.icon}
            </span>
            <small>{item.shortLabel}</small>
          </button>
        ))}
      </nav>

      {toast && (
        <div
          className={styles.toast}
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
