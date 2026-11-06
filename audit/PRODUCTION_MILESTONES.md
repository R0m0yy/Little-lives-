# Production stages, dependencies and approval gates

**Status: proposal only.** No major redevelopment started and no gate is approved. Each stage below requires actual in-engine evidence and explicit user approval before accepting the gate. Owner approval of this recovery plan is separate from artistic approval of future assets.

## Estimation basis

Assume one complete reference-matched Victorian house (roughly 9–12 room/attic areas subject to approved floor plan), four original family characters, curated wardrobes, browser-first delivery with measured desktop/mobile tiers, roughly 30–50 meaningful object affordance groups with reusable sub-actions, and a focused shared animation library rather than hundreds of bespoke per-object clips. No neighborhood economy, multiplayer, unrestricted building, extensive aging or pet in initial scope.

Suggested staffed team: gameplay/render engineer; environment artist/lookdev; character artist/rigging technical artist; animator; fractional QA/art direction, with extra help where roles overlap. A small 4–6 person team may need **9–15 calendar months**, with **90–150 person-weeks base** and **25–35% contingency (~115–200 total person-weeks)**. This is a planning estimate with high uncertainty, not a fixed bid. Approval pauses, missing originals, revisions, outsourcing availability, device constraints and scope changes can extend elapsed time. A solo developer needs substantially longer, especially without dedicated art skills.

## Milestone plan

| Stage | Work and dependencies | Calendar allowance | Base effort | Concrete exit deliverable |
|---|---|---:|---:|---|
| M0: production lock | After plan approval: recover originals/repo/QA, resolve reference inconsistencies, scope platforms/room map, asset/action/save contracts and evidence baseline | 1–2 weeks | 2–3 person-weeks | Approved references/style bible, floor plan, bounded proof budget and device list |
| M1: visual/asset proof | House silhouette→complete presentation and authored Naomi; renderer/import/material/face/lightmap prototype. Environment and character can proceed in parallel | 6–10 weeks | 18–30 person-weeks | Gate1 and Gate2 packages; prototype profiles and final renderer choice |
| M2: Naomi integration | Depends on approved house scale, Naomi rig and pipeline; animation library starter, contacts/IK/props, transactional tasks/saves | 6–9 weeks | 10–18 person-weeks | Gate3 full cooking/carry/sit/eat/wash chain and interruption/save tests |
| M3: real floors | Depends on room map/anchors; stairs/door portals, 3D navigation links, collision and visibility/cameras | 4–7 weeks | 8–14 person-weeks | Gate4 real multi-floor movement and room-camera coverage |
| M4: household completion | Each room's fixtures/articulated assets, bathroom/bed/privacy, storage/food/cleanup, audio/visual state and persistence | 8–14 weeks | 24–40 person-weeks | Gate5 completed interaction matrix with ordinary gameplay evidence |
| M5: family autonomy | Other three original rigs/outfits/retargeting, reservations, paired tasks/schedules, relationships/memories and distribution tests | 6–10 weeks | 16–26 person-weeks | Gate6 four-person 14-day simulations plus observed normal-speed days |
| M6: cinematic/platform polish | Depends on all prior gates; light/sound/camera/secondary motion, quality tiers, device profiles, errors/accessibility and regression suite | 6–10 weeks | 12–20 person-weeks | Gate7 final visual evidence, audible review and physical-platform acceptance |

Some production can overlap after contracts stabilize; integration, visual revisions and reviews prevent dividing effort mechanically by headcount. Do not use the lower bound as a deadline promise.

## Required approval gates

| Gate | Evidence that must be delivered | Approval criteria / rejection conditions |
|---|---|---|
| **1 — Full dollhouse presentation** | Actual default playable shot; original-reference side by side; clay/material renders; day/evening; desktop/portrait framing | Entire house/roof/porch/base/tabletop visible, correct multi-story massing/gables/room hierarchy, dense warm miniature materials and softly blurred real-world context. A kitchen pavilion or Blender-only still fails |
| **2 — Premium Naomi** | Authored source/GLB, in-engine turntable, face/hand/bun close-ups, expression/rig stress grid, neutral/warm light | Recognizable approved Naomi identity and purple-reference style; beautiful coherent anatomy, hair, hands, garments and shading. Valid skinning or higher polygon count alone fails |
| **3 — Character integration** | In-engine continuous footage of approach/cook/carry/sit/eat/wash; front/side views; contact/IK logs; interrupted and restored states | Natural weight, planted contacts, believable grips/expressions, no obvious clipping/snapping/floating. Timer completion alone fails |
| **4 — Functional multi-floor home** | Room/floor nav map, rendered routes through actual doors/stairs, collision tests, camera returns | Characters traverse real floors and stairs with foot placement and usable clearance; hidden/off-room substitutions fail |
| **5 — Complete household functionality** | Per-fixture rendered/action/state/audio/save evidence for final household matrix, privacy and recovery tests | Toilets/flush/wash/bath, beds/blankets/wake, stove/oven/fridge/storage/dishes, lamps/TV/fireplace/doors/chairs and scoped household systems work. Static props or unsupported “simulated” claims fail |
| **6 — Autonomous family life** | All four characters visible, joint routines and reciprocal interactions, fixed-seed 14-day logs and watched days | Independent believable routines, no persistent unmet need/stalls/ownership conflicts, meaningful relationships and memory effects. Relationship rows without agents fail |
| **7 — Cinematic polish** | Reference-comparison footage and stills, sound mix, device profiles, UI/error recovery | Consistent art/lighting/materials/camera/acting/audio/atmosphere at agreed desktop/mobile tiers. Automated tests alone cannot pass this gate |

All seven require **explicit owner approval** attached to a version and reference set. No silent roll-forward or “tests passed” surrogate approval. Rejecting a gate should lead to focused revision there, not additions designed to distract from the failure.

## Major risks and mitigation

- **Reference ambiguity:** separate originals missing and composite contains different house variants. Resolve before detailed modeling; record agreed 3D interpretation.
- **Art staffing:** appealing face/hair/garment/acting is skilled work. Commission reviewable milestones with editable sources and revision allowance, not a promise of one-click procedural generation.
- **Long skirt and proportions:** sitting/stairs/hand reaches stress stylized rigs. Prototype these early, before wardrobes and children are replicated.
- **Browser hardware:** one complete house with many warm lights can exceed low-end budgets. Preserve silhouette/material hierarchy, use baked bounce/LOD and profile representative devices early.
- **Cancellation/persistence:** interacting tasks involve props, occupants, switches and effects. Stable phase IDs/events/ownership/save validation are dependencies, not polish after content expansion.
- **Scope drift:** aging, pets, unlimited furniture placement and neighborhoods multiply assets/simulation. Keep them optional until Gate6/7 and estimate separately.
- **Third-party assets:** legal format access and style fit uncertain until acquired/reviewed. Keep custom hero assets and an acquisition manifest; don't base architecture on unverified pack content.

At final audit handoff, the only decision requested is whether to approve/refine this recovery direction and its scoped proof. Implementation remains paused.
