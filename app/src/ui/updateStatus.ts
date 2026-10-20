// SPDX-License-Identifier: AGPL-3.0-or-later
import * as Updates from 'expo-updates';

/** What "About" shows about the running code. Plain data, so that it can be displayed or reported. */
export type UpdateStatus =
  | { kind: 'disabled'; nativeVersion: string }
  | { kind: 'embedded'; nativeVersion: string }
  | { kind: 'received'; nativeVersion: string; publishedAt: Date };

/** The part of expo-updates this module reads. */
type UpdatesModule = Pick<
  typeof Updates,
  'isEnabled' | 'isEmbeddedLaunch' | 'createdAt' | 'runtimeVersion'
>;

/** The first eight characters of the native fingerprint, or "?" when unknown. */
export function shortNativeVersion(runtimeVersion: string | null | undefined): string {
  return runtimeVersion ? runtimeVersion.slice(0, 8) : '?';
}

/** Turns the constants of expo-updates into a status. `createdAt` is the publication date of the running update. */
export function updateStatusFrom(updates: UpdatesModule): UpdateStatus {
  const nativeVersion = shortNativeVersion(updates.runtimeVersion);
  if (!updates.isEnabled) {
    return { kind: 'disabled', nativeVersion };
  }
  if (updates.isEmbeddedLaunch || !updates.createdAt) {
    return { kind: 'embedded', nativeVersion };
  }
  return { kind: 'received', nativeVersion, publishedAt: updates.createdAt };
}

/** The status of the code running right now. */
export function updateStatus(): UpdateStatus {
  return updateStatusFrom(Updates);
}
