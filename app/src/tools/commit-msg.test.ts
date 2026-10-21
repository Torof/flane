// SPDX-License-Identifier: AGPL-3.0-or-later
// Exercises .githooks/commit-msg on temporary message files, so that `npm test`
// covers the repository hooks too. No extra dependency.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const hook = resolve(__dirname, '../../../.githooks/commit-msg');

function check(message: string): { status: number | null; output: string } {
  const dir = mkdtempSync(join(tmpdir(), 'commit-msg-'));
  try {
    const file = join(dir, 'COMMIT_EDITMSG');
    writeFileSync(file, message);
    const result = spawnSync('bash', [hook, file], { encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('.githooks/commit-msg', () => {
  it('accepts a descriptive title, with comments and blank lines before it', () => {
    expect(
      check('# comment\n\nStop signals also catch "véto" and quoted stops\n\nBody.\n').status,
    ).toBe(0);
  });

  it('accepts a title of exactly 72 characters, accents counted as one', () => {
    expect(check(`${'é'.repeat(72)}\n`).status).toBe(0);
  });

  it('refuses an empty title', () => {
    const { status, output } = check('# only a comment\n\n');
    expect(status).toBe(1);
    expect(output).toContain('(empty)');
  });

  it('refuses a title longer than 72 characters', () => {
    expect(check(`${'a'.repeat(73)}\n`).status).toBe(1);
  });

  it('accepts merges and reverts, whatever their length', () => {
    expect(check(`Merge pull request #15 from Torof/${'x'.repeat(80)}\n`).status).toBe(0);
    expect(check("Merge branch 'main' into chore/T0.6-method-live\n").status).toBe(0);
    expect(check(`Revert "${'y'.repeat(80)}"\n`).status).toBe(0);
  });

  it('refuses a missing message file', () => {
    const result = spawnSync('bash', [hook, '/nonexistent/COMMIT_EDITMSG'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
  });
});
