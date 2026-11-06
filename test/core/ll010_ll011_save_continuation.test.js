// LL-010: save dropped elapsed step time / RNG / slide state, so loads restarted the step.
// LL-011: load rebuilt the plan from the changed world, shifting step indices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, naomi, runUntil, inPhase, startNow, cloneSim, T } from './helpers.js';

function assertExactContinuation(sim, ticksAfter = 40 * T) {
  const b = cloneSim(sim);
  assert.equal(b.serialize(), sim.serialize(), 'state identical right after load');
  sim.run(ticksAfter); b.run(ticksAfter);
  assert.equal(b.serialize(), sim.serialize(), 'state identical after continuing');
}

test('LL-010: mid-chop save resumes at the same elapsed time (legacy probe stepT 4.2 -> 0)', () => {
  const sim = makeSim({ hour: 12 }); startNow(sim, 'cookMeal');
  runUntil(sim, inPhase('cookMeal', 'chop', Math.round(4.2 * T)), 60 * T, 'chop 4.2 min');
  const b = cloneSim(sim);
  assert.equal(naomi(b).task.phaseId, 'chop');
  assert.equal(naomi(b).task.ticks, Math.round(4.2 * T));
  assertExactContinuation(sim);
});

for (const [name, action, phase, hour] of [
  ['mid-walk', 'cookMeal', 'toFridge', 12], ['mid-slide into chair', 'readBook', 'sit.slide', 15],
  ['mid-sit', 'makeTea', 'sit.sit', 15], ['mid-stand', 'doze', 'stand.stand', 14], ['mid-pour (two items held)', 'makeTea', 'pour', 15],
  ['mid-simmer with burner claimed', 'cookMeal', 'simmer', 12], ['walking to bed with door claimed', 'goToBed', 'toHall', 22.5],
]) {
  test(`LL-010: exact continuation after saving ${name}`, () => {
    const sim = makeSim({ hour }); startNow(sim, action);
    runUntil(sim, inPhase(action, phase, 3), 120 * T, phase);
    assertExactContinuation(sim);
  });
}

test('LL-010: RNG state is saved — post-load decisions match', () => {
  const sim = makeSim({ seed: 77 }); sim.run(3 * 60 * T);
  const b = cloneSim(sim, 1);
  sim.run(10 * 60 * T); b.run(10 * 60 * T);
  assert.deepEqual(naomi(b).history, naomi(sim).history);
  assert.equal(b.serialize(), sim.serialize());
});

test('LL-011: bedtime save after the lamp went off keeps the same phase', () => {
  const sim = makeSim({ hour: 22.5 }); sim.O.lamp.on = true; sim.O.chandelier.on = true;
  startNow(sim, 'goToBed');
  runUntil(sim, inPhase('goToBed', 'lightsOff', 2), 30 * T, 'lightsOff');
  assert.equal(sim.O.lamp.on, false);
  const b = cloneSim(sim); const a = naomi(b);
  assert.equal(a.task.phaseId, 'lightsOff');
  assert.equal(a.step.label, 'Turning off the lights');   // legacy load turned this into "Opening the door"
  assert.equal(a._steps.length, naomi(sim)._steps.length);
  assertExactContinuation(sim);
});

test('LL-011: porridge started before the 10:30 cutoff is still porridge after loading at 10:45', () => {
  const sim = makeSim({ hour: 10.2 }); startNow(sim, 'cookMeal');
  runUntil(sim, (s, a) => s.clock.hour > 10.75 && a.task?.phaseId === 'simmer', 120 * T, 'simmer after cutoff');
  const a = naomi(cloneSim(sim));
  assert.equal(a.task.params.kind, 'porridge');
  assert.equal(a.step.label, 'Stirring porridge');
});

test('LL-010/011: fuzz — save at 25 random points over two days, every load continues exactly', () => {
  const sim = makeSim({ seed: 2024 });
  for (let i = 0; i < 25; i++) {
    sim.run(50 * T + i * 37); // irregular offsets land saves in many different phases
    const b = cloneSim(sim);
    const n = 15 * T; sim.run(n); b.run(n);
    assert.equal(b.serialize(), sim.serialize(), `diverged after save #${i} at ${sim.clock.label()}`);
  }
});
