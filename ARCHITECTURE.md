# Architecture

This document explains how Pirate Battle is organized and why. The short version: **the simulation owns the game, PixiJS draws it, React frames it**, and each talks to the others through small, explicit interfaces.

```
src/
  game/              Everything that runs during a battle
    config.ts        Typed gameplay configuration (all balance numbers)
    Game.ts          Owns the Pixi Application; connects simulation, rendering, input, audio
    HudStore.ts      Bridge from the game loop to React (few updates per second)
    assets.ts        Texture manifest and loading
    simulation/      Rules only: World, collisions, angles, seeded random, types
    render/          Pixi views that read the simulation state
    input/           Keyboard and touch, both producing the same PlayerIntent
    audio/           Web Audio manager and the event-to-sound director
    perf/            Frame-time and entity recorder (?perf)
  screens/           React screens (menu, options, battle, result, captain's log, network lab)
  components/        HUD, touch controls, pause dialog, log tabs
  ui/                Shared React pieces (panel, buttons, stepper, error boundary)
  api/               Contracts, Axios client, TanStack Query setup and hooks
  records/           Player identity, pending-record queue (outbox) and background sync
  mocks/             MSW handlers, mock database, fixtures and network scenarios
  settings/, results/, storage/   Options, last result, safe localStorage helpers
  testing/           Test instrumentation, active only with ?e2e
tests/e2e, tests/perf  Playwright suites
```

## 1. React and PixiJS integration

React owns the screens; PixiJS owns one `<canvas>` inside the battle screen.

- `GameScreen` creates a `Game` in a `useEffect` and destroys it in the cleanup. React never renders per frame.
- `Game.mount()` is async (textures, then `Application.init`). It checks a `disposed` flag after every `await`, so **React Strict Mode** (mount, unmount, mount) never leaves a second game running. A game destroyed while loading also never reports errors to the screen.
- The battle screen is loaded with `React.lazy`, so PixiJS is a separate chunk downloaded when the player presses Play. The menus stay small.
- **Game to React:** `HudStore` is a tiny external store used with `useSyncExternalStore`. The game calls `update()` every frame, but listeners run only when a value changes (score, whole seconds left, health, status). In practice the HUD re-renders about once per second.
- **React to game:** plain method calls on the `Game` instance (`pause`, `resume`), and the `TouchInput` object that touch buttons write into.
- Health bars above ships, projectiles and effects are Pixi objects. The HUD panel, pause dialog, loading and error screens are React.

## 2. Simulation loop

`World` (in `simulation/`) contains every rule and no rendering code. It is plain TypeScript and can run without a browser.

- **Fixed timestep.** Each frame adds the real elapsed time (capped at 250 ms) to an accumulator, and the world advances in steps of exactly 1/60 s. Movement, damage, cooldowns, spawns and the match timer therefore do not depend on frame rate. A small epsilon avoids losing steps to floating-point rounding.
- **Order of a step:** timer, player movement, player weapons, spawns, enemy AI, enemy separation, projectiles and hits, Chaser contact, removal of sunk enemies, end check.
- **Input as intent.** Keyboard and touch both produce a `PlayerIntent` (`forward`, `turn`, `fireFront`, `fireLeft`, `fireRight`). The world never knows which device was used. Holding a fire key fires again as soon as the cooldown allows.
- **Events.** The world records what happened (`shot`, `cannonFired`, `hit`, `splash`, `shipDestroyed`, `rammed`, `scored`, `matchEnded`). After stepping, the game drains them into the effect layer and the sound director.
- **End of battle.** When time runs out or the player's health reaches zero, `update()` returns immediately from then on: nothing moves, fires, spawns, takes damage or scores. The outcome (score, active seconds, reason) is captured once.
- **Pause.** While paused the world is not stepped, so timer, cooldowns and spawns freeze. On resume the accumulator is cleared and all held keys and touches are released, so nothing from the paused period carries over. The game pauses on `P`/`Esc`, the pause button, window blur, hidden tab, and portrait orientation on touch devices.
- **Seeded randomness.** Spawn positions and enemy types use a small seeded generator (mulberry32). Real games seed it with the time; tests use a fixed seed.

### Enemy behavior

Both enemies turn gradually toward the player (`rotateTowards`, limited by their turn speed) and move forward, so they really have to steer.

- **Chaser:** always moves forward toward the player. On contact it explodes: the player takes contact damage and no point is given.
- **Shooter:** moves until it is within its preferred distance, then holds position while keeping the player in sight. It fires the front cannon when the player is inside attack range and within the aim tolerance angle, respecting its own cooldown.
- Enemies push each other apart so they do not stack, Shooters cannot push through the player, and all ships are pushed out of islands and kept inside the arena.

