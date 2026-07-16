import {
  useEffect,
  useState,
} from 'react';

import {
  archiveProduct,
  getProducts,
  saveProduct,
} from '../../lib/supabaseProducts.js';

import styles from './ProductList.module.css';

const EMPTY_FORM = {
  id: null,
  name: '',
  sellPrice: '',
  costPrice: '',
  currentStock: '0',
  lowStockThreshold: '5',
};

export default function ProductList({
  onChange,
}) {
  const [products, setProducts] =
    useState([]);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const editing = form.id !== null;

  const canSave =
    form.name.trim().length > 0 &&
    Number.isFinite(
      Number(form.sellPrice),
    ) &&
    Number(form.sellPrice) >= 0 &&
    Number.isFinite(
      Number(form.costPrice),
    ) &&
    Number(form.costPrice) >= 0 &&
    Number.isInteger(
      Number(form.currentStock),
    ) &&
    Number(form.currentStock) >= 0 &&
    Number.isInteger(
      Number(
        form.lowStockThreshold,
      ),
    ) &&
    Number(
      form.lowStockThreshold,
    ) >= 0;

  async function loadProducts() {
    setLoading(true);
    setError('');

    try {
      const nextProducts =
        await getProducts();

      setProducts(nextProducts);
      onChange?.(nextProducts);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Gagal mendapatkan senarai produk.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSave || saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await saveProduct({
        ...(editing
          ? { id: form.id }
          : {}),
        name: form.name.trim(),
        sellPrice: Number(
          form.sellPrice,
        ),
        costPrice: Number(
          form.costPrice,
        ),
        currentStock: Number(
          form.currentStock,
        ),
        lowStockThreshold: Number(
          form.lowStockThreshold,
        ),
      });

      setForm(EMPTY_FORM);
      await loadProducts();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Gagal menyimpan produk.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(product) {
    setError('');

    setForm({
      id: product.id,
      name: product.name,
      sellPrice: String(
        product.sellPrice,
      ),
      costPrice: String(
        product.costPrice,
      ),
      currentStock: String(
        product.currentStock ?? 0,
      ),
      lowStockThreshold: String(
        product.lowStockThreshold ?? 5,
      ),
    });
  }

  async function handleArchive(
    product,
  ) {
    const confirmed =
      window.confirm(
        `Arkibkan "${product.name}"? Produk ini tidak akan muncul untuk jualan baru.`,
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await archiveProduct(
        product.id,
      );

      if (form.id === product.id) {
        setForm(EMPTY_FORM);
      }

      await loadProducts();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Gagal mengarkib produk.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <h3 className={styles.title}>
          {editing
            ? 'Kemaskini produk'
            : 'Tambah produk'}
        </h3>

        <input
          className={styles.input}
          type="text"
          placeholder="Nama produk (cth: Nasi Lemak)"
          value={form.name}
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
            })
          }
          disabled={saving}
          required
        />

        <div
          className={styles.priceRow}
        >
          <label
            className={
              styles.priceField
            }
          >
            Harga jual (RM)

            <input
              type="number"
              min="0"
              step="0.10"
              inputMode="decimal"
              placeholder="4.00"
              value={form.sellPrice}
              onChange={(event) =>
                setForm({
                  ...form,
                  sellPrice:
                    event.target.value,
                })
              }
              disabled={saving}
              required
            />
          </label>

          <label
            className={
              styles.priceField
            }
          >
            Harga kos (RM)

            <input
              type="number"
              min="0"
              step="0.10"
              inputMode="decimal"
              placeholder="2.00"
              value={form.costPrice}
              onChange={(event) =>
                setForm({
                  ...form,
                  costPrice:
                    event.target.value,
                })
              }
              disabled={saving}
              required
            />
          </label>
        </div>

        <div
          className={styles.priceRow}
        >
          <label
            className={
              styles.priceField
            }
          >
            Stok semasa

            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={form.currentStock}
              onChange={(event) =>
                setForm({
                  ...form,
                  currentStock:
                    event.target.value,
                })
              }
              disabled={saving}
            />
          </label>

          <label
            className={
              styles.priceField
            }
          >
            Amaran stok rendah

            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={
                form.lowStockThreshold
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  lowStockThreshold:
                    event.target.value,
                })
              }
              disabled={saving}
            />
          </label>
        </div>

        {error && (
          <p className={styles.empty}>
            {error}
          </p>
        )}

        <div
          className={
            styles.formActions
          }
        >
          <button
            className={styles.save}
            type="submit"
            disabled={
              !canSave || saving
            }
          >
            {saving
              ? 'Menyimpan...'
              : editing
                ? 'Simpan perubahan'
                : '+ Tambah'}
          </button>

          {editing && (
            <button
              className={
                styles.cancel
              }
              type="button"
              onClick={() =>
                setForm(EMPTY_FORM)
              }
              disabled={saving}
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className={styles.empty}>
          Memuatkan produk...
        </p>
      ) : products.length === 0 ? (
        <p className={styles.empty}>
          Tiada produk lagi. Tambah menu
          anda di atas untuk mula merekod
          jualan.
        </p>
      ) : (
        <ul className={styles.list}>
          {products.map((product) => {
            const margin =
              product.sellPrice -
              product.costPrice;

            return (
              <li
                key={product.id}
                className={styles.item}
              >
                <div
                  className={
                    styles.itemInfo
                  }
                >
                  <strong>
                    {product.name}
                  </strong>

                  <span
                    className={
                      styles.prices
                    }
                  >
                    Jual RM
                    {product.sellPrice.toFixed(
                      2,
                    )}
                    {' · '}
                    Kos RM
                    {product.costPrice.toFixed(
                      2,
                    )}
                    {' · '}

                    <span
                      className={
                        margin >= 0
                          ? styles.marginOk
                          : styles.marginBad
                      }
                    >
                      Untung RM
                      {margin.toFixed(2)}
                    </span>
                  </span>

                  <span
                    className={
                      styles.prices
                    }
                  >
                    Stok:{' '}
                    {product.currentStock}
                    {' · '}
                    Amaran pada{' '}
                    {
                      product.lowStockThreshold
                    }
                  </span>
                </div>

                <div
                  className={
                    styles.itemActions
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.edit
                    }
                    onClick={() =>
                      handleEdit(product)
                    }
                    disabled={saving}
                    aria-label={`Kemaskini ${product.name}`}
                    title="Kemaskini produk"
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    className={
                      styles.delete
                    }
                    onClick={() =>
                      handleArchive(
                        product,
                      )
                    }
                    disabled={saving}
                    aria-label={`Arkibkan ${product.name}`}
                    title="Arkibkan produk"
                  >
                    🗄️
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
