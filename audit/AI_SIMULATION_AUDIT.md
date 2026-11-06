# Autonomous family simulation audit

Source: `/workspace/audit/source/naomis-kitchen.html`, particularly `:2182–2207`, `:2446–2777`. Raw results: `evidence/logs/simulation-results.json`, `browser-soaks.json`, `supplemental-logic-results.json`.

## Actual autonomy

One Naomi chooses between fourteen scripted task sequences. Scores use squared unmet need, personality weights, meal/daylight windows, cooldowns, repeat penalty and weighted top-three selection. This is genuine utility selection, not a single fixed daily playback. Individual tasks are predefined sequences; there is no plan search, prerequisite graph or urgent preemption. A long task delays higher-priority needs and bedtime until its completion.

Needs are hunger, energy, hygiene, fun and social. There is **no bladder need**. The trait `playful` is displayed but has no action-selection use; neat/social/foodie/cozy and tea/reading/wake do influence behavior. Memories are fixed completion texts, capped at 40, with tags but no decision readback. Moodlets add scalar bonuses; emotions select simple face presets. Affection/friendship change only for calls, and due to ignored goto callbacks currently always affect Darius. Trust/conflict are initialized and displayed, not evolved. There are no independent Darius, Elias or Laila agents, jobs/school actors, shared activities, conversations or resource contention resolution.

## Reproducible multi-day results

Six 7-day isolated-runtime runs: seed 42 twice at dt .1, seeds 7 and 2026 at .1, seed 42 at .25 and 1/60. Separate **actual browser** runs: seed 42 twice, seed 7 and seed 2026 for 3 days each at .1, using the unmodified `LLAPI.soak`.

| Seven-day run | Completed tea | Completed cooking | Completed leftovers | Abort count | Minimum hygiene |
|---|---:|---:|---:|---:|---:|
| Seed 42, dt .1 | 38 | 9 | 24 | 0 | 0 |
| Repeat seed 42, dt .1 | 38 | 9 | 24 | 0 | 0 |
| Seed 7, dt .1 | 37 | 9 | 24 | 0 | 0 |
| Seed 2026, dt .1 | 40 | 7 | 22 | 0 | 0 |
| Seed 42, dt .25 | 39 | 8 | 19 | 0 | 0 |
| Seed 42, dt 1/60 | 40 | 9 | 23 | 0 | 0 |

No nonfinite positions were found in those normal runs. Seven sleep entries and eight wake entries include the initial wake plus the final morning boundary. Seed42 dt.1 repeat event SHA-256 matches: `ca550780b6630c79e7441c173bdc6c4ea37366569cfdb47cd2760b5613a63189`. Browser seed42 repeats also match event arrays and outcomes. This establishes fixed-configuration repeatability, not timestep-independent determinism or save-resume equivalence.

All browser seeds reached hygiene 0 during the three-day interval; seed2026 ended with a small transient .14 from a newly started handwash. The five-minute cooking handwash adds seven hygiene points while awake decay removes around 30–35 points/day. There is no standalone hygiene action to choose. Mood still remains adequate because the deficit is diluted in the weighted average and positive completion moodlets.

Tea runs approximately five to six times per simulated day; meals often use leftovers, books/gazes fill time, and sleep happens numerically off-room. This is a narrow, repeatable routine, not four lives. Memories repeat generic wording and saturate the 40-entry buffer by around day 3. Darius affection saturates while children's relations remain unchanged. No aborts here does **not** establish robust interruption behavior: injected abort probes leave burners/kettle/path state unresolved.

Raw blocked-grid sample counts are logged but are **not physical-collision failure counts**: the pathfinder deliberately permits exact interaction goals inside inflated furniture margins. No swept-collision oracle is present. No multi-agent contention test can be run on nonexistent family agents.

## Feasible recovery architecture

1. **Separate clocks and random streams.** Fixed simulation ticks with render interpolation; deterministic action/AI RNG serialized separately from cosmetic/audio randomness. Use explicit replay logs and stable event IDs.
2. **Needs with reachable affordances.** Every modeled need must have a reachable recovery action and fallback. Add bathroom fixtures and privacy scheduling before enabling bladder/bathing needs. Add target bands and hysteresis so a need doesn't become an absolute zero indefinitely or trigger obsessive microtasks.
3. **Daily intentions, flexible execution.** Morning meal, school/work, homework, family dinner, winding down and sleep become soft schedule goals with tolerances; utility selects opportunities within them. Urgent needs and safety interrupt at valid action boundaries with compensation/settling.
4. **Reservations and cooperative tasks.** Reserve approach space, chair, fixture, prop and stair link. Two-phase acquire/confirm, lease expiry, wait/alternate/replan, deterministic tie-breaking and cancellation release. Shared dinner has participants, ready times, serving portions and join/leave phases.
5. **Original personalities.** Give each member preferences and small variation in routine, sociability, mess tolerance and hobbies. Tie choices to meaningful context; don't use uniform random noise as personality. Keep a small set of authored gesture/conversation variants per intention.
6. **Emotional feedback and relationships.** Distinguish event appraisal, short-lived emotion and longer-lived relationship values. A shared event changes the relevant pair, then triggers gestures/look/response. Trust and conflict need meaningful events and decay/repair, not visible unused counters.
7. **Memory that matters.** Store compact event facts (participants/object/place/emotion/repetition); consolidate daily milestones and retain salient birthdays, achievements and conflicts. Use preferences/recency weights to influence future choices and captions. Do not build an unbounded transcript or call a language model every simulation tick.
8. **Believable off-camera life.** Simulate actual locations/tasks at reduced frequency without rendering every detail. Materialize animation state consistently when camera moves; do not invent upstairs activities without rooms.

Useful first traditions: Sunday breakfast, bedtime reading with Laila, Elias homework help and Darius evening tea. Each reuses reservations, shared attention and a few strong animation clips. Add weather-triggered window looks or power loss only after task interruption is reliable. Contextual conversations can initially be authored template exchanges selected by participants/activity/memory; expensive generative dialogue is optional, not foundational.

## Future acceptance

Run 14-day fixed-seed suites for all four agents with no unmet critical need beyond a defined recovery window, no reservation leaks, no duplicate item ownership, no stuck door/stair state and save-resume event equivalence. Audit distributions as well as errors: task variety, time per activity, shared meals, social reciprocity and sleep regularity. Watch rendered representative days at normal speed and evaluate whether the family feels individual and warm. Numerical need stability is necessary but cannot approve character acting.
