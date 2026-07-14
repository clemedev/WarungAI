// Local-timezone date helpers. Always use these instead of
// new Date().toISOString() — ISO strings are UTC, so in Malaysia (UTC+8)
// the UTC date is still *yesterday* until 8am local time.

/** @param {Date|string|number} date @returns {string} local "YYYY-MM-DD" */
export function toLocalISO(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** @returns {string} today as local "YYYY-MM-DD" */
export function todayISO() {
  return toLocalISO(new Date());
}

/** @returns {string[]} the last n local dates, oldest first, ending today */
export function lastNDates(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push(toLocalISO(d));
  }
  return out;
}

/** @param {string} iso "YYYY-MM-DD" @returns {string} short "D/M" label for charts */
export function shortLabel(iso) {
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}`;
}
