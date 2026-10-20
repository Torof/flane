// SPDX-License-Identifier: AGPL-3.0-or-later
// Exercises tools/dev/check-spdx.sh on a temporary tree, so that `npm test`
// covers the repository tools too. No extra dependency.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const script = resolve(__dirname, '../../../tools/dev/check-spdx.sh');
const notice = '// SPDX-License-Identifier: AGPL-3.0-or-later\n';
const shellNotice = '# SPDX-License-Identifier: AGPL-3.0-or-later\n';

function runOn(files: Record<string, string>): { status: number | null; output: string } {
  // The real repository path has an accent; the temporary one gets a space and an accent too.
  const root = join(mkdtempSync(join(tmpdir(), 'spdx-')), 'Flâne test');
  mkdirSync(root);
  try {
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, name)), { recursive: true });
      writeFileSync(join(root, name), content);
    }
    const result = spawnSync('bash', [script, root], { encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(dirname(root), { recursive: true, force: true });
  }
}

describe('tools/dev/check-spdx.sh', () => {
  it('passes when every code file carries the notice, after a shebang too', () => {
    const { status, output } = runOn({
      'a.ts': `${notice}export {};\n`,
      'b.sh': `#!/usr/bin/env bash\n${shellNotice}echo\n`,
      'c.mjs': `${notice}export {};\n`,
      '.githooks/pre-push': `#!/usr/bin/env bash\n${shellNotice}exit 0\n`,
    });
    expect(output).toContain('all code files carry one');
    expect(status).toBe(0);
  });

  it('fails and names only the files without a notice', () => {
    const { status, output } = runOn({
      'a.ts': `${notice}export {};\n`,
      'c.tsx': 'export {};\n',
      'late.js': `// first line\n// second line\n${notice}`,
      'empty.ts': '',
      'nonotice.sh': '#!/usr/bin/env bash\necho\n',
      '.githooks/commit-msg': '#!/usr/bin/env bash\nexit 0\n',
    });
    expect(status).toBe(1);
    expect(output).toContain('/c.tsx');
    expect(output).toContain('/late.js');
    expect(output).toContain('/empty.ts');
    expect(output).toContain('/nonotice.sh');
    expect(output).toContain('/.githooks/commit-msg');
    expect(output).not.toContain('/a.ts');
    expect(output).toContain('5 file(s) without SPDX notice');
  });

  it('ignores node_modules, declaration files and data files', () => {
    const { status } = runOn({
      'node_modules/x/index.js': 'module.exports = 1;\n',
      'expo-env.d.ts': '/// <reference />\n',
      'data.json': '{}\n',
      'README.md': '# no notice needed\n',
    });
    expect(status).toBe(0);
  });
});
