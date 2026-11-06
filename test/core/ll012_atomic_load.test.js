// LL-012: load mutated the clock before throwing on bad agents, and a partial fridge record produced NaN.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveError } from '../../core/index.js';
import { makeSim, naomi, startNow, runUntil, inPhase, T } from './helpers.js';

const base = () => { const s = makeSim({ hour: 12 }); s.run(30 * T); return s; };

test('LL-012: invalid agents leave the sim completely untouched (clock included)', () => {
  const sim = base(); const before = sim.serialize();
  const bad = JSON.parse(before); bad.clock.tickOfDay = 100; bad.agents = 'not a list';
  assert.throws(() => sim.load(JSON.stringify(bad)), SaveError);
  assert.equal(sim.serialize(), before);
});

test('LL-012: an error deep in the last agent still leaves the sim untouched', () => {
  const sim = base(); const before = sim.serialize();
  const bad = JSON.parse(before); bad.clock.day = 3; bad.O.lamp.on = true; bad.agents[0].memories = [{ t: 'x', day: 0, text: 42 }];
  assert.throws(() => sim.load(bad), /memories\[0\]\.text/);
  assert.equal(sim.serialize(), before);
});

test('LL-012: partial fridge record gets deep defaults, never NaN', () => {
  const sim = base(); const d = JSON.parse(sim.serialize()); d.O.fridge = {}; delete d.O.stove;
  sim.load(d);
  assert.deepEqual(sim.O.fridge, { open: 0, target: 0 });
  assert.equal(sim.O.stove.b0, 'off');
  sim.run(10 * T);
  assert.ok(Number.isFinite(sim.O.fridge.open));
});

for (const [what, mutate, re] of [
  ['non-numeric fridge.open', (d) => { d.O.fridge.open = 'abc'; }, /fridge\.open/],
  ['null need (JSON-encoded NaN)', (d) => { d.agents[0].needs.hunger = null; }, /needs\.hunger/],
  ['need out of range', (d) => { d.agents[0].needs.fun = 1e6; }, /needs\.fun/],
  ['unknown family member', (d) => { d.agents[0].id = 'mallory'; }, /unknown family member/],
  ['unknown action', (d) => { d.agents[0].task = { action: 'rm -rf', params: {}, phaseId: 'x', ticks: 0 }; }, /task\.action/],
  ['phase not in plan', (d) => { d.agents[0].task = { action: 'makeTea', params: {}, phaseId: 'nope', ticks: 0, slide: null }; }, /phaseId/],
  ['bad action params', (d) => { d.agents[0].task = { action: 'callFamily', params: { who: 'stranger' }, phaseId: 'talk', ticks: 0, slide: null }; }, /params\.who/],
  ['item held by nobody', (d) => { d.O.items.knife = { at: 'held', by: null, hand: null }; }, /items\.knife/],
  ['two items in one hand', (d) => { Object.assign(d.O.items.knife, { at: 'held', by: 'naomi', hand: 'R' }); Object.assign(d.O.items.cup, { at: 'held', by: 'naomi', hand: 'R' }); }, /hand R/],
  ['resource claimed by stranger', (d) => { d.O.res.burner0 = 'mallory'; }, /res\.burner0/],
  ['unsupported version', (d) => { d.v = 99; }, /version/],
  ['clock tick out of range', (d) => { d.clock.tickOfDay = -5; }, /tickOfDay/],
]) {
  test(`LL-012: rejects ${what}`, () => {
    const sim = base(); const before = sim.serialize(); const d = JSON.parse(before); mutate(d);
    assert.throws(() => sim.load(JSON.stringify(d)), (e) => e instanceof SaveError && re.test(e.message));
    assert.equal(sim.serialize(), before);
  });
}

test('LL-012: garbage input is a SaveError, not a crash', () => {
  const sim = base();
  for (const g of ['', '{', 'null', '[]', '"x"', '{"v":2}']) assert.throws(() => sim.load(g), SaveError, g);
});

test('legacy v1 save migrates durable facts and drops the in-progress action', () => {
  const sim = base();
  const v1 = { v: 1, clock: { min: 19 * 60 + 30, day: 2 }, speed: 3, O: { lamp: { on: true }, pot: { food: 'cooked', portions: 2, kind: 'stew', cookedAt: 2 * 1440 + 18 * 60 }, fridge: {} },
    agents: [{ id: 'naomi', pos: [1, 0, 0.5], heading: 0.3, needs: { hunger: 40, energy: 50, hygiene: 60, fun: 70, social: 80 }, rel: { darius: { label: '<b>x</b>', affection: 90, trust: 85, friendship: 74, conflict: 8 } },
      memories: [{ t: 'Monday 9:00 AM', day: 0, text: 'Old memory', tags: [] }], moodlets: [], cooldowns: { makeTea: 100 }, history: ['makeTea'], away: false, sleeping: false, hold: { R: 'knife' }, action: 'cookMeal', stepIdx: 5 }] };
  sim.load(JSON.stringify(v1));
  const a = naomi(sim);
  assert.equal(sim.clock.day, 2); assert.equal(sim.clock.min, 19 * 60 + 30);
  assert.deepEqual(a.pos, [1, 0.5]); assert.equal(a.needs.hunger, 40); assert.equal(a.rel.darius.affection, 90);
  assert.equal(a.rel.darius.label, 'Husband', 'label comes from the definition, not the save');
  assert.equal(a.task, null); assert.equal(sim.O.items.knife.at, 'board'); assert.equal(sim.O.pot.portions, 2); assert.equal(sim.O.lamp.on, true);
  sim.run(60 * T);
});

test('LL-012: valid save mid-task round-trips', () => {
  const sim = makeSim({ hour: 15 }); startNow(sim, 'makeTea');
  runUntil(sim, inPhase('makeTea', 'sip', 5), 60 * T, 'sip');
  const s = sim.serialize(); const b = makeSim({ hour: 3, awake: false }); b.load(s);
  assert.equal(b.serialize(), s);
});
