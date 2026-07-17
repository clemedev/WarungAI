import { supabase } from './supabase.js';
import { adjustDemoStock, archiveDemoProduct, getDemoProducts, isDemoStallEnabled, saveDemoProduct } from './demoStall.js';

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    sellPrice: Number(row.selling_price),
    costPrice: Number(row.cost_price),
    currentStock: Number(row.current_stock ?? 0),
    lowStockThreshold: Number(
      row.low_stock_threshold ?? 5,
    ),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(
      'Sesi pengguna tidak sah. Sila log masuk semula.',
    );
  }

  return user;
}

export async function getProducts() {
  if (isDemoStallEnabled()) return getDemoProducts();
  await requireUser();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Gagal mendapatkan produk: ${error.message}`,
    );
  }

  return (data ?? []).map(mapProduct);
}

export async function saveProduct(product) {
  if (isDemoStallEnabled()) return saveDemoProduct(product);
  const user = await requireUser();

  const name =
    typeof product?.name === 'string'
      ? product.name.trim()
      : '';

  const sellPrice = Number(
    product?.sellPrice,
  );

  const costPrice = Number(
    product?.costPrice,
  );

  const currentStock = Number(
    product?.currentStock ?? 0,
  );

  const lowStockThreshold = Number(
    product?.lowStockThreshold ?? 5,
  );

  if (!name) {
    throw new Error(
      'Nama produk diperlukan.',
    );
  }

  if (
    !Number.isFinite(sellPrice) ||
    sellPrice < 0
  ) {
    throw new Error(
      'Harga jual tidak sah.',
    );
  }

  if (
    !Number.isFinite(costPrice) ||
    costPrice < 0
  ) {
    throw new Error(
      'Harga kos tidak sah.',
    );
  }

  if (
    !Number.isInteger(currentStock) ||
    currentStock < 0
  ) {
    throw new Error(
      'Stok mesti nombor bulat yang sah.',
    );
  }

  if (
    !Number.isInteger(
      lowStockThreshold,
    ) ||
    lowStockThreshold < 0
  ) {
    throw new Error(
      'Paras stok rendah tidak sah.',
    );
  }

  const values = {
    user_id: user.id,
    name,
    selling_price: sellPrice,
    cost_price: costPrice,
    current_stock: currentStock,
    low_stock_threshold:
      lowStockThreshold,
    is_active: true,
    updated_at:
      new Date().toISOString(),
  };

  let query;

  if (product.id) {
    query = supabase
      .from('products')
      .update(values)
      .eq('id', product.id);
  } else {
    query = supabase
      .from('products')
      .insert(values);
  }

  const { data, error } = await query
    .select()
    .single();

  if (error) {
    throw new Error(
      `Gagal menyimpan produk: ${error.message}`,
    );
  }

  return mapProduct(data);
}

/**
 * Move a product's stock by `delta` (negative consumes, positive returns).
 *
 * Stock lives outside the atomic sale RPC: `create_single_item_sale` writes
 * the sale and its item but never touches `current_stock` (see BACKEND.md,
 * "Atomic Sale Creation"). Fixing that properly means editing the SQL
 * function, which needs database access we do not have — so the adjustment
 * happens here instead, immediately after the sale is written.
 *
 * Two consequences callers must respect:
 *
 * - It is NOT atomic with the sale. Callers must never let a stock failure
 *   fail a sale that is already committed: the money is the record that
 *   matters, and stock can always be corrected by editing the product.
 * - Two devices selling the same product at once can lose an update, since
 *   this reads then writes. Fine for a single stall; if multi-device use
 *   ever appears, this belongs in an RPC doing `current_stock - quantity`
 *   in one statement.
 */
export async function adjustStock(productId, delta) {
  if (isDemoStallEnabled()) return adjustDemoStock(productId, delta);
  await requireUser();

  const amount = Number(delta);

  if (!productId || !Number.isFinite(amount) || amount === 0) {
    return null;
  }

  const { data: product, error: readError } =
    await supabase
      .from('products')
      .select('current_stock')
      .eq('id', productId)
      .single();

  if (readError) {
    throw new Error(
      `Gagal membaca stok: ${readError.message}`,
    );
  }

  // Clamp at zero: a sale recorded for untracked stock should read as
  // "none left", never as a negative count.
  const nextStock = Math.max(
    0,
    Number(product?.current_stock ?? 0) +
      amount,
  );

  const { error: writeError } =
    await supabase
      .from('products')
      .update({
        current_stock: nextStock,
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', productId);

  if (writeError) {
    throw new Error(
      `Gagal mengemas kini stok: ${writeError.message}`,
    );
  }

  return nextStock;
}

export async function archiveProduct(id) {
  if (isDemoStallEnabled()) return archiveDemoProduct(id);
  await requireUser();

  if (!id) {
    throw new Error(
      'ID produk diperlukan.',
    );
  }

  const { error } = await supabase
    .from('products')
    .update({
      is_active: false,
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(
      `Gagal mengarkib produk: ${error.message}`,
    );
  }
}
