# Engine and rendering strategy

Recommendation: **Strategy B, a browser-first hybrid reconstruction, with Babylon.js as the leading candidate and Three.js a close alternative.** This is conditional on an imported Naomi + full-house presentation proof, not approval to migrate. Platform assumption: browser remains a primary delivery target because that is the supplied playable form; no native-only or console requirement was supplied. If native mobile/desktop becomes primary, revisit Unity/Godot weighting before commitment.

## Can a browser reach this quality?

Yes, a carefully authored scene with GLB skeletal/morph animation, PBR materials, baked/static indirect lighting, restrained dynamic shadows and cinematic framing can deliver a convincing miniature dollhouse in a browser. Neither this audit nor an engine feature list proves a particular full-house asset set will hit real-device performance. The current image gap is primarily missing/underdeveloped art, scene scope and animation. Switching engine alone will leave those problems intact.

Retaining the *current custom renderer* requires building GLTF loading, PBR materials/texture channels, morph targets, richer skinning, asset validation, reflection/environment support, better color/post pipeline, culling/LOD and editor/import tooling. That is a second rendering-engine project on top of making the game. The original is small enough that its renderer replacement risk is less than the cost of growing it into a professional asset pipeline.

## Verified official capabilities and constraints

| Foundation | Asset/animation/rendering | Deployment and engineering implications |
|---|---|---|
| A: custom WebGL2 | Current two-weight skinning, procedural clips, 8 unshadowed points, 1 directional shadow, color-only materials, no importer/morphs | Tiny single-file deployment today; largest custom-tooling burden and least artist-friendly. WebGL2 availability required |
| B1: Three.js | [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) supports GLB/glTF and compression/material extensions; [animation](https://threejs.org/manual/pages/animation-system.html) handles skeletal/morph tracks and crossfading; PBR/color-managed materials | Direct reuse of JS simulation data; flexible render orchestration. You still implement task state machines, IK/retarget workflow, navigation and editor-level game tooling. MIT engine license |
| B2: Babylon.js | [PBR materials](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/introToPBR), [glTF export/import workflow](https://doc.babylonjs.com/preparingArtForBabylon/dccToGltf), skeleton/morph animation, [retargeting](https://doc.babylonjs.com/features/featuresDeepDive/animation/animationRetargeting), inspector and scene systems | JS logic reuse, integrated game-oriented tools reduce bespoke infrastructure. More engine conventions to learn; verify exact stable-version retarget support (docs describe v9 AnimatorAvatar). WebGL2 baseline; WebGPU optional later. Apache-2.0 engine license |
| C1: Godot 4 | Scene/editor, GLTF import, animation graphs, skeletons, blend shapes, navigation, native renderer options | [Web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) uses Compatibility/WebGL2; Forward+/Mobile renderers unavailable on web. C# Godot4 projects currently cannot export to web. Single-thread web export available; threading imposes hosting isolation. JS sim port/bridge and save conversion required. MIT |
| C2: Unity 6 | Strong editor, Animator/Timeline, blend shapes, rigging/navigation packages, URP lighting, native platforms | Current [Unity 6.0 compatibility docs](https://docs.unity.com/en-us/engine/6000.0/manual/platform-specific/webgl/intro/browsercompatibility) explicitly include some mobile browsers; do **not** repeat obsolete blanket “no mobile web” claims. Still requires profiling payload/memory/graphics, C# port and platform QA. FBX is a normal authoring route; GLTF usually needs an additional vetted package. Proprietary editor/seat terms |

Licenses: [Three.js MIT](https://raw.githubusercontent.com/mrdoob/three.js/dev/LICENSE), [Babylon Apache-2.0](https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/license.md), [Godot MIT](https://godotengine.org/license/), [Unity pricing/eligibility changes](https://activation.unity3d.com/products/pricing-updates). License notices and third-party asset rights remain separate. No price or tool version is locked by this audit.

## Weighted project-fit comparison

Scores 1–5; weights sum 100. These are explicit engineering judgments based on the current project and documented capabilities, **not benchmark results or measured visual-quality scores**. Visual ceiling includes feasible production support, not automatic beauty.

| Criterion | Weight | Custom | Three.js | Babylon.js | Godot 4 | Unity 6 |
|---|---:|---:|---:|---:|---:|---:|
| Approved visual target support | 25 | 2 | 4 | 4 | 4 | 5 |
| Authored asset/rig/face pipeline | 20 | 1 | 5 | 5 | 5 | 5 |
| Interaction/animation/game tooling | 15 | 1 | 3 | 4 | 5 | 5 |
| Browser deployment suitability | 15 | 5 | 5 | 5 | 3 | 3 |
| Scalable mobile support | 10 | 3 | 4 | 4 | 4 | 4 |
| Migration effort/risk (higher = easier) | 10 | 4 | 4 | 4 | 2 | 1 |
| Maintainability / team tooling | 5 | 1 | 4 | 4 | 4 | 3 |
| **Weighted total / 5** | **100** | **2.35** | **4.20** | **4.35** | **4.00** | **4.10** |

Babylon wins narrowly because this game needs many animation/object tools and a working visual inspector, while preserving JS gives a short validation path. Three.js may be the better team choice if existing expertise favors it or custom cinematic rendering control is more valuable than integrated tooling. A .15 score difference is not decisive evidence; the imported-asset spike decides.

Godot is attractive for an open-source editor workflow and native releases, but its web renderer cannot simply use native Forward+ features. Unity is strongest if a professional native production team prioritizes editor/animation workflows and accepts the C# rewrite and proprietary commercial terms. Its native visual ceiling is high; a URP/web/mobile art strategy still requires deliberate quality/performance decisions. Do not compare a native high-end GI demo with a browser Compatibility renderer as if they were equivalent deployable features.

## Migration proof and preservation

Before committing, specify a bounded 2–3 week technical spike **after plan approval**, reusing one exported hero head/body rig, a representative room/roof asset, one skinned clip, one facial morph, a normal/roughness material, baked lightmap mapping, hand target, moving door and four visible character instances. Capture full-house framing and device profiles with identical assets/exposure across candidates where a tie remains. Reject a candidate if export loses facial shapes, shadows fail the material target, browser payload is unacceptable, or team debugging/editing is impractical.

Preserve concepts and tested behavior from Clock/needs/utility/cooldowns/memories, action intentions, household state examples, save export as legacy migration input, camera-mode intentions and UI tone. Refactor coordinate/skeleton/audio coupling before transplanting. Replace renderer, hero procedural meshes, hardcoded room presentation, stringly typed prop sync and fragile continuation code. Navigation algorithm can remain a unit fixture for one floor; it is not the multi-floor solution.

Production examples researched: [Blender Studio's Sprite Fright design process](https://studio.blender.org/blog/sprite-fright-the-illusion-of-simplicity/) describes deceptively simple toy-like shapes requiring intentional sculpting; [Three.js official examples](https://threejs.org/examples/) and [Babylon feature demos](https://www.babylonjs.com/featureDemos/) demonstrate relevant GLTF/PBR/animation mechanisms. They are technique references, **not replacement art references or proof of this game's performance**. The Blender article was available as a search excerpt but direct fetch was blocked; no unviewed demo is presented as played or benchmarked.
