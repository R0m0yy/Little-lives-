# Stage 0 report — renderer-independent sim core

_2026-11-06. Everything below was run in this cloud session; command output is summarised, not invented._

## Environment check
- `npm install three@0.170.0` from registry.npmjs.org: **works** (installed into a scratch dir, `node_modules/three/build/three.module.js` present).
- `pip download playwright` from PyPI: **works**. numpy 2.5.3 and pillow 12.3.0 are already installed.
- Node 22.23.4, npm 10.9.9, Python 3.13. Chromium + **Node** Playwright are preinstalled; **Python** Playwright is *not* installed, so `tools/qa_run.py` / `pose_check.py` / `shot.py` need `pip install playwright` first (and must launch `/opt/pw-browsers/chromium` or the existing `/usr/bin/google-chrome`).
- The "can't install packages" blocker in THREEJS_MIGRATION_PLAN.md no longer applies to this environment.

## What was built
`core/` — ES modules, no DOM/WebGL/globals, runs in Node and the browser:

| File | Purpose |
|---|---|
| `clock.js` | Integer-tick clock (30 ticks per sim minute). Time is `(day, tickOfDay)`, never accumulated float minutes |
| `runner.js` | `FixedStepRunner.advance(realSeconds)` — whole ticks per frame, frame-rate independent, stall cap, `alpha` for interpolation |
| `rng.js` | Per-sim xorshift RNG whose state is saved |
| `objects.js` | Household state; items with one authoritative location; hand-slot invariants |
| `resources.js` | Claimable resources (burners, tap, fridge, chair, door) with release handlers; per-agent ownership |
| `actions.js` | Action library: `plan()` once → JSON params; `steps(params)` pure; stable phase ids |
| `sim.js` | `Sim.tick()`, utility AI, step runner, locomotion, transactional abort, atomic save/load |
| `save.js` | Save schema v2: parse → migrate (v1 legacy importer) → validate → commit |
| `layout.js`, `nav.js`, `family.js` | Kitchen anchors/nav blockers (copied from legacy), A* grid, Naomi definition |

The core emits presentation hints (ik/look/lean/loopIK/expr…) as data and sound/abort events via `sim.drainEvents()`. IK target resolution (`target()`/`loopTarget()` in `src/sim.js`) is presentation and was **not** ported — it belongs in the Stage 1 Three.js layer.

**Not done in Stage 0:** the legacy browser build (`src/sim.js`) still runs the old sim; `core/` is not wired into it (Stage 1's Three.js app will consume `core/` directly). Stage 0 item 3 is partial: approach anchors and reservations exist; **contact events** do not yet.

## Audit defects fixed (each with regression tests in `test/core/`)
| Issue | Fix | Tests |
|---|---|---|
| LL-007 hygiene no recovery | New utility-scored `freshenUp` action (kitchen sink until a bathroom exists) | 3 × seven-day soaks: min hygiene 55.6–58.6 (legacy audit: 0 in all runs), ≥5 freshen-ups/week |
| LL-008 goto start callbacks ignored | `start`/`end` run once for every step kind | probe action covering goto/slide/sit/stand/do |
| LL-009 phone credits Darius | Recipient chosen in `plan()`, persisted in params, used by label and `done()` | Elias + Darius evening calls, weekday call |
| LL-010 save loses elapsed time/RNG/slide | Save stores phase id, elapsed ticks, slide, path, RNG | exact-continuation tests (walk, slide, sit, stand, pour, simmer, bedtime) + 25-point fuzz: byte-identical state after continuing |
| LL-011 load rebuilds plan from changed world | Steps rebuilt from saved params; phase looked up by id | bedtime lamp case ("Turning off the lights" stays), porridge across 10:30 cutoff |
| LL-012 non-atomic/shallow load | Validate into a new object, deep defaults, finite-number/range/enum checks, then commit | 12 rejection cases each verify the sim is byte-unchanged; partial fridge → defaults; garbage input |
| LL-013 abort cleanup | Abort releases all claims (burners off, tap off, fridge/door closed, chair freed), returns held items home, clears path | 8 targeted cases + resource-busy case + 2-day random-abort fuzz |
| LL-030 save text → innerHTML | Core: strict text schema, length caps, labels never imported. UI (`src/main.js`): `esc()` on all save-derived text | 6 core tests; `tools/xss_check.cjs` in headless Chrome: original UI `pwned: true`, fixed UI `pwned: false`, 0 injected elements |
| LL-033 decision scores erased | `lastDecision` recorded at choose time, kept through the task and saved | 1 test |
| LL-038 stale ingredient location | Items carry `at/by/hand`; holding is derived; invariants checked every tick | veg chain test + 3-day per-tick invariant soak |

## How to run
```
npm test                                   # 64 tests, ~2 s, no dependencies
python3 tools/build.py                     # legacy single-file build
node tools/xss_check.cjs "file://$PWD/dist/index.html#test"
```
Result in this session: `# tests 64 # pass 64 # fail 0`. Legacy build soaked 16 sim-hours in headless Chrome with no page errors after the main.js change.

## Next (Stage 1, needs owner approval to start)
Vite + Three.js app consuming `core/`; full-house blockout + fitted camera (LL-002/LL-017); GLB viewer page for the commissioned Naomi; port IK target resolution to the new animation layer; add contact events to the task schema.
