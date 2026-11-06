// LL-008: start callbacks on non-'do' steps were silently ignored. LL-009: phone call credited Darius.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, naomi, runUntil, startNow, ACTIONS, T } from './helpers.js';

test('LL-008: start and end callbacks run exactly once for every step kind', () => {
  const sim = makeSim(); const a = naomi(sim);
  const calls = [];
  const cb = (k) => ({ start: () => calls.push(`start:${k}`), end: () => calls.push(`end:${k}`) });
  ACTIONS.__probe = {
    label: 'probe', params: {}, score: () => 0, plan: () => ({}),
    steps: () => [
      { id: 'g', kind: 'goto', to: 'chairSide', ...cb('goto') },
      { id: 'pull', kind: 'do', label: 'pull', dur: 0.5, start: (s, ag) => s.claim(ag, 'chairA') },
      { id: 'sl', kind: 'slide', to: 'seatStand', dur: 1, ...cb('slide') },
      { id: 'si', kind: 'sit', dur: 1, ...cb('sit') },
      { id: 'st', kind: 'stand', dur: 1, ...cb('stand') },
      { id: 'd', kind: 'do', label: 'do', dur: 1, ...cb('do'), end: (s, ag) => { calls.push('end:do'); s.release(ag, 'chairA'); } },
    ],
  };
  try {
    startNow(sim, '__probe');
    runUntil(sim, (s, x) => !x.task, 60 * T, 'probe to finish');
    assert.deepEqual(calls, ['start:goto', 'end:goto', 'start:slide', 'end:slide', 'start:sit', 'end:sit', 'start:stand', 'end:stand', 'start:do', 'end:do']);
  } finally { delete ACTIONS.__probe; }
});

test('LL-008: cookMeal goto-start sets the recipe on the pot', () => {
  const sim = makeSim({ hour: 8 }); sim.O.pot.kind = 'stew';
  startNow(sim, 'cookMeal');
  runUntil(sim, (s, a) => a.task?.phaseId === 'openFridge', 30 * T, 'fridge');
  assert.equal(sim.O.pot.kind, 'porridge');
});

for (const [rngValue, who, other] of [[0.9, 'elias', 'darius'], [0.1, 'darius', 'elias']]) {
  test(`LL-009: evening call to ${who} credits ${who}, not ${other}`, () => {
    const sim = makeSim({ hour: 19 }); const a = naomi(sim);
    const before = { ...a.rel[who] }, otherBefore = { ...a.rel[other] };
    const real = sim.rng.next.bind(sim.rng); sim.rng.next = () => rngValue;
    startNow(sim, 'callFamily');
    sim.rng.next = real;
    assert.equal(a.task.params.who, who);
    runUntil(sim, (s, x) => x.task?.phaseId === 'talk', 30 * T, 'talk');
    assert.equal(a.activity, who === 'elias' ? 'Checking in on Elias' : 'Calling Darius at work');
    runUntil(sim, (s, x) => !x.task, 60 * T, 'call to finish');
    assert.equal(a.rel[who].affection, Math.min(100, before.affection + 3));
    assert.equal(a.rel[who].friendship, Math.min(100, before.friendship + 2));
    assert.deepEqual(a.rel[other], otherBefore);
    assert.ok(a.memories[0].tags.includes(who));
  });
}

test('LL-009: weekday working-hours call goes to Darius', () => {
  const sim = makeSim({ hour: 11 }); // Monday
  startNow(sim, 'callFamily');
  assert.equal(naomi(sim).task.params.who, 'darius');
});
