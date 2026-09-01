import { describe, expect, it } from 'vitest';

import { parseOptions } from '../src/action.js';

describe('parseOptions', () => {
  it('reads a query string, which is what a README URL already contains', () => {
    expect(parseOptions('username=octocat&theme=dark')).toEqual({
      username: 'octocat',
      theme: 'dark',
    });
  });

  it('accepts the leading ? of a pasted URL query', () => {
    expect(parseOptions('?username=octocat')).toEqual({ username: 'octocat' });
  });

  it('joins a repeated key the way the renderer expects a list', () => {
    expect(parseOptions('hide=stars&hide=issues')).toEqual({
      hide: 'stars,issues',
    });
  });

  it('decodes percent-encoded values', () => {
    expect(parseOptions('custom_title=My%20Stats')).toEqual({
      custom_title: 'My Stats',
    });
  });

  it('keeps a key that was given no value', () => {
    expect(parseOptions('username=octocat&show_icons')).toEqual({
      username: 'octocat',
      show_icons: '',
    });
  });

  it('reads a JSON object, for options that are awkward in a query string', () => {
    expect(parseOptions('{"username":"octocat","show_icons":true}')).toEqual({
      username: 'octocat',
      show_icons: 'true',
    });
  });

  it('joins a JSON array into the comma list the renderer parses', () => {
    expect(parseOptions('{"hide":["stars","issues"]}')).toEqual({
      hide: 'stars,issues',
    });
  });

  it('drops null and undefined, so an unset YAML value is not sent as text', () => {
    expect(parseOptions('{"username":"octocat","theme":null}')).toEqual({
      username: 'octocat',
    });
  });

  it('keeps a JSON false, which is not the same as unset', () => {
    expect(parseOptions('{"show_icons":false}')).toEqual({
      show_icons: 'false',
    });
  });

  it('ignores the whitespace a YAML block scalar leaves behind', () => {
    expect(parseOptions('\n  {"username":"octocat"}\n  ')).toEqual({
      username: 'octocat',
    });
  });

  it('returns nothing for an omitted input', () => {
    expect(parseOptions('')).toEqual({});
    expect(parseOptions('   ')).toEqual({});
  });

  it('rejects malformed JSON instead of parsing it as a query string', () => {
    expect(() => parseOptions('{"username": octocat}')).toThrow('Invalid JSON in options.');
  });
});
