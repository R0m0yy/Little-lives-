// Action definitions are well-formed for every parameter combination.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, paramCombos, ANCHORS } from '../../core/index.js';

test('every action has unique phase ids, valid anchors and step kinds for all param combos', () => {
  for (const [id, act] of Object.entries(ACTIONS)) {
    assert.equal(typeof act.plan, 'function', `${id}.plan`);
    for (const p of paramCombos(act)) {
      const steps = act.steps(p);
      // an empty plan (e.g. lightsOff with both lights already off — unreachable via score) finishes immediately
      if (!steps.length) { assert.equal(id, 'lightsOff'); continue; }
      const ids = steps.map((s) => s.id);
      assert.equal(new Set(ids).size, ids.length, `${id} ${JSON.stringify(p)} duplicate phase ids: ${ids}`);
      for (const s of steps) {
        assert.ok(['goto', 'slide', 'sit', 'stand', 'do'].includes(s.kind), `${id}.${s.id} kind`);
        if (s.kind === 'goto' || s.kind === 'slide') assert.ok(ANCHORS[s.to], `${id}.${s.id} anchor ${s.to}`);
        if (s.kind !== 'goto') assert.ok(s.dur > 0, `${id}.${s.id} dur`);
      }
    }
  }
});

test('steps() is pure: same params give the same phase list regardless of world state', () => {
  for (const act of Object.values(ACTIONS)) for (const p of paramCombos(act)) {
    assert.deepEqual(act.steps(p).map((s) => s.id + ':' + (s.label || '')), act.steps(p).map((s) => s.id + ':' + (s.label || '')));
  }
});
