// SPDX-License-Identifier: AGPL-3.0-or-later
import * as Updates from 'expo-updates';

/** What "About" shows about the running code. Plain data, so that it can be displayed or reported. */
export type UpdateStatus =
  | { kind: 'disabled'; nativeVersion: string }
  | { kind: 'embedded'; nativeVersion: string }
  | { kind: 'received'; nativeVersion: string; receivedAt: Date };

/** The first eight characters of the native fingerprint, or "?" when unknown. */
export function shortNativeVersion(runtimeVersion: string | null | undefined): string {
  return runtimeVersion ? runtimeVersion.slice(0, 8) : '?';
}

type UpdatesModule = {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  createdAt: Date | null;
  runtimeVersion: string | null;
};

export function updateStatusFrom(updates: UpdatesModule): UpdateStatus {
  const nativeVersion = shortNativeVersion(updates.runtimeVersion);
  if (!updates.isEnabled) {
    return { kind: 'disabled', nativeVersion };
  }
  if (updates.isEmbeddedLaunch || !updates.createdAt) {
    return { kind: 'embedded', nativeVersion };
  }
  return { kind: 'received', nativeVersion, receivedAt: updates.createdAt };
}

export function updateStatus(): UpdateStatus {
  return updateStatusFrom(Updates);
}
