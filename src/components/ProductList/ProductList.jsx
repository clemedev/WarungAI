import { useState } from 'react';
import { getProducts, saveProduct, deleteProduct } from '../../lib/storage';
import styles from './ProductList.module.css';

const EMPTY_FORM = { id: null, name: '', sellPrice: '', costPrice: '' };

/** Product setup page — add/edit/delete items with sell & cost prices. */
export default function ProductList({ onChange }) {
  const [products, setProducts] = useState(getProducts);
  const [form, setForm] = useState(EMPTY_FORM);

  const editing = form.id !== null;
  const canSave =
    form.name.trim() && Number(form.sellPrice) > 0 && Number(form.costPrice) >= 0;

  function refresh() {
    setProducts(getProducts());
    onChange?.();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSave) return;
    saveProduct({
      ...(editing ? { id: form.id } : {}),
      name: form.name.trim(),
      sellPrice: Number(form.sellPrice),
      costPrice: Number(form.costPrice),
    });
    setForm(EMPTY_FORM);
    refresh();
  }

  function handleEdit(p) {
    setForm({ id: p.id, name: p.name, sellPrice: p.sellPrice, costPrice: p.costPrice });
  }

  function handleDelete(p) {
    if (!window.confirm(`Padam "${p.name}"? (Delete this product?)`)) return;
    deleteProduct(p.id);
    if (form.id === p.id) setForm(EMPTY_FORM);
    refresh();
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h3 className={styles.title}>
          {editing ? 'Kemaskini produk' : 'Tambah produk'}
        </h3>
        <input
          className={styles.input}
          placeholder="Nama produk (cth: Nasi Lemak)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className={styles.priceRow}>
          <label className={styles.priceField}>
            Harga jual (RM)
            <input
              type="number"
              min="0"
              step="0.10"
              placeholder="4.00"
              value={form.sellPrice}
              onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
            />
          </label>
          <label className={styles.priceField}>
            Harga kos (RM)
            <input
              type="number"
              min="0"
              step="0.10"
              placeholder="2.00"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            />
          </label>
        </div>
        <div className={styles.formActions}>
          <button className={styles.save} type="submit" disabled={!canSave}>
            {editing ? 'Simpan perubahan' : '+ Tambah'}
          </button>
          {editing && (
            <button
              className={styles.cancel}
              type="button"
              onClick={() => setForm(EMPTY_FORM)}
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {products.length === 0 ? (
        <p className={styles.empty}>
          Tiada produk lagi. Tambah menu anda di atas untuk mula merekod jualan.
        </p>
      ) : (
        <ul className={styles.list}>
          {products.map((p) => {
            const margin = p.sellPrice - p.costPrice;
            return (
              <li key={p.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <strong>{p.name}</strong>
                  <span className={styles.prices}>
                    Jual RM{p.sellPrice.toFixed(2)} · Kos RM{p.costPrice.toFixed(2)} ·{' '}
                    <span className={margin >= 0 ? styles.marginOk : styles.marginBad}>
                      Untung RM{margin.toFixed(2)}
                    </span>
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.edit} onClick={() => handleEdit(p)}>
                    ✏️
                  </button>
                  <button className={styles.delete} onClick={() => handleDelete(p)}>
                    🗑️
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
