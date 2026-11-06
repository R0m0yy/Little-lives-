# PROGRESS — Little Lives

_Last updated: 2026-11-05 (session 2). Everything listed as done was verified by rendering or running it in this workspace._

## Where the project stands

| Milestone | Status | Evidence |
|---|---|---|
| 1 Reference analysis & art bible | **Done** (v1) | `ART_BIBLE.md`, `REFERENCE_ANALYSIS.md`, `CHARACTER_SPECIFICATIONS.md` |
| 2 Naomi (first production character) | **v3 done — not yet signed off** (see QA_REPORT gaps) | `qa/v3/v3d_face_cmp.png`, `v3d_body_cmp.png`, `v3d_expr.png` |
| 3 Victorian kitchen | **Done** (functional, single room) | `qa/v3/house_00.png`, `qa/b_*.png` |
| 4 Integrated vertical slice | **Done** — Naomi autonomously cooks, carries, sits, eats, washes up, makes tea, reads, works lights | `qa/v3/v3d_pose_grid.png`, 32 h soak log in QA_REPORT |
| 5 Complete family | Not started (blocked on Naomi sign-off, per execution rule 5) | — |
| 6 Complete 3-storey dollhouse | Not started — only the kitchen module exists | — |
| 7 Autonomous AI | Partial — utility AI, needs, personality, memories, routines for **one** agent | `src/sim.js` |
| 8 Household simulation | Partial — kitchen interactions only; see `HOUSEHOLD_INTERACTION_MATRIX.md` | — |
| 9 Cinematic polish | Partial — cinematic camera sequence exists (Section 27 flow) | `main.js` startCinematic |
| 10 Full testing | Partial — automated soak + pose harness exists | `tools/qa_run.py`, `tools/pose_check.py` |

## Session 2 changes (this session)
- **Naomi v3 character pass** against the design board (side-by-side tool `tools/compare.py`):
  - Head: wide "apple" face fullest at the cheeks, soft broad chin (was pointed egg); head drops into collar; head radius −7% for ~3-head proportion.
  - Eyes: 15% larger, set lower (eye line 0.2 r below equator), sunk into sockets, dark glossy iris filling the eye, large soft key catch-light + small fill; thick upper lash line heavier at the outer corner + 3 lash flicks; lids more open at rest.
  - Brows: shorter, thicker, arched, closer to the eye. Nose: button + nostril wings. Mouth: smaller, with soft lower lip. Ears with inner detail.
  - Hair: new reusable **HairKit** (`cap / ribbon / sweep / coil / tendril`). Naomi's bun rebuilt as 30 swept ribbons into a large curly side-back bun (16 ringlet coils), a wide side-swept forehead lock, and coiled temple tendrils. Near-black base with brown highlights.
  - Outfit: mid-calf bell skirt (was knee), elbow-length gathered sleeves with ruffled cuffs, thicker limbs and neck.
  - Expression table re-tuned for the new lids (all 9 expressions).
- **Bug fix:** roof ridge rail extended a full roof-width past the left gable (cylinder origin error).
- **QA tooling fix:** pose-check camera was placed in front of the face, i.e. inside the wall at counters → black frames in the old pose grid. Now views from the open side.
- New docs: this file, QA_REPORT, HOUSEHOLD_INTERACTION_MATRIX, CHARACTER_PIPELINE, CHARACTER_CUSTOMIZATION, BLENDER_PIPELINE, ENGINE_ARCHITECTURE, AI_SIMULATION_DESIGN, ANIMATION_MATRIX, MILESTONES, ASSET_MANIFEST.csv, ASSET_SOURCES.

## Next (in order)
1. Naomi sign-off items (QA_REPORT §Open issues): bun reads as separate donuts from behind, mitten hands/peg arms, plain skirt vs. printed pinafore + lace band, hair ribbons slightly stripy.
2. Bathroom + bedroom modules (needed so hygiene and sleep happen on-screen; today sleep is "off-room").
3. Darius, Elias, Laila from the shared builder (new HairKit styles: short curls + beard, curly top, pigtail curls with bows).
4. Stack the modules into the 3-storey house with stairs and multi-floor navigation.
