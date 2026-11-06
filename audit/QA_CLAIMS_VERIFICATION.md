# Independent verification of previous QA

**Claude's QA report was not supplied.** Its wording, screenshots, seed, commands, version and pass criteria cannot be independently verified. No prior build/commit history was supplied. It would be misleading to invent claims and mark them verified. The table distinguishes report verification from observations of this exact build.

Source `S` = `/workspace/audit/source/naomis-kitchen.html`.

| Requested QA topic | Status of Claude's actual claim | Independent current-build finding | Evidence / reproduction |
|---|---|---|---|
| Naomi facial changes | Unable to verify | Parametric head and eye layout tagged v3 exist; no earlier version to establish improvement | `S:1018–1110`, `09-naomi-portrait.png`, expression captures |
| Hair and bun quality | Unable to verify | Active swept-ribbon/coiled bun and unused bunV2 coexist. Ring structure/segmentation visible; matching approved style not achieved by code labels | `S:1231`, `S:1275`, `16-mid-stir.png`, comparison plates |
| Hands | Unable to verify | Palm/thumb/mitten with shared finger bone, no independent fingers | `S:1133–1146`, `22-naomi-unobstructed.png` |
| Clothing | Unable to verify | Pinafore/blouse/hem/sleeves and skirt bones exist; authored garment topology/correctives absent | `S:1322–1394`, full-figure capture |
| Skin shading | Unable to verify | Light-wrap/vertex blush/terminator/rim implemented; no skin textures/roughness/SSS pipeline | `S:445–458`, `S:1033`, portrait |
| Expressions | Unable to verify | Nine procedural presets; happy/sad/surprised rendered. No facial blend-shape assets | `S:1600–1640`, `23-expression-*.png` |
| Cooking poses | Unable to verify | Complete action ran; mid-chop/stir poses captured. Position IK and timer-driven contact do not establish refined acting | `S:2248–2277`, `15-mid-chop.png`, `16-mid-stir.png`, action logs |
| Eating poses | Unable to verify | Food decreases/hunger rises; deep head bend and generic hand/utensil contact remain | `S:2299`, `S:2598`, `18-mid-eat.png` |
| Walking | Unable to verify | Navigation and procedural gait function; no explicit foot locking, sweep collision or stairs | `S:1501`, `S:2704`; normal video / path tests. All-angle foot-slide quality unverified |
| Sitting | Unable to verify | Sit/stand action and chair movement complete; fixed pelvis shift and two-bone skirt remain | `S:1516`, `S:2670`; cooking/tea/doze tests, eating capture |
| Overnight simulation | Unable to verify | Seven-day numerical cycles complete with no normal-run aborts; bedtime is a hidden hallway state, not animated bedroom life | `S:2411–2440`, `20-night-hidden-sleep.png`, browser and VM soaks |
| Hygiene degradation | Unable to verify | Decay is real and unrecoverable long-term; every tested configuration reaches zero | `S:2649`, browser day samples and seven-day minima |
| Missing rooms | Unable to verify | Entire bedrooms/bath/living/study/floors absent; dining shell only | `S:1979`, `S:2003`, inventory and overview |
| Camera problems | Unable to verify | House initializes, then starts force Kitchen after 2.5s; portrait aspect crops geometry | `S:3175–3177`, `normal-launch.json`, mobile captures |
| Roof fixes | Unable to verify | Current ridge cylinder starts at right end (comment suggests intention); dormer panels still cross visibly. No previous source proves what was changed | `S:1987`, `S:1997`, overview and board comparison |
| Sound | Unable to verify | WebAudio graph runs at 44.1kHz, event/room loop exercised; auditory quality unassessed | `audio.json`, `S:2909–2986`; no physical listening test |
| Save/load continuity | Unable to verify | Basic UI saves/loads; exact continuity contradicted by missing elapsed/RNG state and regenerated step order | `ui-save.json`, supplemental logic probes, `S:2741–2766` |

“Unable to verify” here refers to the missing **report**, not lack of investigation of the current build. Once the report and corresponding version arrive, add each exact quotation and map it to these tests. Use Verified / Partially verified / Contradicted only when a known claim and evidence can actually be compared. Do not infer that a hidden off-room sleep passes an animated-bedroom requirement or that error-free JS passes visual approval.
