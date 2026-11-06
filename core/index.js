// Little Lives core — public entry point (renderer-independent simulation).
export { Sim, Agent } from './sim.js';
export { FixedStepRunner } from './runner.js';
export { Clock, TICKS_PER_MIN, TICK_MIN, TICKS_PER_DAY, minToTicks } from './clock.js';
export { Rng } from './rng.js';
export { ACTIONS, paramCombos } from './actions.js';
export { ANCHORS, ROOM, DOOR, TABLE, buildKitchenNav } from './layout.js';
export { ITEMS, freshObjects, checkHands } from './objects.js';
export { RESOURCES } from './resources.js';
export { parseSave, SaveError, SAVE_VERSION } from './save.js';
export { NAOMI } from './family.js';
