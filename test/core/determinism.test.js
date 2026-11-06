// Fixed-timestep core: deterministic for a seed, and frame-rate independent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FixedStepRunner } from '../../core/index.js';
import { makeSim, T } from './helpers.js';

test('same seed + same tick count => identical state', () => {
  const a = makeSim({ seed: 5 }), b = makeSim({ seed: 5 });
  a.run(8 * 60 * T); b.run(8 * 60 * T);
  assert.equal(a.serialize(), b.serialize());
});

test('different seeds diverge', () => {
  const a = makeSim({ seed: 5 }), b = makeSim({ seed: 6 });
  a.run(8 * 60 * T); b.run(8 * 60 * T);
  assert.notEqual(a.serialize(), b.serialize());
});

test('runner: 60 fps and 24 fps frames for the same real time produce identical state', () => {
  const a = makeSim({ seed: 9 }), b = makeSim({ seed: 9 });
  a.speed = b.speed = 3;
  const ra = new FixedStepRunner(a), rb = new FixedStepRunner(b);
  let na = 0, nb = 0;
  for (let i = 0; i < 60 * 120; i++) na += ra.advance(1 / 60);   // 120 real seconds
  for (let i = 0; i < 24 * 120; i++) nb += rb.advance(1 / 24);
  // floating-point accumulation can leave one tick in the accumulator; top up to the same tick count
  while (na < nb) { a.tick(); na++; } while (nb < na) { b.tick(); nb++; }
  assert.ok(Math.abs(na - 120 * 3 * T) <= 1, `ticks ${na}`);
  assert.equal(a.serialize(), b.serialize());
});

test('runner: paused does nothing; a long stall is capped instead of spiralling', () => {
  const s = makeSim(); const r = new FixedStepRunner(s, { maxTicksPerAdvance: 100 });
  r.paused = true; assert.equal(r.advance(10), 0);
  r.paused = false; assert.equal(r.advance(1000), 100);
});
