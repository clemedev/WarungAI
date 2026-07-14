import { useState } from 'react';
import Dashboard from './components/Dashboard/Dashboard';
import ReceiptScanner from './components/ReceiptScanner/ReceiptScanner';
import ChatEntry from './components/ChatEntry/ChatEntry';
import ProductList from './components/ProductList/ProductList';
import ExpenseTracker from './components/ExpenseTracker/ExpenseTracker';
import { getProducts } from './lib/storage';
import styles from './App.module.css';

const TABS = [
  { id: 'dashboard', label: '📊 Papan', full: 'Papan pemuka' },
  { id: 'sale', label: '➕ Jualan', full: 'Rekod jualan' },
  { id: 'products', label: '🍜 Produk', full: 'Senarai produk' },
  { id: 'expenses', label: '🧾 Belanja', full: 'Perbelanjaan' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [entryMode, setEntryMode] = useState('chat'); // chat | scan
  const [products, setProducts] = useState(getProducts);
  const [toast, setToast] = useState('');

  function refreshProducts() {
    setProducts(getProducts());
  }

  function handleSaved(count) {
    setToast(`✅ ${count} jualan disimpan`);
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div className={styles.app}>
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

      <main className={styles.main}>
        {tab === 'dashboard' && <Dashboard />}

        {tab === 'sale' && (
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
          </div>
        )}

        {tab === 'products' && <ProductList onChange={refreshProducts} />}
        {tab === 'expenses' && <ExpenseTracker />}
      </main>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
