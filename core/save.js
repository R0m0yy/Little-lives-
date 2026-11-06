// Little Lives core — save schema: parse, migrate, validate (LL-010 / LL-011 / LL-012 / LL-030).
//
// parseSave() never touches the live sim. It returns a fully-normalised state object or throws SaveError
// naming the offending path. Sim.load() commits only after this succeeds, so a bad save can't half-apply.
// Missing fields get deep defaults; present fields must have the right type and range (no NaN/Infinity).
// Strings are length-capped plain text. The core never builds HTML; UIs must render text with textContent.
import { ACTIONS, paramCombos } from './actions.js';
import { freshObjects, ITEMS, HANDS, checkHands } from './objects.js';
import { RESOURCES } from './resources.js';
import { TICKS_PER_DAY, TICKS_PER_MIN } from './clock.js';

export const SAVE_VERSION = 2;
export const MAX_SAVE_BYTES = 512 * 1024;

export class SaveError extends Error { constructor(path, msg) { super(`${path}: ${msg}`); this.path = path; } }
const fail = (p, m) => { throw new SaveError(p, m); };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const V = {
  num(v, p, min = -1e9, max = 1e9) { if (typeof v !== 'number' || !Number.isFinite(v)) fail(p, 'expected a finite number'); if (v < min || v > max) fail(p, `out of range [${min}, ${max}]`); return v; },
  int(v, p, min, max) { V.num(v, p, min, max); if (!Number.isInteger(v)) fail(p, 'expected an integer'); return v; },
  bool(v, p) { if (typeof v !== 'boolean') fail(p, 'expected true/false'); return v; },
  str(v, p, max = 200) {
    if (typeof v !== 'string') fail(p, 'expected text');
    if (v.length > max) fail(p, `text longer than ${max}`);
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) fail(p, 'control characters not allowed');
    return v;
  },
  oneOf(v, p, list) { if (!list.includes(v)) fail(p, `expected one of ${list.join(', ')}`); return v; },
  obj(v, p) { if (!isObj(v)) fail(p, 'expected an object'); return v; },
  arr(v, p, max) { if (!Array.isArray(v)) fail(p, 'expected a list'); if (v.length > max) fail(p, `more than ${max} entries`); return v; },
  vec2(v, p, lim = 50) { V.arr(v, p, 2); if (v.length !== 2) fail(p, 'expected [x, z]'); return [V.num(v[0], p + '[0]', -lim, lim), V.num(v[1], p + '[1]', -lim, lim)]; },
  nullOr(v, p, fn) { return v === null ? null : fn(v, p); },
};

/** Validate object `src` against `def` (a fresh default object): known keys only, same primitive types, deep. */
function mergeShape(def, src, p, rules = {}) {
  if (src === undefined) return def;
  V.obj(src, p);
  const out = {};
  for (const [k, dv] of Object.entries(def)) {
    const kp = `${p}.${k}`;
    if (!has(src, k)) { out[k] = dv; continue; }
    const v = src[k];
    if (rules[k]) out[k] = rules[k](v, kp);
    else if (typeof dv === 'number') out[k] = V.num(v, kp);
    else if (typeof dv === 'boolean') out[k] = V.bool(v, kp);
    else if (typeof dv === 'string') out[k] = V.str(v, kp, 40);
    else if (dv === null) fail(kp, 'no rule for nullable field');
    else out[k] = mergeShape(dv, v, kp);
  }
  return out;
}

