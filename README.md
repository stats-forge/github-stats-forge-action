# github-stats-forge-action

Generate GitHub stats cards as SVG files inside a GitHub Actions run — no server,
no shared instance, no proxy between your README and your data.

> Part of [stats-forge](https://github.com/stats-forge). The rendering packages
> are a fork of
> [anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats)
> via
> [stats-organization/github-stats-extended](https://github.com/stats-organization/github-stats-extended),
> both MIT.

## Usage

```yaml
name: Stats cards
on:
  schedule: [{ cron: "0 3 * * *" }]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  cards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: stats-forge/github-stats-forge-action@v1
        with:
          card: stats
          options: "?username=octocat&show_icons=true&theme=dark"
          path: profile/stats.svg
          token: ${{ secrets.STATS_PAT }}

      - uses: stats-forge/github-stats-forge-action@v1
        with:
          card: top-langs
          options: "?username=octocat&layout=compact"
          path: profile/langs.svg
          token: ${{ secrets.STATS_PAT }}

      - uses: stefanzweifel/git-auto-commit-action@v6
        with:
          commit_message: "chore: refresh stats cards"
```

Then in your README:

```markdown
![](profile/stats.svg)
```

One card per step. `options` takes **the same query string** you already have in
your README image URL, so migrating is copy-paste: take everything from `?`
onward and pick an output path.

## Why files instead of a URL

A hosted instance serves everyone from one shared PAT pool, so a busy instance
rate-limits every user at once, and a card that fails to render shows a broken
image in your README. Rendering in your own Actions run spends your own token
budget, fails loudly in a job log, and the committed SVG keeps working even if
every instance goes away.

## Inputs

| Input           | Required | Default             | Description |
| --------------- | -------- | ------------------- | ----------- |
| `card`          | yes      | —                   | `stats`, `top-langs`, `pin`, `wakatime` or `gist`. |
| `options`       | no       | `""`                | Query string (`?username=x&theme=dark`) or a JSON object. |
| `path`          | no       | `profile/<card>.svg` | Output path, including the filename. |
| `token`         | no       | `github.token`      | PAT with `read:user`; add `repo` to count private contributions. |
| `fail_on_error` | no       | `false`             | Fail the job instead of writing a "Something went wrong" card. |

`username` defaults to the repository owner when omitted.

Output: `path` — where the SVG was written.

## Migrating from `stats-organization/github-readme-stats-action`

Every input keeps its name and meaning, so changing the `uses:` line is normally
the whole migration. One exception:

**`core_version` is gone.** That action installs the renderer from npm on every
run, so it could pick a version at run time. This one **bundles** the renderer
into `dist/index.js`, so there is nothing to install and nothing to choose — the
action tag is the version selector. Pin `@v1.2.3` instead of passing
`core_version`. Passing it anyway logs a warning and is otherwise ignored.

The trade-off is deliberate: no `npm install` per step (faster, and it cannot
fail on a registry blip), and the exact renderer code is committed and reviewable
in this repo rather than resolved at run time.

## Development

```sh
pnpm install
pnpm build        # esbuild src/index.ts -> dist/index.js
pnpm typecheck
pnpm test
```

`dist/` is committed on purpose — the action runs the bundle straight from the
repo. CI rebuilds it and fails on `git diff -- dist/`, so a stale bundle cannot
ship.

## Status

Scaffold. `src/index.ts` imports `@stats-forge/api`, which is not published yet —
see step 7 of `FORK_PLAN.md` in the workspace root.
