// Quick parser tests — run with `npm test` (plain node, no test framework).
import assert from 'node:assert/strict';
import { parseReceiptText } from '../src/lib/ocrParser.js';
import { parseNaturalLanguageEntry, matchProduct } from '../src/lib/nlEntryParser.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${name}\n      ${err.message}`);
  }
}

// ---------- parseReceiptText ----------

test('receipt: typical warung receipt with qty prefix and total', () => {
  const raw = [
    'WARUNG PAK ALI',
    'No. 12 Jalan Besar',
    'Tel: 012-3456789',
    '14/07/2026 12:30',
    '2 x Nasi Lemak 12.00',
    '1 x Teh Tarik 3.00',
    'Mee Goreng 7.50',
    'TOTAL 22.50',
    'TUNAI 50.00',
    'BAKI 27.50',
    'TERIMA KASIH',
  ].join('\n');
  const { items, total } = parseReceiptText(raw);
  assert.equal(items.length, 3);
  assert.deepEqual(items[0], { name: 'Nasi Lemak', quantity: 2, price: 12.0 });
  assert.deepEqual(items[1], { name: 'Teh Tarik', quantity: 1, price: 3.0 });
  assert.deepEqual(items[2], { name: 'Mee Goreng', quantity: 1, price: 7.5 });
  assert.equal(total, 22.5);
});

// The formats below are what real Tesseract output looks like for the
// sample receipt in sample_ocr/. Quantities used to be silently lost on
// every layout that prints a unit price next to the quantity.

test('receipt: sample_ocr.png as Tesseract actually reads it (1 -> "il")', () => {
  const raw = [
    'Jalan Kampung, 43000 Kajang,',
    'Tel: 012-345 6789',
    'Tarikh: 16/07/2026 09:15 Resit #: 000123',
    'ITEM QTY RM',
    'Nasi Lemak 3 12.00',
    'Teh Tarik 2 6.00',
    'Roti Canai il 2.50',
    'Milo Ais il 3.00',
    'Karipap 2 4.00',
    'SUBJUMLAH 27.50',
    'CAJ PERKHIDMATAN 0.50',
    'JUMLAH 28.00',
    'Tunai 28.00',
    'TERIMA KASIH',
  ].join('\n');
  const { items, total } = parseReceiptText(raw);
  assert.equal(items.length, 5);
  assert.deepEqual(items.map((i) => [i.name, i.quantity]), [
    ['Nasi Lemak', 3],
    ['Teh Tarik', 2],
    ['Roti Canai', 1],
    ['Milo Ais', 1],
    ['Karipap', 2],
  ]);
  assert.equal(total, 28);
});

test('receipt: "QTY x UNIT" keeps the quantity, not 1', () => {
  const { items } = parseReceiptText('Nasi Lemak 3 x 4.00 12.00');
  assert.deepEqual(items[0], { name: 'Nasi Lemak', quantity: 3, price: 12.0 });
});

test('receipt: "QTY @ UNIT" keeps the quantity, not 1', () => {
  const { items } = parseReceiptText('Nasi Lemak 3 @ 4.00 12.00');
  assert.deepEqual(items[0], { name: 'Nasi Lemak', quantity: 3, price: 12.0 });
});

test('receipt: plain NAME QTY UNIT TOTAL columns', () => {
  const { items } = parseReceiptText('Teh Tarik 2 3.00 6.00');
  assert.deepEqual(items[0], { name: 'Teh Tarik', quantity: 2, price: 6.0 });
});

test('receipt: leading qty with unit price does not pollute the name', () => {
  const { items } = parseReceiptText('2 Nasi Lemak 6.00 12.00');
  assert.deepEqual(items[0], { name: 'Nasi Lemak', quantity: 2, price: 12.0 });
});

test('receipt: a number is only treated as a unit price when qty x unit = total', () => {
  // 3 x 9.99 != 12.00, so nothing is stripped and no quantity is invented.
  const { items } = parseReceiptText('Nasi Lemak 3 x 9.99 12.00');
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].name, 'Nasi Lemak 3 x 9.99');
});

test('receipt: product names ending in digits survive ("100PLUS")', () => {
  const { items } = parseReceiptText('100PLUS 2 6.00');
  assert.deepEqual(items[0], { name: '100PLUS', quantity: 2, price: 6.0 });
});

test('receipt: BM total line "JUMLAH" and trailing x-quantity', () => {
  const raw = ['Roti Canai x3 4.50', 'Kopi O 2.00', 'JUMLAH RM6.50'].join('\n');
  const { items, total } = parseReceiptText(raw);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { name: 'Roti Canai', quantity: 3, price: 4.5 });
  assert.equal(total, 6.5);
});

test('receipt: no explicit total → derives sum of items', () => {
  const raw = ['Ayam Goreng 8.00', 'Air Sirap 1.50'].join('\n');
  const { items, total } = parseReceiptText(raw);
  assert.equal(items.length, 2);
  assert.equal(total, 9.5);
});

test('receipt: garbage/blurry OCR text yields empty result, no crash', () => {
  const { items, total } = parseReceiptText('~~~ ||| 123 //// \n@@@@\n');
  assert.equal(items.length, 0);
  assert.equal(total, null);
});

