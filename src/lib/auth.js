// auth.js — local vendor accounts (sign in / sign out).
//
// Accounts live in localStorage like everything else: no server, works
// offline. PINs are stored as SHA-256 hashes, which keeps casual snooping
// out but is NOT real security — anyone with the device can read
// localStorage. Good enough to separate vendors on a shared device; swap
// this module for Firebase Auth (BACKEND.md §6) when real accounts are
// needed. storage.js namespaces all data by getCurrentUserId(), so the
// rest of the app never touches auth directly.

const USERS_KEY = 'warungai.users';
const SESSION_KEY = 'warungai.sessionUserId';

// data keys from the pre-auth era, adopted by the first registered vendor
const LEGACY_KEYS = ['products', 'sales', 'expenses', 'settings'];

async function hashPin(name, pin) {
  const data = new TextEncoder().encode(`${name.trim().toLowerCase()}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

/** @returns {{id: string, name: string}|null} the signed-in vendor */
export function getCurrentUser() {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const user = readUsers().find((u) => u.id === id);
  return user ? { id: user.id, name: user.name } : null;
}

/** @returns {string|null} */
export function getCurrentUserId() {
  return getCurrentUser()?.id ?? null;
}

/**
 * Create a vendor account and sign them in.
 * @throws {Error} BM message if the name is taken or input is invalid
 */
export async function register(name, pin) {
  const cleanName = name?.trim();
  if (!cleanName) throw new Error('Sila masukkan nama kedai/penjual.');
  if (!/^\d{4,8}$/.test(pin ?? '')) throw new Error('PIN mesti 4–8 digit nombor.');

  const users = readUsers();
  if (users.some((u) => u.name.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error('Nama ini sudah didaftarkan — log masuk, atau pilih nama lain.');
  }

  const user = { id: newId(), name: cleanName, pinHash: await hashPin(cleanName, pin) };
  const isFirstUser = users.length === 0;
  users.push(user);
  writeUsers(users);

  // adopt any data saved before accounts existed
  if (isFirstUser) {
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(`warungai.${key}`);
      if (legacy !== null) {
        localStorage.setItem(`warungai.${user.id}.${key}`, legacy);
        localStorage.removeItem(`warungai.${key}`);
      }
    }
  }

  localStorage.setItem(SESSION_KEY, user.id);
  return { id: user.id, name: user.name };
}

/**
 * @throws {Error} BM message if the name/PIN pair doesn't match
 */
export async function signIn(name, pin) {
  const cleanName = name?.trim();
  const user = readUsers().find(
    (u) => u.name.toLowerCase() === (cleanName ?? '').toLowerCase(),
  );
  if (!user || user.pinHash !== (await hashPin(cleanName, pin))) {
    throw new Error('Nama atau PIN salah.');
  }
  localStorage.setItem(SESSION_KEY, user.id);
  return { id: user.id, name: user.name };
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

/** @returns {boolean} true if at least one vendor account exists */
export function hasAnyUser() {
  return readUsers().length > 0;
}
