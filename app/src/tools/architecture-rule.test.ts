// SPDX-License-Identifier: AGPL-3.0-or-later
// The domain and the engine must not depend on the interface or the platform.
// This runs the real ESLint configuration on small snippets (docs/CONVENTIONS.md),
// through the ESLint command line: its flat config loads with a dynamic import
// that Jest's sandbox does not support.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const appRoot = resolve(__dirname, '../..');
const eslintBin = resolve(appRoot, 'node_modules/eslint/bin/eslint.js');

type Message = { ruleId: string | null; message: string };
type Result = { messages: Message[] };

function rulesFiredOn(code: string, filePath: string): string[] {
  const result = spawnSync(
    process.execPath,
    [eslintBin, '--stdin', '--stdin-filename', filePath, '--format', 'json', '--no-warn-ignored'],
    { cwd: appRoot, input: code, encoding: 'utf8' },
  );
  if (result.stdout.trim() === '') throw new Error(result.stderr);
  const [first] = JSON.parse(result.stdout) as Result[];
  return (first?.messages ?? []).map((m) => m.ruleId ?? m.message);
}

describe('architecture rule', () => {
  it.each([
    "import { Text } from 'react-native';",
    "import { useState } from 'react';",
    "import * as Location from 'expo-location';",
    "import { Screen } from '@/ui/components/Screen';",
    "import { Screen } from '../ui/components/Screen';",
    "import { route } from '../ui';",
    "import { x } from '@/services/routing';",
    "import { x } from '@react-native-async-storage/async-storage';",
    "import { x } from '@react-navigation/native';",
    "const rn = require('react-native');",
    "const lazy = import('expo-location');",
  ])('refuses %s from src/domain', (code) => {
    const rules = rulesFiredOn(`${code}\nexport const keep = 1;\n`, 'src/domain/probe.ts');
    expect(rules.length).toBeGreaterThan(0);
  });

  it('refuses the same from src/engine', () => {
    const rules = rulesFiredOn(
      "import { Text } from 'react-native';\nexport const keep = Text;\n",
      'src/engine/probe.ts',
    );
    expect(rules).toContain('no-restricted-imports');
  });

  it('allows the domain to import the standard library', () => {
    const rules = rulesFiredOn(
      "import { join } from 'node:path';\nexport const keep = join;\n",
      'src/domain/probe.ts',
    );
    expect(rules).toEqual([]);
  });

  it('allows the interface to import the platform', () => {
    const rules = rulesFiredOn(
      "import { Text } from 'react-native';\nexport const keep = Text;\n",
      'src/ui/probe.ts',
    );
    expect(rules).toEqual([]);
  });
});
