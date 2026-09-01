# Contributing to GitHub Stats Forge Action

## Local Development

```bash
pnpm install      # also installs the git hooks, via lefthook
pnpm build        # esbuild src/index.ts -> dist/index.js
```

The cards come from `@stats-forge/github-stats-forge-core/api`, which esbuild
inlines into the bundle at build time. `src/index.ts` is only the entry point
`action.yml` runs; the logic lives in `src/action.ts` so the tests can import it
without running the action as a side effect.

## Tests

```bash
pnpm test         # vitest
pnpm typecheck    # tsc
pnpm format       # oxfmt, configured by @marcalexiei/oxfmt-config
pnpm lint:knip    # unused files, exports and dependencies
```

The unit tests stub `@actions/core` and the renderer, so nothing reaches the
network. `tests/dist.test.ts` runs the built bundle as a subprocess, and
therefore needs a `pnpm build` first — it only exercises failure paths, since
rendering a real card needs a token. That path is covered by the `action` job in
CI, which runs this action against itself.

A `pre-commit` hook formats the staged files and runs the tests. It is installed
by `prepare`, so a fresh `pnpm install` is all it takes.

## The committed bundle

`dist/` is committed on purpose: a bundled action runs `dist/index.js` straight
from the repo, and nothing installs dependencies at run time. So a change to
`src/` is only half a change — rebuild and commit the bundle with it:

```bash
pnpm build && git add dist/
```

CI rebuilds and diffs `dist/`, and fails if the committed bundle does not match
the sources it was built from.

## Any contributions you make will be under the MIT Software License

In short, when you submit changes, your submissions are understood to be under
the same [MIT License](https://choosealicense.com/licenses/mit/) that covers the
project. Feel free to contact the maintainers if that's a concern.

## Report issues/bugs using GitHub's issues

We use GitHub issues to track public bugs. Report a bug by
[opening a new issue](https://github.com/stats-forge/github-stats-forge-action/issues/new).
Issues with the cards themselves belong in
[github-stats-forge](https://github.com/stats-forge/github-stats-forge/issues),
which is where the renderer lives.

## Releasing

Releases are automated by
[release-please](https://github.com/googleapis/release-please-action), driven by
[Conventional Commits](https://www.conventionalcommits.org). Nothing is
published to npm — the action is consumed by tag.

1. Merge work into `main` with conventional commit subjects. `fix:` gives a
   patch, `feat:` a minor, and a `!` or a `BREAKING CHANGE:` footer a major.
2. Release-please keeps a `chore: release` PR open with the version bump and the
   generated `CHANGELOG.md`. It updates itself as more commits land.
3. Merge that PR. Release-please tags `vX.Y.Z` and publishes the GitHub release,
   then `update-major-tag.yml` moves the floating `vX` that people pin.

To roll a bad release back, run `update-major-tag.yml` by hand: give it the
major to move and the tag or commit it should point at, and everyone pinned to
`vX` is back on the older release. The `vX.Y.Z` tag and its release are left
alone.

The release workflow runs on `workflow_run` after CI, and only when CI passed,
so a red commit on `main` never reaches a release.

The release job needs a `release` environment holding `RELEASE_HELPER_APP_ID`
and `RELEASE_HELPER_PRIVATE_KEY`. It uses a GitHub App token rather than
`GITHUB_TOKEN`, because events from the default token do not start other
workflows, so CI would never run on the release PR.
