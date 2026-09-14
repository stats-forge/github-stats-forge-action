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

## The bundle

The action runs `dist/index.js` straight from the repo, with nothing installed at run time, but `dist/` is not committed: it is git-ignored and built at release time onto the commit the tag points at.
So `main` holds no bundle, and no tagged commit is ever without one.

Locally, `pnpm build` writes it; the `pre-commit` hook rebuilds it whenever `src/` changes, because the tests run it.

## License

Contributions are under the same [MIT License](https://choosealicense.com/licenses/mit/) as the project.
Contact the maintainers if that's a concern.

## Reporting bugs

Report a bug by [opening an issue](https://github.com/stats-forge/github-stats-forge-action/issues/new).
Issues with the cards themselves belong in [github-stats-forge](https://github.com/stats-forge/github-stats-forge/issues), where the renderer lives.

## Releasing

Releases are automated by [Changesets](https://github.com/changesets/changesets).
Nothing is published to npm; the action is consumed by tag.

1. Add a changeset to any pull request that changes what the action does: `pnpm changeset`.
   It writes a file under `.changeset/` naming the bump and the line the changelog will carry.
   A pull request that changes nothing for consumers needs none.
2. Changesets keeps a `Version Packages` PR open with the pending bump and generated `CHANGELOG.md`, updating it as more changesets land.
3. Merge that PR.
   `pnpm release` then builds `dist/`, commits it on top of the released commit, tags that child `vX.Y.Z` and pushes the tag, and `changesets/action` creates the GitHub release for it.
   Creating the release is what starts `update-major-tag.yml`, which moves the floating `vX` that people pin, and `update-readme-version-pin.yml`.
   The pull requests that release shipped, and the issues they close, are then commented on by [changesets-release-commenter](https://github.com/marcalexiei/changesets-release-commenter).

The next version comes from the changesets in the tree rather than from tag ancestry, which is what lets `vX.Y.Z` name a bundle commit that is not on `main`.
Release-please could not: it resolves the latest release to a SHA and walks `main` looking for it.

To roll back, run `update-major-tag.yml` by hand: pick the major and give it an earlier release tag on that same major.
Everyone pinned to `vX` moves back, and the `vX.Y.Z` tag and its release are untouched.

The dispatch refuses anything that is not an existing `vX.Y.Z` tag on the major being moved: no branches, no loose commits, no crossing from `v0` to `v1`.
Add a new major to the dropdown when you first cut one.

The release workflow runs on `workflow_run` after CI, and only when CI passed, so a red commit never reaches a release.

The release job needs a `release` environment holding `RELEASE_HELPER_APP_ID` and `RELEASE_HELPER_PRIVATE_KEY`.
It uses a GitHub App token rather than `GITHUB_TOKEN`, whose events do not start other workflows: CI would never run on the version PR.