### Spawning

Every spawn interval, one enemy appears if fewer than `maxAlive` are present. The position is drawn at random and accepted only if it is far enough from the player (`minDistanceFromPlayer`), not touching an island and not overlapping another enemy. Up to `maxAttempts` positions are tried; if none fits, that spawn is skipped. The first two spawns are a Chaser and a Shooter, so both types appear in every battle.

## 3. Collisions

Shapes are kept simple and cheap:

- **Ships** are circles. **Islands** are axis-aligned rectangles a bit smaller than their drawing (the shores are rounded).
- **Ship vs island:** the circle is pushed out along the shortest path (`pushCircleOutOfRect`), which lets ships slide along shores instead of sticking.
- **Ship vs arena:** the center is clamped so the whole circle stays inside.
- **Ship vs ship:** overlapping circles are separated; Chasers touching the player trigger their explosion instead.
- **Projectiles** are small circles moved by velocity times step. Each one is removed when it expires (lifetime), leaves the arena, enters an island, or hits a valid target. Player shots only hit enemies; enemy shots only hit the player. A projectile is removed in the same step it applies damage, so **damage is applied exactly once**. Sunk enemies are removed at the end of the step, so they stop colliding, firing and dealing damage immediately.

With at most a few dozen entities, brute-force checks are cheaper than a spatial index, and the measured frame time confirms it (see `docs/PERFORMANCE.md`).

## 4. Rendering and resources

- **Textures** are loaded once through Pixi `Assets` (individual PNGs from the provided pack) and stay cached, so later battles reuse them. Loading reports progress to the HUD store; a failed download shows an error screen with **Try again** before any combat starts. Trying again runs the loader again; files that already downloaded come from the cache.
- **Layout.** All world coordinates are in a fixed 1280×768 arena. One container scales it uniformly to fit the canvas (letterbox), so proportions, input and arena limits never change with screen size. The canvas follows its host element (`resizeTo`) and the device pixel ratio (`autoDensity`, resolution capped at 2).
- **Views** read the simulation and never change it. `ShipView` updates its texture, fire and health bar only when health changes, picking one of four damage images (intact to wrecked) from the pack. Health bars use the pack's frame and fill images, cropping the fill from the left as `ui_sheet.json` describes (`clip_axis: x`).
- **Projectile sprites are pooled** and reused, so firing does not allocate new objects. Effects (muzzle flash, hit, splash, explosion, sinking wreck) are short-lived sprites animated by elapsed time.
- **Cleanup.** `Game.destroy()` removes the ticker callback, keyboard, blur and visibility listeners, stops the ambient sound loops, clears touch input and destroys the Pixi application with its display tree (removing the canvas). Textures are kept on purpose for reuse. The memory test shows a flat heap over five start/play/leave cycles and no remaining canvases.
- **Audio** uses the Web Audio API with the provided WAV files. It unlocks on the first user gesture, plays one-shots with a minimum gap to avoid harsh stacking, and loops the ocean and sailing sounds. Any audio failure leaves the game silent but running. The mute setting is saved locally.

## 5. Local persistence

All `localStorage` access goes through `storage/localStore.ts`, which never throws and validates what it reads.

| Key | Content |
| --- | --- |
| `pirate-battle:settings:v1` | Options (session time, spawn interval) |
| `pirate-battle:last-result:v1` | Last finished battle, shown again after a reload |
| `pirate-battle:player:v1` | Local player id and name |
| `pirate-battle:pending-records:v1` | Battles not yet confirmed by the server |
| `pirate-battle:audio-muted:v1` | Sound on or off |
| `pirate-battle:network-scenario:v1` | Active mock scenario |
| `pirate-battle:mock-db:v1` | Battles confirmed by the mock server |

Navigation uses the URL hash (`#/menu`, `#/play`, `#/result`...). Opening or reloading on `#/play` goes back to the menu, which is how a reload ends the battle in progress without recording it.

## 6. Ranking and history

### Contracts

`api/contracts.ts` holds the types and paths shared by the Axios client and the MSW handlers, so both sides compile against the same definitions.

| Operation | Request | Response |
| --- | --- | --- |
| Ranking | `GET /api/ranking?sessionTime&spawnInterval&page&pageSize` | `Page<RankingEntry>` |
| History | `GET /api/players/:playerId/matches?page&pageSize` | `Page<MatchRecord>` |
| Register | `POST /api/matches` with a `MatchRecord` | `201 { record, created: true }` or `200 { record, created: false }` |

A `MatchRecord` has the match id, player id and name, finish date, score, active duration, end reason and the configuration used (session time and spawn interval).

