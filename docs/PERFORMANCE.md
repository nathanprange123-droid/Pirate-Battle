# Performance report

Measured with `npm run test:perf:chrome` (see `tests/perf/performance.spec.ts`). Raw results are saved in `reports/performance/`.

## Reference environment

| Item | Value |
| --- | --- |
| CPU | AMD Ryzen 5 3500X, 6 cores, 3.59 GHz |
| GPU | NVIDIA GeForce GTX 1650 SUPER, 4 GB (driver 32.0.16.1692) |
| RAM | 32 GB |
| OS | Windows 11 25H2 (build 26200) |
| Browser | Google Chrome 135.0.7049.115, 64-bit, visible window (GPU enabled), hardware acceleration on |
| Window | 1280×720 viewport |
| Build | Production build served by `vite preview` |

## 3-minute battle

**Setup:** Game session time 180 s, Enemy spawn time 1 s (the most frequent allowed by the default step), up to 20 enemies alive. The player sails in circles while holding every cannon, so there are always projectiles, hits and explosions on screen. To keep the battle running for the full 3 minutes, the player's health is set very high; nothing else in the rules is changed. The simulation runs on the real clock.

| Metric | Result |
| --- | --- |
| Duration recorded | 179.99 s |
| Frames | 10,797 |
| Average frame rate | **59.99 FPS** (target 60) |
| p95 frame time | **16.8 ms** |
| p99 frame time | 16.9 ms |
| Longest frame | 50 ms |
| Frames slower than 33 ms | 2 of 10,797 |
| Worst one-second window | 57 FPS |
| Entities on screen (average / maximum) | 27.86 / 46 |

Entities are enemies, projectiles and active effects. The frame rate stays at the display refresh rate for the whole battle. The two slow frames are isolated spikes; no one-second window drops below 57 FPS.

## Memory over five start, play and leave cycles

**Setup:** each cycle starts a battle (spawn every 1 s), plays for 10 s with all cannons firing, pauses, returns to the main menu and forces garbage collection twice through the Chrome DevTools Protocol before reading the JavaScript heap.

| After cycle | JS heap (MB) | Canvases in the page |
| --- | --- | --- |
| 0 (menu, before playing) | 3.25 | 0 |
| 1 | 7.19 | 0 |
| 2 | 7.40 | 0 |
| 3 | 7.56 | 0 |
| 4 | 7.65 | 0 |
| 5 | 7.74 | 0 |

The jump after the first cycle is the one-time cost of the battle code (PixiJS chunk), the cached textures and the decoded sounds, all reused by later battles.

From cycle 1 to cycle 5 the heap grows by 0.55 MB in total, and each cycle adds less than the one before (0.21, 0.16, 0.09 and 0.09 MB). A leak of battle objects (Pixi display objects, views, listeners or simulation state) would add a roughly constant amount every cycle, so this slowing growth is more consistent with browser-internal caches (compiled code, inline caches) settling. It does not fully flatten within five cycles; a longer run would be needed to confirm the plateau. In an earlier run of the same test the heap went from 7.18 to 7.63 MB and slightly decreased between cycles 4 and 5.

No canvas survives leaving a battle, confirming that the Pixi application, its display tree, listeners and ticker are released.

## What was optimized

- Fixed-timestep simulation with no allocations in the hot path beyond small per-frame objects.
- Projectile sprites are pooled instead of created and destroyed per shot.
- Ship textures and health bars change only when health changes, not every frame.
- React is updated only when HUD values change (about once per second), never per frame.
- PixiJS is a separate chunk loaded when a battle starts, so the menus load faster.

## Limitations

- One desktop machine; mobile devices were tested for behavior (Playwright mobile emulation and manual checks), not measured.
- The browser window had focus during the run; a hidden tab pauses the game by design.
- The heap figure is JavaScript memory only. GPU memory for textures is not included; textures are loaded once and kept for reuse.
- The frame rate is capped by the display refresh rate; the results match a 60 Hz display.
