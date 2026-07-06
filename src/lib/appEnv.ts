// App environment identity — distinguishes production from staging builds that
// share the same browser origin (GitHub Pages serves prod at / and staging at
// /staging/, and localStorage is scoped per origin, not per path).
//
// VITE_APP_ENV is unset in production builds so every existing key keeps its
// exact current name; a staging build sets VITE_APP_ENV=staging and gets a
// disjoint key namespace (sessions, data, schema-version marker).

export const APP_ENV: string =
  (import.meta.env.VITE_APP_ENV as string | undefined) || 'production';

export const IS_PRODUCTION_ENV = APP_ENV === 'production';

/** Prefix for every localStorage key. Empty in production (backward compatible). */
export const STORAGE_ENV_PREFIX = IS_PRODUCTION_ENV ? '' : `${APP_ENV}_`;