**Ranking order:** only records with the same configuration; score descending, then earlier finish date, then match id. The last criterion makes the order fully deterministic.

### Queries and cache (TanStack Query)

- Each page has its own query key (`['ranking', query]`, `['history', query]`) and the request receives TanStack's `AbortSignal`, so obsolete requests are cancelled. **A late answer can only fill its own cache entry; it can never replace the page on screen.** This is tested with the `outOfOrder` scenario.
- `placeholderData: keepPreviousData` keeps the current page visible while the next one loads. When a refresh fails but data exists, the table stays with a warning.
- `refetchOnMount: 'always'`: only the visible tab is mounted, so showing a tab again always refreshes it in the background ("Updating…").
- **Retries:** up to 2, with exponential delay, only for timeouts, connection failures and 5xx. 4xx errors are not retried.
- **Loading, empty and error** states are handled in one component (`QueryState`), with **Try again** on errors.
- After a battle is registered, both `['ranking']` and `['history']` are invalidated, so both tabs show it.

### Registering battles and recovering pending ones

1. When a battle ends, the client creates a `matchId` (UUID) and adds the record to the **outbox** (`records/outbox.ts`), saved in `localStorage`, before anything is sent.
2. `RecordSync` (always mounted) runs one TanStack mutation per pending record. `beginSubmit` refuses a record that is already being sent, which prevents duplicates from repeated clicks or Strict Mode.
3. The server treats `matchId` as the identity of the battle: a second POST with the same id returns the stored record (`created: false`) instead of inserting it again. So retries after a timeout, even when the first request was stored, never duplicate (`timeoutAfterSave` scenario).
4. On success the record leaves the outbox and both tabs are invalidated. On failure it is marked as failed with a short reason; **Try again** on the result screen or in Match History queues it again. Coming back online retries failed records automatically.
5. After a reload, records that were being sent go back to pending and are sent again automatically; failed ones wait for **Try again**.

None of this blocks the game: options, battles and the result screen work while records wait, and API failures only affect the two tabs.

### Mock server (MSW)

The same handlers, contracts and fixtures run in development, in tests and in the published build. The service worker starts before React renders; if it cannot start, the app still renders and only ranking and history show errors.

Fixtures are 40 rival battles generated from a fixed seed, so pages and positions are always the same. Confirmed records and the active scenario are kept in `localStorage`. Scenario delays are fixed, and the variable-latency one uses its own seed, which is reset when the scenario changes or the server is reset.

## 7. Test instrumentation

With `?e2e` in the URL (`testing/testMode.ts`):

- the seed is fixed (`?seed=` overrides it);
- the simulation runs only when the test calls `window.pirateTest.advance(seconds)`, unless `?clock=real`;
- `window.pirateTest` exposes `getState()` and `addEnemy()` for setting up specific situations;
- `window.__PIRATE_TEST_CONFIG__` can adjust the battle configuration (for example, turning spawns off);
- asset loading can be delayed or forced to fail once, and `?apiTimeout=` shortens the Axios timeout.

Inputs, rules, collisions and rendering are the real ones. None of this is active without `?e2e`.

## 8. Balancing decisions

| Value | Choice | Reason |
| --- | --- | --- |
| Player speed / turn | 140 u/s, 180°/s | Crosses the arena in about 9 s; turns quickly enough to aim |
| Front cannon | 25 damage, 0.4 s cooldown, 420 u/s | Precise, frequent shots; a Chaser takes 2, a Shooter 3 |
| Broadside | 3 × 20 damage, 1.5 s cooldown, 0.9 s life | High burst at short range; rewards positioning sideways |
| Chaser | 40 health, 115 u/s, 25 contact damage | Slower than the player, so it can be outrun, but punishing if ignored |
| Shooter | 60 health, stops at 230 u, fires within 340 u every 1.6 s for 10 damage | Keeps distance and forces the player to close in |
| Spawns | every 3 s by default, first at 1.5 s, at least 350 u away, at most 10 alive | Steady pressure without unavoidable damage at spawn time |
| Islands | Three islands, collision box 12 u inside the drawing | Cover and obstacles without blocking the arena; the margin matches the rounded shores |

## 9. Known limitations

- Ships use circular collision shapes, so contact at the bow and stern is approximate.
- Enemies have no path finding. They steer straight at the player and slide along islands, which can briefly slow them down behind an island.
- The ranking only compares battles with exactly the same session time and spawn interval.
- The player identity and the mock database are per browser (`localStorage`); there is no real backend or login.
- Sound starts only after the first click or key press, as browsers require.
- Performance was measured on one desktop machine (see `docs/PERFORMANCE.md`); mobile performance was checked manually, not measured.
