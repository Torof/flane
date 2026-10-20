// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react-native';
import { AboutScreen, appVersion } from './AboutScreen';
import { PreferencesScreen } from './PreferencesScreen';
import { TripScreen } from './TripScreen';

const mockConstants: { expoConfig: { version?: string } | null } = {
  expoConfig: { version: '1.2.3' },
};
// The getter reads the state at call time, after the hoisted mock factory has run.
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
    expect(getByText(/AGPL-3.0-or-later/)).toBeTruthy();
    expect(getByText(/github.com\/Torof\/flane/)).toBeTruthy();
    expect(getByText(/OpenStreetMap/)).toBeTruthy();
  });

  it('About falls back to a translated text when the version is unknown', () => {
    mockConstants.expoConfig = null;
    expect(appVersion()).toBe('inconnue');
    mockConstants.expoConfig = { version: '1.2.3' };
  });
});
