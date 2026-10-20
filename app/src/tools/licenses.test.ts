// SPDX-License-Identifier: AGPL-3.0-or-later
// Checks the licence rule of tools/dev/licenses.mjs through Node, so that the
// script's main part (npm ls) is not run.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const script = pathToFileURL(resolve(__dirname, '../../../tools/dev/licenses.mjs')).href;

function isAllowed(expressions: string[]): boolean[] {
  const code = `import { isAllowed } from ${JSON.stringify(script)};
    console.log(JSON.stringify(${JSON.stringify(expressions)}.map(isAllowed)));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout) as boolean[];
}

describe('tools/dev/licenses.mjs isAllowed', () => {
  it('accepts allowed licences and OR expressions with one allowed branch', () => {
    expect(
      isAllowed(['MIT', '(MIT OR Apache-2.0)', '(BSD-3-Clause OR GPL-2.0)', 'MIT AND ISC']),
    ).toEqual([true, true, true, true]);
  });

  it('refuses unknown, copyleft-only, missing and nested expressions', () => {
    expect(
      isAllowed([
        'GPL-3.0',
        'UNKNOWN',
        'SEE LICENSE IN LICENSE',
        'MIT AND GPL-2.0',
        '(MIT OR (Apache-2.0 AND X))',
      ]),
    ).toEqual([false, false, false, false, false]);
  });
});
