// Little Lives core — renderer-independent, fixed-timestep household simulation.
// Runs in Node or the browser. No DOM, no WebGL, no globals: presentation reads state and drains `events`.
import { clamp, damp, easeInOut, angleDiff, lerp } from './math.js';
import { Rng } from './rng.js';
import { Clock, TICK_MIN, minToTicks } from './clock.js';
import { ANCHORS, OFFROOM, SEAT_Z_IN, buildKitchenNav } from './layout.js';
import { ACTIONS } from './actions.js';
import { freshObjects, ITEMS, checkHands } from './objects.js';
import { RESOURCES, ResourceBusy } from './resources.js';
import { parseSave, SAVE_VERSION } from './save.js';

const STEP_TIMEOUT_TICKS = minToTicks(90);
const clone = (o) => JSON.parse(JSON.stringify(o));

export class Agent {
  constructor(def) {
    this.id = def.id; this.name = def.name;
    this.personality = { ...def.personality }; this.prefs = { ...def.prefs };
    this.pos = OFFROOM.p.slice(); this.heading = OFFROOM.h; this.speed = 0; this.seated = false;
    this.needs = { hunger: 58, energy: 88, hygiene: 75, fun: 65, social: 60, ...(def.needs || {}) };
    this.rel = clone(def.rel || {}); this.memories = []; this.moodlets = []; this.cooldowns = {}; this.history = [];
    this.away = true; this.sleeping = true; this.activity = 'Asleep (off-room)';
    this.task = null;            // { action, params, phaseId, ticks, slide }
    this.path = null; this.pathI = 0; this.goalH = null; this.moveDone = true;
    this.lastDecision = null;    // LL-033: { tick, chosen, forced, scores:[[score,id],...] } — survives start()
    this.curSpeed = 0; this.curAng = 0; // per-tick outputs for animation (not saved)
    this._steps = null;          // cached step list for task (rebuilt from task.params)
  }
  mood() {
    const n = this.needs; let m = (n.hunger * 1.1 + n.energy + n.hygiene * 0.7 + n.fun * 0.9 + n.social * 0.8) / 4.5;
    for (const ml of this.moodlets) m += ml.v;
    return clamp(m, 0, 100);
  }
  moodLabel() { const m = this.mood(); return m > 82 ? 'Joyful' : m > 68 ? 'Happy' : m > 55 ? 'Content' : m > 42 ? 'Okay' : m > 28 ? 'Low' : 'Upset'; }
  remember(sim, text, v = 0, dur = 240, tags = []) {
    this.memories.unshift({ t: sim.clock.label(), day: sim.clock.day, text, tags });
    if (this.memories.length > 40) this.memories.pop();
    if (v) this.moodlets.push({ text, v, until: sim.absMin() + dur });
  }
  get step() { return this.task && this._steps ? this._steps[this.task.idx] : null; }
  /** Dynamic state only (definition data — name, personality, prefs — comes from the family config). */
  toState() {
    return clone({
      id: this.id, pos: this.pos, heading: this.heading, speed: this.speed, seated: this.seated,
      needs: this.needs, rel: this.rel, memories: this.memories, moodlets: this.moodlets, cooldowns: this.cooldowns, history: this.history,
      away: this.away, sleeping: this.sleeping, activity: this.activity,
      task: this.task && { action: this.task.action, params: this.task.params, phaseId: this.task.phaseId, ticks: this.task.ticks, slide: this.task.slide },
      path: this.path, pathI: this.pathI, goalH: this.goalH, moveDone: this.moveDone, lastDecision: this.lastDecision,
    });
  }
}

