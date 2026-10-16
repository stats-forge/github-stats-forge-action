---
'github-stats-forge-action': minor
---

Render with `@stats-forge/github-stats-forge-core@0.9.0`, which makes card options stricter and more consistent

- A malformed or unknown option value now fails the step instead of being ignored.
- Renamed options: `custom_title` → `title`, `role` → `affiliation`, `api_domain` → `wakatime_host`, `contribs_include_own_repos` → `include_own_repos`, `stats_format` and `display_format` → `value_format` (`percentages` → `percent`), and the top-languages and WakaTime cards' `hide` → `hide_langs`.
- Renamed stats: `contribs` → `contributed_to`, `all_time_contribs` → `contributed_to_all_time`, `prs_authored` → `prs_opened`, `issues_authored` → `issues_opened`, and org-activity's `discussions` → `discussions_started`.
- The stats card's `repo` and `owner` become one `scope` list of `owner/name` and `owner/*` entries.
- Removed `browser_rendering`, `line_height` and `text_bold`.
