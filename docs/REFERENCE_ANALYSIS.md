# Reference Analysis — Little Lives

Source: `refs/design_board.png` (the single combined board supplied). It contains Reference C (purple-sweater wireframe/render, turnaround, expressions), Reference D (family line-up, variation ideas, animation examples), six room vignettes, and two dollhouse renders.

> **Assumption to confirm:** separate A/B house files were not attached. The **lower-right house (slate-blue roof, white trim, side bay porches)** is treated as **Reference B (architectural authority)**. The lower-left (brown shingle roof) house is Reference A. If that's reversed, only the roof/siding palette changes, because both share the 3-storey, 3-bay cutaway layout.

## Task A — Purple-sweater character (Reference C)

| Aspect | Observation | Spec we derived |
|---|---|---|
| Head:body | Head ≈ 1/3 of total height (chibi-doll) | Head radius 0.50 u on a 3.0 u adult (≈3.2 heads). Child: same head, body ×0.72 |
| Head shape | Wide, round cranium; full cheeks; small soft chin | UV sphere with lower-jaw taper (`jaw`), cheek puff (`cheek`), flattened face plane (`faceFlat`) |
| Eyes | Very large, set at or just below mid-head; ~22–25% of face width each; dark iris fills most of the eye; two catch-lights (big upper-left, small lower-right); thick upper lash line with a winged outer corner | Eyeball r = 0.27 × head r; iris texture covers 72% of the eyeball radius; separate lid shell + lash tube on a lid bone |
| Brows | Thick, short, softly arched, dark | Tapered flattened tube on a brow bone (raise, tilt for emotions) |
| Nose / mouth | Tiny button nose; small mouth, subtle smile | Small ellipsoid nose; mouth = curved tube on a scalable bone + hidden open-mouth shell |
| Hair | Large sculpted clumps, clean silhouette, no strands, soft sheen, accessory band | Skull cap + sculpted lock clumps + tapered strand tubes; strand-streak texture; no strand sim |
| Body | Compact torso, short limbs, rounded mitten-like hands, chunky shoes | Short arm chain (0.61 u reach), mitten hand + thumb + finger-curl bone |
| Topology (wireframe side) | Even quad grid, edge loops around eyes and mouth, clean limb loops | We use parametric quad grids (48×36 head, 28-seg lathes). **True edge-flow loops around the eyes/mouth need manual retopo in Blender** — see CHARACTER_PIPELINE.md |
| Materials | Soft subsurface-looking skin, matte knit, glossy eyes | Wrap-lit skin with warm terminator + rim, glossy eye spec, matte cloth |
| Rig | T-pose humanoid with face controls | 30-bone standard skeleton (body + eyes, lids, brows, mouth, fingers, skirt) |

The wireframe is guidance, not an asset — nothing from the image was traced or reused.

## Reference D — Family

| | Darius 38 | Naomi 36 | Elias 15 | Laila 9 |
|---|---|---|---|---|
| Silhouette | Tallest, broad shoulders | Bell-skirt adult | Intermediate, hoodie bulk | Smallest, big head ratio |
| Hair | Short tight curls, full beard | Dark brown high messy bun + face-framing strands | Voluminous curly top | Curly pigtails with pink bows |
| Outfit | Cream shirt, brown vest, tie, trousers, brown shoes | Cream puff-sleeve blouse, floral pinafore dress, lace hem, rose underskirt, brown Mary-Janes, gold earrings & necklace | Grey hoodie, headphones, cargo trousers, sneakers | Pink floral puff-sleeve dress, Mary-Janes |
| Skin | Warm medium brown | Warm tan | Warm tan-brown | Warm tan |

## Task B — Dollhouse (Reference B authority)

- **Layout:** 3 storeys × 3 bays + attic under a cross-gabled slate roof; side bay towers with small pyramid roofs; wraparound porch with turned balusters on both sides.
- **Ground floor (left→right):** living room with fireplace · dining room · **kitchen (black double range, cream cabinets, white tile, brass chandelier)**.
- **Details:** scalloped barge boards, ridge cresting with finials, dentil band between floors, turned corner posts with gingerbread brackets, flower beds along the front plinth.
- **Presentation:** front-facing cutaway, warm interior lamps, polished wooden tabletop, strongly blurred living-room background (bookcase, plants, street-lamp bokeh).
- **Kitchen vignette:** cream panelled cabinets, butcher-block counters, white subway tile, black range with brass rails, cream hood, open shelves with crockery, counter lamp, rug.

Milestone 3 builds the **ground-floor right bay (kitchen)** as a module with its own facade pieces so it slots into the full house in Milestone 6.
