# Visual-quality recovery roadmap

Do not begin this implementation until the user approves the recovery plan. Current-source evidence is in the specialist audits; source root is `/workspace/audit/source/naomis-kitchen.html`.

## Highest-impact sequence

1. Recover original references and lock the complete-house silhouette, adult/child style and main overview composition.
2. Prove the authored asset/material pipeline with one Naomi and complete-house presentation, in the proposed game renderer.
3. Integrate natural contact-rich cooking/sitting/eating before producing hundreds of household interactions.
4. Build actual rooms/floors, navigation and object contracts; then extend to family and complete fixtures.
5. Polish light/sound/weather/story detail on top of approved art and reliable actions.

This sequence avoids polishing current parametric eyes/skirts, rebuilding the custom renderer's missing asset infrastructure, or furnishing rooms before the final architecture dimensions are approved.

## System-by-system recovery specification

| System | Current → target / root cause | Workflow / required assets / technical change | Complexity and risk | Acceptance criteria |
|---|---|---|---|---|
| House massing and architecture | One room/roof/stubs → complete ornate multi-floor cutaway. Missing content is primary | Blender reference-traced elevations/floor plan; custom gables/porch/trim; room/floor hierarchy, traversable portals and camera bounds | High; ambiguous unseen details and scale conflicts need art decisions | Gate1 actual overview matches original architecture/silhouette, every floor visible |
| Default composition | House starts then auto-kitchen, aspect crops → full miniature always first | Remove forced transition after approval; safe-viewport bounds fit, focal/DOF plan, authored room cameras | Small code change, medium cinematic design; will not solve missing house alone | No roof/base cropping on supported viewports; room zoom voluntary; return reliable |
| Naomi model | Parametric spheres/tubes → sculpted original collectible character | Sculpt/blockout→retopo→UV/bake→texture→rig→face→GLB; hands/clothes/hair authored | High; artistic likeness and garment weights dominate | Gate2 turntable/expressions/hand close-ups in actual engine approved |
| Other family | Relationship rows only → original Darius/Elias/Laila | Approved age bases, identity meshes/hair/wardrobes, retarget profiles and individual expressions | High; adult/child style consistency and clothing fit | All four recognizable from board, distinct silhouettes, compatible shared library |
| Materials | Color patterns/spec constant → miniature wood, fabric, brass, ceramic, skin | PBR channel pipeline, normal/roughness/AO, environment reflections, color management, texture compression | Medium-high; unsupported exported nodes and inconsistent scale | Neutral/material charts and room shots show differentiated surfaces without plastic uniform shine |
| Indirect/practical lighting | Corner heuristic/unshadowed points → warm layered rooms and contacts | Static bake/indirect sets, dynamic key/contact shadows, room light budget, day/night exposure | Medium-high; switched light and movable furniture bake mismatch | Gate1/7 show grounded feet/furniture, readable warm rooms and day/night transitions |
| Animation | Analytic clips + IK → believable weight, hands, faces | Authored clips, state/blend layers, root/contact strategy, foot/wrist IK, grip poses and skirt correctives | High; asset/rig/furniture dependencies | Gate3 no obvious snapping, slipping, floating props or garment intersections across tested chain |
| Functional furniture | Static facades and global prop strings → full responsive household | Object schemas/anchors/reservations; articulated pivots/interiors; actual bath/bed/oven/drawers/TV assets | Very high content breadth; state and cancellation combinatorics | Gate5 fixture matrix has rendered/state/audio/persistence evidence per affordance |
| Tabletop/background | Plank box/painted room → believable real-world miniature context | Authored tabletop/base; approved licensed photographic/HDR/3D background, stable lens/depth | Medium; perspective/reflection mismatch can break scale illusion | Table edge/wood scale/base and soft living-room context support rather than compete with house |
| Sound | Synthesized generic events → intimate household Foley | Original/vetted recordings, material variants, spatial/room routing, event/contact synchronization | Medium; licensing, loudness and repetition | Audible coherent quiet scene, no persistent loops after cancellation, camera changes don't misplace sound |
| Atmosphere | Curtain sway/steam/dust → restrained living details | Quality-scaled steam/water/fire/window weather, cloth and breathing; state-driven emission | Medium; effects can obscure weak art or become costly | Effects reinforce action/temperature/weather; no constant fog/bloom wash |
| UI/mobile | Fixed overlays/overlap → clear observation interface | Reflow top bar, compact portrait controls, accessible buttons/tabs, safe areas, optional HUD, error recovery | Medium; touch hardware untested | Clock/controls visible without overlap, large targets, complete-house framing and keyboard/touch paths |
| Runtime/performance | No culling/LOD; costly post; misleading stats → scalable verified rendering | Spatial batching/instancing/LOD, real all-pass counters, compressed assets, GPU/device profiles, context restore | Medium-high; asset budgets unknown until proof | Agreed hardware frame-time/memory/load targets met with core silhouette/warmth intact |

## Quick corrections versus fundamental rebuild

Quick future corrections: stop automatic kitchen zoom; accurately label existing content; preserve decision scores; add defensive atomic save parsing; fix ignored goto callbacks/phone target; stop burners/release tasks on cancel; truthful FPS/all-pass counters; mobile top-bar layout. These are worthwhile reliability fixes, **not evidence that reference quality has been recovered**. They remain proposals in this audit, not unrequested code changes.

Fundamental replacement: hero character topology/rig/materials, complete house model/content, renderer asset/material support, contact animation library, object affordance/persistence contracts and multi-floor/family architecture. Do those before incremental polish of discarded procedural assets.

## Gate evidence standard

Every gate requires a versioned playable build, original-reference side by side, ordinary in-engine screenshots/footage, state/test logs where relevant, known-limitations list and **explicit user approval**. No gate has passed in this audit. The new plan and its first proof may be approved independently; none of these proposed assets currently exists.

Gate1 full-house presentation and Gate2 Naomi may be produced in parallel after plan approval, but both should pass before large-scale integration/content replication. Gate3 proves interaction quality, Gate4 actual floors, Gate5 complete objects, Gate6 family autonomy, Gate7 cinematic finish. If a gate fails artistically, revise that stage before adding breadth.
