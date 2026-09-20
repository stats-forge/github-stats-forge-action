---
'github-stats-forge-action': patch
---

Render with `@stats-forge/github-stats-forge-core@0.8.1`. The stats card's rank ring and the wakatime compact bar are centred properly, and a transport failure is retried with the same token after a backoff instead of failing the card at once.
