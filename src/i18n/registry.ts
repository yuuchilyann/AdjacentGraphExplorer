import type { Lang } from './types';
import type { Dictionary } from './locales/zh';
import { zh } from './locales/zh';
import { en } from './locales/en';

/**
 * The ONLY place to touch when adding a language: register its module here and
 * add its code to the `Lang` union in types.ts. No component changes needed.
 */
export const LOCALES: Record<Lang, Dictionary> = {
  'zh-Hant': zh,
  en,
};

/** Display order of languages in the switcher. */
export const LANGS: Lang[] = ['zh-Hant', 'en'];