function validateObjects(src, p, agentIds) {
  const def = freshObjects();
  const agentOrNull = (v, kp) => V.nullOr(v, kp, (x) => V.oneOf(x, kp, agentIds));
  const unit = (v, kp) => V.num(v, kp, 0, 1);
  const O = mergeShape(def, src, p, {
    items: (v, kp) => {
      V.obj(v, kp); const out = {};
      for (const [id, spec] of Object.entries(ITEMS)) {
        const ip = `${kp}.${id}`, d = def.items[id];
        const it = mergeShape(d, v[id], ip, {
          at: (x, q) => V.oneOf(x, q, spec.at),
          by: agentOrNull, hand: (x, q) => V.nullOr(x, q, (y) => V.oneOf(y, q, HANDS)),
          state: (x, q) => V.oneOf(x, q, ['whole', 'chopped']), kind: (x, q) => V.oneOf(x, q, ['stew', 'porridge']),
          food: unit, tea: unit, heat: unit,
        });
        if ((it.at === 'held') !== (it.by !== null && it.hand !== null)) fail(ip, 'holder must be set exactly when the item is held');
        out[id] = it;
      }
      try { checkHands(out); } catch (e) { fail(kp, e.message); }
      return out;
    },
    res: (v, kp) => { V.obj(v, kp); const out = {}; for (const r of Object.keys(RESOURCES)) out[r] = has(v, r) ? agentOrNull(v[r], `${kp}.${r}`) : null; return out; },
    fridge: (v, kp) => mergeShape(def.fridge, v, kp, { open: unit, target: unit }),
    door: (v, kp) => mergeShape(def.door, v, kp, { open: unit, target: unit }),
    stove: (v, kp) => mergeShape(def.stove, v, kp, { b0: (x, q) => V.oneOf(x, q, ['off', 'heating', 'cooking']), b3: (x, q) => V.oneOf(x, q, ['off', 'heating', 'cooking']), heat0: unit, heat3: unit }),
    pot: (v, kp) => mergeShape(def.pot, v, kp, { food: (x, q) => V.oneOf(x, q, ['empty', 'raw', 'cooking', 'cooked']), kind: (x, q) => V.oneOf(x, q, ['stew', 'porridge']), progress: unit, temp: unit, portions: (x, q) => V.int(x, q, 0, 8), cookedAt: (x, q) => V.num(x, q, -1, 1e9) }),
    chairA: (v, kp) => mergeShape(def.chairA, v, kp, { z: (x, q) => V.num(x, q, -1, 0.5), target: (x, q) => V.num(x, q, -1, 0.5), occupied: agentOrNull }),
    kitchen: (v, kp) => mergeShape(def.kitchen, v, kp, { dirt: unit }),
  });
  return O;
}

function validateTask(v, p) {
  if (v === null || v === undefined) return null;
  V.obj(v, p);
  const action = V.oneOf(v.action, `${p}.action`, Object.keys(ACTIONS));
  const act = ACTIONS[action];
  V.obj(v.params, `${p}.params`);
  const params = {};
  for (const [k, spec] of Object.entries(act.params)) {
    const kp = `${p}.params.${k}`;
    if (!has(v.params, k)) fail(kp, 'missing');
    params[k] = spec === 'bool' ? V.bool(v.params[k], kp) : V.oneOf(v.params[k], kp, spec);
  }
  for (const k of Object.keys(v.params)) if (!has(act.params, k)) fail(`${p}.params.${k}`, 'unknown parameter');
  // LL-011: the phase id must exist in the plan rebuilt from the SAVED params (not from the current world).
  const phaseId = V.str(v.phaseId, `${p}.phaseId`, 60);
  const steps = act.steps(params);
  const step = steps.find((s) => s.id === phaseId);
  if (!step) fail(`${p}.phaseId`, `no phase "${phaseId}" in ${action}`);
  const ticks = V.int(v.ticks, `${p}.ticks`, 0, 90 * TICKS_PER_MIN + 1);
  let slide = null;
  if (step.kind === 'slide') {
    const sp = `${p}.slide`; V.obj(v.slide, sp);
    slide = { from: V.vec2(v.slide.from, sp + '.from'), to: V.vec2(v.slide.to, sp + '.to'), h0: V.num(v.slide.h0, sp + '.h0', -100, 100), h1: V.num(v.slide.h1, sp + '.h1', -100, 100), t: V.num(v.slide.t, sp + '.t', 0, 1) };
  } else if (v.slide != null) fail(`${p}.slide`, 'only valid during a slide phase');
  return { action, params, phaseId, ticks, slide, _stepKind: step.kind };
}

