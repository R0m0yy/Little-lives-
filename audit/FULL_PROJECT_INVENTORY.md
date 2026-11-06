# Accessible project inventory

Audit date: 2026-11-06. This is a complete audit of the **accessible build**, not a certification of an unseen repository. Two original files were found under `/tmp/codex-remote-attachments/01a1b22e-9d1e-7287-b691-2e785d35c003/42701F95-DFD3-4F7E-AE7B-413143B502C7/`. Workspace directories `library-files`, `scratch`, and `shared` contained no additional project files. No `AGENTS.md` was found in the inspected workspace/attachment trees.

A connected GitHub installed-repository search for `Little Lives` returned an empty repository list. That is not proof no repository exists: it only establishes no matching accessible result was returned for that query. No repository was identified or audited through the connector.

| Supplied file | Audit snapshot | Size / provenance |
|---|---|---|
| `2-Little-Lives-Naomi-s-Kitchen-Vertical-Slice-.html` | `source/naomis-kitchen.html` | 232,404 bytes; 3,224 lines; readable HTML/CSS/GLSL/JavaScript |
| `1-Photo-1.jpg` | `references/supplied-design-board.jpg` | 434,090 bytes; 1280×853 composite board |

HTML SHA-256: `bc6c33043afdb05e712feba5f85cba3b1a3cbf536cb57fc22d635b39493c3290`.

Board SHA-256: `48ff189b4197e0d74926df45057dc4ec9bb8173454f8de61b8a0f6435d6d5609`.

The snapshots are byte-for-byte copies. The game was not edited. All new code is audit tooling under `scripts/`.

## Material availability and reference authority

| Requested material | Availability | Consequence |
|---|---|---|
| Complete repository, commit history, original module files | Missing | Cannot audit absent branches, source build process, authorship history or earlier versions |
| Latest playable HTML | Supplied; latest status asserted by request, not independently versionable | This exact file is the runtime under test |
| Claude QA report | Missing | Exact claims, test commands and claimed version cannot be verified |
| Definitive realistic Victorian tabletop dollhouse original | Separate original missing | Board houses are provisional comparison excerpts; cannot establish which is the definitive separate reference |
| Supporting original dollhouse original | Separate original missing | Same limitation; architectural detail limited by board resolution |
| Approved purple-sweater original | Separate original missing; visible on board | Style can be compared at board resolution; no exact topology inferred from drawn wireframe |
| Four-person family board | Supplied as part of composite | Appearance targets available for Darius, Naomi, Elias and Laila |
| Blender, GLB/GLTF, FBX, textures, audio, animation files | None | No existing professional asset pipeline can be recovered from files supplied |
| Package manifests, build scripts, tests, CI, source maps | None | Serve the HTML directly; embedded test API exists, but no previous harness supplied |

Missing-material notice was delivered before fidelity assessment. No generic reference images were substituted. The wireframe, rig and animation labels in the board are design intent, not evidence that production-ready assets exist.

## Every embedded first-party module

All line numbers below refer to **`/workspace/audit/source/naomis-kitchen.html`**, identical to the attachment. Every line of every section was read, including CSS, GLSL and inline actions.

| Section | Lines | Responsibilities / dependencies |
|---|---|---|
| HTML/CSS | 1–80 | Canvas; start overlay; speed/camera/save menus; needs, family and memories UI; Google Fonts links |
| `math.js` label | 81–208 | Matrices, quaternions, vectors, damping, xorshift RNG |
| `geo.js` label | 209–400 | 18-float vertex builder; spheres, tubes, lathes, boxes, normals; 32-bit indices |
| `gl.js` label | 401–712 | Custom WebGL2 shaders; 40 matrix slots; two weights/vertex; eight point lights; one directional shadow; particles; DOF/bloom approximation |
| `textures.js` label | 713–945 | Canvas color textures; wallpaper, wood, eyes, floral fabric, slate, stylized room backdrop |
| `character.js` label | 946–1477 | Single Naomi spec; 30 named bones; procedural face, hair, dress, limbs; two-bone arm IK |
| `anim.js` label | 1478–1643 | Idle/walk/seated clips; damped layers, IK targets, look, blink, nine expressions |
| `kitchen.js` label | 1644–2034 | One room, corridor stub, closed dining stub, roof cap, porch fragment, props, tabletop and backdrop |
| `nav.js` label | 2035–2136 | 2D inflated occupancy grid, A*, string pulling, dynamic shape API |
| `sim.js` label | 2137–2779 | Clock, one agent, needs, utility scores, fourteen actions, object state, save/load |
| `world.js` label | 2780–2905 | First-agent-only state-to-mesh synchronization, lighting, props, steam/dust |
| `audio.js` label | 2906–2989 | Synthesized Web Audio one-shots and loops; no recorded audio |
| `main.js` label | 2990–3224 | Bootstrap, navigation setup, camera/input, DOM UI, localStorage, frame loop, `LLAPI` |

These names are comments, not recovered standalone source files. No bundler banner, third-party engine, minified dependency, source map or original build manifest establishes their origin beyond this concatenated file. `scripts/extract-inventory.py` extracts readable sections and creates an origin map without pretending to recover a repository.

## Runtime inventory

See `evidence/logs/runtime-inventory.json` for every mesh group and dynamic prop.

- 14 static material groups, 38 dynamic scene items, 9 Naomi mesh groups; 52 environment items total.
- One instantiated agent and one character spec. No imported 3D models.
- Naomi: 28,251 vertices, 49,050 submitted triangles across meshes; hair alone 29,062 triangles.
- Navigation: 102×60 cells at 0.1 units, radius 0.42; one floor plane. Chair A is the only configured dynamic blocker, and is never refreshed to follow its moving transform.
- 22 generated material textures plus 1 white fallback; separate shadow and render targets. Zero normal/roughness/metalness/lightmap assets.
- Fourteen actions: cook, leftovers/eat, dishes, tea, reading, phone, cleaning, gaze, lights on, lamp on, lights off, chair doze, bed departure, wake arrival.
- External network dependencies are font CSS/font files from Google Fonts, not game logic or models. No service worker/offline install pipeline.

## Audit outputs

The 23 requested reports and CSVs live at the audit root. `evidence/` contains original browser captures, a normal-session video, machine-readable logs and comparison plates. `references/crops/` contains labeled board excerpts. `research/` records official-source checks and limitations. `scripts/` contains reproducible audit tools. See `TEST_RESULTS.md` for commands and interpretation limits.
