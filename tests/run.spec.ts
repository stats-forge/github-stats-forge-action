import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { InputOptions, info, setOutput, warning } from '@actions/core';
import type { ApiResult } from '@stats-forge/github-stats-forge-core/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

// `vi.mock` is hoisted above this import, so `action.ts` sees the doubles.
import { run } from '../src/action.js';

/** Every card handler, as loosely as the action calls one. */
type Handler = (query: unknown, config: unknown) => Promise<ApiResult>;

const mocks = vi.hoisted(() => {
  const success: ApiResult = { status: 'success', content: '<svg>card</svg>' };
  const card = (): Mock<Handler> => vi.fn<Handler>(() => Promise.resolve(success));
  return {
    inputs: new Map<string, string>(),
    core: {
      info: vi.fn<typeof info>(),
      setOutput: vi.fn<typeof setOutput>(),
      warning: vi.fn<typeof warning>(),
    },
    handlers: {
      stats: card(),
      topLangs: card(),
      pin: card(),
      wakatime: card(),
      gist: card(),
    },
  };
});

vi.mock(import('@actions/core'), () => ({
  ...mocks.core,
  getInput: (name: string, options?: InputOptions): string => {
    const value = mocks.inputs.get(name) ?? '';
    if (!value && options?.required) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return value;
  },
}));

// Only the handlers are doubled: the real `CardConfig` is what the action builds,
// and `Object.assign` keeps the metadata each handler carries, e.g.
// `stats.RANK_ICONS`.
vi.mock(import('@stats-forge/github-stats-forge-core/api'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    stats: Object.assign(mocks.handlers.stats, actual.stats),
    topLangs: Object.assign(mocks.handlers.topLangs, actual.topLangs),
    pin: Object.assign(mocks.handlers.pin, actual.pin),
    wakatime: Object.assign(mocks.handlers.wakatime, actual.wakatime),
    gist: Object.assign(mocks.handlers.gist, actual.gist),
  };
});

let workdir: string;

const writtenCard = (relativePath: string): Promise<string> =>
  readFile(path.join(workdir, relativePath), 'utf8');

describe(run, () => {
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
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

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

    expect(mocks.handlers.gist).toHaveBeenCalledTimes(1);
    expect(mocks.handlers.stats).not.toHaveBeenCalled();
  });

  it('accepts the card name in any case, as YAML authors write it', async () => {
    mocks.inputs.set('card', 'Top-Langs');

    await run();

    expect(mocks.handlers.topLangs).toHaveBeenCalledTimes(1);
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

    expect(mocks.handlers.stats).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        pats: [{ name: 'action input `token`', value: 'ghp_secret' }],
      }),
    );
  });

  it('configures no PAT when no token was supplied', async () => {
    await run();

    expect(mocks.handlers.stats).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pats: [] }),
    );
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
      error: {
        code: 'rate_limited',
        message: 'Maximum retries exceeded',
        secondaryMessage: undefined,
        param: undefined,
      },
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
      error: {
        code: 'not_found',
        message: 'Could not fetch user',
        secondaryMessage: undefined,
        param: undefined,
      },
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
        secondaryMessage: undefined,
        param: 'border_radius',
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
