# Premium art production pipeline

The reference board establishes a visual goal, not a mesh/rig specification. Separate approved originals are still needed before locking measurements and likeness. The proposed pipeline below is work for after recovery-plan approval; it has not been implemented in the game.

## A practical original Naomi workflow

| Stage | Concrete production work | Automation versus artistic work | Review output |
|---|---|---|---|
| Design lock | Annotate approved Naomi front/three-quarter/profile/back, adult body/head ratio, eyes/socket/lips, bun flow and dress silhouette. Resolve unseen details without changing identity | Codex can assemble sheets/checklists; artist and owner decide forms and ambiguities | Measured style bible and approved silhouette sheet |
| Blockout | Blender sculpt/block meshes, large rounded head/cheeks, readable adult body, eye/orbit placement, hair masses and garment silhouette | Symmetry/tools speed work; proportions and appeal require sculpt judgment | Clay turntable and house-distance thumbnails |
| Sculpt / surface design | Refine cheeks/nose/lips/lids, ear transition, hand shapes, bun clumps, sleeve/cuff/fold structure. Keep broad shapes clean; don't add human pores to a collectible doll | Sculpt tools/procedural groove masks help; expression and silhouette require refinement | Neutral and expressive sculpt comparison |
| Retopology | Continuous loops around eyes/mouth, joints and neck; controlled density where expressions deform. Model hands with independently posed digits | Guided retopo/quad tools can start meshes; deformation loops/manual correction mandatory | Wireframe plus extreme bend/face tests |
| UV / baking | Stable UV islands and texel scale; bake high-to-low normals/AO; separate color versus data channels. Keep facial morph topology unchanged | Batch unwrap/bake/pack/export scriptable; seam placement and bake fixes reviewed | UV sheet, normal/roughness review, bake error log |
| Texturing | Paint warm skin/blush/lip gradients and subtle roughness, iris/eye maps, sculpted hair highlights, dress weave/floral motifs/seams | Procedural fabrics and masks reusable; color balance/face/clothing painting artist-controlled | Neutral-light material chart and final renderer lookdev |
| Skin / eye / hair shading | Soft stylized skin response, glossy cornea/darker iris depth, broad hair clumps with restrained grooves; consistent exposure in room | Shader implementation/parameter presets automated; appearance approved by rendered turntable | Same asset under neutral, daylight and warm practical lighting |
| Rig / weights | Semantic deform skeleton, separate control rig, finger/eye/jaw/face controls, shoulder/arm twist as needed; pelvis/thigh/hem skirt controls | Rigify/control generation scriptable; weights, poles, corrective poses and grip anatomy require technical artist | Pose stress suite and export skeleton manifest |
| Face / secondary motion | Blink, squint, smile/frown, surprise, asymmetric brows, mouth open/chew/speech; cheek/lid/lip support and combination correctives; subtle bun/tendril/skirt follow-through | Named shapes and test grids generated; expressions and collision fixes artist-reviewed | Expression sheet/combination video, no lid gaps or inverted lips |
| Animation | Authored gait/contact poses and shared interaction library with contact markers and prop grip poses; retarget and polish | Clip batch export/retarget tests automated; acting, timing, weight and transitions need animator | Walk/sit/cook/eat footage in game |
| Export / validation | Apply documented unit/axis conventions, bake deform-bone animation, export GLB/morphs/materials, strip control rig, validate | Codex can own Blender scripts, validator CI, bounds/anchor/clip checks | Versioned asset bundle with zero structural validator errors and actual-engine reference capture |

Suggested **initial**, adjustable test budgets: hero character 25–45k triangles including hair/clothes, 50–85 deform bones if needed, four influences/vertex, body/face/outfit texture sets around 1–2K with exceptions justified by close-up. These are planning envelopes, not a reason to degrade an approved model or a claimed measured budget. Current Naomi is ~49k triangles, so a more attractive model need not be heavier; reallocating hair density and designing topology matters more.