export class Sim {
  constructor({ seed = 1234567, agents = [], nav = null } = {}) {
    this.clock = new Clock(); this.rng = new Rng(seed); this.O = freshObjects();
    this.nav = nav || buildKitchenNav();
    this.agents = []; this.log = []; this.events = [];
    this.speed = 1; this.forced = null;
    for (const d of agents) this.addAgent(new Agent(d));
  }
  addAgent(a) { this.agents.push(a); return a; }
  agent(id) { return this.agents.find((a) => a.id === id); }
  absMin() { return this.clock.absMin(); }
  urgency(n) { const x = (100 - n) / 100; return x * x * 100; }
  mealTime() { const h = this.clock.hour; return (h > 7 && h < 9.5) || (h > 12 && h < 13.6) || (h > 18 && h < 19.8); }
  dark() { return this.clock.daylight() < 0.3; }
  emit(type, name, extra) { this.events.push({ type, name, tick: this.clock.absTick, ...extra }); if (this.events.length > 500) this.events.shift(); }
  drainEvents() { const e = this.events; this.events = []; return e; }
  pushLog(t) { this.log.unshift(`${this.clock.label()} — ${t}`); if (this.log.length > 60) this.log.pop(); }

  // ---------------------------------------------------------------- items (LL-038) & resources (LL-013)
  heldBy(a) { const h = { R: null, L: null, both: null }; for (const [id, it] of Object.entries(this.O.items)) if (it.at === 'held' && it.by === a.id) h[it.hand] = id; return h; }
  take(a, id, hand) {
    const it = this.O.items[id];
    if (it.at === 'held' && it.by !== a.id) throw new ResourceBusy(id, it.by);
    it.at = 'held'; it.by = a.id; it.hand = hand;
    checkHands(this.O.items);
  }
  place(id, at) {
    const it = this.O.items[id];
    if (!ITEMS[id].at.includes(at) || at === 'held') throw new Error(`invalid location ${at} for ${id}`);
    it.at = at; it.by = null; it.hand = null;
  }
  claim(a, r) {
    const owner = this.O.res[r];
    if (owner && owner !== a.id) throw new ResourceBusy(r, owner);
    this.O.res[r] = a.id; RESOURCES[r].acquire(this, a);
  }
  release(a, r) { if (this.O.res[r] !== a.id) return; this.O.res[r] = null; RESOURCES[r].release(this, a); }
  claimsOf(a) { return Object.keys(this.O.res).filter((r) => this.O.res[r] === a.id); }

