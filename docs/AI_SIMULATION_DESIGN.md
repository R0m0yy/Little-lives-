# AI & SIMULATION DESIGN

## Agent model (per character)
- **Needs** 0–100, decaying per sim-minute: hunger, energy, hygiene, fun, social.
- **Personality** multipliers: neat, social, foodie, cozy, playful — scale action scores, so two characters with equal needs choose differently.
- **Preferences**: e.g. tea, reading, preferred wake hour.
- **Relationships** to each family member: affection, trust, friendship, conflict + label.
- **Memories**: `remember(text, weight, ttlMinutes, tags)` — feed mood and future choices (e.g. a lovely meal raises mood for 6 h).
- **Mood** derived from needs + recent memories.

## Decision making: utility AI with authored step plans
Each action `A.<name>` has `score(sim, agent)` and `steps()`. Every decision tick the highest-scoring action (with noise and cooldowns, so routines don't repeat identically) is chosen. Steps are either `goto` (A* path to an approach point) or `do` (timed, with hand IK targets, look target, lean, expression and per-tick state changes). Abort at any step runs recovery (close fridge, turn off tap, return held items).

Implemented actions: cookMeal, serveAndEat, doDishes, makeTea, readBook, callFamily, tidyKitchen, windowGaze, lightsOn, lampOn, lightsOff, doze, goToBed, wakeUp.

## Clock
1 real second = 1 sim minute at 1×; 3× and 10× speeds; weekdays/weekends; daylight curve drives lighting and dark-room behaviour.

## Save/load
`sim.serialize()` → JSON v1 in localStorage: clock, all object states, agents (position, heading, needs, mood inputs, memories, relationships, current action + step). Loading restarts the saved step from its beginning so animation and state agree.

## Next
Multi-agent: reservation/occupancy on every interactable, social actions (talk, hug, homework help, family dinner as a joint plan), relationship deltas from shared events, age-appropriate routines (school/work blocks for weekdays).
