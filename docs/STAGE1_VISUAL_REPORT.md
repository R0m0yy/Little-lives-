# Stage 1 visual proof — Naomi + house (2026-11-06)

Everything here was rendered in this cloud session with Three.js r170 in headless Chromium (SwiftShader software GL).
Side-by-sides are in `qa/naomi3d/round_XX.png` and `qa/house3d/round_XX.png`. **Not yet approved by the owner.**

## Tooling check
| Check | Result |
|---|---|
| `npm install three` | works (three 0.170.0 in node_modules, used by `web/`) |
| `pip install bpy` | **works** — Blender 5.2.3 LTS as a Python module. Draco / MeshOptimizer compression libs are missing (export still works, uncompressed) |
| Rendering | Node Playwright + preinstalled Chromium; `tools/render.cjs` serves the repo and screenshots `web/*.html` |

## Pipeline
- `art/lib/meshkit.py` — parametric surfaces, sweeps, lathes, voxel-remesh unions, PBR materials, GLB export.
- `art/lib/textures.py` — PIL-painted floral print, lace, trim, weave, iris, wallpapers, planks, slate, siding, flower beds.
- `art/naomi/build_naomi.py` → `assets/characters/naomi.glb` (~450k tris, 12 MB — hero/viewer asset, needs LOD/decimation before gameplay).
- `art/house/build_house.py` → `assets/house/house.glb` (~70k tris, 2.6 MB). Room lights are `Light_*` empties.
- `web/viewer.html` (character, `?view=full|face|back|three4`, `?t=x,y,z&d=` close-ups), `web/house.html` (tabletop camera, warm point lights, bloom).
- `tools/naomi_round.sh N "note"`, `tools/house_round.sh N "note"` rebuild, render and compose a side-by-side.

## Naomi — 10 rounds (biggest difference named → fixed)
1 white face / dark lid shells → skin baked to texture, compact lids · 2 back strands crossed the face → back-half only ·
3 pale cool skin → saturated warm skin, ACES · 4 ridged comb-over → sculpted cap with clumps · 5 jagged hairline → cap dives under skin ·
6 dress washed white (sheen bug) → tinted sheen, bolder florals · 7 pointed chin / low hairline → apple face, higher hairline, bigger eyes ·
8 flipped face bake (lip colour on forehead) → fixed; hair volume · 9 helmet hair / small bun → deeper clumps, big side bun ·
10 hands fused into mittens *and buried inside the skirt* → separated fingers + thumb, arms brought forward (`hands_r10.png`).

**Where it is close (per the side-by-sides):** overall chibi silhouette and head:body ratio, round apple face with blush, large glossy eyes with lids/lashes/brows, warm skin tone, puff sleeves with ruffled cuffs, high collar, floral pinafore + waistband, lace hem, maroon underskirt, brown shoes, big side bun, gold earrings, hands with fingers.

**Honest shortfalls (visible in round 10):**
- Hair reads as a smooth glossy helmet; the board has distinct sculpted clumps and a side-swept forehead lock. Bun ringlets look chunky/faceted.
- Irises are warm brown; the board's are near-black with cool blue reflections. Lower-lid rim is too visible; no lid crease.
- Mouth is a thin line; the board has a soft closed smile with fuller lips. Nose is a faint bump.
- Floral print is smaller/busier and more saturated than the board's softer large-scale print; blouse/sleeves still read whiter than the board's cream.
- Blouse lacks the lace yoke/buttons detail; pinafore straps lack ruffles. No apron layer.
- Hands are slightly long and splayed with a visible wrist crease; the board's are short and relaxed.
- Pose is a stiff A-pose; the board has a relaxed 3/4 stance with head tilt. Not rigged yet (no skeleton/animation).
- Skin has no subsurface scattering (Three.js has no SSS; approximated with sheen).

## House — 6 rounds
1 first blockout · 2 roof missing (only edge-on gable planes) → full-width slate front slope, attic opening ·
3 interiors pale/blown → amber light, golden papers, darker floors · 4 thin trim → chunky posts, spindle friezes, flowers, deeper wing roofs ·
5 sparse rooms → chandeliers, pictures, bookshelves · 6 round-5 zoom cropped the ground floor → framing fixed.

**Close:** overall silhouette (3 floors × 3 bays, 2 front cross-gables + open right attic, side wings with slate pent roofs, plinth, steps, flower beds), warm-lit open rooms, cream gingerbread trim, blue slate, tabletop framing. Roof planes no longer cross in an X (LL-034 does not recur).

**Honest shortfalls:**
- Rooms are blockout furniture (boxes); the board's rooms are densely dressed with detailed antiques, rugs, ornaments.
- Trim is simplified: no pierced fretwork, cresting is posts+balls, bargeboards are plain boards with drops.
- Side wings are smaller/plainer than the board's (no lit ground-floor bay windows, plainer railings).
- Background is a painted gradient, not a real out-of-focus room; no depth of field.
- No stairs or doorways between rooms yet (needed for gameplay), and no measured device performance (SwiftShader only).

## Next (needs owner approval)
Owner reviews `qa/naomi3d/round_10.png`, `hands_r10.png` and `qa/house3d/round_06.png`. After approval: hair clump/lock pass, eye/mouth pass, rig Naomi, then the rest of the family.
