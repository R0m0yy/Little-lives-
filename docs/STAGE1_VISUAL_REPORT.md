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

## Naomi rounds 11–15 (owner-requested list, one fix per round; "a" files = first attempt, final = refinement)
| Round | Fix | Result in the side-by-side |
|---|---|---|
| 11 hair | Cap split into rounded clumps with sharp valleys flowing to the bun; two-clump swept forehead lock from the parting; matte-silk material (rough .42, low env, cool sheen); 48 smaller, tighter ringlets | Helmet broken up, lock reads, near-black. 11a lock sat on the brows and sheen looked like grey felt → raised/slimmed + darker. **Still:** faint streaky highlight bands on the lock; clumps are smoother than the board's sculpt |
| 12 eyes | Near-black iris with cool blue-grey lower glow; clear glass cornea (transmission, reflections only); lid crease line; lower lid edge raised, thinner rim | 12a cornea added a milky haze → glass fix. Dark glossy eyes with crisp catch-lights. **Still:** a dark band under each eye from the lower-lid shell |
| 13 mouth/nose | Mouth line curving up into corner dimples, fuller lower lip, thin upper lip; stronger button tip, nostril wings/dimples, warm tip + under-nose shadow | Soft smile reads; nose now visible but still subtler than the board |
| 14 fabrics | Floral ~2× larger, softer, muted palette, more cream ground; warmer cream blouse; lace yoke with scalloped edge + 4 pearl buttons; ruffles on the inner strap edges (`round_14_detail.png`) | Print character close to the board. **Still:** yoke eyelets barely visible; strap ruffles read as stiff panels; necklace is now hidden under the yoke |
| 15 pose | Static pose (no rig): head group turned 4° + tilted 6° about the neck; left foot forward, right foot turned out; renders at 18° | 15a over-turned (30° total) → reduced. **Still:** arms hang straight and symmetric; the board's arms are softly bent |

Triangles rose to ~580k (GLB ~12 MB); a decimated game LOD is still needed. No rig, no other family members, no gameplay — waiting for owner approval.

## Naomi rounds 16–20 (owner list, 2026-11-07; "a" files = first attempt kept for comparison)
| Round | Fix | Result in the side-by-side |
|---|---|---|
| 16 hair | ~150 thin near-round tapered strands (+22-strand swoop) over a dark cap, anisotropic gloss for fine highlights; 90 small loose ringlets; two loose face-framing curls | Reads as fine combed hair on top with fine highlight lines. 16a–c had flat card strands that shingled/feathered at the left temple → tucked tips, rounder strands. **Still:** left side still slightly choppy; from the side the cap ends in a flat black edge behind the ear |
| 17 eyes | Eyes 1 cm higher, 6 mm closer, aperture opened (rounder); blue-grey iris ring; thicker lash line + one outer flick; shallower socket + smaller lower lid shell | Under-eye dark band gone; blue-grey ring visible. **Still:** outer flick is barely visible at full-body scale; a little sclera shows above the iris (board's upper lid overlaps it) |
| 18 head | Head turn/tilt removed (2° nod only), renders at 10° so the face reads symmetric; fuller apple-cheek bumps | Symmetric face, rounder cheeks |
| 19 arms | Elbows back and softly bent, forearms forward; fingers ~25% shorter, closer, curled inward; thumb tucked (`round_19_detail.png`) | Short relaxed hands, gentle bend visible in side view. **Still:** wrist crease; bend is subtle from the front |
| 20 apron/shoes | Apron front panel (±60°, follows skirt folds) in a cooler lighter print with lace hem + side trim; skirt lace hem band ~70% wider; shoes ~30% larger, warmer brown | Apron layer and broad hem band read like the board; shoes now visible at full size. **Still:** apron side trim barely visible |

Asset now ~600k triangles (GLB ~13 MB). Still static (no rig). Not approved; family/gameplay not started.

## Naomi rounds 21–25 (owner list, 2026-11-07) — STOPPED FOR OWNER APPROVAL
| Round | Fix | Biggest remaining difference after the round |
|---|---|---|
| 21 bun | Ring curls removed; 26 layered S-wave locks (3 layers) wrapped round a core, ~35% in warm chestnut, 4 loose curls | Head was a tall egg vs the board's round head |
| 22 head | Head 0.150→0.162 wide, 0.152→0.146 tall; eyes lower (0.778), larger (r .050); smaller nose; fuller cheeks | Hard cut hair edge behind ear/nape; heavy black forehead band |
| 23 hair integration | Gentle taper of the cap lip at back/sides; ~60 nape strands emerging from under the skin; 25% warm-brown highlight strands; warm rim light (`round_23_detail.png`) | White above the iris, thin lashes and brows |
| 24 eyes/brows | Upper lid 47°→35° (overlaps iris); bold lash line thickening outward, outer flick + 8 feathered lashes; thicker, more arched brows. 24a revealed that the eye frame's side axis points to the nose, so since round 12 the "outer" flick/thick end/corner lift were at the inner corner — fixed | Flat even skin without cheek/nose blush |
| 25 skin | Stronger soft apple-cheek blush, rosy nose tip, chin warmth; wrist: radii matched + local smoothing with recomputed normals (25a still showed a dark band) (`round_25_detail.png`) | See below |

**Biggest remaining differences at round 25 (honest):** hair strands still read slightly stripy/choppy at the left temple and the brown highlight streaks are stronger than the board's; the bun locks look like smooth ribbons rather than the board's soft curly mass; feathered lashes are a little long/spiky; whole-body pose is still a stiff standing pose; the floral print is cleaner/more graphic than the board's painterly print. Asset ~665k tris / ~15 MB — needs the planned ≤60k LOD.

**Waiting for approval before:** (a) ≤60k-triangle game LOD + skeleton with idle/walk/sit clips; (b) house pass (pierced fretwork, dense furniture, rugs, stairs and doorways across all three floors). No other family members.

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
