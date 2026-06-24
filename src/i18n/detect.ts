import type { Lang } from './types';

export const STORAGE_KEY = 'age.lang';

/** A persisted manual choice wins; otherwise detect from the browser. */
export function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh-Hant' || saved === 'en') return saved;
  } catch {
    /* localStorage unavailable (private mode / SSR) — fall through */
  }
  // Walk the browser's ordered language preferences (navigator.languages),
  // honouring the user's priority: the first tag we recognise wins.
  // zh, zh-TW, zh-Hant, zh-HK, … → Traditional Chinese; otherwise → English.
  const prefs =
    typeof navigator !== 'undefined'
      ? navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language || '']
      : [];
  for (const tag of prefs) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('zh')) return 'zh-Hant';
    if (lower.startsWith('en')) return 'en';
  }
  return 'en';
}
