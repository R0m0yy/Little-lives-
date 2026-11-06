// LL-038: after putting vegetables down, O.veg.at stayed 'hand' while hold.R cleared.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, naomi, runUntil, inPhase, startNow, checkInvariants, T } from './helpers.js';

test('LL-038: vegetables have one location through the whole cooking chain', () => {
  const sim = makeSim({ hour: 12 }); const a = naomi(sim); const veg = sim.O.items.veg;
  startNow(sim, 'cookMeal');
  runUntil(sim, inPhase('cookMeal', 'closeFridge'), 60 * T, 'closeFridge');
  assert.equal(veg.at, 'held'); assert.equal(sim.heldBy(a).R, 'veg');
  runUntil(sim, inPhase('cookMeal', 'takeKnife'), 60 * T, 'takeKnife');
  assert.equal(veg.at, 'board', 'veg is on the board after laying it out');
  assert.notEqual(sim.heldBy(a).R, 'veg');
  runUntil(sim, inPhase('cookMeal', 'knifeDown'), 60 * T, 'knifeDown');
  assert.equal(veg.state, 'chopped'); assert.equal(sim.heldBy(a).R, 'knife');
  runUntil(sim, inPhase('cookMeal', 'toStove'), 60 * T, 'toStove');
  assert.equal(sim.heldBy(a).both, 'veg');
  runUntil(sim, inPhase('cookMeal', 'light'), 60 * T, 'light');
  assert.equal(veg.at, 'fridge'); assert.deepEqual(sim.heldBy(a), { R: null, L: null, both: null });
});

test('LL-038: item/hand/resource invariants hold every tick for three days', () => {
  const sim = makeSim({ seed: 8 });
  for (let i = 0; i < 3 * 1440 * T; i++) { sim.tick(); checkInvariants(sim); }
});
