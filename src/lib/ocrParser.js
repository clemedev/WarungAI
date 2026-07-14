// ocrParser.js — OWNER: Engineer A.
// Turns raw Tesseract OCR text from a warung receipt into { items, total }.
// Receipt formats vary a lot, so this is deliberately permissive: it extracts
// what it can and the user corrects the rest in the confirm/edit step.

/** Lines containing these words are never treated as sale items. */
const NON_ITEM_WORDS = [
  // totals / payment
  'total', 'jumlah', 'jml', 'amaun', 'amount', 'subtotal', 'sub-total',
  'cash', 'tunai', 'change', 'baki', 'balance', 'bayaran', 'payment', 'paid',
  'qr', 'duitnow', 'tng', 'touch', 'grabpay', 'boost',
  // tax / service
  'tax', 'gst', 'sst', 'cukai', 'service', 'servis', 'rounding',
  // header / footer noise
  'invoice', 'resit', 'receipt', 'bill', 'no.', 'tel', 'fax', 'terima kasih',
  'thank', 'welcome', 'selamat', 'cashier', 'juruwang', 'table', 'meja',
  'date', 'tarikh', 'time', 'masa', 'qty', 'item', 'harga', 'price', 'rm',
];

const TOTAL_LINE_RE = /\b(grand\s*total|total|jumlah(\s*besar)?|jml|amaun|amount\s*due|amount)\b/i;
const SKIP_IF_TOTAL_RE = /\b(subtotal|sub-total|item|qty|quantity)\b/i;

/** "12.00", "12,00", "RM12.50", "RM 12" at the end of a line. */
const TRAILING_PRICE_RE = /(?:rm\s*)?(\d{1,4}(?:[.,]\d{2})|\d{1,4})\s*$/i;

function parseAmount(str) {
  return parseFloat(str.replace(',', '.'));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function looksLikeNonItem(line) {
  const lower = line.toLowerCase();
  return NON_ITEM_WORDS.some((w) => {
    // match whole words so e.g. "roti" isn't killed by "no."
    const re = new RegExp(`(^|[^a-z])${w.replace('.', '\\.')}([^a-z]|$)`, 'i');
    return re.test(lower);
  });
}

/** Dates, times, phone numbers, receipt numbers — all digits & separators. */
function looksLikeNumericNoise(line) {
  return /^[\d\s\/\-.:#*x]+$/i.test(line);
}

/**
 * Parse one line into a receipt item, or return null.
 * Handles:  "2 x Nasi Lemak 12.00"  |  "Nasi Lemak x2 12.00"
 *           "2 Nasi Lemak 12.00"    |  "Nasi Lemak 12.00" (qty 1)
 */
function parseItemLine(line) {
  const priceMatch = line.match(TRAILING_PRICE_RE);
  if (!priceMatch) return null;

  const price = parseAmount(priceMatch[1]);
  if (!(price > 0) || price > 9999) return null;

  let rest = line.slice(0, priceMatch.index).trim();
  // drop currency/label leftovers between name and price, e.g. "... RM"
  rest = rest.replace(/\b(rm|myr)\s*$/i, '').trim();
  if (!rest) return null;

  let quantity = 1;

  // leading "2 x " / "2x " / "2 "
  const leadQty = rest.match(/^(\d{1,3})\s*(?:x\s+|x(?=[a-z])|\s+)/i);
  // trailing " x2" / " x 2"
  const trailQty = rest.match(/\bx\s*(\d{1,3})\s*$/i);

  if (leadQty) {
    quantity = parseInt(leadQty[1], 10);
    rest = rest.slice(leadQty[0].length).trim();
  } else if (trailQty) {
    quantity = parseInt(trailQty[1], 10);
    rest = rest.slice(0, trailQty.index).trim();
  }

  // name must contain at least 2 letters to be a plausible item
  const name = rest.replace(/\s{2,}/g, ' ').replace(/[|_~`"]+/g, '').trim();
  if ((name.match(/[a-z]/gi) || []).length < 2) return null;
  if (!(quantity >= 1) || quantity > 999) quantity = 1;

  return { name, quantity, price };
}

/**
 * @param {string} rawText raw text out of Tesseract.js
 * @returns {{ items: Array<import('./types').ReceiptItem>, total: number|null }}
 */
export function parseReceiptText(rawText) {
  const items = [];
  let total = null;

  if (!rawText || typeof rawText !== 'string') return { items, total };

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // total line? (keep the LAST total-looking line — grand total is at the bottom)
    if (TOTAL_LINE_RE.test(line) && !SKIP_IF_TOTAL_RE.test(line)) {
      const m = line.match(TRAILING_PRICE_RE);
      if (m) {
        total = parseAmount(m[1]);
        continue;
      }
    }

    if (looksLikeNonItem(line) || looksLikeNumericNoise(line)) continue;

    const item = parseItemLine(line);
    if (item) items.push(item);
  }

  // no explicit total found → derive from items so the confirm step has a number
  if (total === null && items.length > 0) {
    total = round2(items.reduce((sum, it) => sum + it.price, 0));
  }

  return { items, total };
}
