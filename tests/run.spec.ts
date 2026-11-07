import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { InputOptions, info, setOutput } from '@actions/core';
import type {
  ApiError,
  ApiResult,
  CardConfig,
  stats,
} from '@stats-forge/github-stats-forge-core/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

// `vi.mock` is hoisted above this import, so `action.ts` sees the doubles.
import { run } from '../src/action.js';

/** Every card handler, as the action calls one. */
type Handler = (query: Record<string, string>, config: CardConfig) => Promise<ApiResult>;

const mocks = vi.hoisted(() => {
  const success: ApiResult = { status: 'success', content: '<svg>card</svg>' };
  const card = (): Mock<Handler> => vi.fn<Handler>(async () => Promise.resolve(success));
  return {
    inputs: new Map<string, string>(),
    core: {
      info: vi.fn<typeof info>(),
      setOutput: vi.fn<typeof setOutput>(),
    },
    handlers: {
      stats: card(),
      topLangs: card(),
      pin: card(),
      wakatime: card(),
      gist: card(),
      contributedTo: card(),
      org: card(),
      orgActivity: card(),
      orgCalendar: card(),
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
    contributedTo: Object.assign(mocks.handlers.contributedTo, actual.contributedTo),
    org: Object.assign(mocks.handlers.org, actual.org),
    orgActivity: Object.assign(mocks.handlers.orgActivity, actual.orgActivity),
    orgCalendar: Object.assign(mocks.handlers.orgCalendar, actual.orgCalendar),
  };
});

let workdir: string;

const writtenCard = async (relativePath: string): Promise<string> =>
  readFile(path.join(workdir, relativePath), 'utf8');

/**
 * Core's answer for a failure, its `text` already holding both lines.
 *
 * @returns The result a handler resolves with.
 */
const failed = (
  error: Pick<ApiError, 'code' | 'message' | 'text'> & Partial<ApiError>,
  retryable = false,
): ApiResult => ({
  status: 'error',
  retryable,
  error: { reason: undefined, secondaryMessage: undefined, param: undefined, ...error },
  content: '<svg>Something went wrong</svg>',
});

/** Core's own stats handler, which the token tests run so its wording meets the action's hints. */
const { stats: realStats } = await vi.importActual<{ stats: typeof stats }>(
  '@stats-forge/github-stats-forge-core/api',
);

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
    mocks.inputs.set('path', 'profile/stats.svg');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
    mocks.inputs.set('options', 'username=octocat&theme=ember_dark');

    await run();

    expect(mocks.handlers.stats).toHaveBeenCalledWith(
      { username: 'octocat', theme: 'ember_dark' },
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

  describe('the repository-owner fallback', () => {
    beforeEach(() => {
      vi.stubEnv('GITHUB_REPOSITORY_OWNER', 'stats-forge');
    });

    it.each([
      ['stats', 'stats', 'username'],
      ['org', 'org', 'org'],
      ['org-activity', 'orgActivity', 'org'],
      ['org-calendar', 'orgCalendar', 'org'],
    ] as const)(
      'fills the %s card account option, and says that it did',
      async (card, handler, account) => {
        mocks.inputs.set('card', card);
        mocks.inputs.set('options', '');

        await run();

        expect(mocks.handlers[handler]).toHaveBeenCalledWith(
          { [account]: 'stats-forge' },
          expect.anything(),
        );
        expect(mocks.core.info).toHaveBeenCalledWith(
          `${account} not provided; defaulting to repository owner.`,
        );
      },
    );

    it('keeps an explicit username over the repository owner', async () => {
      await run();

      expect(mocks.handlers.stats).toHaveBeenCalledWith({ username: 'octocat' }, expect.anything());
      expect(mocks.core.info).not.toHaveBeenCalledWith(
        expect.stringContaining('defaulting to repository owner'),
      );
    });

    it('does not hand the gist card a username it has no param for', async () => {
      mocks.inputs.set('card', 'gist');
      mocks.inputs.set('options', 'id=bbfce31e0217a3689c8d');

      await run();

      expect(mocks.handlers.gist).toHaveBeenCalledWith(
        { id: 'bbfce31e0217a3689c8d' },
        expect.anything(),
      );
      expect(mocks.core.info).not.toHaveBeenCalledWith(
        expect.stringContaining('defaulting to repository owner'),
      );
    });

    it('fails the gist card for a missing id, which a username does not stand in for', async () => {
      mocks.inputs.set('card', 'gist');
      mocks.inputs.set('options', 'username=octocat');

      await expect(run()).rejects.toThrow('id is required for the gist card.');
      expect(mocks.handlers.gist).not.toHaveBeenCalled();
    });

    it('asks for the wakatime username rather than guessing it from the repository owner', async () => {
      mocks.inputs.set('card', 'wakatime');
      mocks.inputs.set('options', '');

      await expect(run()).rejects.toThrow('username is required for the wakatime card.');
      expect(mocks.handlers.wakatime).not.toHaveBeenCalled();
    });

    it('does not apply to a card that wants another option', async () => {
      mocks.inputs.set('card', 'pin');
      mocks.inputs.set('options', '');

      await expect(run()).rejects.toThrow('repo is required for the pin card.');
    });
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
    mocks.handlers.stats.mockResolvedValueOnce(
      failed(
        { code: 'upstream', message: 'Could not reach GitHub', text: 'Could not reach GitHub.' },
        true,
      ),
    );

    await expect(run()).rejects.toThrow(
      'Card generation failed while fetching data: Could not reach GitHub.',
    );
    await expect(writtenCard('profile/stats.svg')).rejects.toThrow('ENOENT');
  });

  it("reports core's text, which already holds both lines of the error", async () => {
    mocks.handlers.stats.mockResolvedValueOnce(
      failed({
        code: 'forbidden',
        message: 'Missing token permission',
        secondaryMessage: 'The token needs read access to issues',
        text: 'Missing token permission. The token needs read access to issues.',
      }),
    );

    await expect(run()).rejects.toThrow(
      new Error(
        'Card generation failed: Missing token permission. The token needs read access to issues.',
      ),
    );
  });

  it('does not blame the network for an option the renderer rejected', async () => {
    mocks.handlers.stats.mockResolvedValueOnce(
      failed({
        code: 'invalid_param',
        message: 'Something went wrong',
        text: 'Something went wrong. Invalid number input for parameter "border_radius".',
        param: 'border_radius',
      }),
    );

    await expect(run()).rejects.toThrow(
      new Error(
        'Card generation failed: Something went wrong. Invalid number input for parameter "border_radius".',
      ),
    );
  });

  // core's own advice names no input, and this one does
  describe('when no token works', () => {
    beforeEach(() => {
      mocks.handlers.stats.mockImplementationOnce(realStats);
    });

    it('points at an empty token input, and blames no network for it', async () => {
      await expect(run()).rejects.toThrow(
        new Error(
          'Card generation failed: No GitHub API tokens found. The `token` input is empty. If it reads a secret, check that the secret exists: Dependabot and fork pull request runs are not given repository secrets.',
        ),
      );
    });

    it('says the token input may be expired when GitHub rejects it', async () => {
      mocks.inputs.set('token', 'ghp_revoked');
      vi.stubGlobal('fetch', async () =>
        Promise.resolve(Response.json({ message: 'Bad credentials' }, { status: 401 })),
      );

      await expect(run()).rejects.toThrow(
        new Error(
          'Card generation failed: Every GitHub API token was rejected. The `token` input may be expired or revoked.',
        ),
      );
    });

    it('says the quota is spent, without suggesting an instance, when it is rate limited', async () => {
      mocks.inputs.set('token', 'ghp_busy');
      vi.stubGlobal('fetch', async () =>
        Promise.resolve(
          Response.json({ errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }] }),
        ),
      );

      await expect(run()).rejects.toThrow(
        new Error(
          'Card generation failed while fetching data: Downtime due to GitHub API rate limiting. The token has used up its GitHub API quota; try again later.',
        ),
      );
    });
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

  // Before the render, so the failure costs no API call.
  it('requires the path input', async () => {
    mocks.inputs.delete('path');

    await expect(run()).rejects.toThrow('Input required and not supplied: path');
    expect(mocks.handlers.stats).not.toHaveBeenCalled();
  });
});
