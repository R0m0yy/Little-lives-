# Naomi: asset quality and reusable character system

![Actual Naomi versus supplied board face crop](evidence/comparisons/face-side-by-side.png)

Source: `/workspace/audit/source/naomis-kitchen.html`. Character generation `:946–1477`; animation `:1478–1643`. Separate original style/reference images and source character meshes were not provided.

## What was actually built

Naomi has a genuine 30-bone deforming rig, generated bind positions and inverse bind translations. The shader supports two joint influences per vertex, with 40 uniform slots. `chainW` blends along arm/leg/torso polylines (`:990`). The head is a 48×36 sphere with jaw/cheek/flattening functions (`:1018–1042`), ears and button nose added as smaller spheres. Eyes are sphere meshes with planar UVs sampling an iris/sclera/pupil/catchlight texture. Lid shells, lash tubes, brow tubes and mouth pieces are separate surfaces. These are not sculpted facial edge loops or facial shape keys.

The bun includes a scalp shell, 30 swept hair ribbons, a side fringe ribbon, sphere core, 16 coils and three tendrils (`:1231`). It is far more than a plain sphere, but adding subdivisions to these pieces produces expensive geometry without solving shape design. Runtime count: **49,050 Naomi triangles, 28,251 vertices; 29,062 hair triangles (59.25%)**. Nine material groups are submitted again in the shadow pass.

Only the bun and pinafore are active modules; `bunV2` is retained dead comparison code (`:1275`). There are no adult male, teen, child, age variants, wardrobes, face variants or shared imported animations. Declaring modular functions is not a finished character creator.

## Specific quality failures

| System | Observation / root cause | Production replacement |
|---|---|---|
| Head silhouette | Broad near-planar face, large crown relative to facial features; cheek/jaw curvature derived from sphere latitude rather than sculpted planes | Sculpt front/profile/three-quarter against approved Naomi and purple style; approve clay render before rigging |
| Eyes and sockets | Large readable irises are a useful match, but the edge lacks continuous eyelid/orbital anatomy. Painted catchlights are combined with specular and can create overly bright static highlights | Separate eyeball/iris/cornea plus proper lid loops; controlled roughness and reflection environment; stylized rim, no human-realism detour |
| Brows | Thick tubes and corner transitions read as attached strips; expressions translate/rotate a whole brow | Authored brow meshes and facial correctives, optional segmented brow controls |
| Nose/mouth | Tiny independent nose/lip blobs and smile tube read as surface additions; scaled mouth can invert/mismatch supporting anatomy | Integrated muzzle/nose/lip topology, inner mouth and tongue; expression blend shapes with cheek support |
| Hair | Directional sweep is recognizable; ribbon seams and toroidal bun rings dominate close-up/rear silhouette | Sculpted interlocking clumps with designed flow, baked broad groove normals, intentional curl silhouette; few secondary hair bones |
| Hands | Palm + thumb + finger mitten (`:1133`) cannot hold spoon/knife/cup naturally | Rounded four-finger-plus-thumb mesh; finger chains and pose library. Simplify digit geometry at overview LOD, retain grips close up |
| Dress | Blouse/sleeves/skirt generated independently; limited shoulder continuity and skirt correction | Separate tailored garment meshes, sculpted folds, controlled thickness, bodice seams/cuffs, pelvis/thigh/hem skinning and sitting correctives |
| Skin/materials | Vertex-color blush, light wrapping and warm terminator are useful prototypes; no authored color/roughness/normal variation or real skin model | Painted soft gradients and subtle roughness, restrained stylized subsurface approximation, calibrated color and consistent engine material |
| Rig | Chain projection weights + two influences lose control at shoulders, elbows, hips; no twist/corrective topology | Artist-refined weights, four influences baseline, twist/helper bones if needed, deformation review at extreme poses |
| Facial expression | Nine parameter presets exist (`:1630`); lid rotation, brow offsets, scaled smile/open mouth do not deform cheeks | Blend shapes for blink/squint/smile/frown/surprise, asymmetric variants and expression combinations; eye convergence limits |

## Replace the hero pipeline, preserve the design contract

Procedural modeling is not inherently incapable of good work; the actual limitations are these shape primitives, topology, weights, material inputs and absent artistic iteration. A professional result would require authoring so much specialized geometry and tooling here that continuing parameter tweaks is poor production value. Replace Naomi's production mesh, rig export, face and outfit construction. Preserve names and intent of key anchors/actions where useful, and preserve these renders as the rejected baseline.

Build one original Naomi in Blender, not a generic character pack. A character artist should sculpt head/face/hair/body; a technical artist should retopologize, UV, bake, rig and validate export, with animation collaboration throughout. Codex can implement export scripts, validation, animation blending, IK integration, asset manifests and simulation adapters. Codex cannot certify taste, reconstruct unseen reference surfaces or automate away the required sculpt/weight/animation review.

## Modular family system without losing identity

Use a shared semantic skeleton and facial naming contract, **not one identical body stretched for every age**. Adult, teen and child proportion presets should each have an approved base mesh/weights and retarget profile. Darius needs his beard/vest, adult shoulder shape and face; Naomi her bun/floral dress; Elias his curls/headphones/hoodie; Laila her bows/pink dress and child silhouette. These are identity assets, not random color sliders.

Reusable: eyeball shader, skin material family, topology region conventions, finger/face control schema, locomotion intent, hand grips, compatible clothing slots and accessory sockets. Reuse base topology only where face/proportion changes preserve silhouette and deformation. Retarget locomotion with stride/height adjustment, then hand/foot IK; validate child seating at different furniture heights. Age progression should switch approved meshes/rig profiles rather than continuously scale an adult skeleton.

Author meshes for hair styles and clothing against per-body fit variants; use explicit compatibility metadata, hide covered body regions, and test garment intersections. Skin/hair colors are material parameters; hairstyle and face silhouette require meshes or approved shape ranges. Restrict morph combinations to artist-approved envelopes; do not allow extreme sliders to break lids, teeth or weights. Visitors/neighbors can later use those controlled parts and unique portrait details. No system of random primitive pieces will guarantee the approved family quality.

## Naomi acceptance evidence

Require unlit/clay and final-material turntables; front/profile/three-quarter/back views; neutral/happy/sad/surprised/thinking expressions; close-ups of hands and bun; elbow/shoulder/hip bend tests; and exported GLB rendered in the **actual chosen game renderer**. Test silhouette at house overview size and face readability at optional close-up. No visible part intersections, eye/socket separation, broken mouth combinations or hovering soles in the validation scene. Approval of a Blender still alone is insufficient for Gate 2.
