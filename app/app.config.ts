// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ConfigContext, ExpoConfig } from 'expo/config';
import { version } from './package.json';

/**
 * Build variant. `development` and `preview` share the `app.flane.dev`
 * identifier so they can live next to the published `app.flane` (D-015).
 */
type Variant = 'development' | 'preview' | 'production';

function readVariant(raw: string | undefined): Variant {
  if (raw === 'preview' || raw === 'production') {
    return raw;
  }
  return 'development';
}

const variant = readVariant(process.env.APP_VARIANT);
const isProduction = variant === 'production';

const EAS_PROJECT_ID = '77f1c432-03e1-482a-9767-d4e73a41def1';

// Permissions Expo's defaults add and Flâne does not want (found in the built
// manifests, see the T0.3 and T0.5 sheets). The development client keeps
// ACCESS_NETWORK_STATE for Metro; expo-updates only uses it in WIFI_ONLY mode.
const blockedPermissions = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.VIBRATE',
  ...(variant === 'development' ? [] : ['android.permission.ACCESS_NETWORK_STATE']),
];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isProduction ? 'Flâne' : 'Flâne (dev)',
  slug: 'flane',
  version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'flane',
  userInterfaceStyle: 'light',
  // The native fingerprint: changes only when a native module or a native
  // setting changes, and then a new APK is needed (docs/CONVENTIONS.md).
  runtimeVersion: { policy: 'fingerprint' },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    // Only the test variant receives instant updates (D-023).
    enabled: variant === 'preview',
    checkAutomatically: 'ON_LOAD',
    // Never wait for the network at start-up: a downloaded update applies on the next launch.
    fallbackToCacheTimeout: 0,
  },
  android: {
    package: isProduction ? 'app.flane' : 'app.flane.dev',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // Only INTERNET is wanted.
    permissions: [],
    blockedPermissions,
    // Android auto-backup would copy the app's private data to Google Drive.
    // Nothing is stored yet; off from the start so that it never happens (docs/DONNEES.md).
    allowBackup: false,
    predictiveBackGestureEnabled: false,
  },
  plugins: ['expo-router'],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
});
