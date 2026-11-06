# Three realistic recovery strategies

Recommendation: **B — Hybrid reconstruction.** Retain useful simulation ideas and action intentions, rebuild the visual/asset/animation layer and refactor household state/persistence for a real multi-floor family. Browser delivery remains the working assumption. This audit is the reviewable plan; no redevelopment has begun.

## A — Improve the existing project

Preserve the custom WebGL2 renderer, JS modules, utility AI, current room conventions and most action code. Introduce imported meshes, PBR/morph support, authored characters and full-house geometry. Repair callbacks, saves, cancellation and navigation while expanding objects and family.

This sounds conservative but requires authoring a substantial importer/material/animation/render toolchain alongside the game. The custom renderer currently accepts an 18-float vertex format, two influences, one color map and no facial morphs. Maintaining that architecture while pursuing approved art requires extensive replacement inside it. Current hero asset code should still be retired; preserving primitive-based appearance would fail the mission.

Best use: a deliberately limited experiment or a team with strong bespoke rendering expertise and a strategic reason to own the renderer. Not the preferred premium recovery path merely because the HTML already runs.

## B — Hybrid reconstruction

Use an established browser renderer (Babylon.js leading, Three.js alternative) and an original Blender-to-GLB asset pipeline. Extract a renderer-independent fixed-tick core; keep tested needs/clock/utility experiments, object-state examples and semantic kitchen chain as migration fixtures. Refactor action identity/anchors/reservations/cancellation/save transactions rather than transplanting all hardcoded coordinates and callbacks unchanged.

Build full-house presentation and Naomi proofs first. After approval, implement one complete natural cooking/eating/cleanup interaction with contact events and new animation. Then actual stairs/floors, household fixtures and all four agents. Keep old snapshot/logs as baseline, not as aesthetic approval.

Best use: this game's premium art ambition with browser distribution and valuable JS behavior. It avoids paying to rebuild commodity rendering infrastructure while admitting that the simulation is a prototype, not finished family gameplay.

## C — Full production rebuild

Move to Unity 6 or Godot 4, use editor-managed scenes/assets/animation/navigation and port gameplay definitions/state into C#/GDScript or an explicit bridge. Start a proper asset repository and build/QA pipeline. Current design logic can be translated and regression scenarios reused; raw rendering/character construction becomes reference only.

Unity is attractive for a staffed native-focused production using established animation/editor workflows. Godot is attractive for open-source ownership and native development with a lightweight editor workflow, but web export uses Compatibility and has current C# limitations. Both still need all original house/character/animation work and save migration. Neither engine can turn the supplied reference image into a polished functional world automatically.

## Strategy comparison

| Criterion | A: existing renderer | B: hybrid | C: full engine rebuild |
|---|---|---|---|
| Expected fidelity | Medium unless renderer/asset pipeline substantially rebuilt; high is possible but expensive | High potential with authored assets and focused rendering plan | High potential; native rendering options strongest, browser features constrained by deployment |
| Development effort | High plus custom rendering/tool work | High, focused on art/simulation rather than commodity renderer | Highest initial integration/port effort, art effort unchanged |
| Complexity | Hidden inside custom engine, imported assets and many hardcoded systems | Explicit adapter/contracts plus established rendering tooling | New language/editor/build stack and gameplay port |
| Technical risk | High: every asset/material/face feature becomes custom | Medium: asset integration, contact animation, existing logic refactor | Medium-high: port equivalence, platform payload, save conversion, new team tooling |
| Reusability | Most source retained initially, less truly production-ready than appearance suggests | Concepts/tests/data retained; visual code deliberately replaced | Design/test fixtures retained; limited direct JS reuse |
| Browser | Small current payload; growing custom maintenance | Best direct fit with incremental asset loading | Supported, but WASM export/runtime/content and renderer limits need measurement |
| Mobile | Current layout/pacing flaws; no proven hardware performance | Scalable assets/rendering; hardware proof still required | Native support strong; mobile web must be specifically profiled |
| Long-term scale | Weak without broad engine tooling investment | Good for a focused household simulator; eventual editor/authoring tools needed | Strong editor/tool ecosystem; larger rebuild and operational commitments |
| Incremental release | Possible but risk of repeated cosmetic failures | Approval-gated proofs and progressive household slices | Longer time before parity; potential stronger native foundation |

Planning magnitude, same premium content scope: **B roughly 90–150 person-weeks before contingency**; A can add ~15–30 person-weeks of custom rendering/import/tool work; C can add ~15–35 person-weeks of port/editor/persistence/platform work, partly offset later by editor workflows. These are scenario estimates, not measured bids. Art staffing, original reference ambiguity, room/prop count and hardware targets can change them substantially. See milestone assumptions and contingency; do not select A merely as the apparently fastest fix.

## What to preserve and replace

Preserve: named family intent, needs/personality data experiments, clock and utility/cooldown concepts, action vocabulary, kitchen task sequence, appliance state examples, mood/memory UI tone, camera mode intentions, and portable regression cases. Recover legacy save data through a versioned importer where useful.

Replace: the hero procedural Naomi pipeline, one-room house presentation, custom renderer as production foundation, global single-agent prop sync, hardcoded scene/action/nav coordinates, brittle step-index save continuation and missing resource ownership model. Keep mesh primitives for blockout/proxies/trim-generation tools, not final hero modeling.

## Decision conditions

Approve the **plan** first. Before funding the whole rebuild, require authentic original references and a capped visual/asset proof budget. Candidate Babylon must prove Naomi GLB skin/morphs/materials, complete-house composition, baked-light integration, one contact interaction and measured target devices. If that proof fails for a concrete renderer/platform limitation, compare the identical assets in Three.js or a native engine rather than commissioning all content again.

If the product is redefined as native-first, weight editor workflows/native rendering higher and reconsider Unity/Godot. If the originals demand offline-render-level dynamic GI at unrestricted mobile frame rate, explain the specific difference and approve a baked-light/limited-dynamic alternative; do not promise an exact still-image reproduction under every camera/light state.

The strongest path is to invest first in approved forms, materials and acting, then make a real house/family interact through stable contracts. Repeated procedural micro-adjustments would preserve the central cause of rejection.
