import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));

/**
 * Type-check the project the way `pnpm typecheck` does, minus the workaround.
 *
 * @returns Everything `tsc` wrote.
 */
const typecheckWithoutSkipLibCheck = (): Promise<string> =>
  new Promise<string>((resolve) => {
    execFile(
      path.join(root, 'node_modules', '.bin', 'tsc'),
      ['-p', 'tsconfig.json', '--skipLibCheck', 'false'],
      { cwd: root },
      (_error, stdout, stderr) => {
        resolve(stdout + stderr);
      },
    );
  });

describe('tsconfig.json', () => {
  // `skipLibCheck` is there only for the DOM type tinybench's declarations name.
  it('still needs skipLibCheck for tinybench', async () => {
    const output = await typecheckWithoutSkipLibCheck();

    expect(
      output,
      'tinybench no longer breaks `tsc` — drop `skipLibCheck` from tsconfig.json and delete this test',
    ).toContain('tinybench');
  });
});
