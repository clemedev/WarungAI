import { useState } from 'react';
import Dashboard from './components/Dashboard/Dashboard';
import ReceiptScanner from './components/ReceiptScanner/ReceiptScanner';
import ChatEntry from './components/ChatEntry/ChatEntry';
import ProductList from './components/ProductList/ProductList';
import ExpenseTracker from './components/ExpenseTracker/ExpenseTracker';
import LoginScreen from './components/LoginScreen/LoginScreen';
import SalesList from './components/SalesList/SalesList';
import { getProducts } from './lib/storage';
import { getCurrentUser, signOut } from './lib/auth';
import styles from './App.module.css';

const TABS = [
  { id: 'dashboard', label: '📊 Papan', full: 'Papan pemuka' },
  { id: 'sale', label: '➕ Jualan', full: 'Rekod jualan' },
  { id: 'products', label: '🍜 Produk', full: 'Senarai produk' },
  { id: 'expenses', label: '🧾 Belanja', full: 'Perbelanjaan' },
];

export default function App() {
  const [user, setUser] = useState(getCurrentUser);
  const [tab, setTab] = useState('dashboard');
  const [entryMode, setEntryMode] = useState('chat'); // chat | scan
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState('');
  const [salesVersion, setSalesVersion] = useState(0); // bump to refresh SalesList

  function handleAuthed(authedUser) {
    setUser(authedUser);
    setProducts(getProducts());
  }

  function handleSignOut() {
    signOut();
    setUser(null);
    setProducts([]);
    setTab('dashboard');
  }

  if (!user) {
    return <LoginScreen onAuthed={handleAuthed} />;
  }

  function refreshProducts() {
    setProducts(getProducts());
  }

  function handleSaved(count) {
    setToast(`✅ ${count} jualan disimpan`);
    setTimeout(() => setToast(''), 3000);
    setSalesVersion((v) => v + 1);
  }

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <header className={styles.header}>
          <h1 className={styles.logo}>🍛 WarungAI</h1>
          <p className={styles.tagline}>Rekod jualan dalam beberapa saat</p>
        </header>

        <nav className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? styles.tabActive : styles.tab}
              onClick={() => setTab(t.id)}
              title={t.full}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <button className={styles.signOut} onClick={handleSignOut}>
          🚪 {user.name} — Log keluar
        </button>
      </aside>

      <main className={styles.main}>
        {tab === 'dashboard' && (
          <div className={styles.wideContent}>
            <Dashboard />
          </div>
        )}

        {tab === 'sale' && (
          <div className={styles.narrowContent}>
            <div className={styles.saleWrap}>
              <div className={styles.subTabs}>
                <button
                  className={entryMode === 'chat' ? styles.subTabActive : styles.subTab}
                  onClick={() => setEntryMode('chat')}
                >
                  💬 Taip / 🎤 Suara
                </button>
                <button
                  className={entryMode === 'scan' ? styles.subTabActive : styles.subTab}
                  onClick={() => setEntryMode('scan')}
                >
                  📷 Imbas Resit
                </button>
              </div>
              {entryMode === 'chat' && (
                <ChatEntry products={products} onSaved={handleSaved} />
              )}
              {entryMode === 'scan' && (
                <ReceiptScanner products={products} onSaved={handleSaved} />
              )}

              <SalesList
                products={products}
                refreshKey={salesVersion}
                onChange={() => setSalesVersion((v) => v + 1)}
              />
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div className={styles.narrowContent}>
            <ProductList onChange={refreshProducts} />
          </div>
        )}
        {tab === 'expenses' && (
          <div className={styles.narrowContent}>
            <ExpenseTracker />
          </div>
        )}
      </main>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
