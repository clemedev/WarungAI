import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useTranslation } from 'react-i18next';

import Dashboard from './components/Dashboard/Dashboard';
import SaleReceiptScanner from './components/ReceiptScanner/SaleReceiptScanner';
import ChatEntry from './components/ChatEntry/ChatEntry';
import ProductList from './components/ProductList/ProductList';
import ExpenseTracker from './components/ExpenseTracker/ExpenseTracker';
import LoginScreen from './components/LoginScreen/LoginScreen';
import SalesList from './components/SalesList/SalesList';
import ThemeToggle from './components/ThemeToggle/ThemeToggle.jsx';
import LanguageSwitcher from './components/LanguageSwitcher/LanguageSwitcher';
import OverviewMetrics from './components/OverviewMetrics/OverviewMetrics';

import {
  getProducts,
} from './lib/supabaseProducts.js';

import {
  getCurrentUser,
  onAuthStateChange,
  signOut,
} from './lib/supabaseAuth.js';

import i18n, {
  getDateLocale,
} from './i18n/config.js';

import styles from './App.module.css';

/**
 * Nav model. Labels/descriptions are not stored here — they live in the
 * locale files under `views.<id>` and are resolved at render, so they
 * follow the language picker.
 */
const VIEWS = [
  { id: 'overview', icon: '⌂' },
  { id: 'records', icon: '≡' },
  { id: 'inventory', icon: '◫' },
  { id: 'insights', icon: '↗' },
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
      // Module scope, so the i18n instance is used directly rather than
      // the hook. Only reached when a user has neither name nor email.
      i18n.t('app.defaultUserName'),
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

  let users = [];

  try {
    const savedUsers = JSON.parse(
      localStorage.getItem(
        'warungai.users',
      ),
    );

    if (Array.isArray(savedUsers)) {
      users = savedUsers;
    }
  } catch {
    users = [];
  }

  const localUser = {
    id: mappedUser.id,
    name: mappedUser.name,
    email: mappedUser.email,
    authProvider: 'supabase',
  };

  const existingIndex =
    users.findIndex(
      (item) =>
        item.id === localUser.id,
    );

  if (existingIndex >= 0) {
    users[existingIndex] = {
      ...users[existingIndex],
      ...localUser,
    };
  } else {
    users.push(localUser);
  }

  localStorage.setItem(
    'warungai.users',
    JSON.stringify(users),
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

/** Returns a locale key, not a phrase — resolved by the caller via t(). */
function getGreetingKey() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'greeting.morning';
  }

  if (hour < 18) {
    return 'greeting.afternoon';
  }

  return 'greeting.evening';
}

