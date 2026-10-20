// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  title: string;
  body: string;
  children?: ReactNode;
};

/** The empty shell every tab shows for now: a title, a sentence, optional details. */
export function Screen({ title, body, children }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    color: '#333333',
  },
});
