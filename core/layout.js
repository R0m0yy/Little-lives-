// Little Lives core — kitchen layout data the simulation needs (floor plan, interaction anchors, nav blockers).
// Values copied from src/kitchen.js / src/main.js / src/sim.js so the core behaves like the legacy build.
// Stage 1 (Three.js) should read these from authored scene data instead of hardcoding them twice.
import { NavGrid } from './nav.js';
const PI = Math.PI;

export const ROOM = { x0: -4, x1: 4, z0: -3, z1: 3 };
export const DOOR = { x: -4, z0: 0.35, z1: 1.65 };
export const TABLE = { x: 1.0, z: 1.0, r: 0.82 };
export const CHAIRS = [
  { id: 'chairB', x: TABLE.x + TABLE.r + 0.38, z: TABLE.z },
  { id: 'chairC', x: TABLE.x - TABLE.r - 0.38, z: TABLE.z },
];

/** Approach anchors: floor position [x,z] + facing heading. */
export const ANCHORS = {
  fridge: { p: [2.92, -1.55], h: PI }, prep: { p: [1.25, -1.66], h: PI }, plates: { p: [0.72, -1.66], h: PI },
  stove: { p: [-1.05, -1.66], h: PI }, kettle: { p: [-0.3, -1.66], h: PI }, sink: { p: [-2.75, -1.6], h: PI }, rack: { p: [-1.95, -1.66], h: PI },
  switch: { p: [-3.48, -0.25], h: -PI / 2 }, door: { p: [-3.42, 1.0], h: -PI / 2 }, hall: { p: [-5.55, 1.0], h: PI / 2 },
  phone: { p: [3.42, 1.55], h: PI / 2 }, window: { p: [-2.75, -1.55], h: PI }, lamp: { p: [2.0, -1.66], h: PI },
  shelf: { p: [3.05, -0.6], h: PI / 2 }, chairSide: { p: [0.36, -0.3], h: PI / 2 }, seatStand: { p: [1.0, -0.19], h: 0 },
};

/** Where an agent is placed while off-room (asleep upstairs). */
export const OFFROOM = { p: [-5.4, 1.0], h: PI / 2 };
export const SEAT_Z_IN = ANCHORS.seatStand.p[1] + 0.3;

export function buildKitchenNav() {
  const nav = new NavGrid({ x0: -6.2, x1: 4.0, z0: -3.0, z1: 3.0 }, 0.1, 0.42);
  nav.addStatic({ type: 'rect', x0: -4.0, x1: 3.9, z0: -3.0, z1: -2.24 });              // counters, range, fridge
  nav.addStatic({ type: 'circle', x: TABLE.x, z: TABLE.z, r: TABLE.r + 0.05 });          // table
  for (const c of CHAIRS) nav.addStatic({ type: 'rect', x0: c.x - 0.3, x1: c.x + 0.3, z0: c.z - 0.3, z1: c.z + 0.3 });
  nav.addStatic({ type: 'rect', x0: 3.5, x1: 4.0, z0: -1.1, z1: -0.1 });                 // bookshelf
  nav.setDynamic('chairA', { type: 'rect', x0: 0.72, x1: 1.28, z0: -0.48, z1: 0.08 });
  const R = ROOM, D = DOOR;
  nav.bake((x, z) => (x > R.x0 + 0.15 && x < R.x1 - 0.15 && z > R.z0 && z < R.z1 - 0.25) || (x <= R.x0 + 0.15 && x > -6.0 && z > D.z0 + 0.05 && z < D.z1 - 0.05));
  return nav;
}