  // ---------------------------------------------------------------- decision
  choose(a) {
    const scores = [], now = this.absMin();
    for (const [id, act] of Object.entries(ACTIONS)) {
      if (a.away !== (id === 'wakeUp')) continue;
      if ((a.cooldowns[id] || 0) > now) continue;
      let sc = act.score(this, a);
      if (!(sc > 0)) continue;
      if (!act.urgent) sc *= 0.9 + this.rng.next() * 0.2;
      if (a.history[0] === id && !act.urgent) sc *= 0.55;
      scores.push([sc, id]);
    }
    scores.sort((x, y) => y[0] - x[0]);
    if (this.forced && ACTIONS[this.forced] && !a.away) { const f = this.forced; this.forced = null; return { id: f, scores, forced: true }; }
    if (!scores.length) return null;
    const top = scores.slice(0, 3).filter((s) => s[0] > scores[0][0] * 0.75);
    let r = this.rng.next() * top.reduce((t, s) => t + s[0], 0);
    for (const s of top) { r -= s[0]; if (r <= 0) return { id: s[1], scores }; }
    return { id: top[0][1], scores };
  }
  start(a, id) {
    const act = ACTIONS[id];
    const params = act.plan(this, a);
    a.task = { action: id, params, phaseId: null, idx: -1, ticks: 0, slide: null };
    a._steps = act.steps(params);
    this.pushLog(`${a.name}: ${act.label}`);
    this.nextStep(a);
  }
  finish(a, ok) {
    const t = a.task, act = ACTIONS[t.action];
    if (ok && act.done) act.done(this, a, t.params);
    a.history.unshift(t.action); a.history.length = Math.min(a.history.length, 6);
    a.cooldowns[t.action] = this.absMin() + (ok ? 20 : 45);
    a.task = null; a._steps = null;
  }
  /** LL-013: transactional cancellation — release every claim, put every held item home, stop moving. */
  abort(a, why) {
    if (!a.task) return;
    const label = ACTIONS[a.task.action].label;
    this.pushLog(`${a.name} gave up (${why})`);
    for (const r of this.claimsOf(a)) this.release(a, r);
    for (const [id, it] of Object.entries(this.O.items)) {
      if (it.at !== 'held' || it.by !== a.id) continue;
      this.place(id, ITEMS[id].home);
      if (id === 'plate') { it.dirty = false; it.food = 0; }
      if (id === 'book') it.open = false;
    }
    if (this.O.items.spoon.at === 'plate' && this.O.items.plate.at !== 'table') this.place('spoon', 'rest');
    if (this.O.chairA.occupied === a.id) this.O.chairA.occupied = null;
    a.seated = false; a.path = null; a.pathI = 0; a.goalH = null; a.moveDone = true; a.speed = 0;
    a.remember(this, `Couldn't finish: ${label.toLowerCase()}`, -3, 60);
    this.emit('abort', a.task.action, { agent: a.id, why });
    this.finish(a, false);
  }
  /** Runs a step callback; a busy resource aborts the task instead of throwing out of update(). */
  _cb(a, fn, ...args) {
    if (!fn) return true;
    try { fn(this, a, ...args); return true; }
    catch (e) { if (e instanceof ResourceBusy) { this.abort(a, e.message); return false; } throw e; }
  }
  nextStep(a) {
    const t = a.task; t.idx++;
    if (t.idx >= a._steps.length) { this.finish(a, true); return; }
    const st = a._steps[t.idx];
    t.phaseId = st.id; t.ticks = 0; t.slide = null;
    a.activity = st.label || ACTIONS[t.action].label;
    this.beginStep(a, st);
  }
  beginStep(a, st) {
    if (st.kind === 'goto') {
      const sp = ANCHORS[st.to];
      const path = this.nav.path(a.pos, sp.p);
      if (!path) { this.abort(a, 'no path to ' + st.to); return; }
      a.path = path; a.pathI = 1; a.goalH = st.noFace ? null : sp.h; a.moveDone = false;
    } else if (st.kind === 'slide') {
      const sp = ANCHORS[st.to];
      a.task.slide = { from: a.pos.slice(), to: sp.p.slice(), h0: a.heading, h1: sp.h, t: 0 };
    } else if (st.kind === 'sit') {
      a.seated = true; this.O.chairA.occupied = a.id; this.emit('sound', 'chair');
    } else if (st.kind === 'stand') {
      this.O.chairA.target = -0.65; this.emit('sound', 'chair');
    }
    // LL-008: start runs for every step kind, exactly once, when the step begins (never again on load).
    this._cb(a, st.start);
  }
  _endStep(a, st) { if (this._cb(a, st.end) && a.task) this.nextStep(a); }

