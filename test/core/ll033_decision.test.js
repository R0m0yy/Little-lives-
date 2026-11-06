// LL-033: `lastScores` was assigned then immediately erased by start(), so "Next on her mind" was always empty.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, naomi, cloneSim, T } from './helpers.js';

test('LL-033: the decision explanation survives start() and the whole task', () => {
  const sim = makeSim({ hour: 12 }); const a = naomi(sim);
  sim.tick();
  assert.ok(a.task, 'chose something');
  const d = a.lastDecision;
  assert.ok(d && d.scores.length > 0, 'scores kept');
  assert.equal(d.chosen, a.task.action);
  assert.ok(d.scores.some(([, id]) => id === d.chosen) || d.forced);
  for (let i = 0; i < 5 * T && a.task; i++) sim.tick();
  assert.equal(a.lastDecision, d);
  assert.deepEqual(naomi(cloneSim(sim)).lastDecision, d, 'survives save/load');
});
