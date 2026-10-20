// SPDX-License-Identifier: AGPL-3.0-or-later
import { Tabs } from 'expo-router';
import { t } from '@/i18n/t';

// No icon library yet: tabs show their label only.
const noIcon = () => null;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarIcon: noIcon }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.trip') }} />
      <Tabs.Screen name="preferences" options={{ title: t('tabs.preferences') }} />
      <Tabs.Screen name="about" options={{ title: t('tabs.about') }} />
    </Tabs>
  );
}
