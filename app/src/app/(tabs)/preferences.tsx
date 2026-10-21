// SPDX-License-Identifier: AGPL-3.0-or-later
// Thin route: the screen lives in src/ui/screens (docs/CONVENTIONS.md).
export { PreferencesScreen as default } from '@/ui/screens/PreferencesScreen';

// Deliberate fault for the T0.4b red check (never merged): an image that does
// not exist, required at runtime, so only the assembler can see it.
export const missingImage: number = require('../../../assets/does-not-exist.png');