function validateAgent(src, p, a, agentIds) {
  V.obj(src, p);
  const actionIds = Object.keys(ACTIONS);
  const needs = {};
  for (const k of Object.keys(a.needs)) needs[k] = has(src.needs || {}, k) ? V.num(src.needs[k], `${p}.needs.${k}`, 0, 100) : a.needs[k];
  if (src.needs !== undefined) V.obj(src.needs, `${p}.needs`);
  const rel = {};
  if (src.rel !== undefined) V.obj(src.rel, `${p}.rel`);
  for (const [k, r] of Object.entries(a.rel)) {
    const s = (src.rel || {})[k], rp = `${p}.rel.${k}`;
    if (s === undefined) { rel[k] = { ...r }; continue; }
    V.obj(s, rp);
    rel[k] = { label: r.label }; // labels come from the family definition, never from the save
    for (const f of ['affection', 'trust', 'friendship', 'conflict']) rel[k][f] = has(s, f) ? V.num(s[f], `${rp}.${f}`, 0, 100) : r[f];
  }
  const memories = (src.memories === undefined ? [] : V.arr(src.memories, `${p}.memories`, 40)).map((m, i) => {
    const mp = `${p}.memories[${i}]`; V.obj(m, mp);
    return { t: V.str(m.t, mp + '.t', 40), day: V.int(m.day, mp + '.day', 0, 1e6), text: V.str(m.text, mp + '.text', 160),
      tags: (m.tags === undefined ? [] : V.arr(m.tags, mp + '.tags', 8)).map((t, j) => V.str(t, `${mp}.tags[${j}]`, 24)) };
  });
  const moodlets = (src.moodlets === undefined ? [] : V.arr(src.moodlets, `${p}.moodlets`, 40)).map((m, i) => {
    const mp = `${p}.moodlets[${i}]`; V.obj(m, mp);
    return { text: V.str(m.text, mp + '.text', 160), v: V.num(m.v, mp + '.v', -50, 50), until: V.num(m.until, mp + '.until', 0, 1e9) };
  });
  const cooldowns = {};
  if (src.cooldowns !== undefined) for (const [k, v] of Object.entries(V.obj(src.cooldowns, `${p}.cooldowns`))) { V.oneOf(k, `${p}.cooldowns`, actionIds); cooldowns[k] = V.num(v, `${p}.cooldowns.${k}`, 0, 1e9); }
  const history = (src.history === undefined ? [] : V.arr(src.history, `${p}.history`, 6)).map((h, i) => V.oneOf(h, `${p}.history[${i}]`, actionIds));
  const task = validateTask(src.task, `${p}.task`);
  const path = src.path == null ? null : V.arr(src.path, `${p}.path`, 2000).map((q, i) => V.vec2(q, `${p}.path[${i}]`));
  if (path && path.length < 2) fail(`${p}.path`, 'path needs at least 2 points');
  const out = {
    id: a.id,
    pos: src.pos === undefined ? a.pos.slice() : V.vec2(src.pos, `${p}.pos`),
    heading: src.heading === undefined ? a.heading : V.num(src.heading, `${p}.heading`, -1000, 1000),
    speed: src.speed === undefined ? 0 : V.num(src.speed, `${p}.speed`, 0, 5),
    seated: src.seated === undefined ? false : V.bool(src.seated, `${p}.seated`),
    needs, rel, memories, moodlets, cooldowns, history,
    away: src.away === undefined ? a.away : V.bool(src.away, `${p}.away`),
    sleeping: src.sleeping === undefined ? a.sleeping : V.bool(src.sleeping, `${p}.sleeping`),
    activity: src.activity === undefined ? '' : V.str(src.activity, `${p}.activity`, 80),
    task: task && { action: task.action, params: task.params, phaseId: task.phaseId, ticks: task.ticks, slide: task.slide },
    path,
    pathI: path ? V.int(src.pathI, `${p}.pathI`, 0, path.length - 1) : 0,
    goalH: src.goalH == null ? null : V.num(src.goalH, `${p}.goalH`, -100, 100),
    moveDone: src.moveDone === undefined ? true : V.bool(src.moveDone, `${p}.moveDone`),
    lastDecision: src.lastDecision == null ? null : (() => {
      const dp = `${p}.lastDecision`, d = V.obj(src.lastDecision, dp);
      return { tick: V.int(d.tick, dp + '.tick', 0, 1e12), chosen: V.oneOf(d.chosen, dp + '.chosen', actionIds), forced: d.forced === undefined ? false : V.bool(d.forced, dp + '.forced'),
        scores: V.arr(d.scores, dp + '.scores', 8).map((s, i) => { const sp = `${dp}.scores[${i}]`; V.arr(s, sp, 2); return [V.num(s[0], sp + '[0]', 0, 1e6), V.oneOf(s[1], sp + '[1]', actionIds)]; }) };
    })(),
  };
  if (task && task._stepKind === 'goto' && !out.moveDone && !out.path && out.goalH === null) fail(`${p}`, 'walking phase without a path or facing goal');
  if (!task && (out.path || !out.moveDone)) fail(`${p}`, 'movement state without a task');
  return out;
}

