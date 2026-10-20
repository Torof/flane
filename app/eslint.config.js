// SPDX-License-Identifier: AGPL-3.0-or-later
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');

// Modules the domain and the engine must never depend on: the interface and
// the platform. This keeps them testable alone and portable (docs/CONVENTIONS.md).
const platformAndInterface = [
  'react',
  'react-*',
  'react-native',
  'react-native/*',
  'expo',
  'expo/*',
  'expo-*',
  '@expo/*',
  '@/app',
  '@/app/*',
  '@/ui',
  '@/ui/*',
  '@/services',
  '@/services/*',
  '**/app/*',
  '**/ui/*',
  '**/services/*',
];

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'coverage/*', 'expo-env.d.ts'],
  },
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': typescriptPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/domain/**', 'src/engine/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: platformAndInterface,
              message:
                'The domain and the engine must not depend on the interface or the platform (docs/CONVENTIONS.md).',
            },
          ],
        },
      ],
    },
  },
];
