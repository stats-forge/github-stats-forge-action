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
  // `skipLibCheck` is there only for the dangling references vitest 5.0.0 ships.
  // The fix is merged upstream, so this goes red once it is released.
  // https://github.com/vitest-dev/vitest/issues/11140
  it('still needs skipLibCheck for vitest', async () => {
    const output = await typecheckWithoutSkipLibCheck();

    expect(
      output,
      'vitest no longer breaks `tsc` — drop `skipLibCheck` from tsconfig.json and delete this test',
    ).toContain('@vitest/expect');
  });
});