test('receipt: empty / non-string input is safe', () => {
  assert.deepEqual(parseReceiptText(''), { items: [], total: null });
  assert.deepEqual(parseReceiptText(null), { items: [], total: null });
});

test('receipt: comma decimals and subtotal skipped in favour of total', () => {
  const raw = ['Nasi Ayam 9,50', 'SUBTOTAL 9.50', 'TOTAL 10.00'].join('\n');
  const { items, total } = parseReceiptText(raw);
  assert.equal(items[0].price, 9.5);
  assert.equal(total, 10.0);
});

// ---------- parseNaturalLanguageEntry ----------

const products = [
  { id: 'p1', name: 'Nasi Lemak', sellPrice: 4.0, costPrice: 2.0 },
  { id: 'p2', name: 'Teh Tarik', sellPrice: 3.0, costPrice: 1.0 },
  { id: 'p3', name: 'Mee Goreng', sellPrice: 7.5, costPrice: 4.0 },
];

test('nl: "Sold 3 nasi lemak RM12" — the canonical example', () => {
  const r = parseNaturalLanguageEntry('Sold 3 nasi lemak RM12', products);
  assert.equal(r.productId, 'p1');
  assert.equal(r.quantity, 3);
  assert.equal(r.total, 12);
  assert.equal(r.needsReview, false);
});

test('nl: BM phrasing "jual 2 teh tarik rm6"', () => {
  const r = parseNaturalLanguageEntry('jual 2 teh tarik rm6', products);
  assert.equal(r.productId, 'p2');
  assert.equal(r.quantity, 2);
  assert.equal(r.total, 6);
});

test('nl: no RM stated → total derived from sellPrice × qty', () => {
  const r = parseNaturalLanguageEntry('sold 2 mee goreng', products);
  assert.equal(r.productId, 'p3');
  assert.equal(r.quantity, 2);
  assert.equal(r.total, 15);
});

test('nl: BM number word "dua teh tarik"', () => {
  const r = parseNaturalLanguageEntry('jual dua teh tarik', products);
  assert.equal(r.productId, 'p2');
  assert.equal(r.quantity, 2);
  assert.equal(r.total, 6);
});

test('nl: misspelling still fuzzy-matches ("nasi lemk")', () => {
  const r = parseNaturalLanguageEntry('sold 1 nasi lemk', products);
  assert.equal(r.productId, 'p1');
});

test('nl: "12 ringgit" amount form', () => {
  const r = parseNaturalLanguageEntry('3 nasi lemak 12 ringgit', products);
  assert.equal(r.total, 12);
  assert.equal(r.quantity, 3);
});

test('nl: unknown product → needsReview, no productId', () => {
  const r = parseNaturalLanguageEntry('sold 2 burger special rm10', products);
  assert.equal(r.productId, null);
  assert.equal(r.needsReview, true);
  assert.equal(r.total, 10);
  assert.equal(r.quantity, 2);
});

test('nl: empty input is safe', () => {
  const r = parseNaturalLanguageEntry('', products);
  assert.equal(r.productId, null);
  assert.equal(r.needsReview, true);
});

test('nl: empty product list is safe', () => {
  const r = parseNaturalLanguageEntry('sold 2 nasi lemak rm8', []);
  assert.equal(r.productId, null);
  assert.equal(r.quantity, 2);
  assert.equal(r.total, 8);
});

// ---------- Chinese product names via voice ----------

const zhProducts = [
  { id: 'z1', name: '椰浆饭', sellPrice: 4.0, costPrice: 2.0 },
  { id: 'z2', name: '拉茶', sellPrice: 3.0, costPrice: 1.0 },
  ...products,
];

test('nl: zh "三份椰浆饭" — hanzi qty + measure word, no spaces', () => {
  const r = parseNaturalLanguageEntry('三份椰浆饭', zhProducts);
  assert.equal(r.productId, 'z1');
  assert.equal(r.quantity, 3);
  assert.equal(r.total, 12);
  assert.equal(r.needsReview, false);
});

test('nl: zh "卖了两杯拉茶" — sale verb stripped, 两 = 2', () => {
  const r = parseNaturalLanguageEntry('卖了两杯拉茶', zhProducts);
  assert.equal(r.productId, 'z2');
  assert.equal(r.quantity, 2);
  assert.equal(r.total, 6);
});

test('nl: zh "3份椰浆饭" — digit qty glued to measure word', () => {
  const r = parseNaturalLanguageEntry('3份椰浆饭', zhProducts);
  assert.equal(r.productId, 'z1');
  assert.equal(r.quantity, 3);
});

test('nl: zh unknown product still safe', () => {
  const r = parseNaturalLanguageEntry('三份汉堡包', zhProducts);
  assert.equal(r.productId, null);
  assert.equal(r.quantity, 3);
  assert.equal(r.needsReview, true);
});

test('matchProduct: exact and extra-words matches', () => {
  assert.equal(matchProduct('nasi lemak', products).product.id, 'p1');
  assert.equal(matchProduct('nasi lemak ayam', products).product.id, 'p1');
  assert.equal(matchProduct('xyz', products).product, null);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
