// SPDX-License-Identifier: AGPL-3.0-or-later
import fr from './fr.json';
import { t, type TranslationKey } from './t';

describe('t', () => {
  it('returns the French text of a known key', () => {
    expect(t('tabs.trip')).toBe('Trajet');
  });

  it('returns the key itself when the text is missing', () => {
    // @ts-expect-error — a key that does not exist, to exercise the run-time fallback.
    const missing: TranslationKey = 'does.not.exist';
    expect(t(missing)).toBe('does.not.exist');
  });

  it('has no empty text', () => {
    for (const [key, value] of Object.entries(fr)) {
      expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
    }
  });
});
