// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/ui/theme';

type Props = {
  title: string;
  body: string;
  children?: ReactNode;
};

/**
 * The empty shell every tab shows for now: a title, a sentence, optional
 * details. It scrolls, so nothing is lost with a large font or a small screen.
 */
export function Screen({ title, body, children }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screen,
    gap: spacing.gap,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.textSecondary,
  },
});
