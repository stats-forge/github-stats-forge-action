# Contributing to GitHub Stats Forge Action

## Local Development

```bash
pnpm install      # also installs the git hooks, via lefthook
pnpm build        # esbuild src/index.ts -> dist/index.js
```

The cards come from `@stats-forge/github-stats-forge-core/api`; esbuild inlines it into the bundle at build time.
`src/index.ts` is only the entry point `action.yml` runs. The logic lives in `src/action.ts`, so tests can import it without running the action.

## Tests

```bash
pnpm test         # vitest
pnpm typecheck    # tsc
pnpm format       # oxfmt, configured by @marcalexiei/oxfmt-config
pnpm lint:oxlint  # oxlint, configured by @marcalexiei/oxlint-config
pnpm lint:knip    # unused files, exports and dependencies
```

The unit tests stub `@actions/core` and the renderer, so nothing reaches the network.
`tests/dist.spec.ts` runs the built bundle as a subprocess, so it needs `pnpm build` first.
It covers only failure paths, since rendering a real card needs a token; the `action` job in CI covers the rest by running this action against itself.

A `pre-commit` hook formats and lints staged files, then runs the tests.
`prepare` installs it, so `pnpm install` is enough.

## The committed bundle

`dist/` is committed on purpose: the action runs `dist/index.js` straight from the repo, with nothing installed at run time.
A change to `src/` is only half a change; rebuild and commit the bundle with it:

```bash
pnpm build && git add dist/
```

CI rebuilds and diffs `dist/`, failing if the committed bundle does not match its sources.

## License

Contributions are under the same [MIT License](https://choosealicense.com/licenses/mit/) as the project.
Contact the maintainers if that's a concern.

## Reporting bugs

Report a bug by [opening an issue](https://github.com/stats-forge/github-stats-forge-action/issues/new).
Issues with the cards themselves belong in [github-stats-forge](https://github.com/stats-forge/github-stats-forge/issues), where the renderer lives.

## Releasing

Releases are automated by [release-please](https://github.com/googleapis/release-please-action), driven by [Conventional Commits](https://www.conventionalcommits.org).
Nothing is published to npm; the action is consumed by tag.

1. Merge work into `main` with conventional commit subjects.
   `fix:` gives a patch, `feat:` a minor, `!` or a `BREAKING CHANGE:` footer a major.
2. Release-please keeps a `chore: release` PR open with the version bump and generated `CHANGELOG.md`, updating it as more commits land.
3. Merge that PR.
   Release-please tags `vX.Y.Z` and publishes the GitHub release, then `update-major-tag.yml` moves the floating `vX` that people pin.

To roll back, run `update-major-tag.yml` by hand: pick the major and give it an earlier release tag on that same major.
Everyone pinned to `vX` moves back, and the `vX.Y.Z` tag and its release are untouched.

The dispatch refuses anything that is not an existing `vX.Y.Z` tag on the major being moved: no branches, no loose commits, no crossing from `v0` to `v1`.
Add a new major to the dropdown when you first cut one.

The release workflow runs on `workflow_run` after CI, and only when CI passed, so a red commit never reaches a release.

The release job needs a `release` environment holding `RELEASE_HELPER_APP_ID` and `RELEASE_HELPER_PRIVATE_KEY`.
It uses a GitHub App token rather than `GITHUB_TOKEN`, whose events do not start other workflows: CI would never run on the release PR.
