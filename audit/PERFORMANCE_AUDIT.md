# Actual performance investigation and platform strategy

## Test environment and limits

Chromium 156.0.8078.79 on Linux, headless ANGLE Vulkan **SwiftShader** (`runtime-inventory.json`). No physical GPU or mobile hardware tested. Mobile tests emulate 390×844 touch layout and DPR3 in Chromium, not Safari/iOS execution. These results must never be represented as desktop/mobile device frame rates.

One normal desktop load reached `READY` in 3,475 ms on the local HTTP server. Document load event was ~768 ms, transfer 232,404 body bytes. This includes procedural generation/initialization but is a single instrumented, software-rendered sample, not network-distribution p95 or time to smooth interactive rendering. External font requests are separate.

## Measured / derived profile

| Metric | Observed value | Interpretation |
|---|---|---|
| Render pixels | Desktop 1440×1000, mobile internal 585×1266 | DPR capped to 1.75 desktop / 1.5 mobile, source `:3193` |
| Main scene counters, sampled portrait sequence | 52 draws, 109,122 triangles | In-engine counters omit shadow/particle/post |
| Instrumented all-pass submissions | 101 draws, 216,339 triangles/frame | Average over six controlled frames, includes repeated shadow geometry and one fullscreen triangle |
| Opening House main scene | 50 draws, 107,180 triangles | Scene state changes item visibility; don't treat one count as a fixed maximum |
| Character | 49,050 triangles; 28,251 vertices; hair 29,062 triangles | Dense hair contributes over half character triangles; poor silhouette is not caused by too few polygons |
| Resident static geometry uploads | 6,646,776 bytes (~6.34 MiB) | `bufferData` STATIC_DRAW sum; excludes driver copies and particle streaming |
| Color texture storage estimate | ~12.31 MiB including mip chains | Derived from 23 color texture uploads; not VRAM query |
| Shadows | One 2048² desktop / 1024² mobile depth target | All shadow-casting visible meshes rendered every frame; no point-light shadows |
| MSAA | Four samples in desktop run; same max-four logic for mobile | No mobile sample-count downgrade policy |
| JS heap sample | ~4.41 MB used / 5.05 MB total in controlled capture | Nonportable browser estimate; excludes graphics memory and much browser process memory |
| CPU render submission timings | .3–1.2 ms in six controlled calls | `performance.now` around frame and `gl.finish`; browser command buffering means **not GPU duration or end-to-end frame time** |
| Raw normal rAF intervals, separate 800×600 software run | Includes ~950–1,167 ms intervals | Short noisy software sample; proves HUD's ≥20-ish FPS display is misleading, not a physical-device benchmark |
| Timer query extension | Available; three frames collected, disjoint=false | SwiftShader-only pass timing; no physical hardware GPU duration |
| Navigation | 684 paths in seed42 seven-day .1 run; mean ~.142 ms in isolated VM | Small 6,120-cell grid; duplicated bootstrap nav with actual nav implementation. Not a full-house/multi-agent scaling benchmark |
| Whole 7-day logic+animation+world run | ~12.49 s at .1; ~114.04 s at 1/60 | Different tick counts and scene-state/RNG work; not real-time rendered performance |

Renderer texture/shader evidence: source `/workspace/audit/source/naomis-kitchen.html:401–710`. Full machine-readable uploads, mesh counts, browser timing and extensions are retained in `evidence/logs/`.

An additional `EXT_disjoint_timer_query_webgl2` run at 1280×900 measured **software** pass ranges: shadow ~60–88 ms, main ~1,317–1,370 ms, particles ~1.46–1.87 ms, post ~609–656 ms. These are ANGLE/SwiftShader query durations with boundaries at `useProgram`, including some adjacent clear/state work, three samples only (`gpu-and-recovery.json`). They establish the observed software workload and reinforce that CPU submission time is not completion time. They do not establish physical-GPU cost ratios or a deployable-device FPS.

## Shader and memory costs

The lit material computes nine PCF shadow samples per fragment plus up to eight unshadowed point lights. The fullscreen DOF/glow shader loops 27 times: depth, color and glow samples each iteration plus initial color/depth = about **83 texture lookups/pixel** (`:499–520`). This runs even with a broad house view. It is a substantial fill-rate burden relative to this prototype's material detail.

At 1440×1000, two resolve textures plus four-sample color/depth renderbuffers imply roughly 48–55 MiB of render-target storage, depending on 24-bit depth packing; the shadow target adds ~12–16 MiB. With color textures and geometry, a simple storage estimate is ~79–90 MiB before browser/driver overhead, copies and temporary CPU canvases. This is an estimate, not measured VRAM usage. GPU memory growth/leaks over hours remain unverified; resource ownership lacks robust disposal/context restoration.

Every group is submitted without scene frustum culling, spatial LOD or distance-dependent character detail. Static merging reduces draws but combines unrelated spatial pieces; it won't scale efficiently to many rooms. Particle vertices and matrices create fresh arrays per update. AI is modest now, but A* linearly scans open nodes and `open.includes` in each insertion; no hierarchical nav or scheduling exists for a neighborhood. Current measurements do not justify prematurely reducing target art quality.

## Platform strategy preserving the aesthetic

First build one approved complete-house shot and one approved Naomi in the candidate renderer, then profile on an agreed desktop GPU, integrated laptop, midrange Android Chrome and iPhone Safari. Establish 60fps desktop / 30fps mobile as **provisional targets**, not promises; negotiate after actual slice measurements. Capture p50/p95 frame times, CPU/GPU breakdown, cold/warm loading, memory after 30 minutes, battery/thermal throttling and context-loss recovery.

| Setting | Desktop quality proposal | Mobile scalability proposal |
|---|---|---|
| Geometry | Full silhouette, trim and hero character close-up LOD | Same silhouette; simplified hidden carvings, hair/prop LOD at house distance |
| Materials | Authored PBR, 1–2K/selected hero 2–4K as justified | KTX2 compressed maps, lower mip/resolution by screen size; retain roughness/normal material separation |
| Lighting | Baked static bounce plus selected dynamic/contact shadows | Same warm baked bounce; fewer shadowed locals, smaller shadow map; room-light culling |
| Post | Moderate DOF, restrained bloom, optional AO | Half-res/optional foreground DOF and AO; distant background preblur or low-cost depth blur |
| Resolution / MSAA | Cap DPR, measured MSAA or post-AA | Dynamic resolution and measured AA policy; no blanket 4× MSAA with expensive post |
| Animation | Full face/hands near camera, reduced at overview | Same key poses/contact, reduce face/secondary updates when tiny/offscreen |
| Simulation | Fixed tick, staggered decisions, room portal paths | Preserve gameplay/needs; reduce decision cadence/cosmetic sampling, not autonomy correctness |
| Loading | Chunk rooms/props and compress meshes/textures | First overview + visible family, staged high-detail room loads; no single massive texture payload |

Bake contact-rich static detail, not all dynamic family lighting. Preserve house silhouette, warm room hierarchy, tabletop context and character contact across tiers. Disable bloom/grain/expensive AO before sacrificing those defining features. Validate compression, lightmaps and shared-material instancing using actual imported assets; no asset/GPU performance claim is established until that slice exists.
