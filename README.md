# Pirate Battle

A top-down 2D naval shooter built with **React**, **TypeScript** (strict), and **PixiJS**. Sail between islands, sink enemy ships and climb the ranking before time runs out.

**Live demo:** https://pirate-battle.vercel.app

| Responsibility | Technology |
| --- | --- |
| Menus, forms, panels, dialogs | React |
| Language | TypeScript, strict mode |
| Game rendering | PixiJS |
| Ranking and history remote state | TanStack Query |
| HTTP client | Axios |
| Mock ranking and history API | MSW 3 (service worker, also in the published build) |
| End-to-end and visual tests | Playwright |
| Build tool | Vite |

Architecture and design decisions are described in [ARCHITECTURE.md](ARCHITECTURE.md). Performance measurements are in [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## Setup

Requirements: **Node.js 22 or newer** (MSW 3 needs it) and npm.

```bash
npm install
npx playwright install chromium   # browser for the tests (see "Tests" for an alternative)
npm run dev                       # http://localhost:5173
```

The project runs from a clean checkout. No private services or API keys are needed: the ranking and history server is simulated in the browser by MSW.

### Environment variables

All are optional. See [.env.example](.env.example).

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_TIMEOUT_MS` | `8000` | Axios timeout for ranking and history requests |
| `PW_CHANNEL` | (unset) | Playwright only. `chrome` runs the tests in the installed Google Chrome |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-checks and builds the production bundle into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check of the app, config and tests |
| `npm run test:e2e` | Playwright E2E and visual tests (desktop and mobile Chromium) |
| `npm run test:e2e:chrome` | Same, using the installed Google Chrome |
| `npm run test:e2e:update` | Re-creates the visual regression baselines (only when a visual change is intended) |
| `npm run test:e2e:report` | Opens the last HTML test report |
| `npm run test:perf` | Performance run: 3-minute battle and memory over 5 cycles |
| `npm run test:perf:chrome` | Same, using the installed Google Chrome |

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Sail forward | `W` or `↑` | Forward button (bottom left) |
| Turn left / right | `A` / `D` or `←` / `→` | Turn buttons (bottom left) |
| Front cannon (1 shot) | `Space` | Front cannon button (bottom right) |
| Left / right broadside (3 parallel shots) | `Q` / `E` | Broadside buttons (bottom right) |
| Pause / resume | `P` or `Esc` | Pause button (top right) |

Movement and firing work at the same time, on the keyboard and with several fingers on touch screens. Game keys are only captured during an active, unpaused battle, so menus keep normal keyboard navigation.

The battle also pauses by itself when the window loses focus, the tab is hidden, or a phone is turned to portrait. Resuming always needs a player action.

**Mobile:** the game is played in landscape. In portrait, a message asks to rotate the device and the battle pauses. The arena scales to the screen without changing the rules.

## Gameplay rules

- A battle lasts the **Game session time** (60 to 180 s of active play; pauses do not count).
- Enemies appear every **Enemy spawn time** seconds until the battle ends, at free spots away from the player and the islands. The first two spawns are always one Chaser and one Shooter, so both types appear in every battle.
- **Chaser** (black sails): chases the player and explodes on contact, damaging the player. It gives no points.
- **Shooter** (red sails): approaches, stops at a distance and fires when aimed at the player.
- Every enemy sunk by the player's cannons gives **1 point**.
- The battle ends when time runs out or the player's ship sinks. Everything stops at that moment.

## Gameplay configuration

All gameplay numbers live in one typed object, [`src/game/config.ts`](src/game/config.ts) (`DEFAULT_CONFIG`). Systems read these values and never hardcode them, so balancing never requires changing logic.

It covers: arena size and islands, battle duration, spawn interval, first spawn delay, maximum enemies alive, minimum spawn distance and Chaser/Shooter ratio, health, movement and turn speeds, collision radii, projectile damage, speed, lifetime and cooldowns for each weapon, Shooter attack range, preferred distance and aim tolerance, and Chaser contact damage.

The **Options** screen exposes two of them, validated and saved in `localStorage`:

| Option | Range | Step | Default |
| --- | --- | --- | --- |
| Game session time | 60 to 180 s, whole seconds | 10 s | 120 s |
| Enemy spawn time | 0.5 to 10 s | 0.5 s | 3 s |

Each battle copies the configuration when it starts (snapshot). Changing options during a pause only affects the next battle.

## Ranking and match history

The main menu has **Ranking** and **Match History** tabs. A finished battle is registered once in both. Ranking compares only battles played with the same session time and spawn interval; ties go to the battle that finished first, then to the match id, so the order is always the same.

Battles that could not be saved stay in a local queue (also after a reload) and can be retried from the result screen or the Match History tab. Saving never blocks playing: a new battle can start while a record is pending. Abandoned battles (leaving or reloading during play) are never recorded.

## Simulating network conditions

The mock server supports reproducible scenarios. Choose one in any of these ways:

1. **Network lab screen:** link at the bottom of the main menu. It lists every scenario and has a **Reset all** button.
2. **URL:** add `?scenario=<id>` before the hash, for example `/?scenario=slow#/ranking`.
3. **Browser console:** `pirateNetwork.setScenario('timeoutAfterSave')`, `pirateNetwork.reset()`, `pirateNetwork.scenarios`.

The selected scenario is kept in `localStorage` until changed or reset.

| Scenario | Behavior |
| --- | --- |
| `normal` | Everything works (150 ms latency) |
| `empty` | Ranking and history return empty lists |
| `manyPages` | Adds 23 battles to your history, so every tab has several pages |
| `slow` | Every response takes 2.5 s |
| `variableLatency` | 0.2 to 3 s per response, from a fixed seed (same sequence every run) |
| `outOfOrder` | Odd requests take 3 s, even ones 0.3 s, so answers arrive out of order |
| `timeout` | The server never answers; requests time out |
| `connectionFailure` | Every request fails like a network error |
| `clientError` | Every request gets HTTP 422 |
| `serverError` | Every request gets HTTP 503 |
| `rankingFails` | Only the ranking fails (HTTP 500) |
| `historyFails` | Only the history fails (HTTP 500) |
| `timeoutAfterSave` | Saving stores the battle but never answers; the retry finds it already saved |
| `saveUnavailable` | Saving fails (HTTP 503) until you switch back to a working scenario |

**Reset all** (or `pirateNetwork.reset()`) clears saved battles, pending battles, the scenario and the latency sequence.

### Reproducing failures by hand

| To see | Do this |
| --- | --- |
| Loading, empty and error states | Pick `slow`, `empty`, `rankingFails` or `historyFails`, then open Ranking or Match History |
| Saving fails, then recovers | Pick `saveUnavailable`, finish a battle, see "Not saved yet", pick `normal`, press **Try again** |
| Pending record after a reload | Pick `saveUnavailable`, finish a battle, reload: the record is still pending |
| Timeout after saving, no duplicates | Pick `timeoutAfterSave`, finish a battle and wait about 10 s: it is saved once |
| Late answers not overwriting newer ones | Pick `outOfOrder`, open Ranking and change pages quickly |
| Asset loading failure | Open `/?e2e&clock=real#/menu`, run `window.__PIRATE_FAIL_NEXT_LOAD__ = true` in the console, then press Play |

## Tests

Playwright runs against the **production build** (`npm run build` + `npm run preview`) with MSW active, on **Chromium desktop** (1280×720) and **Chromium mobile** (Pixel 7, landscape).

```bash
npm run test:e2e          # or test:e2e:chrome
npm run test:e2e:report   # HTML report (reports/e2e)
```

If `npx playwright install chromium` cannot download, `npm run test:e2e:chrome` uses the installed Google Chrome.

The suite covers the 12 areas from the challenge: options, asset loading and retry, movement and island collisions, weapons and scoring, enemy behavior and spawns, end of battle and restart, pause, result persistence, abandoning battles and touch controls, ranking and history states and pagination, recording and pending recovery, and network resilience. Visual regression covers the menu, the arena and the result screen; baselines are versioned in `tests/e2e/__screenshots__`.

**Reproducible by design:** with `?e2e` in the URL the app exposes `window.pirateTest`, uses a fixed random seed, and the simulation advances only when a test calls `advance(seconds)`. Tests press real keys and touch buttons; rules, collisions and rendering run unchanged. Every test starts with a clean browser context, fails on any uncaught page error, and keeps a trace on failure (`test-results/`).

## Performance

`npm run test:perf` plays a full 3-minute battle on the real clock and runs five start, play and leave cycles while measuring the heap. Results are written to `reports/performance/`. The reference results and environment are in [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## Deploy

The app is a static site. On Vercel: import the repository, keep the detected Vite settings (build `npm run build`, output `dist`) and use Node.js 22 or newer. The MSW service worker (`public/mockServiceWorker.js`) is published with the site, so ranking and history work on the deployed URL. Routes use the URL hash, so no rewrite rules are needed.

## Assets and credits

All images and sounds come from the challenge's `assets/` folder and are used without changes, served from `public/assets/`. The interface uses system fonts. No other third-party assets were added.
