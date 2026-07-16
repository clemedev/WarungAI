import { supabase } from './supabase.js';

function mapSale(row) {
  const item =
    Array.isArray(row.sale_items)
      ? row.sale_items[0]
      : null;

  return {
    id: row.id,
    date: row.sale_date,
    productId:
      item?.product_id ?? null,
    productName:
      item?.product_name_snapshot ??
      'Produk tidak dikenali',
    quantity:
      Number(item?.quantity ?? 0),
    unitPrice:
      Number(item?.unit_price ?? 0),
    unitCost:
      Number(item?.unit_cost ?? 0),
    total:
      Number(row.total_revenue),
    totalCost:
      Number(row.total_cost),
    grossProfit:
      Number(row.gross_profit),
    source: row.source,
    paymentMethod:
      row.payment_method,
    createdAt: row.created_at,
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

export async function getSales() {
  await requireUser();

  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      sale_date,
      payment_method,
      source,
      total_revenue,
      total_cost,
      gross_profit,
      created_at,
      sale_items (
        product_id,
        product_name_snapshot,
        quantity,
        unit_price,
        unit_cost,
        line_total
      )
    `)
    .order('sale_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Gagal mendapatkan jualan: ${error.message}`,
    );
  }

  return (data ?? []).map(mapSale);
}

export async function saveSale(sale) {
  await requireUser();

  const productId = String(
    sale?.productId ?? '',
  ).trim();

  const quantity = Number(
    sale?.quantity,
  );

  const total = Number(
    sale?.total,
  );

  const paymentMethod =
    sale?.paymentMethod === 'qr'
      ? 'qr'
      : 'cash';

  const validSources = [
    'manual',
    'chat',
    'voice',
    'ocr',
    'receipt',
  ];

  const source =
    validSources.includes(sale?.source)
      ? sale.source
      : 'manual';

  const date = String(
    sale?.date ?? '',
  ).trim();

  if (!productId) {
    throw new Error(
      'Produk diperlukan.',
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      'Kuantiti mesti nombor bulat melebihi sifar.',
    );
  }

  if (
    !Number.isFinite(total) ||
    total < 0
  ) {
    throw new Error(
      'Jumlah jualan tidak sah.',
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    throw new Error(
      'Tarikh jualan tidak sah.',
    );
  }

  const { data, error } =
    await supabase.rpc(
      'create_single_item_sale',
      {
        p_product_id: productId,
        p_quantity: quantity,
        p_total_revenue: total,
        p_payment_method:
          paymentMethod,
        p_source: source,
        p_sale_date: date,
      },
    );

  if (error) {
    throw new Error(
      `Gagal menyimpan jualan: ${error.message}`,
    );
  }

  const saleId = data;

  const { data: savedSale, error: loadError } =
    await supabase
      .from('sales')
      .select(`
        id,
        sale_date,
        payment_method,
        source,
        total_revenue,
        total_cost,
        gross_profit,
        created_at,
        sale_items (
          product_id,
          product_name_snapshot,
          quantity,
          unit_price,
          unit_cost,
          line_total
        )
      `)
      .eq('id', saleId)
      .single();

  if (loadError) {
    throw new Error(
      `Jualan disimpan tetapi gagal dimuatkan: ${loadError.message}`,
    );
  }

  return mapSale(savedSale);
}

export async function deleteSale(id) {
  await requireUser();

  if (!id) {
    throw new Error(
      'ID jualan diperlukan.',
    );
  }

  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(
      `Gagal memadam jualan: ${error.message}`,
    );
  }
}