/** v1 = legacy src/sim.js save. Migrates durable household facts; any in-progress action is dropped. */
export function migrateV1(d) {
  const O = isObj(d.O) ? d.O : {};
  const pick = (o, keys) => (isObj(o) ? Object.fromEntries(keys.filter((k) => has(o, k)).map((k) => [k, o[k]])) : undefined);
  const clockMin = isObj(d.clock) ? d.clock.min : undefined;
  return {
    v: 2,
    clock: { day: isObj(d.clock) ? d.clock.day : undefined, tickOfDay: typeof clockMin === 'number' ? Math.round(clockMin * TICKS_PER_MIN) : clockMin },
    speed: d.speed, forced: null,
    O: { chandelier: pick(O.chandelier, ['on']), lamp: pick(O.lamp, ['on']), kitchen: pick(O.kitchen, ['dirt']), pot: pick(O.pot, ['food', 'portions', 'kind', 'cookedAt']) },
    agents: Array.isArray(d.agents) ? d.agents.map((s) => (isObj(s) ? {
      id: s.id, pos: Array.isArray(s.pos) && s.pos.length === 3 ? [s.pos[0], s.pos[2]] : undefined, heading: s.heading,
      needs: s.needs, rel: s.rel, memories: s.memories, moodlets: s.moodlets, cooldowns: s.cooldowns, history: s.history,
      away: s.away, sleeping: s.sleeping, activity: s.activity,
    } : s)) : d.agents,
  };
}

/** Parse + migrate + validate. `sim` supplies the agent roster and definitions; it is not modified. */
export function parseSave(json, sim) {
  let d = json;
  if (typeof json === 'string') {
    if (json.length > MAX_SAVE_BYTES) fail('save', 'too large');
    try { d = JSON.parse(json); } catch (e) { fail('save', 'not valid JSON'); }
  }
  V.obj(d, 'save');
  if (d.v === 1) d = migrateV1(d);
  else if (d.v !== SAVE_VERSION) fail('save.v', `unsupported save version ${JSON.stringify(d.v)}`);
  const agentIds = sim.agents.map((a) => a.id);
  const clockSrc = d.clock === undefined ? {} : V.obj(d.clock, 'save.clock');
  const clock = {
    day: clockSrc.day === undefined ? 0 : V.int(clockSrc.day, 'save.clock.day', 0, 1e6),
    tickOfDay: clockSrc.tickOfDay === undefined ? 0 : V.int(clockSrc.tickOfDay, 'save.clock.tickOfDay', 0, TICKS_PER_DAY - 1),
  };
  const rng = d.rng === undefined ? sim.rng.state : V.int(d.rng, 'save.rng', 1, 0xffffffff);
  const speed = d.speed === undefined ? 1 : V.num(d.speed, 'save.speed', 0, 100);
  const forced = d.forced == null ? null : V.oneOf(d.forced, 'save.forced', Object.keys(ACTIONS));
  const O = validateObjects(d.O, 'save.O', agentIds);
  V.arr(d.agents, 'save.agents', 16);
  const seen = new Set();
  const agents = d.agents.map((s, i) => {
    const p = `save.agents[${i}]`; V.obj(s, p);
    const a = sim.agent(s.id); if (!a) fail(`${p}.id`, `unknown family member ${JSON.stringify(s.id)}`);
    if (seen.has(s.id)) fail(`${p}.id`, 'duplicate'); seen.add(s.id);
    return validateAgent(s, p, a, agentIds);
  });
  // agents missing from the save keep their definition defaults
  for (const a of sim.agents) if (!seen.has(a.id)) agents.push(validateAgent({}, `save.agents(${a.id})`, a, agentIds));
  return { v: SAVE_VERSION, clock, rng, speed, forced, O, agents };
}

export { paramCombos };
