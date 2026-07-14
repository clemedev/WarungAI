// nlEntryParser.js — OWNER: Engineer A.
// Turns a typed or spoken sentence like "Sold 3 nasi lemak RM12" /
// "jual 2 teh tarik rm6" into a partial Sale, fuzzy-matched against the
// product list. Output goes to the confirm/edit step, never straight to save.

const FILLER_WORDS = new Set([
  // English
  'sold', 'sell', 'sale', 'add', 'i', 'a', 'an', 'the', 'of', 'for', 'at',
  'today', 'just', 'please',
  // Bahasa Malaysia
  'jual', 'jualan', 'tambah', 'saya', 'sudah', 'dah', 'tadi', 'hari', 'ini',
  'beli', 'orang', 'mangkuk', 'pinggan', 'bungkus', 'cawan', 'gelas',
]);

const BM_NUMBER_WORDS = {
  satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7,
  lapan: 8, sembilan: 9, sepuluh: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10,
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Classic Levenshtein distance. */
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[n];
}

/** 0..1 similarity between two strings. */
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Fuzzy-match free text against the product list.
 * Scores each product on whole-string similarity plus per-word overlap, so
 * "nasi lemak ayam" still matches product "Nasi Lemak".
 *
 * @param {string} text
 * @param {Array<import('./types').Product>} products
 * @returns {{ product: import('./types').Product|null, confidence: number }}
 */
export function matchProduct(text, products) {
  const query = normalize(text);
  if (!query || !products?.length) return { product: null, confidence: 0 };

  let best = null;
  let bestScore = 0;

  for (const product of products) {
    const name = normalize(product.name);
    if (!name) continue;

    let score = similarity(query, name);

    // containment either way is a strong signal
    if (query.includes(name) || name.includes(query)) {
      score = Math.max(score, 0.9);
    }

    // per-word overlap: fraction of product-name words present (fuzzily) in query
    const nameWords = name.split(' ');
    const queryWords = query.split(' ');
    const hits = nameWords.filter((nw) =>
      queryWords.some((qw) => similarity(qw, nw) >= 0.75),
    ).length;
    score = Math.max(score, hits / nameWords.length - 0.05);

    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  if (bestScore < 0.55) return { product: null, confidence: round2(bestScore) };
  return { product: best, confidence: round2(bestScore) };
}

/**
 * @param {string} text  typed or voice-transcribed sentence
 * @param {Array<import('./types').Product>} products
 * @returns {import('./types').ParsedEntry}
 */
export function parseNaturalLanguageEntry(text, products) {
  const result = {
    productId: null,
    productName: null,
    quantity: 1,
    total: null,
    confidence: 0,
    needsReview: true,
    raw: text ?? '',
  };
  if (!text || typeof text !== 'string') return result;

  let working = ` ${text.toLowerCase()} `;

  // 1. RM amount: "rm12", "rm 12.50", "12 ringgit", "12.50rm"
  const rmMatch =
    working.match(/rm\s*(\d+(?:[.,]\d{1,2})?)/i) ||
    working.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:rm|ringgit)/i);
  if (rmMatch) {
    result.total = parseFloat(rmMatch[1].replace(',', '.'));
    working = working.replace(rmMatch[0], ' ');
  }

  // 2. quantity: first standalone number, or a number word (dua/two/...)
  const qtyMatch = working.match(/(?:^|\s)(\d{1,3})(?:\s|$|x\b)/);
  if (qtyMatch) {
    result.quantity = parseInt(qtyMatch[1], 10);
    working = working.replace(qtyMatch[0], ' ');
  } else {
    for (const [word, value] of Object.entries(BM_NUMBER_WORDS)) {
      const re = new RegExp(`(^|\\s)${word}(\\s|$)`);
      if (re.test(working)) {
        result.quantity = value;
        working = working.replace(re, ' ');
        break;
      }
    }
  }

  // 3. what's left minus filler words should be the product name
  const nameText = normalize(working)
    .split(' ')
    .filter((w) => w && !FILLER_WORDS.has(w))
    .join(' ');

  const { product, confidence } = matchProduct(nameText, products ?? []);
  result.confidence = confidence;

  if (product) {
    result.productId = product.id;
    result.productName = product.name;
    // no RM stated → derive from the product's sell price
    if (result.total === null) {
      result.total = round2(product.sellPrice * result.quantity);
    }
    // confident match with a total → good to go, still shown for confirmation
    result.needsReview = confidence < 0.75;
  } else {
    // keep whatever name text we extracted so the user can pick manually
    result.productName = nameText || null;
    result.needsReview = true;
  }

  return result;
}
