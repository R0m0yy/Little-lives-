# BLENDER PIPELINE

## Status: not runnable in this workspace
Blender (`bpy`) is not installed in the cloud workspace and package/network installs are blocked, and the developer works from a phone with no local PC. **No Blender files exist for this project**, and none are claimed.

## What Blender would add
- Sculpted faces with real edge loops around eyes/mouth → shape-key expressions instead of bone tricks.
- Sculpted hair clumps with baked strand normals.
- Hand-painted textures, baked AO.
- glTF 2.0 export → would justify swapping the renderer layer to Three.js (`GLTFLoader`).

## Planned workflow (when a Blender-capable environment is available)
1. Export the current procedural mesh + skeleton as glTF from the browser build (a small exporter in `tools/`) as a base mesh.
2. Blender: sculpt pass on head/hair/hands → retopo keeping the 30-bone names → UVs → shape keys for blink, smile, frown, open, O, brow up/down.
3. Weight paint against the same skeleton; extreme-pose test (shoulders, elbows, hips, knees, neck).
4. Export glTF (Y-up, +Z forward, 2 bones/vertex) → `assets/characters/<name>.glb`.
5. In-engine validation with `tools/compare.py`.

Until then, character quality is driven by the procedural builder documented in CHARACTER_PIPELINE.md.
