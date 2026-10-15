---
'github-stats-forge-action': patch
---

Render with `@stats-forge/github-stats-forge-core@0.8.5`. The top-languages donut stays inside the card and centred on its list: the ring no longer grows with `card_width`, and the card's height fits whichever of the ring and the list is taller. The repo card's `show` stats no longer run into their values: each column places its values after its widest label, and a card drawing two columns defaults to 500px wide instead of 430px.
