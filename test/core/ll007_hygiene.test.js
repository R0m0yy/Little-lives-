// LL-007: hygiene decayed with no utility-scored recovery; every seven-day audit run hit zero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, naomi, checkInvariants, T } from './helpers.js';

for (const seed of [1, 2, 3]) {
  test(`LL-007: seven-day soak (seed ${seed}) — hygiene never collapses and is recovered autonomously`, () => {
    const sim = makeSim({ seed, hour: 7.1, awake: false }); const a = naomi(sim);
    let minHyg = 100, fresh = 0, prev = null;
    const mins = { hunger: 100, energy: 100, fun: 100, social: 100 };
    for (let i = 0; i < 7 * 1440 * T; i++) {
      sim.tick();
      minHyg = Math.min(minHyg, a.needs.hygiene);
      for (const k in mins) mins[k] = Math.min(mins[k], a.needs[k]);
      const act = a.task?.action || null; if (act !== prev && act === 'freshenUp') fresh++; prev = act;
      if (i % 600 === 0) checkInvariants(sim);
    }
    assert.ok(fresh >= 5, `freshenUp chosen only ${fresh} times in a week`);
    assert.ok(minHyg > 15, `hygiene fell to ${minHyg.toFixed(1)}`);
    assert.ok(mins.hunger > 0 && mins.energy > 0, `needs collapsed ${JSON.stringify(mins)}`);
  });
}
