import { execFile } from 'node:child_process';
import { access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);

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
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  // Set on every GitHub runner, and the action falls back to it.
  delete env['GITHUB_REPOSITORY_OWNER'];
  for (const [name, value] of Object.entries(inputs)) {
    env[`INPUT_${name.toUpperCase()}`] = value;
  }

  const cwd = await mkdtemp(path.join(tmpdir(), 'stats-forge-dist-'));
  try {
    const { stdout } = await run(process.execPath, [bundle], { cwd, env });
    return { code: 0, stdout };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '' };
  }
};

describe('dist/index.js', () => {
  beforeAll(async () => {
    await expect(
      access(bundle),
      'dist/index.js is missing — run `pnpm build`, and commit the result',
    ).resolves.toBeUndefined();
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
