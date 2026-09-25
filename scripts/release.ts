import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';

/**
 * Publish the release Changesets has already versioned.
 *
 * The bundle belongs to the tag rather than to `main`, so it is built by the
 * workflow and committed here as a child of `main`'s HEAD, and that commit is
 * what `vX.Y.Z` names. It is made through the API because GitHub signs what an
 * app's token commits there. `changesets/action` reads the `New tag:` line.
 */

// `pnpm run` sets `npm_package_version`; the runner sets the rest.
const { GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_TOKEN, npm_package_version } = process.env;

const post = async (endpoint: string, body: object): Promise<string> => {
  const response = await fetch(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`POST ${endpoint}: ${response.status} ${await response.text()}`);
  }
  const result = await response.json();
  // Creating a ref returns no `sha`, and nothing reads it.
  return typeof result === 'object' && result !== null && 'sha' in result ? String(result.sha) : '';
};

const rev = (spec: string): string => execFileSync('git', ['rev-parse', spec]).toString().trim();

const tag = `v${npm_package_version}`;

const tree = await post('git/trees', {
  base_tree: rev('HEAD^{tree}'),
  tree: readdirSync('dist', { recursive: true, encoding: 'utf8' })
    .map((file) => `dist/${file}`)
    .filter((path) => statSync(path).isFile())
    .map((path) => ({ path, mode: '100644', type: 'blob', content: readFileSync(path, 'utf8') })),
});
// No author or committer: either would stop GitHub from signing it.
const commit = await post('git/commits', { message: tag, tree, parents: [rev('HEAD')] });
await post('git/refs', { ref: `refs/tags/${tag}`, sha: commit });

process.stdout.write(`New tag: ${tag}\n`);
