// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react-native';
import { AboutScreen } from './AboutScreen';
import { PreferencesScreen } from './PreferencesScreen';
import { TripScreen } from './TripScreen';

describe('tab screens', () => {
  it('Trip shows its title', async () => {
    const { getByRole } = await render(<TripScreen />);
    expect(getByRole('header', { name: 'Trajet' })).toBeTruthy();
  });

  it('Preferences shows its title', async () => {
    const { getByRole } = await render(<PreferencesScreen />);
    expect(getByRole('header', { name: 'Préférences' })).toBeTruthy();
  });

  it('About shows title, licence, source and OpenStreetMap attribution', async () => {
    const { getByRole, getByText } = await render(<AboutScreen />);
    expect(getByRole('header', { name: 'À propos' })).toBeTruthy();
    expect(getByText(/AGPL-3.0-or-later/)).toBeTruthy();
    expect(getByText(/github.com\/Torof\/flane/)).toBeTruthy();
    expect(getByText(/OpenStreetMap/)).toBeTruthy();
    expect(getByText(/^Version /)).toBeTruthy();
  });
});