  // ---------------------------------------------------------------- fixed tick
  /** Advance exactly one fixed tick (TICK_MIN sim minutes). */
  tick() {
    const dt = TICK_MIN, O = this.O;
    this.clock.step();
    O.fridge.open = damp(O.fridge.open, O.fridge.target, 3.2, dt);
    O.door.open = damp(O.door.open, O.door.target, 3.0, dt);
    O.chairA.z = damp(O.chairA.z, O.chairA.target, 3.5, dt);
    O.stove.heat0 = damp(O.stove.heat0, O.stove.b0 === 'off' ? 0 : 1, 1.5, dt);
    O.stove.heat3 = damp(O.stove.heat3, O.stove.b3 === 'off' ? 0 : 1, 1.5, dt);
    if (O.pot.food === 'cooked' && O.stove.b0 === 'off') O.pot.temp = Math.max(0, O.pot.temp - dt * 0.004);
    else if (O.stove.b0 !== 'off') O.pot.temp = Math.min(1, O.pot.temp + dt * 0.05);
    if (O.pot.food === 'cooked' && this.absMin() - O.pot.cookedAt > 14 * 60) { O.pot.food = 'empty'; O.pot.portions = 0; }
    O.kitchen.dirt = Math.min(1, O.kitchen.dirt + dt * 0.00012);
    for (const a of this.agents) this.updateAgent(a, dt);
  }
  /** Run n ticks. */
  run(n) { for (let i = 0; i < n; i++) this.tick(); }
  updateAgent(a, dt) {
    const n = a.needs, P = a.personality;
    n.hunger = Math.max(0, n.hunger - dt * 0.085);
    n.energy = a.sleeping ? Math.min(100, n.energy + dt * 0.2) : Math.max(0, n.energy - dt * 0.055);
    n.hygiene = Math.max(0, n.hygiene - dt * (a.sleeping ? 0.015 : 0.035));
    n.fun = Math.max(0, n.fun - dt * (a.sleeping ? 0.005 : 0.06));
    n.social = Math.max(0, n.social - dt * (a.sleeping ? 0.005 : 0.045 * P.social));
    if (a.sleeping) n.hunger = Math.max(n.hunger, 20);
    const now = this.absMin(); a.moodlets = a.moodlets.filter((m) => m.until > now);
    if (!a.task) {
      const c = this.choose(a);
      if (c) {
        a.lastDecision = { tick: this.clock.absTick, chosen: c.id, forced: !!c.forced, scores: c.scores.slice(0, 5).map(([s, id]) => [Math.round(s * 100) / 100, id]) };
        this.start(a, c.id);
      } else if (!a.away) a.activity = 'Pottering about';
    }
    if (a.task) this.runStep(a, dt);
    this.move(a, dt);
  }
  runStep(a, dt) {
    const t = a.task, st = a._steps[t.idx];
    t.ticks++;
    if (t.ticks > STEP_TIMEOUT_TICKS) { this.abort(a, 'step timed out'); return; }
    if (st.kind === 'goto') { if (a.moveDone) this._endStep(a, st); return; }
    if (st.kind === 'slide') {
      const s = t.slide; s.t = Math.min(1, s.t + dt / st.dur); const k = easeInOut(s.t);
      a.pos = [lerp(s.from[0], s.to[0], k), lerp(s.from[1], s.to[1], k)]; a.heading = s.h0 + angleDiff(s.h0, s.h1) * k;
      if (s.t >= 1) this._endStep(a, st);
      return;
    }
    const dur = minToTicks(st.dur), f = clamp(t.ticks / dur, 0, 1);
    if (st.kind === 'sit') {
      if (f > 0.6) { this.O.chairA.target = -0.35; a.pos[1] = damp(a.pos[1], SEAT_Z_IN, 3.5, dt); }
      if (t.ticks >= dur) { a.pos[1] = SEAT_Z_IN; this._endStep(a, st); }
      return;
    }
    if (st.kind === 'stand') {
      a.pos[1] = damp(a.pos[1], ANCHORS.seatStand.p[1], 4, dt);
      if (f > 0.35) a.seated = false;
      if (t.ticks >= dur) { a.pos[1] = ANCHORS.seatStand.p[1]; if (this.O.chairA.occupied === a.id) this.O.chairA.occupied = null; this._endStep(a, st); }
      return;
    }
    // 'do'
    if (st.fx) for (const [k, v] of Object.entries(st.fx)) a.needs[k] = Math.min(100, a.needs[k] + v * dt);
    if (st.tick && !this._cb(a, st.tick, f, dt)) return;
    if (st.sfx === 'chop' && Math.floor(t.ticks * dt * 7.5 / Math.PI) !== Math.floor((t.ticks - 1) * dt * 7.5 / Math.PI)) this.emit('sound', 'chop');
    if (t.ticks >= dur) this._endStep(a, st);
  }
  move(a, dt) {
    let speed = 0, ang = 0;
    if (!a.moveDone && a.path) {
      const tgt = a.path[a.pathI]; const dx = tgt[0] - a.pos[0], dz = tgt[1] - a.pos[1]; const d = Math.hypot(dx, dz);
      const last = a.pathI === a.path.length - 1;
      let rem = d; for (let k = a.pathI; k < a.path.length - 1; k++) rem += Math.hypot(a.path[k + 1][0] - a.path[k][0], a.path[k + 1][1] - a.path[k][1]);
      if (d < (last ? 0.03 : 0.25)) {
        if (last) { a.pos = [tgt[0], tgt[1]]; a.path = null; a.pathI = 0; a.speed = 0; } else a.pathI++;
      } else {
        const want = Math.atan2(dx, dz); const diff = angleDiff(a.heading, want);
        const maxV = 1.05, acc = 2.2;
        const target = Math.abs(diff) > 1.4 && a.speed < 0.25 ? 0 : Math.min(maxV, Math.sqrt(2 * 1.6 * rem) + 0.05) * clamp(1.25 - Math.abs(diff) / 1.6, 0.25, 1);
        a.speed = a.speed < target ? Math.min(target, a.speed + acc * dt) : Math.max(target, a.speed - acc * 1.4 * dt);
        const turn = clamp(diff, -4.2 * dt, 4.2 * dt); a.heading += turn; ang = turn / dt;
        const step = Math.min(a.speed * dt, d);
        a.pos[0] += Math.sin(a.heading) * step; a.pos[1] += Math.cos(a.heading) * step;
        speed = a.speed;
      }
      if (!a.path && a.goalH == null) a.moveDone = true;
    } else if (!a.moveDone && a.goalH != null) {
      const diff = angleDiff(a.heading, a.goalH);
      if (Math.abs(diff) < 0.03) { a.heading = a.goalH; a.goalH = null; a.moveDone = true; }
      else { const turn = clamp(diff, -3.6 * dt, 3.6 * dt); a.heading += turn; ang = turn / dt; }
    } else if (!a.moveDone) a.moveDone = true;
    a.curSpeed = speed; a.curAng = ang;
  }

