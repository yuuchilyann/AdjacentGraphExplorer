import type { ReactNode } from 'react';

/** Internal language codes. Add future languages here (e.g. 'ja', 'ko'). */
export type Lang = 'zh-Hant' | 'en';

/** Parameters passed to an interpolating translation entry. */
export type TParams = Record<string, unknown>;

/**
 * A translation entry. Either:
 *  - a static ReactNode — a literal string (simple labels) or static rich JSX
 *    (prose interleaved with <Math>/<strong> that takes no params), or
 *  - a function of params returning a string (interpolation) or rich JSX.
 * ReactNode excludes functions, so the runtime `typeof v === 'function'`
 * check cleanly distinguishes the two forms.
 */
export type TValue = ReactNode | ((p: TParams) => ReactNode);
