# Three.js migration plan (Strategy B, chosen 2026-11-06)

Decision: move Little Lives to Three.js with authored GLB characters, following the external audit's Strategy B (`little-lives-audit_2.zip`). The custom renderer and procedural Naomi become reference/blockout only.

**Blocker:** this workspace cannot install packages or reach a CDN, so Three.js can't be installed or tested here. Owner action: enable package installs in Claude network settings, then continue in a new chat.

## Stage 0 — before any port (can run without Three.js)
1. Extract a renderer-independent, fixed-timestep sim core (`core/`) runnable in Node: clock, needs, personality, utility AI, object states.
2. Fix confirmed audit defects in that core, each with a regression test:
   - LL-008 `goto` start callbacks never run → LL-009 Elias phone call credits Darius
   - LL-010/011 save restores by step index and rebuilds plans from changed world → persist task plan + phase id + elapsed time + RNG
   - LL-012 non-atomic load (partial mutation, NaN fields) → validate into temp state, commit atomically
   - LL-013 abort cleanup (burners, kettle, path) → per-task resource release
   - LL-007 hygiene has no recovery action
   - LL-033 decision scores erased; LL-038 stale ingredient location; LL-030 save text into innerHTML
3. Task/object schema: interactables with approach anchors, contact events, reservations (needed for 4 agents).

## Stage 1 — Three.js visual proof (gate: owner approval)
- Full 3-storey house blockout at correct silhouette, default house camera fitted to aspect (LL-002, LL-017), baked warm lighting.
- GLB character viewer/test page for the commissioned artist (promised in the commission brief).
- Placeholder Naomi = current procedural mesh exported until the commissioned GLB arrives.

## Stage 2+ — per audit PRODUCTION_MILESTONES gates
Kitchen interaction chain on new animation → real floors/stairs → bathroom/bedrooms → four agents → cinematic/device polish. Each gate needs rendered evidence and explicit approval; passing automated tests is not visual approval.

## Audit findings accepted as corrections to earlier docs
- Kitchen interaction matrix overstated the phone (callback bug) and hygiene ("expected" drain is actually a missing need-recovery path).
- Dormer roof panels cross into an X (LL-034); only the ridge rail was fixed earlier.
- FPS/draw counters are biased (LL-020/021).
