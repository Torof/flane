// SPDX-License-Identifier: AGPL-3.0-or-later
// The Expo configuration, resolved as EAS Build and `eas update` resolve it.
// The fields below are the ones @expo/fingerprint hashes (its "expoConfig" source).
// They must not depend on the app version, so that a version bump never needs a
// new APK. Development and preview differ only by `updates.enabled` (D-023), so an
// update must always be published with APP_VARIANT=preview (docs/CONVENTIONS.md).
import type { ExpoConfig } from 'expo/config';

const FINGERPRINTED_FIELDS = [
  'android',
  'extra',
  'icon',
  'name',
  'orientation',
  'platforms',
  'plugins',
  'runtimeVersion',
  'scheme',
  'sdkVersion',
  'slug',
  'updates',
  'userInterfaceStyle',
] as const;

type Variant = 'development' | 'preview' | 'production';

function resolve(variant: Variant, version: string): ExpoConfig {
  jest.resetModules();
  jest.doMock('./../package.json', () => ({ version }), { virtual: false });
  process.env.APP_VARIANT = variant;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const configModule = require('../app.config') as {
    default: (ctx: { config: object }) => ExpoConfig;
  };
  return configModule.default({ config: {} });
}

function fingerprinted(config: ExpoConfig, except: string[] = []): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  const raw = config as unknown as Record<string, unknown>;
  for (const key of FINGERPRINTED_FIELDS) {
    if (!except.includes(key)) picked[key] = raw[key];
  }
  return picked;
}

afterAll(() => {
  delete process.env.APP_VARIANT;
});

describe('app.config.ts', () => {
  it('gives development and preview the same native fingerprint inputs, except updates.enabled', () => {
    const development = resolve('development', '0.0.2');
    const preview = resolve('preview', '0.0.2');
    expect(fingerprinted(development, ['updates'])).toEqual(fingerprinted(preview, ['updates']));
    expect({ ...development.updates, enabled: true }).toEqual(preview.updates);
  });

  it('keeps the native fingerprint inputs when the version changes', () => {
    expect(fingerprinted(resolve('preview', '0.0.2'))).toEqual(
      fingerprinted(resolve('preview', '0.0.3')),
    );
    expect(resolve('preview', '0.0.3').version).toBe('0.0.3');
  });

  it('enables instant updates for preview only (D-023)', () => {
    expect(resolve('preview', '0.0.2').updates?.enabled).toBe(true);
    expect(resolve('development', '0.0.2').updates?.enabled).toBe(false);
    expect(resolve('production', '0.0.2').updates?.enabled).toBe(false);
  });

  it('separates the test variant from the published one', () => {
    expect(resolve('preview', '0.0.2').android?.package).toBe('app.flane.dev');
    expect(resolve('production', '0.0.2').android?.package).toBe('app.flane');
    expect(resolve('production', '0.0.2').name).toBe('Flâne');
  });

  it('uses the native fingerprint as runtime version and never waits for the network', () => {
    const config = resolve('preview', '0.0.2');
    expect(config.runtimeVersion).toEqual({ policy: 'fingerprint' });
    expect(config.updates?.fallbackToCacheTimeout).toBe(0);
    expect(config.android?.allowBackup).toBe(false);
  });
});
