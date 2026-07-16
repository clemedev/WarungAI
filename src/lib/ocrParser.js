// Converts raw Tesseract OCR text into:
// {
//   items: [{ name, quantity, price }],
//   total: number | null
// }
//
// Receipt formats vary, so every parsed result must still be reviewed
// by the user before being saved.

const NON_ITEM_WORDS = [
  // Totals and payment
  'total',
  'jumlah',
  'jml',
  'amaun',
  'amount',
  'subtotal',
  'sub-total',
  'subjumlah',
  'sub-jumlah',
  'cash',
  'tunai',
  'change',
  'baki',
  'balance',
  'bayaran',
  'payment',
  'paid',
  'qr',
  'duitnow',
  'tng',
  'touch',
  'grabpay',
  'boost',

  // Tax and service fees
  'tax',
  'gst',
  'sst',
  'cukai',
  'service',
  'servis',
  'rounding',
  'caj',
  'perkhidmatan',

  // Header and footer noise
  'invoice',
  'resit',
  'receipt',
  'bill',
  'no.',
  'tel',
  'fax',
  'terima kasih',
  'thank',
  'welcome',
  'selamat',
  'cashier',
  'juruwang',
  'table',
  'meja',
  'date',
  'tarikh',
  'time',
  'masa',
  'qty',
  'item',
  'harga',
  'price',
];

const TOTAL_LINE_RE =
  /\b(grand\s*total|total|jumlah(\s*besar)?|jml|amaun|amount\s*due|amount)\b/i;

const SKIP_IF_TOTAL_RE =
  /\b(subtotal|sub-total|subjumlah|sub-jumlah|item|qty|quantity)\b/i;

const TRAILING_PRICE_RE =
  /(?:rm\s*)?(\d{1,4}(?:[.,]\d{2})|\d{1,4})\s*$/i;

function parseAmount(value) {
  return Number.parseFloat(
    value.replace(',', '.'),
  );
}

function round2(value) {
  return (
    Math.round(
      (Number(value) + Number.EPSILON) *
        100,
    ) / 100
  );
}

function escapeRegExp(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
}

function looksLikeNonItem(line) {
  const lower = line.toLowerCase();

  return NON_ITEM_WORDS.some(
    (word) => {
      const expression =
        new RegExp(
          `(^|[^a-z])${escapeRegExp(
            word,
          )}([^a-z]|$)`,
          'i',
        );

      return expression.test(lower);
    },
  );
}

function looksLikeNumericNoise(line) {
  return /^[\d\s/.:#*x-]+$/i.test(
    line,
  );
}

/**
 * Tesseract sometimes reads the number 1 as:
 * i, I, l, L, il, or ll.
 *
 * Only treat these values as quantities when they appear in the
 * expected quantity position.
 */
function parseQuantityToken(token) {
  if (/^\d{1,3}$/.test(token)) {
    return Number.parseInt(token, 10);
  }

  if (/^[iIlL]{1,2}$/.test(token)) {
    return 1;
  }

  return null;
}

/**
 * Supported item formats:
 *
 * 2 x Nasi Lemak 12.00
 * 2 Nasi Lemak 12.00
 * Nasi Lemak x2 12.00
 * Nasi Lemak 3 12.00
 * Nasi Lemak 12.00
 *
 * The final number is always treated as the line total.
 */
function parseItemLine(line) {
  const priceMatch =
    line.match(TRAILING_PRICE_RE);

  if (!priceMatch) {
    return null;
  }

  const price =
    parseAmount(priceMatch[1]);

  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 9999
  ) {
    return null;
  }

  let rest = line
    .slice(0, priceMatch.index)
    .trim();

  rest = rest
    .replace(/\b(rm|myr)\s*$/i, '')
    .trim();

  if (!rest) {
    return null;
  }

  let quantity = 1;

  // Format: "2 x Nasi Lemak" or "2 Nasi Lemak"
  const leadingQuantity =
    rest.match(
      /^(\d{1,3})\s*(?:x\s+|x(?=[a-z])|\s+)/i,
    );

  // Format: "Nasi Lemak x2"
  const trailingXQuantity =
    rest.match(
      /\bx\s*(\d{1,3})\s*$/i,
    );

  // Format: "Nasi Lemak 3"
  // Also handles OCR mistakes such as "Roti Canai il".
  const trailingQuantity =
    rest.match(
      /\s+(\d{1,3}|[iIlL]{1,2})\s*$/,
    );

  if (leadingQuantity) {
    quantity = Number.parseInt(
      leadingQuantity[1],
      10,
    );

    rest = rest
      .slice(
        leadingQuantity[0].length,
      )
      .trim();
  } else if (trailingXQuantity) {
    quantity = Number.parseInt(
      trailingXQuantity[1],
      10,
    );

    rest = rest
      .slice(
        0,
        trailingXQuantity.index,
      )
      .trim();
  } else if (trailingQuantity) {
    const parsedQuantity =
      parseQuantityToken(
        trailingQuantity[1],
      );

    if (parsedQuantity !== null) {
      quantity = parsedQuantity;

      rest = rest
        .slice(
          0,
          trailingQuantity.index,
        )
        .trim();
    }
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 999
  ) {
    quantity = 1;
  }

  const name = rest
    .replace(/\s{2,}/g, ' ')
    .replace(/[|_~`"]+/g, '')
    .trim();

  const letterCount =
    (name.match(/[a-z]/gi) ?? [])
      .length;

  if (letterCount < 2) {
    return null;
  }

  return {
    name,
    quantity,
    price: round2(price),
  };
}

export function parseReceiptText(
  rawText,
) {
  const items = [];
  let total = null;

  if (
    !rawText ||
    typeof rawText !== 'string'
  ) {
    return {
      items,
      total,
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (
      TOTAL_LINE_RE.test(line) &&
      !SKIP_IF_TOTAL_RE.test(line)
    ) {
      const totalMatch =
        line.match(
          TRAILING_PRICE_RE,
        );

      if (totalMatch) {
        total = parseAmount(
          totalMatch[1],
        );

        continue;
      }
    }

    if (
      looksLikeNonItem(line) ||
      looksLikeNumericNoise(line)
    ) {
      continue;
    }

    const item =
      parseItemLine(line);

    if (item) {
      items.push(item);
    }
  }

  if (
    total === null &&
    items.length > 0
  ) {
    total = round2(
      items.reduce(
        (sum, item) =>
          sum + item.price,
        0,
      ),
    );
  }

  return {
    items,
    total,
  };
}
