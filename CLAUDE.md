# Little Lives — handoff for Claude Code sessions

Premium 2.5D autonomous family simulator in a Victorian tabletop dollhouse (browser game). Family: Darius (father 38), Naomi (mother 36), Elias (son 15), Laila (daughter 9). Owner works from an iPhone; no local PC. Be honest in status reports: never claim a file, build or test exists unless verified.

## Read first
- docs/PROGRESS.md, docs/QA_REPORT.md, docs/THREEJS_MIGRATION_PLAN.md
- audit/ (external audit: EXECUTIVE_SUMMARY.md, ISSUE_REGISTER.csv LL-001..LL-039, RECOVERY_STRATEGY.md)

## Decision (2026-11-06)
Strategy B: move to Three.js + commissioned/authored GLB characters. Current custom WebGL2 renderer and procedural Naomi (src/character.js) are reference/blockout only. Stage 0 (no Three.js needed): extract a renderer-independent fixed-timestep sim core, fix audit defects LL-007/008/009/010/011/012/013/030/033/038 with regression tests. Stage 1: Three.js full-house visual proof.

## Current build
src/*.js concatenated by `python3 tools/build.py` -> dist/index.html. QA: tools/compare.py (character vs reference), tools/pose_check.py, tools/qa_run.py (headless Chrome via Playwright, software GL). refs/design_board.png is the single supplied reference board (lower-right house = architectural authority; separate A/B originals were never supplied).

## Known open items
Only the kitchen exists; no bedroom/bathroom/stairs. Sleep is hidden off-room. Naomi v3 not signed off (bun from behind, mitten hands, missing apron layer, flat skin). Dormer roof panels cross in an X (LL-034). Artist commission brief exists as a Claude doc "Little Lives — Naomi 3D Character Commission Brief".
