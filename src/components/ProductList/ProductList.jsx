import {
  useEffect,
  useState,
} from 'react';

import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
          : t('product.loadFailed'),
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
          : t('product.saveFailed'),
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
        t('product.archiveConfirm', { name: product.name }),
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
          : t('product.archiveFailed'),
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
            ? t('product.editTitle')
            : t('product.addTitle')}
        </h3>

        <input
          className={styles.input}
          type="text"
          placeholder={t(
            'product.namePlaceholder',
          )}
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
            {t('product.sellPrice')}

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
            {t('product.costPrice')}

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
            {t('product.currentStock')}

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
            {t(
              'product.lowStockThreshold',
            )}

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
              ? t('product.saving')
              : editing
                ? t('product.saveChanges')
                : t('product.add')}
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
              {t('product.cancel')}
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className={styles.empty}>
          {t('product.loading')}
        </p>
      ) : products.length === 0 ? (
        <p className={styles.empty}>
          {t('product.empty')}
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
                      {t('product.profit')} RM
                      {margin.toFixed(2)}
                    </span>
                  </span>

                  <span
                    className={
                      styles.prices
                    }
                  >
                    {t('product.stock', {
                      count:
                        product.currentStock,
                    })}
                    {' · '}
                    {t('product.warnAt', {
                      threshold:
                        product.lowStockThreshold,
                    })}
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
                    aria-label={t(
                      'product.editAria',
                      { name: product.name },
                    )}
                    title={t(
                      'product.editTitle2',
                    )}
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
                    aria-label={t(
                      'product.archiveAria',
                      { name: product.name },
                    )}
                    title={t(
                      'product.archiveTitle',
                    )}
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
