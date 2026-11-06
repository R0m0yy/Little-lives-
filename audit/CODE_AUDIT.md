# Code forensic audit

Source `S` in this report means the exact path **`/workspace/audit/source/naomis-kitchen.html`**. The original is unchanged. Findings distinguish missing scope from defects in implemented systems. Priority: P0 blocks the approved product; P1 materially breaks behavior/production; P2 limits polish or reliability; P3 cleanup.

| ID | Priority | Finding and exact source location | Evidence / consequence |
|---|---|---|---|
| LL-001 | P0 | Only one functional room; `S:1648`, `S:1979`, `S:2003` | Upper floors described as future milestone; dining room explicitly a shell. `03-house-overview.png` |
| LL-002 | P0 | Start forcibly changes to kitchen; `S:3175`, `S:3177` | Both start handlers set a 2,500 ms timeout. `normal-launch.json` records `cam.mode=kitchen` |
| LL-003 | P0 | One character spec/agent; `S:1471`, `S:3037`, `S:3043`; first-agent visual sync `S:2799` | Darius/Elias/Laila are UI relationship entries, not autonomous people |
| LL-004 | P0 | Procedural character asset pipeline; `S:1015`, `S:1072`, `S:1133`, `S:1231`, `S:1322` | No authored topology/UV painting/morph assets. Primitive density does not provide approved silhouette/deformation |
| LL-005 | P1 | Renderer has no GLTF import or PBR map support; `S:427`, `S:439`, `S:600` | Blinn-style specular, vertex material constants and a single color texture; no image-based reflections/normal/roughness maps |
| LL-006 | P1 | Sleeping is visibility/state substitution; `S:2422`, `S:2425`, `S:2880` | Exit into corridor, set `away/sleeping`, hide character. Energy restores without bed/stairs |
| LL-007 | P1 | Hygiene decays but has no utility-scored recovery action; `S:2211`, `S:2649` | Five-minute handwash exists only within cooking. All six seven-day runs hit hygiene zero |
| LL-008 | P1 | `goto` start callbacks silently ignored; `S:2260`, `S:2348`, `S:2521` | Only generic `do` branch invokes `st.start` (`S:2543`). Phone's `vars.who` remains absent |
| LL-009 | P1 | Phone relationship updates wrong recipient; `S:2356` | Falls back to Darius although label can name Elias. `supplemental-logic-results.json:call-target-mismatch` |
| LL-010 | P1 | Save omits elapsed action time, RNG, slide and animation state; `S:2742` | Restart at step beginning (`S:2766`), not exact continuation. Probe: `stepT=4.2→0` |
| LL-011 | P1 | Loading rebuilds condition-dependent step arrays; `S:2764` | Bedtime index 3 changes from “Turning off the lights” to “Opening the door” when lamp is now off. Recipe also changes across morning cutoff |
| LL-012 | P1 | Load is non-atomic and shallow; `S:2749`, `S:2752` | Invalid `agents` mutates clock before throwing. Partial fridge record yields NaN `open` (JSON logs encode NaN as null) |
| LL-013 | P1 | Abort cleanup incomplete; `S:2497` | Both burners remain active, kettle can remain at `hand`, path remains active; global resets also unsuitable for multiple agents |
| LL-014 | P1 | Navigation is not collision resolution; `S:2090`, `S:2130`, `S:2704` | LOS skips blocked samples within 0.5 units of endpoints; blocked exact goals appended; steering can leave planned segment; no swept physical checks |
| LL-015 | P1 | Dynamic blocker disconnected; `S:3026`, `S:2804` | Chair A moves visually, grid rect remains at original coordinates. Door/fridge not blockers |
| LL-016 | P1 | No reservation/ownership checks; `S:2537`, `S:2799` | Chair occupancy is assigned, not acquired; one global plate/cup/knife, one-agent prop sync. Adding agents would overwrite props |
| LL-017 | P1 | Fixed camera shots do not fit aspect; `S:3046`, `S:3091` | Mobile portrait crops house horizontally; no bounding-volume fit or UI-safe frame |
| LL-018 | P2 | Cinematic mutates gameplay; `S:3101` | Resets clock, hunger, position, food, cooldowns; forces cooking. It is a demonstration reset, not merely a camera mode |
| LL-019 | P1 | No fixed simulation timestep; `S:2631`, `S:3202` | Animation, needs, action timing and particles depend on frame subdivision; coarse soak and live runs differ |
| LL-020 | P1 | Reported FPS is biased; `S:3202`, `S:3203` | `dt` clipped to 0.05 then inverted, so slow rendering tends toward a displayed floor of 20 FPS. Raw rAF intervals exceed 900 ms in software session |
| LL-021 | P2 | Render counters omit shadow/particle/post passes; `S:627`, `S:670` | Instrumented 101 submissions/216,339 triangles vs UI 52/109,122 in sampled frame |
| LL-022 | P2 | Ambient corner heuristic is not geometric AO; `S:451` | Uses distance to single room walls/floor. No under-furniture or character contact occlusion |
| LL-023 | P2 | Tone mapping occurs before blending/post; `S:442`, `S:477`, `S:515` | Display-encoded RGBA8 scene, approximate gamma, glow threshold; no linear HDR post pipeline |
| LL-024 | P2 | No point-light shadows; `S:435`, `S:460`, `S:627` | Practical lights can illuminate through furniture/walls. One fixed directional shadow volume cannot cover a future house automatically |
| LL-025 | P2 | Always-on costly post and full scene passes; `S:499`, `S:627` | 27 DOF/glow loop iterations (~83 total texture samples/pixel), no culling/LOD/quality selection; max 4× MSAA even mobile |
| LL-026 | P1 | No leg IK, authored contact or stair system; `S:1501`, `S:1553` | Distance-driven walk phase is useful, but does not lock feet; 2D path has no floor/step heights |
| LL-027 | P1 | Hand/face/clothing rig quality limitations; `S:1133`, `S:1353`, `S:1614` | Mitten finger bone; two skirt bones; scaled mouth meshes and rotating lid shell; no facial blend shapes or collision correction |
| LL-028 | P2 | Main startup/loop lacks broad recovery; `S:3002`, `S:3204` | Catch covers renderer construction only; geometry/DOM/render exceptions can stop initialization/RAF; no context-lost rebuild |
| LL-029 | P2 | WebGL lifecycle management incomplete; `S:523`, `S:596`, `S:588` | Compiled shaders not deleted; upload returns only VAO/count, no disposal API for buffers; incomplete-MSAA fallback can leave allocations until resize |
| LL-030 | P2 | Loaded text inserted as HTML; `S:3167`, `S:3168` | Unvalidated save memory/relationship strings reach `innerHTML`; malicious imported save can inject DOM/event attributes. No external attacker path observed; reject/sanitize imported content |
| LL-031 | P2 | Mobile overlap / accessibility; `S:55`, `S:4`, `S:3139` | Camera bar starts y=58, top bar reaches y=73 at 390px; zoom disabled by viewport; custom card/tabs lack semantic keyboard controls |
| LL-032 | P2 | Reproducibility incomplete; `S:1586`, `S:2863`, `S:3040`, `S:2742` | Face/audio use Math.random, simulation and particles share M.rand; seed can be set but state not saved. Fixed dt + same seed repeats decisions; different dt does not |
| LL-033 | P2 | Decision explanation erased; `S:2657`, `S:2480` | `lastScores` assigned then `start` resets to null; UI “Next on her mind” loses scores. Reproduced |
| LL-034 | P2 | Roof dormer panels cross; `S:1997` | Both roof boxes centered at same position with ±z rotation create an X silhouette, visible in overview. No previous roof-fix claim can be verified |
| LL-035 | P2 | Household visuals not fully stateful; `S:1942`, `S:2838`, `S:2839` | Dirty plate has no dirty texture; cup tea amount does not change visible liquid; no actual kettle water consumption/refill/pour stream |
| LL-036 | P3 | Dormant/dead scaffolding; `S:1275`, `S:551`, `S:1492`, `S:1536`, `S:2450` | Unused `bunV2`, `boneIdent`, Animator speed, Sim.t consumers absent, `forced` only cinematic. `a.angVel`, `moveDone` scaffolding and unused IK locals complicate maintenance |
| LL-037 | P1 | No supplied reproducible build or prior tests | Only `LLAPI` hooks, no harness/manifests/CI/asset validator. This audit supplies independent tooling, not missing original QA provenance |
| LL-038 | P2 | Stale ingredient state; `S:2257`, `S:2260`, `S:2800` | After putting vegetables down, `O.veg.at` remains `hand` while `hold.R` clears; visuals use hold state instead. Confirmed in interaction-stage logs |
| LL-039 | P2 | Audio pause policy is disconnected; `S:3187`, `S:2977`, `S:3190` | Simulation pause sets visual dt to zero, but Audio.sync and phase-based footsteps still run without a pause guard; active water/room/cooking loops can continue. Define desired sound behavior and test it; auditory acceptability unverified |

