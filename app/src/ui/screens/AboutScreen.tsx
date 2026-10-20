// SPDX-License-Identifier: AGPL-3.0-or-later
import Constants from 'expo-constants';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/ui/components/Screen';
import { colors } from '@/ui/theme';
import { updateStatus, type UpdateStatus } from '@/ui/updateStatus';
import { t } from '@/i18n/t';

/** Reads the version from the app configuration, never from a translated string. */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? t('about.versionUnknown');
}

/** One line for the state of the instant updates. */
export function updateLine(status: UpdateStatus): string {
  switch (status.kind) {
    case 'disabled':
      return t('about.update.disabled');
    case 'embedded':
      return t('about.update.embedded');
    case 'received':
      return `${t('about.update.received')} ${status.receivedAt.toLocaleString('fr-FR')}`;
  }
}

export function AboutScreen() {
  const status = updateStatus();
  return (
    <Screen title={t('about.title')} body={t('about.body')}>
      <Text style={styles.line}>
        {t('about.version')} {appVersion()}
      </Text>
      <Text style={styles.line}>
        {t('about.nativeVersion')} {status.nativeVersion}
      </Text>
      <Text style={styles.line}>{updateLine(status)}</Text>
      <Text style={styles.line}>{t('about.license')}</Text>
      <Text style={styles.line}>{t('about.source')}</Text>
      <Text style={styles.line}>{t('about.osm')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
