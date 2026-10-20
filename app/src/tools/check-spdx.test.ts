// SPDX-License-Identifier: AGPL-3.0-or-later
// Exercises tools/dev/check-spdx.sh on a temporary tree, so that `npm test`
// covers the repository tools too. No extra dependency.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const script = resolve(__dirname, '../../../tools/dev/check-spdx.sh');
const notice = '// SPDX-License-Identifier: AGPL-3.0-or-later\n';

function runOn(files: Record<string, string>): { status: number | null; output: string } {
  const root = mkdtempSync(join(tmpdir(), 'spdx-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, name)), { recursive: true });
      writeFileSync(join(root, name), content);
    }
    const result = spawnSync('bash', [script, root], { encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('tools/dev/check-spdx.sh', () => {
  it('passes when every code file carries the notice, after a shebang too', () => {
    const { status, output } = runOn({
      'a.ts': `${notice}export {};\n`,
      'b.sh': '#!/usr/bin/env bash\n# SPDX-License-Identifier: AGPL-3.0-or-later\necho\n',
    });
    expect(output).toContain('all code files carry one');
    expect(status).toBe(0);
  });

  it('fails and names the file without a notice', () => {
    const { status, output } = runOn({
      'a.ts': `${notice}export {};\n`,
      'c.tsx': 'export {};\n',
    });
    expect(status).toBe(1);
    expect(output).toContain('c.tsx');
    expect(output).not.toContain('a.ts');
  });

  it('ignores node_modules, generated declarations and data files', () => {
    const { status } = runOn({
      'node_modules/x/index.js': 'module.exports = 1;\n',
      'expo-env.d.ts': '/// <reference />\n',
      'data.json': '{}\n',
    });
    expect(status).toBe(0);
  });
});
