# Complete accessible animation investigation

Source: `/workspace/audit/source/naomis-kitchen.html`. No imported animation clips, mocap, FBX, GLB or authored Blender Actions were supplied.

![Rendered activity samples](evidence/comparisons/interaction-contact-sheet.png)

## Every animation mechanism found

| Mechanism / activity | Implementation | Audit result / visual limitation |
|---|---|---|
| Idle | `CLIPS.idle`, sine breathing/sway/arms/head, `:1492` | Functional numerical pose; nice small movement intent, limited authored weight/personality |
| Walking and turning | `CLIPS.walk`, distance-scaled phase, angular turn-step, `:1501`, `:1553` | Functional. No ground contact solve, root motion, stop/pivot clips or individual stride calibration; foot planting unverified. Turning can cycle feet without matching actual contact |
| Sitting / standing | `CLIPS.seated`, damped blend and mid lean, `:1516`, `:1562`; character/seat slides `:2670` | Completed tests. Root slides and fixed pelvis offset are not a full weight-transfer animation; two skirt bones cannot guarantee no thigh/chair intersections |
| Chair pull/scoot/tuck | Chair state z damping and hand target, `:2216`, `:2537`, `:2804` | Real chair moves; grip and body synchronization not contact-validated; nav blocker stays stale |
| Reach and arm IK | Analytical two-bone upperarm/forearm solve, `:1445`, damped targets `:1577` | Real IK, but target may exceed reach and clamps; no grip/wrist orientation goal or torso reach solve |
| Chopping | Sinusoidal hand height plus knife attachment, `:2593`, `:2832` | State sequence/capture verified. Knife contacts are timer approximations; mitten cannot articulate grip |
| Stirring / serving | Circular IK hand and interpolated serve path, `:2594`, `:2572` | Pot changes food/progress. Broad arm/torso pose, limited wrist articulation; no spoon-liquid collision or transfer particles |
| Carry plate/ingredients | Fixed forward hand targets; level prop at hand midpoint, `:2699`, `:2891` | Carry state and rendered prop verified. Can pop at attachment switches; no grip orientation/constraint validation or adaptive balance |
| Eating | Repeating scoop/raise/bite/lower target, `:2598`; procedural chew, `:1622` | Needs/food update verified. `18-mid-eat.png` shows exaggerated head-down posture and weak hand/utensil-face relationship; timer success is not natural eating |
| Handwashing / dishes / rinse cup | Scrub sine targets and faucet mesh, `:2595`, `:2808` | Water and held plate respond. No finger rubbing, realistic dish grip, foam/splash/dirty material or towel drying |
| Tea / kettle / sip | Held kettle tilt, cup level attachment, sip loop `:2606`, `:2821` | Action completes; pour sound but no liquid stream, tea surface/depletion not visualized, grip and wrist remain generic |
| Reading / page gesture | Two hand targets and periodic right-hand move, `:2611`; open-book mesh | Functional prop swap, but page itself is not turned/deformed; cover/open swap can pop |
| Phone / talk | Receiver follows right hand, ear anchor, mouth open oscillation `:2621`, `:1619` | Numerical/skeletal response; no actual conversation partner or speech; recipient relation bug |
| Cleaning | Repeating wiping target, rag attachment, dirt scalar | Functional crumbs disappear; no cloth deformation or robust surface contact |
| Switches and doors | IK reach plus state rotations, `:2554`, `:2801` | Real door/fridge/switch motion; rigid knob/faucet handle geometry does not rotate with touch; no hand-contact event |
| Doze | Seated eyesClosed target plus energy recovery | Logic completed; chair doze is not a bedroom sleep implementation |
| Bedtime / wake | Door traversal, hide/show, numeric energy recovery `:2411–2440` | Placeholder off-room activity; bed entry, lying down, blanket, pajamas, breathing in bed and wake-up are absent |
| Stairs | None | Not implemented; no stair geometry, 3D path or gait |
| Face / eye look | Nine presets, blink, head/eye residual target, `:1591–1640` | Expression probes render happy/sad/surprised. No shape keys, lip/cheek/eyelid surface deformation, jaw rig or emotional gesture library |
| Hair / clothing secondary motion | Two skirt bones in locomotion and sit; all hair on head | Very limited; no hair spring bones, sleeve follow-through or cloth correctives |
| Curtains / clock / water / steam | Sinusoidal rigid curtain sway, clock hand rotation, water-cylinder scale oscillation, additive particles | Actual environmental motion; no real curtain simulation, water flow solve or environmental state interactions |
| Flame / weather / blankets / TV / drawers / oven | None | Not implemented, despite some static appearances such as oven/drawers |

