import { Sim, NAOMI, ACTIONS, ITEMS, checkHands, TICKS_PER_MIN } from '../../core/index.js';
import assert from 'node:assert/strict';

export const T = TICKS_PER_MIN;
export function makeSim({ seed = 42, hour = 7, awake = true, agents = [NAOMI] } = {}) {
  const sim = new Sim({ seed, agents });
  sim.clock.setHour(hour);
  if (awake) for (const a of sim.agents) { a.away = false; a.sleeping = false; a.pos = [0, 0.5]; a.activity = 'Pottering about'; }
  return sim;
}
export const naomi = (sim) => sim.agents[0];
/** Tick until pred(sim, agent) is true; returns ticks used. Fails the test if it never happens. */
export function runUntil(sim, pred, maxTicks = 600 * T, what = 'condition') {
  for (let i = 0; i < maxTicks; i++) { if (pred(sim, naomi(sim))) return i; sim.tick(); }
  assert.fail(`timed out waiting for ${what} (at ${sim.clock.label()}, task=${JSON.stringify(naomi(sim).task)})`);
}
export const inPhase = (action, phaseId, minTicks = 0) => (s, a) => a.task && a.task.action === action && a.task.phaseId === phaseId && a.task.ticks >= minTicks;
/** Force an action to start right now. */
export function startNow(sim, id, a = naomi(sim)) { if (a.task) sim.abort(a, 'test'); sim.start(a, id); }
export function cloneSim(sim, seed = 999) { const b = new Sim({ seed, agents: sim.agents.map(() => NAOMI) }); b.load(sim.serialize()); return b; }

/** Invariants that must hold after every tick. */
export function checkInvariants(sim) {
  const O = sim.O;
  checkHands(O.items);
  for (const [id, it] of Object.entries(O.items)) {
    assert.ok(ITEMS[id].at.includes(it.at), `${id} at illegal location ${it.at}`);
    if (it.at === 'held') assert.ok(sim.agent(it.by), `${id} held by unknown ${it.by}`);
  }
  for (const [r, owner] of Object.entries(O.res)) if (owner) assert.ok(sim.agent(owner)?.task, `${r} claimed by ${owner} with no task`);
  // anything switched on must be owned by someone doing a task (LL-013)
  if (O.stove.b0 !== 'off') assert.ok(O.res.burner0, 'burner 0 on without an owner');
  if (O.stove.b3 !== 'off') assert.ok(O.res.burner3, 'burner 3 on without an owner');
  if (O.faucet.on) assert.ok(O.res.faucet, 'tap running without an owner');
  if (O.fridge.target > 0) assert.ok(O.res.fridge, 'fridge open without an owner');
  if (O.door.target > 0) assert.ok(O.res.door, 'door open without an owner');
  for (const a of sim.agents) {
    for (const [k, v] of Object.entries(a.needs)) assert.ok(Number.isFinite(v) && v >= 0 && v <= 100, `need ${k}=${v}`);
    assert.ok(a.pos.every(Number.isFinite) && Number.isFinite(a.heading), 'non-finite pose');
    if (!a.task) { assert.equal(a.path, null, 'path without task'); assert.deepEqual(sim.claimsOf(a), [], 'claims without task'); }
  }
}
export { ACTIONS, NAOMI };
