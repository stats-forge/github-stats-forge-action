# github-stats-forge-action

Generate GitHub stats cards as SVG files in a GitHub Actions run. No server, no shared instance, no proxy between your README and your data.

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
    #        * * * * *
    - cron: '0 3 * * *'

permissions:
  contents: write

jobs:
  cards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: stats-forge/github-stats-forge-action@6c7c6b28578a9196c4fd954463ef8ef13a7bc9c4 # v0.7.1
        with:
          card: stats
          options: '?username=octocat&show_icons=true&theme=dark'
          path: profile/stats.svg
          token: ${{ secrets.STATS_PAT }}

      - uses: stats-forge/github-stats-forge-action@6c7c6b28578a9196c4fd954463ef8ef13a7bc9c4 # v0.7.1
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
`options` takes **the same query string** as the hosted image URL, so migrating is copy-paste: everything from `?` onward, plus an output path.

## Why files instead of a URL

A hosted instance shares one PAT pool, so heavy traffic rate-limits everyone at once and your README shows a broken image.
Your own run spends your own token, fails visibly in the job log, and leaves a committed SVG that keeps working if the instance goes away.

## Inputs

| Input     | Required | Default        | Description                                                                                          |
| --------- | -------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `card`    | yes      | —              | `stats`, `top-langs`, `pin`, `wakatime`, `gist`, `contributed-to`, `org` or `org-activity`.          |
| `options` | no       | `""`           | Query string (`key=value&...`) or JSON. Repeated keys join with commas.                              |
| `path`    | yes      | —              | Output path, including the filename.                                                                 |
| `token`   | no       | `github.token` | GitHub token. Private repo stats need a PAT with `repo` and `read:user`; gists need one with `gist`. |

The account option defaults to the repository owner: `org` for the org and org-activity cards, `username` for the rest. Not for `gist`, keyed on its id, or `wakatime`, keyed on a WakaTime profile rather than a GitHub login.

`token` defaults to the workflow's `github.token`, enough for public data. Private repositories and gists need an explicit PAT.

## Outputs

| Output | Description                                      |
| ------ | ------------------------------------------------ |
| `path` | Path the SVG was written to, as given in `path`. |
