// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react-native';
import { AboutScreen, appVersion, updateLine } from './AboutScreen';
import { PreferencesScreen } from './PreferencesScreen';
import { TripScreen } from './TripScreen';

const mockConstants: { expoConfig: { version?: string } | null } = {
  expoConfig: { version: '1.2.3' },
};
const NATIVE_VERSION = 'd2d3412e6003c7632900308047f5ea000a6aa552';
jest.mock('expo-updates', () => ({
  isEnabled: true,
  isEmbeddedLaunch: true,
  createdAt: null,
  runtimeVersion: 'd2d3412e6003c7632900308047f5ea000a6aa552',
}));
// expo-constants: the getter reads the state at call time, after the hoisted mock factory has run.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConstants.expoConfig;
    },
  },
}));

describe('tab screens', () => {
  it('Trip shows its title', async () => {
    const { getByRole } = await render(<TripScreen />);
    expect(getByRole('header', { name: 'Trajet' })).toBeTruthy();
  });

  it('Preferences shows its title', async () => {
    const { getByRole } = await render(<PreferencesScreen />);
    expect(getByRole('header', { name: 'Préférences' })).toBeTruthy();
  });

  it('About shows title, version from the configuration, licence, source and OpenStreetMap attribution', async () => {
    const { getByRole, getByText } = await render(<AboutScreen />);
    expect(getByRole('header', { name: 'À propos' })).toBeTruthy();
    expect(getByText('Version 1.2.3')).toBeTruthy();
    expect(getByText(`Version native ${NATIVE_VERSION.slice(0, 8)}`)).toBeTruthy();
    expect(getByText('Code embarqué')).toBeTruthy();
    expect(getByText(/AGPL-3.0-or-later/)).toBeTruthy();
    expect(getByText(/github.com\/Torof\/flane/)).toBeTruthy();
    expect(getByText(/OpenStreetMap/)).toBeTruthy();
  });

  it('About says when an update has been received, and when updates are off', () => {
    const publishedAt = new Date(2026, 9, 20, 18, 0);
    expect(updateLine({ kind: 'received', nativeVersion: 'd2d3412e', publishedAt })).toBe(
      'Mise à jour publiée le 20/10/2026 18:00',
    );
    expect(updateLine({ kind: 'disabled', nativeVersion: '?' })).toBe(
      'Mises à jour instantanées désactivées',
    );
  });

  it('About falls back to a translated text when the version is unknown', () => {
    mockConstants.expoConfig = null;
    expect(appVersion()).toBe('inconnue');
    mockConstants.expoConfig = { version: '1.2.3' };
  });
});