Blender sculpt/control rigs and procedural nodes are not assumed to export unchanged. Bake constraints/animation to deform transforms and shape weights. Arbitrary Blender shaders become supported GLTF materials or baked texture maps. Some corrective driver logic must be baked into clips or implemented in runtime. Test facial normal/tangent behavior, skinning and material extensions in the chosen renderer before commissioning all four characters. [Official GLTF exporter](https://github.com/KhronosGroup/glTF-Blender-IO), [GLTF validator](https://github.com/KhronosGroup/glTF-Validator), [Painter export templates](https://experienceleague.adobe.com/en/docs/substance-3d-painter/using/export/output-templates/creating-export-presets).

## House asset workflow

1. Trace the approved original into elevations/room map. Establish three full stories and attic treatment as shown, porch footprint, gable/window rhythm, stair runs and cutaway viewing side. If image perspectives conflict, record and approve the consistent 3D interpretation rather than quietly improvising.
2. Build a Blender architectural blockout with real traversable floors, door/stair openings, character clearance and camera bounds. Check it in the actual default overview at desktop/portrait before detailing.
3. Finish custom silhouette assets: gables/dormers, porch posts/rails/stairs, facade trims, chimneys, bay windows and base/tabletop. Model silhouette detail; bake non-silhouette carvings to normal/AO. Instance repeating ornament.
4. Build a reusable furniture/prop kit matched to miniature scale. Use custom hero beds/kitchen/appliances plus vetted secondary stock. Separate opening doors/drawers, lamp switches, blankets and moving chair parts; model visible interiors. Author warm wallpapers/floors and texture atlases/trim sheets without obvious scale mismatches.
5. Author PBR maps and unique lightmap UVs where required. Bake static indirect light/contact AO with documented color/exposure. Plan switchable fixtures and day/night indirect variants; avoid baking permanently lit surfaces for lights that must turn off.
6. Organize by house → floors → rooms → architecture/furniture/interactive parts. Put object IDs, pivots, approach/contact anchors and collider references in exported extras or versioned sidecar JSON. Core GLTF is an interchange baseline, not the entire game-object/lightmap contract.
7. Export GLB scene chunks, compress geometry/textures, generate LODs/proxy colliders, then validate clipping, anchor reach, nav connectivity and camera visibility. Compare both clay and material passes to the approved original.

## Shared art direction

The house should feel like tiny objects made from believable wood, painted trim, brass, ceramic and cloth. Grain size, seam thickness, rounded edge highlights and slight variation convey craft. Avoid noisy edge wear everywhere, uniform plastic gloss and oversaturated gold bloom. Large-to-small hierarchy matters: house silhouette → room character → furniture → personal props → subtle imperfections.

Characters remain stylized, with rounded collectible shapes and expressive eyes. Match their scale, color management, shadows and bounce to the house. Use one coherent rendering/exposure pipeline so they belong to the same miniature world. A dedicated portrait light may be used for review, but gameplay approval must occur under ordinary room lights as well.

## Asset contract and validation

Each bundle should include editable source, export version, named object/skeleton IDs, bounds/unit/axis convention, material channels/color spaces, all texture rights/attributions, LODs, colliders, semantic anchors, deform-bone names, expression names, animation clips/contact markers and test poses. Hand grips specify position **and orientation**; furniture has seat/standing clearance and height metadata. Item ownership and persistence keys must not be derived from fragile mesh names alone.

Automated checks: GLTF validity, missing textures/animations, unsupported shader extensions, normalized weights and influence limits, bounds, texture budgets, duplicate IDs, missing anchors, skeleton map, contact marker existence and load regression screenshots. Artist review: identity, silhouette, appealing proportions, expressions, material finish, weight/acting and room composition. Both must pass. A structurally valid asset with poor art still fails the gate.

## Roles and ownership

At minimum, the work needs character art/rigging, environment art/lookdev, animation/technical art and gameplay/render engineering, with owner/art-direction review. One person may cover several roles but cannot remove the work. Codex can implement infrastructure and tests, integrate approved assets and diagnose technical failures. Original sculpting/painting/acting and approval are dedicated production tasks. AI images, if ever authorized as concept exploration, cannot substitute for a consistent rigged 3D asset or serve as rendered gameplay evidence.
