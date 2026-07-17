export const SUPPORTED_LANGS = ['ms', 'en', 'zh'];

/** Keep every language control on the same BM → BI → BC cycle. */
export function getNextLanguage(lang) {
  const currentIndex = SUPPORTED_LANGS.indexOf(lang);
  const nextIndex =
    currentIndex >= 0
      ? (currentIndex + 1) % SUPPORTED_LANGS.length
      : 0;

  return SUPPORTED_LANGS[nextIndex];
}