The fourteen action tests verify completion and state effects at fixed dt. Screenshots verify selected poses, not temporal smoothness of every clip. The supplied normal-session video is real elapsed-time browser recording; the multi-day soaks accelerate logic without rendering. Physical device motion quality and all possible clipping cases remain unverified.

## Why movement still looks mechanical

The system blends three analytic base poses, then pulls hands toward anchors. No authored anticipation, overlap, support-leg contact, wrist roll or contact event ties the body to its task. A hand reaching an impossible point is clamped, but the action timer still completes. Speed/phase synchronization helps foot slide but cannot enforce it; a foot target anchored in world coordinates or matching authored root trajectory is missing. The seated pelvis shift and skirt tilt operate independently of actual garment and chair surface constraints.

Position-only prop midpoint attachment can float a plate between hands and snaps it between table and hands at callbacks. The head/eye look uses a generic head location, fixed clamps and a blend; it does not ensure the face stays readable while eating or holding a phone. Torso lean plus head look can stack into the severe forward bend in the evidence.

## Reusable production animation library

Create a shared semantic clip set, retargeted and polished for adult/teen/child rigs:

- Idle variants (relaxed, busy, tired, pleased), look shifts, blink, short reactions, listening/talking gestures.
- Walk at slow/normal speed, start/stop, 90°/180° turns, sidestep/align, stairs up/down, careful carry locomotion.
- Stand-to-sit/sit idle/sit-to-stand with furniture-height variants and contact metadata.
- Reach high/mid/low, open/pull/push, knob/switch press, grasp/release, one/two-hand carry, place/pickup.
- Chop/stir/serve, scoop/eat/chew, pour/sip, wash hands/scrub plate/rinse/dry, wipe surface.
- Bed sit/lie/cover/idle-breath/turn/uncover/get-up, toilet approach/sit/wash, bath entry and brushing teeth (appropriate privacy framing).
- Read/page turn, write/homework, sofa relax, shared conversation/serve/hand-over and family celebration gestures.

Most object reuse comes from **normalized interaction classes and anchors**, not a bespoke clip for each chair. An authored reach clip sets timing/torso/wrist intention; runtime IK corrects final hand position/orientation within a limited valid range. Furniture records seat/back/hand anchors and dimensions. If outside the range, select a different height variant or reposition the actor; do not stretch a limb beyond reach.

Use a state machine for locomotion/interaction phases, blend trees for speed/direction, upper-body masks for carrying/talking, additive breathing/looks, and facial blend shapes driven by mood/action. Author root motion for contact-rich sit/bed/door approaches, or extract and match it to navigation; use in-place locomotion only with tested stride/foot locking. Foot IK accounts for ground/stairs and pelvis adjustment; hands have explicit grip poses and wrist orientations. Retarget offline where practical, then adjust per family member and outfit. Add subtle constrained hair/cloth springs or baked follow-through, with corrective shapes for the long skirt.

Primary references: [Three.js animation system](https://threejs.org/manual/pages/animation-system.html), [Babylon animation retargeting](https://doc.babylonjs.com/features/featuresDeepDive/animation/animationRetargeting), [official Blender glTF exporter](https://github.com/KhronosGroup/glTF-Blender-IO). Engine blending/retargeting is useful tooling; it will not create appealing acting or fix poor rig weights automatically.

## Animation approval tests

Gate 3 must show rendered front/side close-ups and full-body footage for approach → cook → carry → sit → eat → wash, including interruption and save/load in each phase. Feet should remain planted during marked stance intervals; utensils must align with fingers, plate and mouth; no obvious table/cloth/body intersection; smooth velocity and no one-frame teleports at attachment. Choose numeric contact tolerances relative to final approved character scale, then visually review alongside the board. Test all four rigs and clothing variants before treating retargeting as complete.