  // ---------------------------------------------------------------- save / load (LL-010 / LL-011 / LL-012 / LL-030)
  toState() {
    return { v: SAVE_VERSION, clock: { day: this.clock.day, tickOfDay: this.clock.tickOfDay }, rng: this.rng.state, speed: this.speed, forced: this.forced,
      O: clone(this.O), agents: this.agents.map((a) => a.toState()) };
  }
  serialize() { return JSON.stringify(this.toState()); }
  /**
   * Atomic load: parse + migrate + validate the whole save into a new state object first (throws SaveError,
   * leaving this sim untouched), then commit with plain assignments that cannot fail.
   */
  load(json) {
    const st = parseSave(json, this);
    const steps = new Map(st.agents.map((s) => [s.id, s.task ? ACTIONS[s.task.action].steps(s.task.params) : null]));
    // ---- commit (no throwing operations below)
    this.clock.day = st.clock.day; this.clock.tickOfDay = st.clock.tickOfDay;
    this.rng.state = st.rng; this.speed = st.speed; this.forced = st.forced; this.O = st.O; this.events = [];
    for (const s of st.agents) {
      const a = this.agent(s.id);
      Object.assign(a, { pos: s.pos, heading: s.heading, speed: s.speed, seated: s.seated, needs: s.needs, rel: s.rel, memories: s.memories, moodlets: s.moodlets,
        cooldowns: s.cooldowns, history: s.history, away: s.away, sleeping: s.sleeping, activity: s.activity,
        path: s.path, pathI: s.pathI, goalH: s.goalH, moveDone: s.moveDone, lastDecision: s.lastDecision, curSpeed: 0, curAng: 0 });
      a._steps = steps.get(s.id);
      a.task = s.task && { ...s.task, idx: a._steps.findIndex((x) => x.id === s.task.phaseId) };
    }
    this.pushLog('Game loaded');
  }
}
