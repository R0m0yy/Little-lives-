# ANIMATION MATRIX

All clips are procedural (code-driven poses on the shared skeleton) blended in `anim.js`, with two-bone hand IK for interactions. ✅ in game · 🟡 partial · ⬜ missing.

| Group | Clip | Status | Notes |
|---|---|---|---|
| Locomotion | idle + breathing | ✅ | |
| | walk, start/stop | ✅ | speed-driven blend, arrival deceleration |
| | turn in place | ✅ | heading-rate driven |
| | stairs up/down | ⬜ | needs stairs (Milestone 6) |
| Kitchen | reach / open fridge / take items | ✅ | hand IK |
| | chop, stir, serve, pour | ✅ | IK loops |
| | carry plate (two-hand) | ✅ | |
| | wash dishes, rinse | ✅ | |
| Seated | sit down / stand up (chair pull/tuck) | ✅ | |
| | eat, drink tea, read | ✅ | |
| Social | talk (phone), listen | 🟡 | phone only; face-to-face needs 2nd agent |
| | wave, hug, laugh, gesture, greet | ⬜ | |
| Sleep | approach bed, sit, lie, sleep, wake, get up | ⬜ | bedroom not built; doze-at-table exists ✅ |
| Bathroom | toilet, hand wash, brush teeth, bath | ⬜ | |
| Living | TV, games, typing, studying | ⬜ | |
| Face | blink, gaze/look-at, 9 expressions, talk, chew | ✅ | |

Quality rules enforced in code: no teleporting (all movement via nav paths), arrival alignment before `do` steps, sit only after chair pulled.
