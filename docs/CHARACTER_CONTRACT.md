# Character contract (swappable GLBs)

Any character GLB that follows this drops into the house (`web/lib/characters.js`, `house.html?char=<url>&at=<interaction id>`).
Naomi (`assets/characters/naomi_game.glb`) is the frozen placeholder; the commissioned character pack replaces her.

| Rule | Value |
|---|---|
| Format | glTF 2.0 binary (`.glb`), one scene |
| Up / forward | glTF +Y up; character faces **+Z** (Blender: Z up, faces −Y) |
| Origin | between the feet, on the floor (`min.y = 0`) |
| Scale | reference adult Naomi = **1.0** tall (hair top). Family targets: Darius 1.05, Elias 0.95, Laila 0.78 |
| Budget | head + hair ≤ 60k triangles; whole character ≤ 120k for the game version |
| Materials | names starting `skin`, `hair`, `cornea`, `fabric` get the house look-dev tuning (wrap/terminator skin, Kajiya-Kay hair, glass cornea, fabric sheen) |
| Landmarks (optional) | empties named `LM_*` are hidden in the house (used by the character QA tools) |
| Rig (from Stage 2) | one skeleton per character; clips named `idle`, `walk`, `sit_down`, `sit_idle`, `stand_up`, `reach`, `sleep`. Same bone names across the family so clips can be shared |

How the house uses a character: `house_data.json` → `interactions[]` gives `stand` (where the feet go), `face` (forward
direction), `contact` (hand / seat / pillow point), `kind` (`sit`, `sleep`, `open`, `use`, `switch`, `bathe`, `climb`,
`arrive`) and extras (`seat_h`, `controls`, `appliance`, `stair`). Coordinates are Blender (Z up); three.js = (x, z, −y).
The loader reports height, feet offset, triangle count, skinning and clip names, and only rescales when `?normalize=<h>` is given.

Known mismatch at round 23: furniture was built ~1.5× too large for a 1.0-tall chibi doll (chair seats 0.48 vs her hip
height ~0.3) — corrected in house round 24.
