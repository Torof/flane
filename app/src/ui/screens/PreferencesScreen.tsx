// SPDX-License-Identifier: AGPL-3.0-or-later
import { Screen } from '@/ui/components/Screen';
import { t } from '@/i18n/t';

export function PreferencesScreen() {
  return <Screen title={t('preferences.title')} body={t('preferences.body')} />;
}
