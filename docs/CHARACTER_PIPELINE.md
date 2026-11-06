# CHARACTER PIPELINE

## Current pipeline (runs in this workspace)
Characters are built **in code** from a spec object, so every family member shares topology rules, skeleton and materials.

1. **Reference crop** → `qa/v3/ref_naomi_face.png`, `ref_naomi_full.png`.
2. **Spec** in `LL.CharacterSpecs` (proportions, face layout, colours, hair style, outfit).
3. **Build** `buildCharacter()`:
   - head: 48×36 parametric sphere + `headDeform` (jaw, cheek, face plane, chin)
   - face: layered eyes (eyeball with planar iris UV, lid shell, lash line, lash flicks), brows, nose, mouth + lower lip, ears — each on its own bone
   - hair: `LL.HairStyles[spec.hair]` built from `LL.HairKit`
   - outfit: `LL.Outfits[spec.outfit]` with skinning weights (torso chain, skirt bones, sleeve chains)
   - limbs + hands shared by all characters
4. **Skinning**: up to 2 bones per vertex via `chainW()` projection onto joint chains.
5. **QA**: `python3 tools/compare.py <tag>` → face/body comparison sheets + expression sheet; `tools/pose_check.py` in-game.

## Topology note (honest)
Parametric grids give clean, even quads (like the reference wireframe) but **not** true edge-loops around eyes and mouth. Facial expressions therefore use bones (lid rotation, brow translate/rotate, mouth scale, open-mouth shell) rather than mesh-deforming shape keys. Moving to sculpted, retopologised meshes requires Blender — see BLENDER_PIPELINE.md.
