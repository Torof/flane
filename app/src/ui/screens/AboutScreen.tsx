// SPDX-License-Identifier: AGPL-3.0-or-later
import Constants from 'expo-constants';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/ui/components/Screen';
import { t } from '@/i18n/t';

/** Reads the version from the app configuration, never from a translated string. */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? '?';
}

export function AboutScreen() {
  return (
    <Screen title={t('about.title')} body={t('about.body')}>
      <Text style={styles.line}>
        {t('about.version')} {appVersion()}
      </Text>
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
    color: '#555555',
  },
});
