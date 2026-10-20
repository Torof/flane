// SPDX-License-Identifier: AGPL-3.0-or-later
import fr from './fr.json';

/** Every key of the French file. Other languages will have to provide them all. */
export type TranslationKey = keyof typeof fr;

const messages: Record<TranslationKey, string> = fr;

/**
 * Returns the French text for a key. Unknown keys cannot compile; at run time
 * (for example a stale file) the key itself is shown, and nothing is logged.
 */
export function t(key: TranslationKey): string {
  const value: string | undefined = messages[key];
  return value ?? key;
}
