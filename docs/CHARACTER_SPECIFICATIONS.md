# Character Specifications

Units: 1 u ≈ 1 dollhouse "foot". Characters stand at the world origin and face +Z.

## Shared proportion system (`LL.CharacterSpecs`)
| Param | Meaning | Naomi | Darius (plan) | Elias (plan) | Laila (plan) |
|---|---|---|---|---|---|
| `body` | body height scale (head excluded) | 1.00 | 1.10 | 0.92 | 0.72 |
| `width` | shoulder/hip width | 1.00 | 1.18 | 0.95 | 0.85 |
| `headR` | head radius | 0.50 | 0.50 | 0.49 | 0.47 |
| `headW` | head width | 0.98 | 1.02 | 0.98 | 1.0 |
| `jaw` | lower-face taper | 0.02 | 0.0 (beard) | 0.04 | 0.0 |
| `cheek` | cheek fullness | 0.14 | 0.08 | 0.10 | 0.18 |
| `eye` | eyeball radius / head r | 0.27 | 0.24 | 0.26 | 0.29 |
| `nose`, `browW`, `limb` | feature scales | 1,1,1 | 1.2,1.3,1.15 | 1,1.1,1 | 0.85,0.9,0.9 |
| hair / outfit modules | | `bun` / `pinafore` | `shortCurls+beard` / `vestShirt` | `curlyTop` / `hoodieCargo` | `pigtailsBows` / `puffDress` |

## Naomi (built, v0.3)
- **Height:** 3.05 u to the top of the bun; head ≈ 0.95 u (≈3.2 heads).
- **Face:** 48×36 head grid; layered eyes (sclera/iris/pupil/catch-light texture + lid shell + winged lash tube); tapered brows; button nose; smile-arc mouth plus an open-mouth shell.
- **Hair (`bun`):** skull cap with a back-low, front-high hairline and lock ridges; 10 swept clumps; high bun (sphere, wrap torus, 7 messy clumps); 4 face-framing tapered strands.
- **Outfit (`pinafore`):** cream yoke and ruffle collar; floral bodice with a lace trim and rose waistband; 56-segment flared skirt with 11 folds; rose underskirt; lace hem; puff sleeves with ruffled cuffs; Mary-Janes with sole and strap; gold necklace, pendant and drop earrings.
- **Vertex count:** 16.5k (one draw call per material group, 9 groups).
- **Personality:** neat 0.8, social 1.0, foodie 1.15, cozy 0.85. Loves tea and cooking; wakes about 6:54.

## Skeleton standard (30 bones; the retarget contract for every character)
`root, pelvis, spine, chest, neck, head, upperarm/forearm/hand/fingers _L/_R, thigh/shin/foot _L/_R, eye_L/R, lid_L/R, brow_L/R, mouth, mouthO, skirtF, skirtB`

- Two-influence linear skinning. Joint blend zones are 0.05–0.07 u.
- Face expressions are driven by **bone TRS**: lid rotation, brow translate/rotate, mouth scale (the scale sign flips smile↔frown). These are exported as bones, so they retarget like the body.
- `skirtF`/`skirtB` keep a bell skirt clean when walking and when seated.
