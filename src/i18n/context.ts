import { createContext } from 'react';
import type { ReactNode } from 'react';
import type { Lang, TParams } from './types';
import type { TKey } from './locales/zh';

export type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Resolve a key to a ReactNode (use in children / label / title / helperText). */
  t: (key: TKey, params?: TParams) => ReactNode;
  /** Resolve a key to a plain string (use for SVG <text>, toasts, filenames, code). */
  tStr: (key: TKey, params?: TParams) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);
