import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getInput, info, setOutput, warning } from '@actions/core';
// A build-time dependency.
// esbuild bundles it into dist/index.js, so nothing installs at run time and the
// action tag pins the version.
import {
  CardConfig,
  gist,
  pin,
  stats,
  topLangs,
  wakatime,
} from '@stats-forge/github-stats-forge-core/api';
import type { ApiResult } from '@stats-forge/github-stats-forge-core/api';

type Handler = (query: Record<string, string>, config: CardConfig) => Promise<ApiResult>;

interface CardDefinition {
  handler: Handler;
  /** The option this card cannot render without. */
  requires: string;
}

/** Adding a card is a one-line change here. */
const CARDS = {
  stats: { handler: stats, requires: 'username' },
  'top-langs': { handler: topLangs, requires: 'username' },
  pin: { handler: pin, requires: 'repo' },
  wakatime: { handler: wakatime, requires: 'username' },
  gist: { handler: gist, requires: 'id' },
} satisfies Record<string, CardDefinition>;

type CardName = keyof typeof CARDS;

const isCardName = (value: string): value is CardName => Object.hasOwn(CARDS, value);

/**
 * Parse the `options` input, either a query string or a JSON object.
 *
 * @param value Raw `options` input.
 * @returns Parsed options, every value a string.
 * @throws {Error} If the value starts with `{` but is not valid JSON.
 */
export const parseOptions = (value: string): Record<string, string> => {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  if (trimmed.startsWith('{')) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid JSON in options.');
    }
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, entry]) => entry !== null && entry !== undefined)
        .map(([key, entry]) => [key, Array.isArray(entry) ? entry.join(',') : String(entry)]),
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
  if (!options['username'] && repositoryOwner) {
    options['username'] = repositoryOwner;
    warning('username not provided; defaulting to repository owner.');
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
    throw new Error(`Card generation failed while fetching data: ${result.error.message}`);
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
