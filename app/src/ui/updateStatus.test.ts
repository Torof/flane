// SPDX-License-Identifier: AGPL-3.0-or-later
import { shortNativeVersion, updateStatusFrom } from './updateStatus';

jest.mock('expo-updates', () => ({}));

describe('updateStatusFrom', () => {
  const nativeVersion = 'd2d3412e6003c7632900308047f5ea000a6aa552';

  it('reports the embedded code when no update has been received', () => {
    expect(
      updateStatusFrom({
        isEnabled: true,
        isEmbeddedLaunch: true,
        createdAt: null,
        runtimeVersion: nativeVersion,
      }),
    ).toEqual({ kind: 'embedded', nativeVersion: 'd2d3412e' });
  });

  it('reports a received update with its date', () => {
    const publishedAt = new Date('2026-10-20T18:00:00Z');
    expect(
      updateStatusFrom({
        isEnabled: true,
        isEmbeddedLaunch: false,
        createdAt: publishedAt,
        runtimeVersion: nativeVersion,
      }),
    ).toEqual({ kind: 'received', nativeVersion: 'd2d3412e', publishedAt });
  });

  it('treats a non-embedded launch without a date as embedded code', () => {
    expect(
      updateStatusFrom({
        isEnabled: true,
        isEmbeddedLaunch: false,
        createdAt: null,
        runtimeVersion: nativeVersion,
      }),
    ).toEqual({ kind: 'embedded', nativeVersion: 'd2d3412e' });
  });

  it('reports disabled updates (development client, production, Jest)', () => {
    expect(
      updateStatusFrom({
        isEnabled: false,
        isEmbeddedLaunch: true,
        createdAt: null,
        runtimeVersion: null,
      }),
    ).toEqual({ kind: 'disabled', nativeVersion: '?' });
  });

  it('shortens the native version and tolerates its absence', () => {
    expect(shortNativeVersion(nativeVersion)).toBe('d2d3412e');
    expect(shortNativeVersion(null)).toBe('?');
    expect(shortNativeVersion(undefined)).toBe('?');
    expect(shortNativeVersion('')).toBe('?');
  });
});
