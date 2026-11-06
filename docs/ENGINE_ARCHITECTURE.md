# ENGINE ARCHITECTURE

## Decision: browser WebGL2, single-file build
| Requirement | Unity 6 | Godot 4 | Three.js / WebGL2 (chosen) |
|---|---|---|---|
| Runs where the developer works (phone + cloud sessions, no local PC) | ✗ editor needs a desktop | ✗ editor needs a desktop (headless export possible but no editor here) | ✓ opens on the phone as one HTML file |
| Buildable in this workspace (network off, no installs) | ✗ | ✗ not installed | ✓ Node + Chrome present |
| Character rendering / skinning | ✓ best | ✓ | ✓ custom skinned shader |
| Desktop + mobile deployment | ✓ | ✓ | ✓ any browser |
| Iteration speed with automated QA | slow | medium | fast: headless Chrome screenshots in ~6 s |

Three.js could not be installed (package installs are blocked in this workspace), so the renderer is a small **custom WebGL2 layer** (`gl.js`). It is isolated behind `Renderer.upload/texture/render`, so it can be swapped for Three.js later without touching sim, AI, nav or animation — only if a concrete benefit (glTF import from Blender, PBR, profiling tools) justifies it.

## Modules (`src/`, concatenated by `tools/build.py` → `dist/index.html`)
| File | Role |
|---|---|
| math.js | vectors, quaternions, 4×4 matrices, seeded RNG |
| geo.js | MeshBuilder: parametric grid, sphere, lathe, tube, boxes; per-vertex bone/skin weights |
| gl.js | WebGL2: skinned PBR-lite shader (wrap diffuse, rim, spec), shadow-mapped key light, up to N point lights, room clip, depth-of-field post, particles |
| textures.js | procedural canvas textures (wallpaper, planks, tiles, iris, hair, floral, lace…) |
| character.js | shared 30-bone skeleton, parametric head/face, HairKit + hair styles, outfits, IK, character specs |
| anim.js | procedural clip library (idle, walk, turn, sit, reach, chop, stir, eat, read, talk…), blending, facial expressions, blink, gaze |
| kitchen.js | kitchen + house-shell geometry, interaction anchors |
| nav.js | inflated occupancy grid, 8-way A*, line-of-sight smoothing, dynamic blockers (chairs, doors) |
| sim.js | clock, object states, needs, personality, memories, relationships, utility AI, action steps, save/load |
| world.js | state → visuals: object animation, held props, lights, day/night, particles |
| audio.js | WebAudio procedural SFX triggered by sim events |
| main.js | boot, camera director (house/room/follow/director/cinematic), UI, test API (`LLAPI`) |

## Simulation ↔ rendering contract
The sim never reads meshes. It writes object state (`sim.O`) and agent state; `world.sync` maps that to visuals each frame. This is what lets `LLAPI.soak()` run days of simulation with no rendering for testing.