## What is real and worth preserving

This is not a fake renderer or a prerecorded animation. GPU skinning, world-space arm IK, eased movement, utility selection, appliance variables, hand attachment transforms, lighting changes, synthesized audio and browser local saves are implemented. All fourteen action sequences completed in controlled logic scenarios. Rendered snapshots verify multiple kitchen stages. These are useful prototypes and design tests.

The gap is scope and production quality: there is no full house, family cast, finished model pipeline or robust world simulation. Passing fourteen action-completion tests does not prove natural motion, attractive faces, safe continuation after every save, or appliance completeness.

## Coupling and technical debt

Kitchen dimensions and anchors appear separately in geometry (`S:1648`), interaction points (`S:2144`), IK targets (`S:2554`), world prop transforms (`S:2812`) and nav obstacles (`S:3021`). This makes even moving a sink a multi-file-equivalent edit. Every household prop is addressed by a special string and repeated conditionals. Action definitions are closures with state changes spread across start/tick/end callbacks; there is no schema for persistence, cancellation or contact events. A data-driven affordance layer must replace this duplication before adding rooms and people.

Procedural mesh generators remain useful for blockout, collision proxies and decorative repetition. Keep them as tools; replace the hero character and house production path. Do not spend another iteration tuning eye radii or adding ringlet tubes as a substitute for approved authored assets.
