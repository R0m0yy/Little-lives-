# Little Lives — Naomi 3D Character Commission Brief

_2026-11-06. Source of truth is the Claude doc "Little Lives — Naomi 3D Character Commission Brief"; this is a copy._

## What we're commissioning

One original, game-ready 3D character — **Naomi**, the mother (36) — delivered as a rigged, textured GLB that runs in a web browser on phones and desktops.

- **The game:** *Little Lives*, a cozy autonomous family simulator. Four doll-like characters live inside a lit Victorian tabletop dollhouse; the player watches them cook, eat, read and sleep.
- **Engine:** Three.js (WebGL2), so the file must load with Three.js `GLTFLoader` and look right under its physically based (PBR) materials.
- **Why Naomi first:** she sets the visual standard and the shared body/rig that Darius (father), Elias (son, 15) and Laila (daughter, 9) will be built from. A follow-on contract for those three is likely if Naomi lands well.
- **Style in one line:** a premium stylized collectible doll — oversized glossy eyes, round apple-cheeked face, compact body, sculpted (not strand) hair. Not photoreal, not low-poly.

## Character design

Match the Naomi figure on the supplied Little Lives design board (`refs/design_board.png`, attached separately). The board is concept art, not a model: sculpt an original character from it, nothing traced or kit-bashed.

| Area | Requirement |
| --- | --- |
| Proportions | About 3 heads tall. Large round head, short torso, short soft limbs. Still reads as an adult woman beside a 9-year-old. |
| Face | Wide "apple" face, fullest at the cheeks, small soft chin. Eyes set below the head's midline; mouth close to the chin. |
| Eyes | Very large, slightly taller than wide, near-black brown iris filling most of the eye, one big soft catch-light plus a small one. Thick upper lash line winged at the outer corner. Real modeled lids (not a texture) so blinks and squints deform. |
| Brows, nose, mouth | Short thick softly arched brows close to the eye; small button nose; small closed mouth with a slight smile and soft lower lip. |
| Skin | Warm medium-brown, rosy blush on cheeks and nose tip, soft subsurface look. |
| Hair | Near-black with brown highlights. Sleek, swept back from a side part; one thick lock sweeps across the forehead and tucks behind the ear; big curly bun high at the back on her right; loose coiled tendrils at both temples. Sculpted clumps with strand detail in the normal map — no hair cards or strand systems. |
| Outfit | Cream blouse with high frilled collar and elbow-length puff sleeves with ruffled cuffs; floral pinafore/apron over a mid-calf bell skirt; lace hem band and dark-rose petticoat; small gold drop earrings and pendant; brown Mary Jane shoes. |
| Hands | Sculpted hands with four separated fingers and a thumb (no mittens) — she holds knives, spoons, plates and cups in game. |

Identity check: someone who has seen the board should recognize Naomi from the model alone, without the dress.

## Technical deliverables

The model must run in a phone browser with four family members on screen at once, so these budgets are firm unless we agree otherwise in writing.

| Item | Spec |
| --- | --- |
| File | One `.glb` (glTF 2.0 binary), loads without errors in Three.js `GLTFLoader` and passes the Khronos glTF Validator |
| Orientation & scale | Y-up, facing +Z, meters, 1.0 m tall, feet on the origin, all transforms applied |
| Rest pose | A-pose (arms about 45° down), mouth closed, eyes open looking forward |
| Triangles | 20,000–30,000 total including hair and clothing; dense where it deforms (face, shoulders, hips) |
| Materials | 5 or fewer, glTF metallic-roughness PBR: skin, eyes, hair, cloth, accessories |
| Textures | Base color, normal, ORM (occlusion-roughness-metal). 2048² for body+clothes, 1024² for hair, 512² for eyes. PNG source files plus the GLB |
| Skeleton | Humanoid using Mixamo bone names (`Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`, shoulders, arms, forearms, hands, all finger joints, legs, feet, toes) so licensed and mocap animation can be retargeted |
| Extra bones | `LeftEye`/`RightEye` for gaze; `Jaw`; skirt chains (6 around the hem, 2–3 bones each); bun and front lock (1–2 bones each) for secondary motion |
| Skinning | Max 4 influences per vertex. Clean deformation at shoulders, elbows, wrists, hips, knees and neck |
| Blend shapes (morph targets) | `blink_L`, `blink_R`, `squint_L`, `squint_R`, `browUp_L/R`, `browDown_L/R`, `browSad_L/R`, `smile`, `frown`, `mouthOpen`, `mouthO`, `mouthWide`, `cheekPuff`, plus visemes `AA`, `EE`, `OO`, `MM`, `FV` |
| Test animations (in the GLB) | `idle`, `walk` (in place), `sit_down`, `extreme_pose_test` (deep squat, arms overhead, arms crossed, head turned 70°) |

The extreme-pose clip is how we check the rig: it should show no candy-wrapper twisting, collapsing joints or skirt passing through the legs.

## Milestones and approval gates

Work moves to the next stage only after written approval of the current one, so changes stay cheap.

1. **Clay sculpt** — untextured high-res sculpt with hair and clothing blocked in. Deliver front, ¾, side and back turntable renders plus a face close-up. Approves shape, proportions and likeness.
2. **Retopology and UVs** — game mesh within budget, wireframe renders of the head and body, UV layout screenshots.
3. **Textures and materials** — PBR textures; renders under neutral studio light and under warm lamp light (the game is lit by warm interior lamps).
4. **Rig, skinning and face** — skeleton, weights, all blend shapes; the extreme-pose test clip and a contact sheet of each blend shape.
5. **Final GLB** — validated file plus all source files. We load it in the game and check it in our own scenes before final sign-off.

Open questions for the quote: fixed price or per milestone, number of revision rounds per gate (we suggest two), and timeline per stage.

## Rights, handover and what we supply

Naomi must be fully original and fully ours to use commercially, including in a paid game.

- **Ownership:** full transfer of copyright (or an exclusive, perpetual, worldwide commercial licence) for the character design, model, textures and rig. The artist may show renders in a portfolio after the game is announced.
- **No third-party parts:** no store-bought bases, kitbash parts, scanned heads or AI-generated meshes or textures. Any tool-generated starting point (e.g. a base mesh) must be disclosed and cleared with us first.
- **Source files:** the Blender `.blend` (or equivalent) with the sculpt, game mesh, rig and shape keys; texture source files (e.g. Substance Painter project or layered PSD/KRA); the final `.glb` and PNG textures.
- **We supply:** the Little Lives design board, this brief, answers within two working days, and a browser test page where the artist can drop in the GLB to see it in the game's lighting.