function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingLogo}>
          🍛
        </div>

        <h1>WarungAI</h1>

        <p>{t('app.loading')}</p>

        <div className={styles.loadingTrack}>
          <span />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { t, i18n: i18nInstance } =
    useTranslation();

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [view, setView] =
    useState('overview');

  const [composer, setComposer] =
    useState('chat');

  const [recordType, setRecordType] =
    useState('sales');

  const [products, setProducts] =
    useState([]);

  const [
    salesVersion,
    setSalesVersion,
  ] = useState(0);

  const [
    activityVersion,
    setActivityVersion,
  ] = useState(0);

  const [toast, setToast] =
    useState('');

  const [
    createMenuOpen,
    setCreateMenuOpen,
  ] = useState(false);

  const currentView = useMemo(
    () =>
      VIEWS.find(
        (item) => item.id === view,
      ) ?? VIEWS[0],
    [view],
  );

  // Re-formats when the language changes, so the date is not stuck in Malay.
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(
        getDateLocale(
          i18nInstance.language,
        ),
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      ).format(new Date()),
    [i18nInstance.language],
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
    authenticatedUser,
  ) {
    setUser(authenticatedUser);
    await loadProducts();
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : t('app.signOutFailed'),
      );

      return;
    }

    setLocalStorageIdentity(null);
    setUser(null);
    setProducts([]);
    setView('overview');
    setComposer('chat');
    setRecordType('sales');
    setCreateMenuOpen(false);
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
      t('toast.salesSaved', { count }),
    );

    setSalesVersion(
      (version) => version + 1,
    );

    setActivityVersion(
      (version) => version + 1,
    );

    window.setTimeout(() => {
      setToast('');
    }, 3000);
  }

  function openSale() {
    setView('overview');
    setComposer('chat');
    setCreateMenuOpen(false);
  }

  function openReceipt() {
    setView('overview');
    setComposer('receipt');
    setCreateMenuOpen(false);
  }

  function openExpense() {
    setView('records');
    setRecordType('expenses');
    setCreateMenuOpen(false);
  }

  function openProduct() {
    setView('inventory');
    setCreateMenuOpen(false);
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
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            🍛
          </div>

          <div className={styles.brandCopy}>
            <strong>WarungAI</strong>
            <span>
              {t('app.workspaceTag')}
            </span>
          </div>
        </div>

        <div className={styles.themeControl}>
          <ThemeToggle
            darkSurface
          />
        </div>

        <div className={styles.sidebarLanguage}>
          <LanguageSwitcher darkSurface />
        </div>

        <p className={styles.navHeading}>
          {t('app.navHeading')}
        </p>

        <nav
          className={styles.desktopNav}
          aria-label={t('app.navAria')}
        >
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                view === item.id
                  ? styles.navActive
                  : styles.navItem
              }
              onClick={() =>
                setView(item.id)
              }
            >
              <span
                className={styles.navSymbol}
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>
                {t(
                  `views.${item.id}.label`,
                )}
              </span>
            </button>
          ))}
        </nav>

        <button
          type="button"
          className={styles.sidebarCreate}
          onClick={() =>
            setCreateMenuOpen(true)
          }
        >
          <span>+</span>
          {t('app.recordActivity')}
        </button>

        <div className={styles.sidebarSpacer} />

        <div className={styles.businessCard}>
          <div className={styles.avatar}>
            {getInitials(user.name)}
          </div>

          <div className={styles.businessDetails}>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.signOut}
          onClick={handleSignOut}
        >
          ↪ {t('app.signOut')}
        </button>
      </aside>

      <section className={styles.application}>
        <header className={styles.mobileHeader}>
          <div className={styles.mobileBrand}>
            <span>🍛</span>
            <strong>WarungAI</strong>
          </div>

          <div className={styles.mobileControls}>
            <LanguageSwitcher />

            <ThemeToggle compact />

            <button
              type="button"
              className={styles.mobileProfile}
              onClick={() =>
                setCreateMenuOpen(true)
              }
              aria-label={t(
                'app.openMenuAria',
              )}
            >
              {getInitials(user.name)}
            </button>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.workspace}>
            <header className={styles.pageHeader}>
              <div>
                <p className={styles.greeting}>
                  {t(getGreetingKey())},{' '}
                  <strong>{user.name}</strong>
                </p>

                <h1 className={styles.pageTitle}>
                  {t(
                    `views.${currentView.id}.label`,
                  )}
                </h1>

                <p
                  className={
                    styles.pageDescription
                  }
                >
                  {t(
                    `views.${currentView.id}.description`,
                  )}
                </p>
              </div>

              <div className={styles.headerMeta}>
                <time className={styles.headerDate}>
                  {formattedDate}
                </time>
              </div>
            </header>

            {view === 'overview' && (
              <>
                <OverviewMetrics
                  refreshKey={
                    activityVersion
                  }
                />

                <div
                  className={
                    styles.overviewLayout
                  }
                >
                <section
                  className={
                    styles.capturePanel
                  }
                >
                  <div
                    className={
                      styles.captureHeader
                    }
                  >
                    <div>
                      <p>
                        {t(
                          'capture.eyebrow',
                        )}
                      </p>
                      <h2>
                        {t('capture.title')}
                      </h2>
                      <span>
                        {t('capture.hint')}
                      </span>
                    </div>

                    <div
                      className={
                        styles.captureStatus
                      }
                    >
                      {t('capture.badge')}
                    </div>
                  </div>

                  <div
                    className={
                      styles.captureTabs
                    }
                  >
                    <button
                      type="button"
                      className={
                        composer === 'chat'
                          ? styles.captureTabActive
                          : styles.captureTab
                      }
                      onClick={() =>
                        setComposer('chat')
                      }
                    >
                      ✦ {t('capture.tabChat')}
                    </button>

                    <button
                      type="button"
                      className={
                        composer ===
                        'receipt'
                          ? styles.captureTabActive
                          : styles.captureTab
                      }
                      onClick={() =>
                        setComposer(
                          'receipt',
                        )
                      }
                    >
                      ▣{' '}
                      {t(
                        'capture.tabReceipt',
                      )}
                    </button>
                  </div>

                  <div
                    className={
                      styles.captureBody
                    }
                  >
                    {composer ===
                      'chat' && (
                      <ChatEntry
                        products={products}
                        onSaved={
                          handleSaved
                        }
                      />
                    )}

                    {composer ===
                      'receipt' && (
                      <SaleReceiptScanner
                        products={products}
                        onSaved={
                          handleSaved
                        }
                      />
                    )}
                  </div>
                </section>

                <aside
                  className={
                    styles.todayPanel
                  }
                >
                  <p
                    className={
                      styles.todayEyebrow
                    }
                  >
                    {t('quick.eyebrow')}
                  </p>

                  <h2>{t('quick.title')}</h2>

                  <div
                    className={
                      styles.actionStack
                    }
                  >
                    <button
                      type="button"
                      onClick={openSale}
                    >
                      <span>+</span>
                      <div>
                        <strong>
                          {t(
                            'quick.saleTitle',
                          )}
                        </strong>
                        <small>
                          {t(
                            'quick.saleHint',
                          )}
                        </small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={openReceipt}
                    >
                      <span>▣</span>
                      <div>
                        <strong>
                          {t(
                            'quick.receiptTitle',
                          )}
                        </strong>
                        <small>
                          {t(
                            'quick.receiptHint',
                          )}
                        </small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={openExpense}
                    >
                      <span>−</span>
                      <div>
                        <strong>
                          {t(
                            'quick.expenseTitle',
                          )}
                        </strong>
                        <small>
                          {t(
                            'quick.expenseHint',
                          )}
                        </small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={openProduct}
                    >
                      <span>◫</span>
                      <div>
                        <strong>
                          {t(
                            'quick.productTitle',
                          )}
                        </strong>
                        <small>
                          {t(
                            'quick.productHint',
                          )}
                        </small>
                      </div>
                    </button>
                  </div>
                </aside>

                <section
                  className={
                    styles.recentPanel
                  }
                >
                  <div
                    className={
                      styles.sectionHeading
                    }
                  >
                    <div>
                      <p>
                        {t('recent.eyebrow')}
                      </p>
                      <h2>
                        {t('recent.title')}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setView('records');
                        setRecordType(
                          'sales',
                        );
                      }}
                    >
                      {t('recent.viewAll')}
                    </button>
                  </div>

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
                </section>
                </div>
              </>
            )}

            {view === 'records' && (
              <div
                className={
                  styles.recordsLayout
                }
              >
                <div
                  className={
                    styles.recordTabs
                  }
                >
                  <button
                    type="button"
                    className={
                      recordType === 'sales'
                        ? styles.recordTabActive
                        : styles.recordTab
                    }
                    onClick={() =>
                      setRecordType('sales')
                    }
                  >
                    {t('records.sales')}
                  </button>

                  <button
                    type="button"
                    className={
                      recordType ===
                      'expenses'
                        ? styles.recordTabActive
                        : styles.recordTab
                    }
                    onClick={() =>
                      setRecordType(
                        'expenses',
                      )
                    }
                  >
                    {t('records.expenses')}
                  </button>
                </div>

                {recordType === 'sales' && (
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
                )}

                {recordType ===
                  'expenses' && (
                  <ExpenseTracker
                    onChange={() =>
                      setActivityVersion(
                        (version) =>
                          version + 1,
                      )
                    }
                  />
                )}
              </div>
            )}

            {view === 'inventory' && (
              <div
                className={
                  styles.inventoryLayout
                }
              >
                <ProductList
                  onChange={
                    refreshProducts
                  }
                />
              </div>
            )}

            {view === 'insights' && (
              <div
                className={
                  styles.insightsLayout
                }
              >
                <Dashboard />
              </div>
            )}
          </div>
        </main>
      </section>

      <nav
        className={styles.mobileNav}
        aria-label={t('app.mobileNavAria')}
      >
        {VIEWS.slice(0, 2).map(
          (item) => (
            <button
              key={item.id}
              type="button"
              className={
                view === item.id
                  ? styles.mobileNavActive
                  : styles.mobileNavItem
              }
              onClick={() =>
                setView(item.id)
              }
            >
              <span>{item.icon}</span>
              <small>
                {t(
                  `views.${item.id}.short`,
                )}
              </small>
            </button>
          ),
        )}

        <button
          type="button"
          className={styles.mobileCreate}
          onClick={() =>
            setCreateMenuOpen(true)
          }
          aria-label={t(
            'app.newActivityAria',
          )}
        >
          +
        </button>

        {VIEWS.slice(2).map(
          (item) => (
            <button
              key={item.id}
              type="button"
              className={
                view === item.id
                  ? styles.mobileNavActive
                  : styles.mobileNavItem
              }
              onClick={() =>
                setView(item.id)
              }
            >
              <span>{item.icon}</span>
              <small>
                {t(
                  `views.${item.id}.short`,
                )}
              </small>
            </button>
          ),
        )}
      </nav>

      {createMenuOpen && (
        <div
          className={styles.createOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setCreateMenuOpen(false);
            }
          }}
        >
          <section
            className={styles.createSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
          >
            <div
              className={
                styles.sheetHandle
              }
            />

            <header
              className={
                styles.createHeader
              }
            >
              <div>
                <p>
                  {t('createSheet.eyebrow')}
                </p>
                <h2 id="create-title">
                  {t('createSheet.title')}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateMenuOpen(
                    false,
                  )
                }
                aria-label={t(
                  'createSheet.close',
                )}
              >
                ×
              </button>
            </header>

            <div
              className={
                styles.createOptions
              }
            >
              <button
                type="button"
                onClick={openSale}
              >
                <span>+</span>
                <div>
                  <strong>
                    {t(
                      'createSheet.saleTitle',
                    )}
                  </strong>
                  <small>
                    {t(
                      'createSheet.saleHint',
                    )}
                  </small>
                </div>
              </button>

              <button
                type="button"
                onClick={openReceipt}
              >
                <span>▣</span>
                <div>
                  <strong>
                    {t(
                      'createSheet.receiptTitle',
                    )}
                  </strong>
                  <small>
                    {t(
                      'createSheet.receiptHint',
                    )}
                  </small>
                </div>
              </button>

              <button
                type="button"
                onClick={openExpense}
              >
                <span>−</span>
                <div>
                  <strong>
                    {t(
                      'createSheet.expenseTitle',
                    )}
                  </strong>
                  <small>
                    {t(
                      'createSheet.expenseHint',
                    )}
                  </small>
                </div>
              </button>

              <button
                type="button"
                onClick={openProduct}
              >
                <span>◫</span>
                <div>
                  <strong>
                    {t(
                      'createSheet.productTitle',
                    )}
                  </strong>
                  <small>
                    {t(
                      'createSheet.productHint',
                    )}
                  </small>
                </div>
              </button>
            </div>
          </section>
        </div>
      )}

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
