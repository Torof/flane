// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ConfigContext, ExpoConfig } from 'expo/config';

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

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isProduction ? 'Flâne' : 'Flâne (dev)',
  slug: 'flane',
  version: '0.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'flane',
  userInterfaceStyle: 'light',
  android: {
    package: isProduction ? 'app.flane' : 'app.flane.dev',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // Nothing beyond what Expo adds by default (INTERNET). Anything else that
    // shows up in the built manifest is listed in blockedPermissions.
    permissions: [],
    blockedPermissions: [],
    predictiveBackGestureEnabled: false,
  },
  plugins: ['expo-router'],
  extra: {
    variant,
    eas: {
      projectId: '77f1c432-03e1-482a-9767-d4e73a41def1',
    },
  },
});
