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

## Naomi rounds 26–35 — structured rebuild of head, hair and look-dev (2026-11-07) — STOPPED FOR OWNER APPROVAL

Owner verdict after round 25: outfit close, head/hair/face/rendering not. Rounds 26–35 rebuilt those against a
**measured** reference instead of eyeballed side-by-sides. Outfit/body unchanged.

### Measurement (Phase A, commit 3f4a0eb)
- `refs/naomi_head_ref.png`, `refs/naomi_full_ref.png` — native-resolution board crops (the board is 1536×1024, Naomi's head is only ~95 px tall; this caps how fine the comparison can be).
- `refs/naomi_landmarks.json` — 22 hand-annotated head landmarks + body points + head/hair silhouette polygon → `refs/naomi_head_mask(_4x).png`.
- Reference camera (`web/lib/refcam.js`, viewer `?view=ref`): 85 mm-equivalent (16.1° vertical FOV), 9° above eye level, **20° yaw toward her left** (15/17/20° were measured; 20 fitted best; 23° was tried in round 34 and made the eyes worse, so it was rejected). Distance is solved so the projected head height (chin → top of hair) equals the reference's 95.4 px; translation is a least-squares fit over the face landmarks, so errors measure shape, not placement.
- `tools/naomi_measure.cjs` → 2× renders, `tools/naomi_report.py` → landmark error table (% of head height), silhouette IoU, onion skin, landmark overlay, mask diff, and the reference | Three.js | Cycles side-by-side. `tools/naomi_cycles.py` renders the same camera in Blender Cycles (CPU, SSS). `tools/naomi_round2.sh N "change" [1]` runs a whole round.

### What was rebuilt (round 26)
- Head (`art/naomi/head.py`): one quad-sphere base mesh shaped with coarse forms (apple cheeks as the widest part, short chin, slight brow ridge, tucked temples, jaw into a thinner neck), Catmull-Clark ×2, then a detail pass: eye sockets carved into the mesh along head normals (lids are the head skin resting on the eyeball), button nose with nostril wings, closed smile with fuller lower lip and corner dimples. Brows, lips, blush, lid lines and the hairline transition are **painted** into a 2048×1024 skin texture from a Cycles-baked position map; AO baked in Blender and multiplied in.
- Eyes: new iris texture (dark pupil, radial fibres, blue-grey outer ring, dark limbal ring, big soft upper-left + small second highlight), glass cornea bulge, thick upper lash line thickening outward + 4 outer flicks, thin lower lid line.
- Hair (`art/naomi/hair.py`): strand tubes deleted. A grooved hair volume (soft valleys converging on the bun) + 3 large rounded clumps (side-swept forehead lock and left side), a bun of 11 S-curve locks in a rosette + 3 loose curls, 2 thin face-framing spirals. Strand-direction texture + normal map; base #1b1412.
- Look-dev (`web/lib/look.js`): Kajiya-Kay double highlight (sharp white + soft warm-brown), skin wrap lighting + red-orange terminator tint (onBeforeCompile), warm key upper-left / cool fill right / warm rims behind, board-sampled backdrop with soft bokeh, bloom, ACES, 2× render downsampled.

### Rounds (one change each; sbs = `qa/naomi3d/rNN_sbs.png`, onion = `rNN_onion.png`, table = `rNN_table.md`)
| round | change | landmarks ≤3 % | mean err % | IoU | biggest remaining difference |
|---|---|---|---|---|---|
| 25 | (before rebuild) | 4/22 | 7.4 | 0.710 | — |
| 26 | structured rebuild (above) | 10/22 | 4.0 | 0.837 | hair reads as tangled wavy ribbons; ear pokes out |
| 27 | hair: grooved masses + bridge into bun, ribbon clumps removed | 10/22 | 3.5 | 0.859 | eyes bulge out of the face |
| 28 | eyes set 9 mm deeper, raised 10 mm | 14/22 | 3.0 | 0.860 | chin 7.6 % (jaw underside hangs below the chin) |
| 29 | lower face: round chin, jaw curves up | 13/22 | 3.0 | 0.868 | V-shaped crease under each eye |
| 30 | socket carve without seams (grazing-ray fade) | 13/22 | 3.0 | 0.868 | chin still 7.7 % |
| 31 | chin is the lowest point (proportional deform; 31a/31b radial attempts failed) | 15/22 | 2.7 | 0.866 | bun is a lattice of crossing ribbons |
| 32 | bun rebuilt as a rosette of S-curve locks | 16/22 | 3.1 | 0.884 | bun too low/far left, notch above it |
| 33 | bun higher + wider, notch filled (33a moved it the wrong way) | 14/22 | 2.7 | 0.888 | near/far eye foreshortening wrong |
| 34 | eye openings wrap around the face (apertures turned out 16°) | 17/22 | 2.5 | 0.888 | skin flat and too light on the shaded side |
| 35 | look-dev: contrast, warmer skin, blush, no under-eye AO patch, Cycles exposure | 17/22 | 2.5 | 0.888 | see below |

Full/face/back views: `r26_views.png`, `r29_views.png`, `r32_views.png`, `r35_views.png`.

### Against the targets (honest)
- **Landmarks:** 17/22 within 3 % — **target not met**. Failing at round 35: bun_top 5.3 %, cheek_L 4.3 %, hair_top 4.2 %, ear_R_top 4.0 %, eye_R 3.8 %. Mean 2.5 % (was 7.4 % at round 25).
- **Silhouette IoU:** 0.888 — **target 0.90 not met** (was 0.710). Remaining misses: the board's bun is wider at the lower left and its hair continues past the ear on her right; her left temple/cheek edge is a little narrow.
- **Game version:** head+hair 54.9k triangles in `assets/characters/naomi_game.glb` (≤60k ✓); hero `naomi.glb` head+hair 281k.

### Three.js vs Cycles diagnostic
- Hair colour: Cycles renders the same hair near-black like the board; Three.js lifts it to dark chestnut with streaky highlights → **shading** problem in the Three.js hair shader (Kajiya-Kay + specular), not the model.
- Skin: after round 35, Cycles matches the board in the shaded cheek (191,118,86 vs board 192,108,72) while Three.js is far too bright there (238,142,89) → **shading** (Three.js fill/wrap too strong). Both are less creamy than the board in the lit areas.
- Both renderers share the modelling differences: smoother/blander hair than the board's sculpted locks, glossy marble-like eyes, small ear.
- GTAO was tried and disabled: in SwiftShader it darkened a screen-space box and made hair translucent. Baked AO is used.

### Biggest remaining differences after round 35
1. **Three.js shading**: skin too light and flat on the shaded side; hair too brown with noisy highlight streaks (Cycles shows both can be fixed in shading).
2. **Hair sculpt**: the board's hair is a few big glossy locks with crisp edges; ours is smoother and more uniform, and the bun is still a little small at the lower left.
3. **Eyes**: still read as glossy marbles; the board's thick upper lid wraps further over the iris and the iris is darker with a softer ring.
4. **Ear** still pokes out sideways in the face close-up; hairline shows a hard dark edge there.
5. Measurement limit: the board is low-resolution (head ≈ 95 px), so ±1 px annotation error ≈ 1 % of head height.

Not started (waiting for approval): rig/LOD clips, house pass, other family members, gameplay.

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

## House rounds 7–25 — measured rebuild (2026-11-07) — STOPPED FOR OWNER APPROVAL

Naomi is frozen as a provisional placeholder (round 35). The house was rebuilt against a **measured** reference with the
same method as Naomi. Outputs per round in `qa/house3d/hNN_*` (sbs = reference | Three.js [| Cycles], onion, lm, maskdiff, table).

### Measurement (Phase H0, commit 10aa782)
- `refs/house_ref.png` (board crop [990,605]–[1510,1025]), `refs/house_landmarks.json` (34 hand-annotated landmarks: finials, gable apexes, eaves, posts at the floor lines, wing roofs/finials/rails, plinth, attic opening; silhouette polygon), `refs/house_mask(_2x).png`.
- Reference camera `web/lib/housecam.js` (`house.html?view=ref`, `&mask=1`): frozen from the board's own perspective cues — fov 11°, elevation 6°, yaw 0 (a grid search on the old blockout preferred fov 8 / el 0, but that blockout was built near-orthographically, so the fit described the model rather than the board). Distance from the house height (centre finial → plinth bottom = 396 px), least-squares translation.
- `tools/house_measure.cjs`, `tools/house_report.py`, `tools/house_cycles.py`, `tools/house_round.sh N "change" [1]`.
- Targets: IoU ≥ 0.92, every landmark ≤ 2 % of house height (7.9 px).

### Rounds
| round | one change | landmarks ≤2 % | mean % | IoU | biggest remaining difference after the round |
|---|---|---|---|---|---|
| 6 | (baseline, old blockout) | 6/34 | 3.97 | 0.866 | massing off everywhere |
| 7 | massing to the measured landmarks | 31/34 | 1.22 | 0.923 | centre/left gable roof planes cross in an X (LL-034) |
| 8 | gable valley clip (no X); 8b main slope no longer through the centre attic | 31/34 | 1.22 | 0.926 | no rooms/stairs |
| 9 | H1 room plan: 12 rooms, hinged doors, stacked stairs + floor openings, attic stairs | 31/34 | 1.22 | 0.926 | plain-board gable trim |
| 10 | pierced bargeboards + spandrel brackets, fish-scale shingles; 10b left gable face forward | 31/34 | 1.23 | 0.927 | slate too dark/flat |
| 11 | blue-grey slate with courses + variation | 31/34 | 1.23 | 0.927 | plain cresting/finials |
| 12 | pierced fleur cresting, lathe-turned finials | 31/34 | 1.23 | 0.926 | wings unlit, box railings |
| 13 | lit multi-pane wing bays + curtains, turned balusters | 31/34 | 1.23 | 0.926 | wing roofs invisible from the front |
| 14 | hipped lower wing roofs, narrower upper wing gables | 31/34 | 1.23 | 0.930 | centre gable 7 px right/8 px high |
| 15 | centre gable to the landmarks (15a lowered the finial and shrank the whole fit; 15b taller finial) | 33/34 | 1.19 | 0.932 | blocky furniture |
| 16 | furniture kit v2 (turned legs, tufted upholstery, carved beds, clawfoot tub, glass cabinets) **+ bug: lathe parts ignored x,y since round 12** (finials, balusters, legs, posts stacked at x=y=0; landmarks are empties so the table did not catch it) | 33/34 | 1.19 | 0.932 | rooms bare |
| 17 | clutter pass (clock, candlesticks, tea set, vases, books, pictures + sconces, toys, pans, radio), attic ceiling lining | 33/34 | 1.19 | 0.932 | interior light pink/flat vs the board's amber |
| 18 | amber room light vs cool dusk ambient, blurred backdrop + bokeh, bulb bloom, live fireplace flicker (18b fixed discs rotated about the world origin) | 33/34 | 1.19 | 0.932 | ~1900 draw calls, 281k tris |
| 19 | budget: dissolved fretwork, merged static mesh, vertex-coloured class materials (19a merged the tabletop into the mask, IoU 0.913 → fixed) | 33/34 | 1.19 | 0.932 | no gameplay data |
| 20 | 77 interaction points + 9 light switches, `house_data.json` | 33/34 | 1.19 | 0.932 | no nav |
| 21 | per-level nav grid + stair links + reachability check → **45 of 81 points unreachable** | 33/34 | 1.19 | 0.932 | crowded layout |
| 22 | nav-driven re-layout, global stair-linked reachability, front-exit landings → 9 of 75 unreachable | 33/34 | 1.19 | 0.932 | characters not swappable / scale unchecked |
| 23 | character contract + loader, Naomi dropped in at interaction points → **furniture ~1.5× too big for her** | 33/34 | 1.19 | 0.932 | furniture scale |
| 24 | furniture ×0.68 (board proportions + Naomi's hip height) → 3 of 75 unreachable | 33/34 | 1.19 | 0.932 | left gable apex 2.2 % |
| 25 | left gable apex 8 px lower, taller finial | 33/34 | 1.12 | **0.931** | see below |

Cycles + floor/room close-ups: rounds 9, 12, 15, 18, 21, 24 (`hNN_cycles.png`, `hNN_floors.png`, `hNN_room*.png`).

### Against the targets (honest)
- **IoU 0.931 — target 0.92 met.**
- **Landmarks: 33/34 within 2 % — not met.** `eave_R` is 2.03 % (8.0 px vs 7.9 px allowed). Mean 1.12 %.
- **Budget: met.** 177k triangles (≤ 300k), 101 draw calls including the shadow and post passes (≤ 150), 2.2–4.4 ms/frame in SwiftShader (software GL in this container — **not** a device measurement).
- **Gameplay data:** `assets/house/house_data.json` — 12 rooms + attic spaces, 4 levels, 6 hinged doors, 4 stairs, 14 lights, 9 switches, 81 interaction points (sit 17 · open 23 · use 14 · switch 14 · sleep 4 · bathe 1 · climb 4 · arrive 4), per-level nav grids (4 cm cells, radius 0.17) with stair links. **72 of 75 points reachable** from the ground floor through doors and stairs; unreachable: attic landing chair + trunk, loft lamp. 3 points in the sealed left-gable storage are excluded (no stair reaches it). Map: `qa/house3d/h24_nav.png`.
- **Characters:** `docs/CHARACTER_CONTRACT.md` + `web/lib/characters.js` (`house.html?char=<glb>&at=<interaction id>`).

### Biggest remaining differences after round 25
1. **Interior density and detail.** At the corrected scale the rooms read sparser than the board's packed collector's rooms; furniture is still simplified (no carving detail, little fabric pattern), wallpapers are simple procedural motifs.
2. **Exterior siding/trim.** Clapboard has no baked AO, no corbels under the beams, plain window glass on the back walls; the board's trim is finer and more ornate.
3. **Lighting.** Three.js interiors are amber like the board but flatter (no AO — GTAO was disabled because it produced artefacts in SwiftShader); Cycles from the same camera shows softer bounce light and darker corners, so the remaining gap is shading, not modelling.
4. **Attic.** The centre attic landing is small (headroom ≥ 1.0 only ±0.62 around the ridge) and the left-gable storage has no access.
5. **Doors** are exported open (folded into the partition plane); opening/closing is for the sim wiring stage.

Not started (waiting for approval): wiring `core/` into the Three.js house, placeholder dolls for the family, other family members.
