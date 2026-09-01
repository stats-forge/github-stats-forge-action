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
  workflow_dispatch:
  schedule:
    #        ┌───────────── minute (0 - 59)
    #        │ ┌───────────── hour (0 - 23)
    #        │ │ ┌───────────── day of the month (1 - 31)
    #        │ │ │ ┌───────────── month (1 - 12 or JAN-DEC)
    #        │ │ │ │ ┌───────────── day of the week (0 - 6 or SUN-SAT)
    #        │ │ │ │ │
    #        │ │ │ │ │
    #        │ │ │ │ │
    #        * * * * *
    - cron: '0 3 * * *'

permissions:
  contents: write

jobs:
  cards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: stats-forge/github-stats-forge-action@v0
        with:
          card: stats
          options: '?username=octocat&show_icons=true&theme=dark'
          path: profile/stats.svg
          token: ${{ secrets.STATS_PAT }}

      - uses: stats-forge/github-stats-forge-action@v0
        with:
          card: top-langs
          options: '?username=octocat&layout=compact'
          path: profile/langs.svg
          token: ${{ secrets.STATS_PAT }}

      - uses: stefanzweifel/git-auto-commit-action@v6
        with:
          commit_message: 'chore: refresh stats cards'
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

| Input     | Required | Default              | Description                                                                                                                                             |
| --------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `card`    | yes      | —                    | `stats`, `top-langs`, `pin`, `wakatime` or `gist`.                                                                                                      |
| `options` | no       | `""`                 | Card options as a query string (`key=value&...`) or JSON. Repeated keys are joined with commas. If `username` is omitted, the repository owner is used. |
| `path`    | no       | `profile/<card>.svg` | Output path, including the filename.                                                                                                                    |
| `token`   | no       | `github.token`       | GitHub token (PAT or `GITHUB_TOKEN`). For private repo stats use a PAT with `repo` and `read:user`; for any gist, a PAT with `gist`.                    |

`username` defaults to the repository owner when omitted.

Output: `path` — where the SVG was written.

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for local development, the test
layout, and why `dist/` is committed.
