// SPDX-License-Identifier: AGPL-3.0-or-later
// The Expo configuration, resolved as EAS Build and `eas update` resolve it.
// @expo/fingerprint hashes the whole resolved configuration (minus a few fields
// such as `version`), so the native version must not depend on the app version:
// a version bump must never need a new APK. Development and preview differ only
// by what D-023 and the permission list impose, so an update is always published
// with APP_VARIANT=preview (docs/CONVENTIONS.md). This test does not replace
// `eas fingerprint:compare` on a real build.
import type { ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const originalVariant = process.env.APP_VARIANT;

function resolve(variant: Variant, version: string): ExpoConfig {
  let config: ExpoConfig | undefined;
  jest.isolateModules(() => {
    jest.doMock('../package.json', () => ({ version }));
    process.env.APP_VARIANT = variant;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const configModule = require('../app.config') as {
      default: (ctx: { config: object }) => ExpoConfig;
    };
    config = configModule.default({ config: {} });
  });
  if (!config) throw new Error('app.config.ts did not resolve');
  return config;
}

/** The resolved configuration without the fields that are allowed to differ. */
function comparable(config: ExpoConfig, except: string[] = []): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...(config as unknown as Record<string, unknown>) };
  delete rest.version;
  for (const key of except) delete rest[key];
  return rest;
}

afterAll(() => {
  if (originalVariant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = originalVariant;
});

describe('app.config.ts', () => {
  it('keeps everything but the version when the version changes', () => {
    expect(comparable(resolve('preview', '0.0.2'))).toEqual(
      comparable(resolve('preview', '0.0.3')),
    );
    expect(resolve('preview', '0.0.3').version).toBe('0.0.3');
  });

  it('gives development and preview the same configuration, except updates.enabled and one permission', () => {
    const development = resolve('development', '0.0.2');
    const preview = resolve('preview', '0.0.2');
    expect(comparable(development, ['updates', 'android'])).toEqual(
      comparable(preview, ['updates', 'android']),
    );
    expect({ ...development.updates, enabled: true }).toEqual(preview.updates);
    expect({
      ...development.android,
      blockedPermissions: preview.android?.blockedPermissions,
    }).toEqual(preview.android);
    expect(preview.android?.blockedPermissions).toEqual([
      ...(development.android?.blockedPermissions ?? []),
      'android.permission.ACCESS_NETWORK_STATE',
    ]);
  });

  it('enables instant updates for preview only (D-023)', () => {
    expect(resolve('preview', '0.0.2').updates?.enabled).toBe(true);
    expect(resolve('development', '0.0.2').updates?.enabled).toBe(false);
    expect(resolve('production', '0.0.2').updates?.enabled).toBe(false);
  });

  it('separates the test variant from the published one, both without backup', () => {
    const preview = resolve('preview', '0.0.2');
    const production = resolve('production', '0.0.2');
    expect(preview.android?.package).toBe('app.flane.dev');
    expect(production.android?.package).toBe('app.flane');
    expect(production.name).toBe('Flâne');
    expect(preview.android?.allowBackup).toBe(false);
    expect(production.android?.allowBackup).toBe(false);
  });

  it('uses the native fingerprint as runtime version and never waits for the network', () => {
    const config = resolve('preview', '0.0.2');
    expect(config.runtimeVersion).toEqual({ policy: 'fingerprint' });
    expect(config.updates?.url).toBe('https://u.expo.dev/77f1c432-03e1-482a-9767-d4e73a41def1');
    expect(config.updates?.fallbackToCacheTimeout).toBe(0);
  });
});
