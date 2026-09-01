import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `vi.mock` is hoisted above this import, so `action.ts` sees the doubles.
import { run } from '../src/action.js';

const mocks = vi.hoisted(() => {
  const success = { status: 'success', content: '<svg>card</svg>' };
  const card = () => vi.fn(async () => success as unknown);
  return {
    inputs: new Map<string, string>(),
    /** Every `CardConfig` the action constructed, in order. */
    configs: [] as unknown[],
    core: { info: vi.fn(), setOutput: vi.fn(), warning: vi.fn() },
    handlers: {
      stats: card(),
      topLangs: card(),
      pin: card(),
      wakatime: card(),
      gist: card(),
    },
  };
});

vi.mock('@actions/core', () => ({
  ...mocks.core,
  getInput: (name: string, options?: { required?: boolean }) => {
    const value = mocks.inputs.get(name) ?? '';
    if (!value && options?.required) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return value;
  },
}));

vi.mock('@stats-forge/github-stats-forge-core/api', () => ({
  ...mocks.handlers,
  CardConfig: class {
    constructor(options: unknown) {
      mocks.configs.push(options);
    }
  },
}));

let workdir: string;

beforeEach(async () => {
  workdir = await mkdtemp(path.join(tmpdir(), 'stats-forge-action-'));
  vi.spyOn(process, 'cwd').mockReturnValue(workdir);
  // Set on every GitHub runner.
  // A test that does not want the fallback has to say so, or CI and a laptop
  // disagree.
  vi.stubEnv('GITHUB_REPOSITORY_OWNER', '');
  mocks.inputs.clear();
  mocks.inputs.set('card', 'stats');
  mocks.inputs.set('options', 'username=octocat');
});

