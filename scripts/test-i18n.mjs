import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getNextLanguage,
} from '../src/i18n/languages.js';

function readLocale(name) {
  return JSON.parse(
    readFileSync(
      new URL(
        `../src/i18n/locales/${name}.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  );
}

const ms = readLocale('ms');
const en = readLocale('en');
const zh = readLocale('zh');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}\n      ${error.message}`);
  }
}

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === 'object' && !Array.isArray(child)
      ? flattenKeys(child, path)
      : [path];
  });
}

function normalizePluralKeys(keys) {
  return [...new Set(
    keys.map((key) =>
      key.replace(
        /_(zero|one|two|few|many|other)$/,
        '_plural',
      ),
    ),
  )];
}

test('i18n: every locale exposes the same translation keys', () => {
  const expected = normalizePluralKeys(
    flattenKeys(ms),
  ).sort();

  for (const [name, locale] of Object.entries({ en, zh })) {
    assert.deepEqual(
      normalizePluralKeys(
        flattenKeys(locale),
      ).sort(),
      expected,
      `${name} is missing or has extra translation keys`,
    );
  }
});

test('i18n: language toggle cycles BM → BI → BC → BM', () => {
  assert.equal(getNextLanguage('ms'), 'en');
  assert.equal(getNextLanguage('en'), 'zh');
  assert.equal(getNextLanguage('zh'), 'ms');
  assert.equal(getNextLanguage('unknown'), 'ms');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
