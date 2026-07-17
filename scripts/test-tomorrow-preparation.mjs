import assert from 'node:assert/strict';
import { createTomorrowPreparation } from '../src/lib/tomorrowPreparation.js';

const products = [
  { id: 'nasi', name: 'Nasi Lemak' },
  { id: 'teh', name: 'Teh Tarik' },
  { id: 'roti', name: 'Roti Canai' },
];

const result = createTomorrowPreparation({
  matchingDates: ['2026-07-03', '2026-07-10', '2026-07-17'],
  products,
  sales: [
    { date: '2026-07-03', productId: 'nasi', quantity: 12 },
    { date: '2026-07-10', productId: 'nasi', quantity: 18 },
    { date: '2026-07-17', productId: 'nasi', quantity: 15 },
    { date: '2026-07-10', productId: 'teh', quantity: 9 },
  ],
});

assert.equal(result.sampleSize, 3);
assert.deepEqual(result.items[0], {
  productId: 'nasi', name: 'Nasi Lemak', quantity: 45,
  average: 15, recommended: 17,
});
assert.deepEqual(result.items[1], {
  productId: 'teh', name: 'Teh Tarik', quantity: 9,
  average: 3, recommended: 4,
});
assert.equal(result.items.some((item) => item.productId === 'roti'), false);
console.log('ok  tomorrow preparation uses same-weekday history and a 10% buffer');
