import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Publish the release Changesets has already versioned.
 *
 * The bundle belongs to the tag rather than to `main`, so it is built by the
 * workflow, committed here onto a detached HEAD, and that child commit is what
 * `vX.Y.Z` names. `changeset git-tag` reports the tag it created, which is how
 * `changesets/action` learns what was published.
 */

const run = (command: string, ...args: Array<string>): void => {
  execFileSync(command, args, { stdio: 'inherit' });
};

const manifest: unknown = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
if (typeof manifest !== 'object' || manifest === null || !('version' in manifest)) {
  throw new Error('package.json has no version.');
}
const tag = `v${String(manifest.version)}`;

run('git', 'checkout', '--detach');
// `--force`, because `.gitignore` holds `dist/`.
run('git', 'add', '--force', 'dist');
run('git', 'commit', '--message', tag);

run('pnpm', 'exec', 'changeset', 'git-tag');

run('git', 'push', 'origin', `refs/tags/${tag}`);