afterEach(() => {
  mocks.configs.length = 0;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const writtenCard = (relativePath: string): Promise<string> =>
  readFile(path.join(workdir, relativePath), 'utf8');

describe('run', () => {
  it('writes the rendered card to the requested path', async () => {
    mocks.inputs.set('path', 'profile/stats.svg');

    await run();

    await expect(writtenCard('profile/stats.svg')).resolves.toBe('<svg>card</svg>');
  });

  it('creates the directories leading to the path', async () => {
    mocks.inputs.set('path', 'deeply/nested/output/stats.svg');

    await run();

    await expect(writtenCard('deeply/nested/output/stats.svg')).resolves.toBe('<svg>card</svg>');
  });

  it('defaults the path to profile/<card>.svg', async () => {
    mocks.inputs.set('card', 'top-langs');

    await run();

    await expect(writtenCard('profile/top-langs.svg')).resolves.toBe('<svg>card</svg>');
  });

  it('outputs the path as given, not resolved, so a commit step can use it', async () => {
    mocks.inputs.set('path', 'profile/stats.svg');

    await run();

    expect(mocks.core.setOutput).toHaveBeenCalledWith('path', 'profile/stats.svg');
  });

  it('dispatches to the handler for the requested card', async () => {
    mocks.inputs.set('card', 'gist');
    mocks.inputs.set('options', 'id=bbfce31e0217a3689c8d');

    await run();

    expect(mocks.handlers.gist).toHaveBeenCalledOnce();
    expect(mocks.handlers.stats).not.toHaveBeenCalled();
  });

  it('accepts the card name in any case, as YAML authors write it', async () => {
    mocks.inputs.set('card', 'Top-Langs');

    await run();

    expect(mocks.handlers.topLangs).toHaveBeenCalledOnce();
  });

  it('passes the parsed options through to the handler', async () => {
    mocks.inputs.set('options', 'username=octocat&theme=dark');

    await run();

    expect(mocks.handlers.stats).toHaveBeenCalledWith(
      { username: 'octocat', theme: 'dark' },
      expect.anything(),
    );
  });

  it('gives the renderer the token as a named PAT', async () => {
    mocks.inputs.set('token', 'ghp_secret');

    await run();

    expect(mocks.configs).toEqual([
      { pats: [{ name: 'action input `token`', value: 'ghp_secret' }] },
    ]);
  });

  it('configures no PAT when no token was supplied', async () => {
    await run();

    expect(mocks.configs).toEqual([{ pats: [] }]);
  });

  it('falls back to the repository owner, and says that it did', async () => {
    mocks.inputs.set('options', '');
    vi.stubEnv('GITHUB_REPOSITORY_OWNER', 'stats-forge');

    await run();

    expect(mocks.handlers.stats).toHaveBeenCalledWith(
      { username: 'stats-forge' },
      expect.anything(),
    );
    expect(mocks.core.warning).toHaveBeenCalledWith(
      'username not provided; defaulting to repository owner.',
    );
  });

  it('keeps an explicit username over the repository owner', async () => {
    vi.stubEnv('GITHUB_REPOSITORY_OWNER', 'stats-forge');

    await run();

    expect(mocks.handlers.stats).toHaveBeenCalledWith({ username: 'octocat' }, expect.anything());
    expect(mocks.core.warning).not.toHaveBeenCalled();
  });

  it('does not apply the owner fallback to a card that wants another option', async () => {
    mocks.inputs.set('card', 'pin');
    mocks.inputs.set('options', '');
    vi.stubEnv('GITHUB_REPOSITORY_OWNER', 'stats-forge');

    await expect(run()).rejects.toThrow('repo is required for the pin card.');
  });

  it('rejects an unknown card before calling any handler', async () => {
    mocks.inputs.set('card', 'starts');

    await expect(run()).rejects.toThrow('Unsupported card type: starts.');
    expect(mocks.handlers.stats).not.toHaveBeenCalled();
  });

  it('rejects options that are neither a query string nor JSON', async () => {
    mocks.inputs.set('options', '{not json}');

    await expect(run()).rejects.toThrow('Invalid JSON in options.');
  });

  it('never writes the error card over a good one', async () => {
    mocks.inputs.set('path', 'profile/stats.svg');
    mocks.handlers.stats.mockResolvedValueOnce({
      status: 'error',
      retryable: true,
      error: { code: 'rate_limited', message: 'Maximum retries exceeded' },
      content: '<svg>Something went wrong</svg>',
    });

    await expect(run()).rejects.toThrow(
      'Card generation failed while fetching data: Maximum retries exceeded',
    );
    await expect(writtenCard('profile/stats.svg')).rejects.toThrow('ENOENT');
  });

  it('reports what the renderer said went wrong', async () => {
    mocks.handlers.stats.mockResolvedValueOnce({
      status: 'error',
      retryable: false,
      error: { code: 'not_found', message: 'Could not fetch user' },
      content: '<svg>Something went wrong</svg>',
    });

    await expect(run()).rejects.toThrow('Card generation failed: Could not fetch user');
  });

  it('does not blame the network for an option the renderer rejected', async () => {
    mocks.handlers.stats.mockResolvedValueOnce({
      status: 'error',
      retryable: false,
      error: {
        code: 'invalid_param',
        message: 'Invalid number input for parameter "border_radius"',
      },
      content: '<svg>Something went wrong</svg>',
    });

    await expect(run()).rejects.toThrow(
      'Card generation failed: Invalid number input for parameter "border_radius"',
    );
  });

  it('does not write an empty file over a good card', async () => {
    mocks.inputs.set('path', 'profile/stats.svg');
    mocks.handlers.stats.mockResolvedValueOnce({
      status: 'success',
      content: '',
    });

    await expect(run()).rejects.toThrow('Card renderer returned empty output.');
    await expect(writtenCard('profile/stats.svg')).rejects.toThrow('ENOENT');
  });

  it('requires the card input', async () => {
    mocks.inputs.delete('card');

    await expect(run()).rejects.toThrow('Input required and not supplied: card');
  });
});
