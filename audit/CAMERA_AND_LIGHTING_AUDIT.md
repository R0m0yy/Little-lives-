# Camera, lighting and cinematic presentation

Source: `/workspace/audit/source/naomis-kitchen.html`. Browser evidence: `normal-launch.json`, `camera-controls.json`, `mobile-layout.json`, screenshots 01–03, 20–21, 24–25.

## Default camera: exact cause

The initialized mode is `house` with target [−1,2.9,0], distance 23, yaw .1, pitch .15 and vertical FOV .6 radians (`:3046–3056`). Both sound and quiet start handlers execute `setTimeout(() => setCam('kitchen'), 2500)` (`:3175`, `:3177`). The House button can restore the broad shot, but there is only one room below the roof. This is **both a deliberate room-first transition and incomplete architecture**, not a hidden full house or a scale bug alone.

The room shot uses distance 13.5 and target [.1,1.8,−.1]. Follow tracks a clamped agent position; director picks fixed sink/stove/prep/table/phone views based on current position/step (`:3057–3083`). Damping smooths target and lens variables. Drag and wheel work in the browser probe: yaw user offset reached −.6, pitch .24, zoom .8. Pinch handlers exist, but physical multitouch behavior was not tested.

The Cinematic button resets simulation to a hungry lunch cooking demo (`:3101–3111`), then selects activity shots and returns to house after eating. Do not treat that reset as proof that spontaneous cooking is guaranteed under every need state. Camera mode should not rewrite household state in the production version.

## Composition problems

- Hardcoded distance/FOV does not adapt to aspect ratio or HUD safe areas. At portrait 390×844, the module is cropped on both sides. The canvas uses 585×1266 render pixels due to capped DPR 1.5; the screenshot uses device scale 3. These are distinct quantities.
- The roof and empty shell dominate the overview, and furnishings sit low within a single open box. The reference identity depends on vertically stacked rooms and gables, so zoom alone cannot fix it.
- Director lacks minimum dwell time, action anticipation and collision/occlusion checks. The face is often hidden by head pitch, cupboard, body orientation or table. See sampled eating pose.
- No general pan/room framing or selection exists; drag is orbit offset, not translation. No semantic floor/room camera volumes.
- DOF focus is distance to shot target rather than a controlled house-depth interval; close-ups can blur context and details before they have adequate material quality.

## Proposed cinematic system

| Mode | Behavior and implementation | Acceptance evidence |
|---|---|---|
| Full-house default | Fit authored house bounds, excluding backdrop/table bounds, inside UI-safe viewport. For centered bounds, use limiting vertical/horizontal FOV and add depth/margin; verify all eight corners after projection. Persist only user-selected departures | Entire roof, porch, base and all floors visible at desktop, tablet and portrait; no forced start zoom |
| Room zoom | Per-room anchor, safe lens range and cutaway visibility group; tween position/target/lens with eased interruption and retained overview return state | Optional 1–2 second move without passing through roofs/walls or clipping furniture |
| Character follow | Spring target filtered from head/chest/floor position, speed lead, floor-aware camera limits and visibility test | Shows feet during stairs and face during interactions; no background obstruction |
| Director | Consume semantic activity events, score visibility/story relevance, 4–8 second dwell and cooldown; favor house view between scenes | Smooth edit sequence across family with no forced task or clock resets |
| Return to house | Dedicated visible control; eased movement from any camera with bounds fitting recalculated for viewport | Return preserves simulation and frames complete house |
| Lens / DOF | Stable moderate focal length, deep enough focus band for full house; stronger blur on real-world background, restrained close-up DOF | Important rooms/family readable; background soft without haloing roof/railings |

Use an overview composition approved in the engine, not one guessed from Blender's camera. The board cannot provide exact physical focal length; lens ranges are art-direction hypotheses to tune against the originals.

## Actual renderer lighting

There is one 2048² directional shadow map on desktop, 1024² on mobile, 3×3 PCF, a fixed radius 8.5, no face culling and a hemisphere ambient term (`:435`, `:627`, `:3197`). Interior point lights (up to eight) illuminate surfaces but do not shadow. Room corner darkening is an analytic wall/floor-distance heuristic, not SSAO or baked AO (`:451`). Skin has wrap and warm terminator/rim approximations, not a physical subsurface model.

World lighting interpolates day/sky/key/fill colors from clock; lamp, chandelier, burners and fridge provide point lights (`:2849–2860`). Window/daylight is a near-window point plus a fixed key, not simulated transmission through a window opening. `ovenGlow` is created with zero emissive at `:1758` and never updated; there is no oven-use action. Frame buffer is RGBA8; ACES-like mapping and gamma happen in material shading before post/bloom (`:477`, `:583`). This cannot provide linear HDR bloom, reflections or global illumination by adding another warm light.

## Warmth and miniature photography: practical production choices

| Technique | Value for this project | Cost / implementation decision |
|---|---|---|
| PBR roughness/normal + reflection environment | High: separates varnish, brass, ceramic, skin and fabric | First priority; correct sRGB color/data map tagging; compressed textures |
| Baked room indirect light/AO | High: under-cabinet depth and warm enclosure | Bake fixed architecture; use unique non-overlapping lightmap UVs and explicit runtime lightmap binding. Core glTF is not a universal baked-lightmap transport |
| Practical fixtures | High: reference's room identity | Visible emissive shade plus bounded dynamic light; baked or switchable indirect contribution; per-room active-light budgets |
| Character contact / dynamic shadows | High: anchors feet, hands and furniture | One well-fitted directional shadow plus selective local shadows or contact technique; update only when needed |
| Day/night | Medium-high for living home | Blend day/evening/night indirect sets or ambient/probes; dynamic key/window influence. A single fixed bake must not remain sunlight-bright at midnight |
| Fireplace | High in living room, currently absent | Animated emissive flame plus subtle flickering local light; bake warm bounce where appropriate; no costly full flame fluid simulation |
| AO | High under furnishings; moderate elsewhere | Baked AO for static crevices; optional half-resolution SSAO for dynamic contact, test haloing and double-darkening |
| Tone/exposure | High at low relative cost | Linear lighting and HDR-capable target where supported, one output transform, calibrated exposure; restrained auto-exposure bounds |
| Background DOF | High for miniature context | Author photographic/3D distant background and lens blur; low-resolution separable/quality-scaled DOF; avoid blurring all rooms |
| Bloom | Low-medium | Small thresholded highlights from practicals; quality-scaled; never replace material detail with glow |
| Dynamic GI | Potentially useful, high complexity | Not the first browser solution. Investigate only if baked/switchable sets cannot support required customization |

Relevant primary guidance: [Three.js color management](https://threejs.org/manual/pages/color-management.html), [Babylon PBR](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR). Renderer capabilities enable an art pipeline; they do not create the reference's composition or craftsmanship automatically.
