# Visual comparison against the supplied vision

**Reference limitation:** only the composite board was supplied. Separate definitive realistic dollhouse, supporting original house and purple-sweater originals are missing. The crops below are explicitly board excerpts, not substitute references. Exact reproduction of small moldings, unseen elevations or facial topology cannot be assessed from this resolution. The board's lower-right and lower-left houses differ; neither is silently promoted to the missing definitive original.

![Both board house panels versus the actual build](evidence/comparisons/both-house-references.png)

![Style, Naomi identity and actual character](evidence/comparisons/naomi-side-by-side.png)

Source code path for line citations: `/workspace/audit/source/naomis-kitchen.html`.

## Environment discrepancy matrix

| Reference feature visible in the board | Actual rendered evidence | Root cause | Severity / target proof |
|---|---|---|---|
| Tall multi-level cutaway with attic beneath elaborate roof | Wide, low, one-room pavilion | Missing geometry/content: `:1648`, `:1979` | Critical; full silhouette and every floor present in overview |
| Multiple front gables, steep roof, deep layered fascia | Broad two-plane cap, one small dormer; crossed dormer boards | Roof topology and proportions: `:1981–1998` | Critical; matched front/three-quarter silhouette and ridge/gable details |
| Continuous wraparound porch and ornate posts | Right-hand fragment, empty left wall/stub | Partial geometry `:1968` | High; correct porch footprint, stairs, supports and roof junctions |
| Many framed windows/doors aligned across floors | Sink window, stub window, lit dormer only | Architecture absent, not a lighting issue | Critical; facade rhythm reviewed in clay and final material passes |
| Filigree, balusters, cresting, layered cornices | Repeated cylinders, tubes and discs | Simplified parametric trim `:1958` | High; custom profile kit with silhouette-critical geometry |
| Furnished bedrooms, bathroom, dining/living rooms and stairs | One kitchen and tiny closed shell | Missing room content | Critical; room map, furnished overview and navigable floors |
| Dense, layered furniture, rugs, pictures, books and textiles | Credible kitchen identifiers but large empty floor/wall areas | Staging, prop variety and scale | High; hierarchy of hero furniture, medium props and small lived-in objects |
| Material grain, metal reflections, fabric weave, miniature finish | Color patterns and procedural specular highlights | No PBR maps/reflection environment `:427–477` | High; matched neutral-light material validation board |
| Warm practical pools with cool ambient separation and contact shadows | Warm fill/points; simple directional shadows and corner darkening | Lighting/material pipeline `:451`, `:2849` | High; retain warmth while grounding furniture/feet |
| Distinct tabletop, house base and believable softly blurred room | Overscaled plank surface and painted bookshelf/lamp backdrop | Art asset/scale and lens context `:2010`, `:893` | High; consistent miniature wood scale, restrained context and realistic distant background |
| House dominates as complete object, surroundings support it | House shot shows entire supplied module; start then pushes kitchen | Scope plus start logic `:3175` | Critical; complete house remains default, close-ups voluntary |

This comparison is against the target board, not against a prior prototype. Small functional details do not compensate for the missing silhouette and room hierarchy.

## Character discrepancy matrix

| Area | What matches | Significant gap observed | Cause / evidence |
|---|---|---|---|
| Identity | Dark hair, side bun, brown eyes, warm skin, cream floral dress | Face and garment construction do not resolve like the board's rounded collectible sculpture | See `CHARACTER_QUALITY_AUDIT.md`; portrait and family crop |
| Head | Rounded large head and button nose | Broad flat lower face, large forehead, weak integrated cheek/orbit structure | Parametric sphere deformation `:1018`; portrait |
| Eyes | Large dark irises/catchlights | Texture-dominated eye spheres; eyelid/lash pieces read as separate lines rather than a continuous sculpted socket | `:1072–1110`; portrait and expressions |
| Hair | Swept lock, side-back bun and tendrils | Ribbon overlap/cap segmentation; bun reads as visible coiled rings | `:1231–1267`; mid-stir rear view |
| Hands | Thumb and bent finger mass | No independently posed digits, grip anatomy or believable finger-object contact | `:1133`; unobstructed and eating captures |
| Clothing | Cream puff sleeves, floral skirt, pink waist | Separate balloon volumes, stiff bell skirt, no tailored folds or fabric response | `:1322–1394`; full figure |
| Surface | Warm wrapped light | Flat skin color/blush, simple specular; eye catchlights remain painted while light changes | `:1033`, `:825`; portrait |
| Expression | Brows, mouth, eyes change | Scaling tube/sphere facial pieces cannot reproduce the board's coherent cheek/lid/lip deformation | `:1600–1640`; expression captures |
| Motion | Walking/IK/seated cycles run | Deep forward head bend in eating; weak grips/foot contact and limited garment deformation | `18-mid-eat.png`; animation report |

Purple-sweater reference establishes **modeling style**, not Naomi's wardrobe or identity. Do not put Naomi in that child's clothing or copy the child's exact proportions. Adults and children need deliberately different body/head relationships while retaining shared eye, cheek and material language.

## Limits of visual conclusions

The browser renders are actual WebGL2/ANGLE SwiftShader captures. They demonstrate the model, scene, material and composition produced by this file; they do not predict device-specific aliasing, driver issues, colors on a physical display, mobile thermals or frame rate. Composition comparisons are side by side, not pixel registration or physically calibrated photometry. No reference image was synthesized or retouched. Crops and resizing are documented in `evidence/comparisons/PROVENANCE.json`.

No exact likeness score or numerical “percentage matched” is warranted. Gate approval must use original references, matched views and the user's visual judgment independently of test results.
