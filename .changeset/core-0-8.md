---
'github-stats-forge-action': minor
---

Render with `@stats-forge/github-stats-forge-core@0.8.0`. Cards no longer carry a bottom padding that grew with `line_height` — the space under the last row is a fixed 18px, so regenerated cards come out slightly shorter — and the all-time contributions walk now recovers from gateway timeouts, `RESOURCE_LIMITS_EXCEEDED` and empty responses instead of failing the card.
