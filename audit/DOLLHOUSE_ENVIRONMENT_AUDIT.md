# Victorian dollhouse environment audit

![Board house versus actual scene](evidence/comparisons/environment-side-by-side.png)

Only board excerpts are available; the definitive realistic house original and supporting original are missing. This prevents exact architectural measurement and verification of small details. Source references below are `/workspace/audit/source/naomis-kitchen.html`.

## Actual space

The kitchen occupies x=−4…4, z=−3…3, height 4.6 (`:1648`). A corridor stub extends left to approximately x=−6.1. There is no complete hallway network. The closed dining stub, main roof cap and lit dormer communicate a larger house without furnishing or simulating one (`:1979–2009`). A 34×18 tabletop and 120×60 painted backdrop quad provide context (`:2015–2018`).

Kitchen assets include lower cabinet/drawer **facades**, counters, false sink basin surface, taps, double range with fixed oven doors, shelf crockery, fridge body and hinged door, telephone/handset, clock/hands, botanical frame, table/cloth/rug, three chairs and one active chair. Small props include pot, kettle, plate/food, knife/spoon, ingredient variants, rag, book/open book, cup and water stream. Only some are functional; see the CSV, not visual presence, for behavior classification.

The scene has some craftsmanship intent: molding, toe kicks, turned porch posts, floral dress/curtains, stove controls and table dressing. It remains a sparse room module with simplified proportions and surface detail. The two visible house panels on the board both establish a much taller, denser, layered miniature than this module.

## What must be modeled

| Asset group | Current gap | Required production method |
|---|---|---|
| Whole house structure | Upper floors/attic/stair openings/real room divisions absent | Reference-traced Blender blockout, measured floor plan, consistent room module dimensions and wall thickness |
| Victorian roof | Simple cap, crossed dormer pieces, wrong mass distribution | Custom main gables/dormers/roof junctions/chimneys; shingles normal/roughness with real geometry at silhouettes |
| Porch and facade | Partial right fragment and left shell | Full wraparound footprint, rail/stair segments, columns, bay windows and door frames |
| Trim and ornament | Repeated generic tube/disc motifs | Custom curve/profile kit for crown/baseboard/fascia, modeled brackets and cresting; reuse instances after approval |
| Room interiors | One kitchen | Bedroom/bathroom/living/dining/study/children's room sets; furniture heights checked against family rigs |
| Miniature materials | Painted color patterns, uniform shine | Wood grain at dollhouse scale, plaster/wallpaper, fabrics, aged brass, ceramic/glass; basecolor + normal + roughness + AO |
| Functional furniture | Shared global props, no real cabinet/oven interiors | Separate named pivoted parts, shelves/insides, collision proxies, approach/contact anchors and state schemas |
| Real-world context | Stylized bookshelf plane and plank patchwork | Custom tabletop/base hero asset; authored or legally sourced blurred HDR/photo/3D background with consistent perspective |

## Efficient ornate architecture

Treat silhouette-critical trim as geometry: gable lace, railing outlines, cornice depth and window reveals must cast shadows at the house view. Use baked normals/AO for carvings that do not change silhouette, trim sheets for long profiles, and instanced repeated spindles/roof ornaments. Combine static room meshes by material **within spatial rooms**, not into a whole-house monolith that defeats culling and cutaways. Use atlases for unique prop sets and a small tiling material library for wood/wall/fabric. Keep interactive pivots separate even when visually similar.

Start with a target asset budget, then measure the real loaded house. Do not give every knob a separate 4K texture or every baluster a unique mesh/material. Author three LODs for ornamental pieces where they are actually below a few pixels. Keep gable/roof silhouette, warmth and material hierarchy in all quality levels. Occlusion/visibility groups must let the camera see the cutaway rooms without deleting geometry needed for shadow casting.

## Custom versus sourced

Custom production is mandatory for the house silhouette, reference-specific trim/gables, tabletop/base composition, hero kitchen, family beds and interaction geometry whose dimensions dictate choreography. Legally sourced tables, books, vases, fabrics, woods and selected Victorian furniture can reduce time, but must be rescaled, retextured, optimized, fitted and checked against the reference. Research found actual furniture candidates; none was purchased or validated in-engine. See `ASSET_AND_TOOL_RESEARCH.md` for exact links and licensing status.

## Required unified art direction

Use realistic miniature materials and deliberate handcrafted imperfection: slight paint edge wear, modest timber variation, fabric seam thickness and softened edges that catch light. Avoid applying full-size distressed scan damage at miniature scale. Characters should read as crafted rounded collectibles with the same warm key, room bounce, contact shadow and exposure as furniture. Their stylization can differ from the house's realism while material finish, scale and light remain coherent. The family must not have a separate arbitrary rim/exposure that makes it look composited into the room.

Approve the full house clay silhouette before furnishing all rooms. Then finish one visible room/material slice under the final overview camera. Only then replicate the approved trim/material kit. This prevents months of polishing a kitchen that will be resized when the real house is finally built.
