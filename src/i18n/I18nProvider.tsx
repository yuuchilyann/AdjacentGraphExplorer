import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang, TParams } from './types';
import type { Dictionary, TKey } from './locales/zh';
import { zh } from './locales/zh';
import { LOCALES } from './registry';
import { detectInitialLang, STORAGE_KEY } from './detect';
import { I18nContext } from './context';

function resolveNode(dict: Dictionary, key: TKey, params: TParams): ReactNode {
  const value = dict[key] ?? zh[key] ?? key;
  return typeof value === 'function' ? value(params) : value;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence failure */
    }
  }, []);

  // Keep the document in sync with the active language.
  useEffect(() => {
    const dict = LOCALES[lang];
    document.documentElement.lang = lang;
    const title = dict['meta.title'];
    if (typeof title === 'string') document.title = title;
    const desc = dict['meta.description'];
    if (typeof desc === 'string') {
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute('content', desc);
    }
  }, [lang]);

  const value = useMemo(() => {
    const dict = LOCALES[lang];
    return {
      lang,
      setLang,
      t: (key: TKey, params: TParams = {}): ReactNode =>
        resolveNode(dict, key, params),
      tStr: (key: TKey, params: TParams = {}): string => {
        const node = resolveNode(dict, key, params);
        if (typeof node === 'string') return node;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(`[i18n] tStr() called on non-string key "${key}"`);
        }
        return key;
      },
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
