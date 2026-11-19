# leonida-ledger

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/bdgpride/leonida-ledger/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/bdgpride/leonida-ledger/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Ledger is a free, offline trophy guide and tracker for Grand Theft Auto VI on PlayStation 5. It covers all 55 official trophies — 1 platinum, 2 gold, 6 silver, 46 bronze — each with an original guide written for this project and its sources cited. The tracker saves your checklist in the browser (localStorage) with export and import, search, filters by grade, kind, earned state and missables, a spoiler shield that hides story trophies until earned, and a five-stage roadmap to the platinum with the missable trophies flagged. It runs entirely from its own files: no account, no network, no tracking.

## Run it

```sh
node serve.ts
```

Open http://localhost:8080 in a desktop browser. The guide is the app/ folder; serve.ts serves it locally, and the app itself loads nothing over the network. To build the submission output instead, run `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

## What's inside

- `app/` — the guide itself: index.html, app.js, style.css, and data/trophies.json with all 55 trophies, their guides, and cited sources.
- `screenshots/` — four renders of the app (tracker, a trophy guide, the roadmap, and the missables view).
- `main.ts` — hands the guide in: copies app/ and screenshots/ to the output directory and writes the dossier.
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged.

## License

MIT — see LICENSE.

---

<sub>Entered on [make.fun](https://make.fun/?ref=2my8wvpk&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
