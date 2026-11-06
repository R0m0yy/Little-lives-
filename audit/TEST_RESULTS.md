# Test results and reproduction

Tests ran 2026-11-06 on the unchanged source snapshot. Source SHA-256: `bc6c33043afdb05e712feba5f85cba3b1a3cbf536cb57fc22d635b39493c3290`.

## Environment / method

- Node **24.22.1**, recorded in `environment.json`; Playwright **1.62.1**; system Chromium **156.0.8078.79** at `/usr/bin/chromium`.
- Headless ANGLE Vulkan **SwiftShader**; no physical GPU, Android, iPhone, Safari, battery, thermal or controller tests.
- Desktop captures 1440×1000 and 1280×900. Mobile emulation 390×844, touch/DPR3, internal renderer 585×1266. A viewport emulation is not a mobile browser compatibility certification.
- Python/Pillow 13.0.0 builds report crops/layouts only. No generated or retouched game/reference imagery.
- There is no supplied source build system to compile. The actual HTML was served by Python HTTP and executed, including original shader compilation. The twelve embedded modules were extracted for provenance/syntax inspection; they are not a recovered original repository.

## Results by test

| ID | Test / method | Result and limits | Evidence |
|---|---|---|---|
| T01 | Byte inventory, full source read, module extraction and JS syntax | Complete for accessible HTML: all 3,224 lines, 12 embedded sections. Repository/source maps/build/old tests absent | `FULL_PROJECT_INVENTORY.md`, `source-map.json`, source hashes |
| T02 | Normal page load/start overlay/quiet start | Loads and renders; READY observed at ~3.475s in one local sample. Switches to Kitchen after 2.5s. Initial overview is only module | `normal-launch.json`, screenshots 01/02/26 |
| T03 | House/room/director/follow/debug camera and mouse drag/wheel | Camera paths render; drag/wheel offsets change. Entire module cropped on portrait; no complete house exists | `camera-controls.json`, shots 03–10/24/26 |
| T04 | Cooking selected with cinematic lunch setup | Full cook/serve/eat/clean sequence completes; controlled forced setup, not spontaneous-selection proof | `interaction-stages.json`, `supplemental-browser.json`, shots 15–19 |
| T05 | Isolated fourteen-action fixtures | All 14 returned completion at dt .05 with no aborts; checks logic progression, not artistic approval | `simulation-results.json:actions`, times below |
| T06 | Food carrying / serving | Held plate/food state and hand-midpoint rendering verified; natural grip/contact incomplete | Shots 06/17 and state logs |
| T07 | Eating / sitting / stand / chair | Needs/food and seat state update; sampled eating pose too bent; dynamic blocker stale | Shots 07/18, action logs, source |
| T08 | Washing / water / cleaning | Water mesh and state, hygiene increment, dirty flag/rack and crumbs logic exist; long-term hygiene fails | Shots 08/19; action and soak logs |
| T09 | Bedtime / wake / overnight | Numerical sleep/wake cycle works; actual bedroom sleep/stairs not implemented | Shot20; browser/VM soaks |
| T10 | Bathroom / bedrooms / living/study / stairs | Not implemented in complete accessible geometry/action source; cannot play-test absent systems | Household CSV, full source inventory |
| T11 | Autonomous three-day **browser** runs | Four runs: seed42 repeated, seed7, seed2026, dt .1; no normal aborts; hygiene reaches zero; only Naomi exists | `browser-soaks.json` |
| T12 | Seven-day isolated runtime, three seeds and dt sensitivity | Six runs ×7 days =42 simulated days. Repeat seed42 .1 event hash matches; .25 and 1/60 schedules differ. No nonfinite normal positions or normal aborts; hygiene zero in all | `simulation-results.json:soaks` |
| T13 | Relationship recipient probe | DEFECT: Elias label with missing vars.who updates Darius affection 82→85 and friendship 74→76; Elias unchanged | `supplemental-logic-results.json:call-target-mismatch` |
| T14 | Memory/personality/needs | Needs decay and capped memories/moodlets work; memories do not guide decisions, some traits and relationship axes unused | Source and day samples |
| T15 | Light on/off, evening/day/night | Light action fixtures complete, emissive/points respond; no practical-light shadows or complete-house bake | Shot21 and action logs |
| T16 | Basic local save/load/code export UI | Nonempty JSON saved/exported; load toast succeeds. Not a full continuation equivalence pass | `ui-save.json` |
| T17 | Mid-step load | DEFECT: saved `stepT=4.2`, loaded `stepT=0`; no serialized RNG/elapsed/slide state | `simulation-results.json:save-mid-step` |
| T18 | Conditional task reconstruction on load | DEFECT: bedtime phase index3 changes from lights-off to opening door; cooking recipe rebuilt as stew across cutoff | `supplemental-logic-results.json:bedtime-step-index-shift`, recipe probe |
| T19 | Partial/invalid save records | DEFECT: missing agents throws after clock mutates; shallow fridge record produces nonfinite open. NaN is encoded null in JSON log | `invalid-save-atomicity`, `partial-object-save` probes |
| T20 | Malformed base64 UI input | Rejects with “That save code could not be read”; does not establish atomic handling of valid-but-invalid-schema JSON | `gpu-and-recovery.json:badCodeToast` |
| T21 | Abort/error cleanup | DEFECT: active burners remain, kettle can remain hand-attached, stale path remains after abort | `abort-burners-and-kettle` probe |
| T22 | Navigation reachability/obstacles | Every SP path queried; single-room tasks complete. Physical collision correctness not established; endpoint-margin bypass and no swept resolution | `interaction-point-paths` probe, source |
| T23 | WebAudio enable/event/loop graph | Context running at 44.1kHz and room loop/chop event exercised. No physical listening or final audio quality assessment | `audio.json` |
| T24 | UI family/needs/menu | UI renders real data and missing-family milestone notice. Scores erased on start; keyboard semantics/mobile overlap incomplete | Shot11/25, decision-score probe |
| T25 | Mobile layout | Scene renders; bounds/camera bar overlap top bar y58–73. No hardware multitouch/Safari/mobile GPU test | `mobile-layout.json`, shots24/25 |
| T26 | WebGL unavailable | Renderer constructor handled with visible unsupported-device message; READY false | `webgl-unavailable.json`, shot14 |
| T27 | WebGL context loss | DEFECT: context lost, READY remains true, no visible error/recovery overlay; blank scene capture | `gpu-and-recovery.json:recovery`, shot27 |
| T28 | Draw/mesh/texture/CPU and software GPU profile | Actual pass counts/memory estimates and software timing captured; no physical-device FPS claimed | `runtime-inventory.json`, `render-profile.json`, `raf-intervals.json`, `gpu-and-recovery.json` |
| T29 | Character neutral/expressions / reference plates | Actual rendered face/full figure/happy/sad/surprised; five side-by-side plates from supplied board. Separate original reference fidelity unverified | Shots09/22/23; comparison provenance |
| T30 | Previous Claude QA | Unable to verify without report/version; current topics independently assessed | `QA_CLAIMS_VERIFICATION.md` |

