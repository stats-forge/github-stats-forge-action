# github-stats-forge-action

Generate GitHub stats cards as SVG files inside a GitHub Actions run — no server, no shared instance, no proxy between your README and your data.

## Usage

> [!TIP]
> Pin a [full commit SHA](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions) rather than `@v0`: tags move, and `dist/` is committed, so the SHA fixes the code that runs.
>
> ```yaml
> - uses: stats-forge/github-stats-forge-action@a9de909a0295de1d1e85be7d14af52ecc64050e0 # v0.5.0
> ```

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
    #        * * * * *
    - cron: '0 3 * * *'

permissions:
  contents: write

jobs:
  cards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

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

      - name: Commit if anything changed
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git add profile
          git diff --quiet --cached || git commit -m 'chore: refresh stats cards'
          git push
```

Then in your README:

```markdown
![](profile/stats.svg)
```

One card per step.
`options` takes **the same query string** you already have in your README image URL, so migrating is copy-paste: take everything from `?` onward and pick an output path.

## Why files instead of a URL

A hosted instance serves everyone from one shared PAT pool, so a busy instance rate-limits every user at once, and a card that fails to render shows a broken image in your README.
Rendering in your own Actions run spends your own token budget, fails loudly in a job log, and the committed SVG keeps working even if every instance goes away.

## Inputs

| Input     | Required | Default              | Description                                                                                                                          |
| --------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `card`    | yes      | —                    | `stats`, `top-langs`, `pin`, `wakatime`, `gist`, `contributed-to`, `org` or `org-activity`.                                          |
| `options` | no       | `""`                 | Card options as a query string (`key=value&...`) or JSON. Repeated keys are joined with commas.                                      |
| `path`    | no       | `profile/<card>.svg` | Output path, including the filename.                                                                                                 |
| `token`   | no       | `github.token`       | GitHub token (PAT or `GITHUB_TOKEN`). For private repo stats use a PAT with `repo` and `read:user`; for any gist, a PAT with `gist`. |

The account option defaults to the repository owner when omitted: `org` for the org and org-activity cards, `username` for the rest. The `gist` and `wakatime` cards are excluded: a gist is keyed on its id, and a WakaTime username is not a GitHub login.

`token` defaults to the workflow's `github.token`, which is enough for public data.
A card covering private repositories, or a gist, needs a PAT passed explicitly.

## Outputs

| Output | Description                                                |
| ------ | ---------------------------------------------------------- |
| `path` | Path the SVG was written to, as given in the `path` input. |

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for local development, the test layout, and why `dist/` is committed.
