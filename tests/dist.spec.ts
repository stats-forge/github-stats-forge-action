import { execFile } from 'node:child_process';
import { access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

const bundle = fileURLToPath(new URL('../dist/index.js', import.meta.url));

interface Run {
  code: number;
  stdout: string;
}

/**
 * Run the committed bundle the way the runner does: `node dist/index.js`, with
 * the inputs in the environment.
 *
 * Only failure paths are exercised, since reaching the renderer needs the
 * network.
 * That is the `action` job's business.
 * This proves the bundle exists, loads, and reads its inputs.
 *
 * @param inputs Action inputs, by their `action.yml` names.
 * @returns The exit code and everything written to stdout.
 */
const runBundle = async (inputs: Record<string, string>): Promise<Run> => {
  const env: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    // Set on every GitHub runner, and the action falls back to it.
    if (value !== undefined && name !== 'GITHUB_REPOSITORY_OWNER') {
      env[name] = value;
    }
  }
  for (const [name, value] of Object.entries(inputs)) {
    env[`INPUT_${name.toUpperCase()}`] = value;
  }

  const cwd = await mkdtemp(path.join(tmpdir(), 'stats-forge-dist-'));
  return new Promise<Run>((resolve) => {
    execFile(process.execPath, [bundle], { cwd, env }, (error, stdout) => {
      if (error === null) {
        resolve({ code: 0, stdout });
        return;
      }
      // `error.code` is the child's exit status; a signal or a spawn failure
      // leaves it non-numeric.
      resolve({ code: typeof error.code === 'number' ? error.code : 1, stdout });
    });
  });
};

describe('dist/index.js', () => {
  beforeAll(async () => {
    await access(bundle).catch(() => {
      throw new Error('dist/index.js is missing — run `pnpm build`, and commit the result');
    });
  });

  it('reports a missing required option as a failure, not a crash', async () => {
    const { code, stdout } = await runBundle({ card: 'stats', options: '' });

    expect(stdout).toContain('::error::username is required for the stats card.');
    expect(code).toBe(1);
  });

  it('reports an unknown card', async () => {
    const { stdout } = await runBundle({
      card: 'starts',
      options: 'username=octocat',
    });

    expect(stdout).toContain('::error::Unsupported card type: starts.');
  });
});
