import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getInput, info, setOutput } from '@actions/core';
import {
  CardConfig,
  contributedTo,
  gist,
  org,
  orgActivity,
  pin,
  stats,
  topLangs,
  wakatime,
} from '@stats-forge/github-stats-forge-core/api';
import type { ApiResult, ErrorCode } from '@stats-forge/github-stats-forge-core/api';

type Handler = ((query: Record<string, string>, config: CardConfig) => Promise<ApiResult>) & {
  /** Which of the card's params name an identity, and which allowlist guards each. */
  IDENTITIES: Readonly<Record<string, string | undefined>>;
};

// `retryable` cannot stand in for these: core also marks `no_tokens` retryable,
// and a missing `token` input is not the network's fault.
const FETCH_FAILURES: ReadonlySet<ErrorCode> = new Set(['rate_limited', 'upstream']);

interface CardDefinition {
  handler: Handler;
  /** The option this card cannot render without. */
  requires: string;
  /** The option naming a GitHub account, filled from the repository owner when omitted. */
  account: string | undefined;
}

/**
 * @param handler The card's endpoint.
 * @param requires The option it cannot render without.
 * @returns The card, its account option read from the identity core guards by GitHub login —
 *          so a gist, keyed on its id, and wakatime, keyed on a WakaTime profile, declare none.
 */
const defineCard = (handler: Handler, requires: string): CardDefinition => ({
  handler,
  requires,
  account: Object.keys(handler.IDENTITIES).find(
    (param) => handler.IDENTITIES[param] === 'username',
  ),
});

/** Adding a card is a one-line change here. */
const CARDS = {
  stats: defineCard(stats, 'username'),
  'top-langs': defineCard(topLangs, 'username'),
  pin: defineCard(pin, 'repo'),
  wakatime: defineCard(wakatime, 'username'),
  gist: defineCard(gist, 'id'),
  'contributed-to': defineCard(contributedTo, 'username'),
  org: defineCard(org, 'org'),
  'org-activity': defineCard(orgActivity, 'org'),
} satisfies Record<string, CardDefinition>;

type CardName = keyof typeof CARDS;

const isCardName = (value: string): value is CardName => Object.hasOwn(CARDS, value);

const isScalar = (entry: unknown): entry is string | number | boolean =>
  typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean';

/**
 * @param key The option the value was given for, named so the error can point at it.
 * @param entry One JSON value from the options object.
 * @returns The value as the renderer takes it, a list joined on commas.
 * @throws {Error} If the value is a nested object or array, which `String` would
 *         flatten to `[object Object]` and send as if it were a real option.
 */
const flattenOption = (key: string, entry: unknown): string => {
  const values = Array.isArray(entry) ? entry : [entry];
  if (!values.every((value) => isScalar(value))) {
    throw new Error(`Option \`${key}\` must be text, a number, a boolean, or a list of those.`);
  }
  return values.join(',');
};

/**
 * Parse the `options` input, either a query string or a JSON object.
 *
 * @param value Raw `options` input.
 * @returns Parsed options, every value a string.
 * @throws {Error} If the value opens as JSON but is not an object of values a
 *         card option can carry.
 */
export const parseOptions = (value: string): Record<string, string> => {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  // `[` is caught here rather than left to the query string, where it would
  // become a key nobody typed.
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error('Invalid JSON in options.');
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Options must be a JSON object.');
    }
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, entry]) => entry !== null && entry !== undefined)
        .map(([key, entry]) => [key, flattenOption(key, entry)]),
    );
  }

  // URLSearchParams strips a single leading "?" natively.
  const params = new URLSearchParams(trimmed);
  return Object.fromEntries(
    [...new Set(params.keys())].map((key) => [key, params.getAll(key).join(',')]),
  );
};

/**
 * @param card Requested card type.
 * @param options Parsed options.
 * @returns The card's definition.
 * @throws {Error} If the card is unknown or its required option is missing.
 */
export const resolveCard = (card: string, options: Record<string, string>): CardDefinition => {
  if (!isCardName(card)) {
    throw new Error(
      `Unsupported card type: ${card}. Expected one of ${Object.keys(CARDS).join(', ')}.`,
    );
  }
  const definition: CardDefinition = CARDS[card];
  if (!options[definition.requires]) {
    throw new Error(`${definition.requires} is required for the ${card} card.`);
  }
  return definition;
};

/**
 * Render the requested card and write it to disk.
 *
 * @throws {Error} If the inputs are unusable, or the renderer fails or returns
 *         nothing.
 *         Nothing is written in either case.
 */
export const run = async (): Promise<void> => {
  const card = getInput('card', { required: true }).toLowerCase();
  const options = parseOptions(getInput('options'));

  const repositoryOwner = process.env['GITHUB_REPOSITORY_OWNER'];
  // Before `resolveCard`, which is what the fallback has to satisfy.
  const account = isCardName(card) ? CARDS[card].account : undefined;
  if (account && !options[account] && repositoryOwner) {
    options[account] = repositoryOwner;
    info(`${account} not provided; defaulting to repository owner.`);
  }

  const { handler } = resolveCard(card, options);

  const token = getInput('token');
  const config = new CardConfig({
    pats: token ? [{ name: 'action input `token`', value: token }] : [],
  });

  const result = await handler(options, config);

  // A data-fetch error is never thrown, only answered as `status: "error"` with
  // the failure drawn onto a card.
  // Writing that would replace a good card with an apology, so it fails instead.
  if (result.status === 'error') {
    throw new Error(
      FETCH_FAILURES.has(result.error.code)
        ? `Card generation failed while fetching data: ${result.error.message}`
        : `Card generation failed: ${result.error.message}`,
    );
  }
  if (!result.content) {
    throw new Error('Card renderer returned empty output.');
  }

  const outputPath = getInput('path') || path.join('profile', `${card}.svg`);
  const resolved = path.resolve(process.cwd(), outputPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, result.content, 'utf8');

  info(`Wrote ${resolved}`);
  setOutput('path', outputPath);
};
