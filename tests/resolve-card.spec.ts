import { describe, expect, it } from 'vitest';

import { resolveCard } from '../src/action.js';

describe(resolveCard, () => {
  it.each([
    ['stats', { username: 'octocat' }],
    ['top-langs', { username: 'octocat' }],
    ['pin', { repo: 'github-stats-forge' }],
    ['wakatime', { username: 'octocat' }],
    ['gist', { id: 'bbfce31e0217a3689c8d' }],
    ['contributed-to', { username: 'octocat' }],
  ])('resolves the %s card the action documents', (card, options) => {
    expect(resolveCard(card, options)).toBeDefined();
  });

  it('names the supported cards when given one it does not know', () => {
    expect(() => resolveCard('stat', { username: 'octocat' })).toThrow(
      'Unsupported card type: stat. Expected one of stats, top-langs, pin, wakatime, gist, contributed-to.',
    );
  });

  it('does not treat an inherited Object property as a card', () => {
    expect(() => resolveCard('constructor', {})).toThrow('Unsupported card type: constructor.');
  });

  it('names the option each card cannot render without', () => {
    expect(() => resolveCard('stats', {})).toThrow('username is required for the stats card.');
    expect(() => resolveCard('pin', {})).toThrow('repo is required for the pin card.');
    expect(() => resolveCard('gist', {})).toThrow('id is required for the gist card.');
  });

  it('treats an empty option as missing, since that is how Actions sends it', () => {
    expect(() => resolveCard('stats', { username: '' })).toThrow(
      'username is required for the stats card.',
    );
  });
});
