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

permissions: {}

jobs:
  cards:
    runs-on: ubuntu-latest
    permissions:
      contents: write # to push the refreshed cards
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - uses: stats-forge/github-stats-forge-action@5fce3e74e665b0854cde1d72ae7d7ffef370b595 # v0.13.4
        with:
          card: stats
          path: profile/stats.svg
          options: '?username=octocat&show_icons=true&theme=github_light,github_dark'
          token: ${{ secrets.STATS_PAT }}

      - uses: stats-forge/github-stats-forge-action@5fce3e74e665b0854cde1d72ae7d7ffef370b595 # v0.13.4
        with:
          card: top-langs
          path: profile/langs.svg
          options: '?username=octocat&layout=compact'
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

## Options

Each card's options are listed on its page; [themes](https://stats-forge.github.io/github-stats-forge/docs/customization/themes/) and the [options every card shares](https://stats-forge.github.io/github-stats-forge/docs/customization/common-options/) have their own.

| `card`           | Options                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `stats`          | [Stats](https://stats-forge.github.io/github-stats-forge/docs/cards/stats/)                                 |
| `top-langs`      | [Top languages](https://stats-forge.github.io/github-stats-forge/docs/cards/top-languages/)                 |
| `pin`            | [Repo pin](https://stats-forge.github.io/github-stats-forge/docs/cards/repo-pin/)                           |
| `gist`           | [Gist pin](https://stats-forge.github.io/github-stats-forge/docs/cards/gist-pin/)                           |
| `wakatime`       | [WakaTime](https://stats-forge.github.io/github-stats-forge/docs/cards/wakatime/)                           |
| `contributed-to` | [Contributed to](https://stats-forge.github.io/github-stats-forge/docs/cards/contributed-to/)               |
| `org`            | [Organization](https://stats-forge.github.io/github-stats-forge/docs/cards/organization/)                   |
| `org-activity`   | [Organization activity](https://stats-forge.github.io/github-stats-forge/docs/cards/organization-activity/) |
| `org-calendar`   | [Organization calendar](https://stats-forge.github.io/github-stats-forge/docs/cards/organization-calendar/) |

When a query string gets long, `options` also takes a JSON object. A list joins with commas, as a repeated key does:

```yaml
options: |
  {
    "username": "octocat",
    "hide": ["prs", "issues"],
    "theme": "github_light,github_dark"
  }
```

## Why files instead of a URL

A hosted instance shares one PAT pool, so heavy traffic rate-limits everyone at once and your README shows a broken image.
Your own run spends your own token, fails visibly in the job log, and leaves a committed SVG that keeps working if the instance goes away.

## Inputs

| Input     | Required | Default        | Description                                                                                                 |
| --------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `card`    | yes      | —              | `stats`, `top-langs`, `pin`, `wakatime`, `gist`, `contributed-to`, `org`, `org-activity` or `org-calendar`. |
| `path`    | yes      | —              | Output path, including the filename.                                                                        |
| `options` | no       | `""`           | Query string (`key=value&...`) or JSON. Repeated keys join with commas.                                     |
| `token`   | no       | `github.token` | GitHub token. Private repo stats need a PAT with `repo` and `read:user`; gists need one with `gist`.        |

The account option defaults to the repository owner: `org` for the org, org-activity and org-calendar cards, `username` for the rest. Not for `gist`, keyed on its id, or `wakatime`, keyed on a WakaTime profile rather than a GitHub login.

`token` defaults to the workflow's `github.token`, enough for public data. Private repositories and gists need an explicit PAT.

## Outputs

| Output | Description                                      |
| ------ | ------------------------------------------------ |
| `path` | Path the SVG was written to, as given in `path`. |
