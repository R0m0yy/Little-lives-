// LL-013: abort left burners on, the kettle in hand and the path active; resets were global, not per agent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, naomi, runUntil, inPhase, startNow, checkInvariants, T } from './helpers.js';

function abortAt(action, phase, hour, minTicks = 3) {
  const sim = makeSim({ hour }); startNow(sim, action);
  runUntil(sim, inPhase(action, phase, minTicks), 120 * T, `${action}.${phase}`);
  const a = naomi(sim); const snapshot = { held: sim.heldBy(a), claims: sim.claimsOf(a) };
  sim.abort(a, 'test');
  return { sim, a, snapshot };
}
function assertClean(sim, a) {
  assert.equal(a.task, null);
  assert.deepEqual(sim.heldBy(a), { R: null, L: null, both: null });
  assert.deepEqual(sim.claimsOf(a), []);
  assert.equal(a.path, null); assert.equal(a.moveDone, true); assert.equal(a.seated, false);
  assert.equal(sim.O.stove.b0, 'off'); assert.equal(sim.O.stove.b3, 'off'); assert.equal(sim.O.faucet.on, false);
  assert.equal(sim.O.fridge.target, 0); assert.equal(sim.O.door.target, 0); assert.equal(sim.O.chairA.occupied, null);
  checkInvariants(sim);
}

test('LL-013: abort while simmering turns the burner off and rests the spoon', () => {
  const { sim, a, snapshot } = abortAt('cookMeal', 'simmer', 12);
  assert.deepEqual(snapshot.claims, ['burner0']); assert.equal(snapshot.held.R, 'spoon');
  assertClean(sim, a); assert.equal(sim.O.items.spoon.at, 'rest');
});

test('LL-013: abort while pouring puts the kettle back on the stove and the cup away', () => {
  const { sim, a, snapshot } = abortAt('makeTea', 'pour', 15);
  assert.equal(snapshot.held.L, 'kettle'); assert.equal(snapshot.held.R, 'cup');
  assertClean(sim, a); assert.equal(sim.O.items.kettle.at, 'stove'); assert.equal(sim.O.items.cup.at, 'counter');
});

test('LL-013: abort while the kettle is heating turns burner 3 off', () => {
  const { sim, a, snapshot } = abortAt('makeTea', 'wait', 15);
  assert.deepEqual(snapshot.claims, ['burner3']); assertClean(sim, a);
});

test('LL-013: abort mid-walk clears the path and stops', () => {
  const { sim, a } = abortAt('cookMeal', 'toFridge', 12);
  assertClean(sim, a); const p = a.pos.slice(); sim.run(10); assert.ok(Math.hypot(a.pos[0] - p[0], a.pos[1] - p[1]) < 1e-9 || a.task, 'did not keep walking the old path');
});

test('LL-013: abort while washing turns the tap off', () => {
  const { sim, a, snapshot } = abortAt('cookMeal', 'wash.scrub', 12);
  assert.deepEqual(snapshot.claims, ['faucet']); assertClean(sim, a);
});

test('LL-013: abort while seated releases the chair', () => {
  const { sim, a, snapshot } = abortAt('readBook', 'read', 15);
  assert.deepEqual(snapshot.claims, ['chairA']); assert.equal(snapshot.held.both, 'book');
  assertClean(sim, a); assert.equal(sim.O.chairA.target, -0.2); assert.equal(sim.O.items.book.at, 'shelf'); assert.equal(sim.O.items.book.open, false);
});

test('LL-013: abort walking to bed closes the door', () => {
  const { sim, a, snapshot } = abortAt('goToBed', 'toHall', 22.5);
  assert.deepEqual(snapshot.claims, ['door']); assertClean(sim, a);
});

test('LL-013: abort carrying a dirty plate to the sink returns plate and spoon', () => {
  const { sim, a } = abortAt('doDishes', 'toSink', 12, 1);
  assertClean(sim, a); assert.equal(sim.O.items.plate.at, 'rack'); assert.equal(sim.O.items.spoon.at, 'rest');
});

test('LL-013: a resource owned by another agent aborts the task instead of stealing it', () => {
  const sim = makeSim({ hour: 12 }); const a = naomi(sim);
  sim.O.res.burner0 = 'darius';
  startNow(sim, 'cookMeal');
  runUntil(sim, (s, x) => !x.task, 120 * T, 'abort on busy burner');
  assert.equal(sim.O.res.burner0, 'darius', 'claim untouched');
  assert.match(sim.log.find((l) => l.includes('gave up')), /burner0 in use by darius/);
  assert.deepEqual(sim.heldBy(a), { R: null, L: null, both: null });
});

test('LL-013: fuzz — random aborts over two days always leave the household clean', () => {
  const sim = makeSim({ seed: 31337 }); const a = naomi(sim); let aborts = 0;
  for (let i = 0; i < 2 * 1440 * T; i++) {
    sim.tick();
    if (i % 7 === 0) checkInvariants(sim);
    if (a.task && i % 97 === 0 && sim.rng.next() < 0.15) { sim.abort(a, 'fuzz'); aborts++; assertClean(sim, a); }
  }
  assert.ok(aborts > 20, `only ${aborts} aborts exercised`);
});
