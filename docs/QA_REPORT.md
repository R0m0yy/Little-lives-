# QA REPORT — Little Lives

Test environment: headless Chrome + SwiftShader (software WebGL2) in the cloud workspace. **No GPU, no phone** — frame-rate numbers here are not representative of real devices; on-device performance is untested.

## 1. Naomi vs. reference (design board)

Sheets: `qa/v3/v2base_face_cmp.png` (before) → `v3a/b/c/d_face_cmp.png`, `v3c/v3d_body_cmp.png`, `v3d_expr.png`.

| Criterion | v2 (session 1) | v3d (now) | Verdict |
|---|---|---|---|
| Head shape | Pointed egg, flat cheeks | Round apple face, soft chin | Close |
| Eye size / placement | Mid-head, orange iris, heavy lids | Low-set, large, dark glossy iris, open lids, winged lash | Close; slight white rim below iris at some angles |
| Brows | Long, thin, high | Short, thick, arched, close | Close |
| Mouth / nose | Thin smile line, tiny nose | Small mouth + lower lip, button nose | Acceptable; ref lips slightly fuller |
| Hair front | Red-brown ribbed cap | Sleek swept ribbons + side lock + tendrils | Recognisably the same hairstyle; ribbons still a little stripy/tubular |
| Bun | Small knot | Large curly side-back bun | Shape right; **from behind reads as separate donut coils** |
| Proportions | ~2.6 heads, knee skirt | ~3 heads, mid-calf skirt | Close |
| Sleeves | Short puffs | Elbow puffs with ruffled cuffs | Close |
| Dress | Plain floral | Plain floral | **Missing** pinafore/apron layer, high collar, lace band, warmer print |
| Hands / arms | Mitten pegs | Thicker but still peg-like | **Below reference** |
| Skin shading | Flat | Flat with broader blush | Below reference (no SSS) |
| Expressions | 6 | 6 render correctly (neutral, happy, surprised, sad, angry, tired) | Pass |

**Verdict:** large improvement; not yet at sign-off quality. Open issues are listed in §4.

## 2. In-game pose checks (`qa/v3/v3d_pose_grid.png`)
Run: `pose_check.py dist/index.html#test,seed=3,time=11.5`

| Activity | Reached (sim min) | Result |
|---|---|---|
| Chopping vegetables | 99 | Pass — knife IK on board, lean, longer skirt clears counter |
| Simmering stew (stir) | +15.6 | Pass |
| Carrying plate | +22.9 | Pass — both hands on plate rim |
| Sitting down | +14.7 | Pass — skirt rests over chair seat, no visible clipping |
| Eating | +0.7 | Pass — head dips to plate, spoon hand IK |
| Walking | +19 | Pass |

## 3. Soak test (`qa/v3/soak_*.png`)
`qa_run.py … seed=5,time=6.5  4 samples × 480 sim-min` → Mon 2:31 PM → Tue 2:35 PM, **0 page errors**.
Observed: window gazing, reading at 10:32 PM (lamp on), sleeping off-room overnight, morning routine. Needs stay bounded **except hygiene**, which falls steadily (65.8 → 31.7) because no bathroom exists yet — expected, tracked for Milestone 6.

## 4. Open issues (ranked)
1. **Sleep and hygiene happen off-screen** — bedroom/bathroom not built. Activity label says so ("Asleep (off-room)"); nothing is faked.
2. Bun coils read as separate rings from behind → merge into fewer, fatter twisted clumps.
3. Hands/arms: replace mitten + tube with a sculpted hand (palm, 4 finger pads, thumb) on the existing `fingers_*` bone.
4. Dress layer: add pinafore apron + high collar + lace hem band; warmer floral print.
5. Hair ribbons: lower the lens cross-section contrast; add strand normal texture.
6. Skin: add wrap-diffuse SSS tint + subtle cheek specular.
7. Mobile performance not measured on hardware.

## 5. Fixed this session
- Roof ridge rail protruding ~5 units past left gable (`kitchen.js`, cylinder origin).
- Pose-check camera inside the wall (black frames in `qa/pose_grid_v1.png`).