Controlled action completion times, simulated minutes: cook119.60, leftovers68.10, dishes20.70, tea63.15, reading47.00, call25.65, tidy25.10, gaze11.10, lightsOn2.40, lampOn6.75, lightsOff13.70, doze36.60, bed9.15, wake5.40. These fixture scenarios explicitly set prerequisites/time/positions and invoke the selected action. They are not a claim that every action is autonomously selected in the normal week.

## Evidence capture caveats

Screenshots 03 and12 were early test-mode captures while CSS start/loading fade was still completing; their translucent overlays are **capture timing**, not a stuck-loading defect. Prefer settled 26 (desktop), 24/25 (mobile). Early 04–08 capture entry to an action before a settled gesture; use 15–19 for mid-action poses. Portraits/full-figure/expression probes reposition the existing Naomi and use debug cameras; they do not replace meshes, materials or geometry. `22-naomi-unobstructed.png` is preferred over the table-obstructed initial full-body view10.

The normal-session `.webm` is a real 43.52-second browser recording (actual elapsed-time software-rendered launch/quiet start), not synthetic promo footage. It is not a full normal-speed cooking day or evidence of physical-device fluidity. Multi-day tests run unrendered accelerated updates; no multi-day rendered video is claimed. Shot27 intentionally loses the local test page's context.

No uncaught page exceptions were recorded in the controlled browser test. Normal server logs include `/favicon.ico` 404s. Zero JS exceptions does not negate the behavioral/visual failures above. Timer-query profiles are software only; CPU `gl.finish` timing must not be converted to hardware FPS.

## Reproduce in this environment

Use Node and Python, Chromium at `/usr/bin/chromium`, and the audit-only dependencies. Original game runtime has no npm dependencies. Network access may be needed for dependency install and optional Google Fonts; environment font availability can affect HUD metrics.

```bash
cd /workspace/audit
npm ci
npx playwright install ffmpeg
python3 -m pip install -r requirements.txt
python3 -m http.server 8765 --bind 127.0.0.1 --directory /workspace/audit
```

Leave the HTTP server in that terminal. In a second terminal:

```bash
cd /workspace/audit
python3 scripts/extract-inventory.py
node scripts/browser-audit.cjs
node scripts/supplemental-browser.cjs
node scripts/presentation-captures.cjs
node scripts/browser-soak.cjs
node scripts/simulation-audit.cjs
LL_AUDIT_PROBES_ONLY=1 node scripts/simulation-audit.cjs
node scripts/gpu-recovery-audit.cjs
python3 scripts/comparison-plates.py
python3 scripts/build-matrices.py
python3 scripts/verify-package.py
```

Commands overwrite derived evidence/logs inside `audit/` only. Browser scripts support `LL_AUDIT_URL` for another local serving address; URL hash controls are `#test&seed=42` and optional `time=19`. Captured `.webm` names are Playwright-generated. Launch tests can take tens of seconds on this software renderer; logic soaks take several minutes. These are explicit test operations, not changes to gameplay source.

In the browser console, the original API also supports:

```js
LLAPI.state()
LLAPI.setCam('house'); LLAPI.snap(); LLAPI.frame(0.25)
LLAPI.soak(3 * 1440, 0.1) // accelerated logic + animation/world, no render
LLAPI.startCinematic()     // NOTE: resets clock/needs/food/position and forces cook
```

`simulation-audit.cjs` evaluates the original script in a VM, stubs upload/DOM/audio, and duplicates bootstrap nav definitions exactly. That separation permits logging/invariants without GPU cost. Actual-browser soaks cross-check the real bootstrap; VM results are never represented as rendered gameplay or device performance.
