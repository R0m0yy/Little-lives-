// Little Lives — simulation: clock, household object states, agent needs/personality/memory, utility AI, action steps, save/load
(function () {
  const { M, V, Q, M4 } = LL;
  const PI = Math.PI;
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ------------------------------------------------------------------ interaction points (floor x,z + facing heading)
  const SP = {
    fridge: { p: [2.92, -1.55], h: PI }, prep: { p: [1.25, -1.66], h: PI }, plates: { p: [0.72, -1.66], h: PI },
    stove: { p: [-1.05, -1.66], h: PI }, kettle: { p: [-0.3, -1.66], h: PI }, sink: { p: [-2.75, -1.6], h: PI }, rack: { p: [-1.95, -1.66], h: PI },
    switch: { p: [-3.48, -0.25], h: -PI / 2 }, door: { p: [-3.42, 1.0], h: -PI / 2 }, hall: { p: [-5.55, 1.0], h: PI / 2 },
    phone: { p: [3.42, 1.55], h: PI / 2 }, window: { p: [-2.75, -1.55], h: PI }, lamp: { p: [2.0, -1.66], h: PI },
    shelf: { p: [3.05, -0.6], h: PI / 2 }, chairSide: { p: [0.36, -0.3], h: PI / 2 }, seatStand: { p: [1.0, -0.19], h: 0 },
  };
  LL.SP = SP;

  class Clock {
    constructor() { this.min = 7 * 60 + 5; this.day = 0; }
    get hour() { return this.min / 60; }
    advance(m) { this.min += m; while (this.min >= 1440) { this.min -= 1440; this.day++; } }
    weekend() { return this.day % 7 >= 5; }
    label() { const h = Math.floor(this.min / 60), m = Math.floor(this.min % 60); const ap = h < 12 ? 'AM' : 'PM'; const hh = h % 12 || 12; return `${DAYS[this.day % 7]} ${hh}:${String(m).padStart(2, '0')} ${ap}`; }
    period() { const h = this.hour; return h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night'; }
    daylight() { const h = this.hour; if (h < 5.3 || h > 20.6) return 0; if (h < 7.6) return M.smooth((h - 5.3) / 2.3); if (h > 17.6) return 1 - M.smooth((h - 17.6) / 3.0); return 1; }
  }

  // ------------------------------------------------------------------ household objects (state machines)
  function freshObjects() {
    return {
      fridge: { open: 0, target: 0 },
      stove: { b0: 'off', b3: 'off', heat0: 0, heat3: 0 },
      pot: { food: 'empty', progress: 0, portions: 0, kind: 'stew', temp: 0, cookedAt: -1 },
      kettle: { water: 'cold', heat: 0, at: 'stove' },
      board: { veg: 'none' },
      plate: { at: 'stack', food: 0, kind: 'stew', dirty: false },
      cup: { at: 'counter', tea: 0, dirty: false },
      knife: { at: 'board' }, spoon: { at: 'rest' }, rag: { at: 'counter' }, book: { at: 'shelf' }, handset: { at: 'hook' }, veg: { at: 'fridge' },
      faucet: { on: false }, chandelier: { on: false }, lamp: { on: false },
      door: { open: 0, target: 0 }, chairA: { z: -0.2, target: -0.2, occupied: null },
      kitchen: { dirt: 0.15 },
    };
  }

  // ------------------------------------------------------------------ agent
  class Agent {
    constructor(id, ch, anim, def) {
      this.id = id; this.ch = ch; this.anim = anim; this.name = def.name;
      this.pos = [-5.4, 0, 1.0]; this.heading = PI / 2; this.speed = 0; this.angVel = 0;
      this.needs = { hunger: 58, energy: 88, hygiene: 75, fun: 65, social: 60 };
      this.personality = def.personality; this.prefs = def.prefs;
      this.rel = def.rel; this.memories = []; this.moodlets = [];
      this.action = null; this.stepIdx = 0; this.stepT = 0; this.vars = {}; this.cooldowns = {};
      this.hold = { R: null, L: null, both: null }; this.away = true; this.sleeping = true; this.activity = 'Asleep (off-room)';
      this.path = null; this.pathI = 0; this.goalH = null; this.moveDone = true; this.history = [];
    }
    mood() {
      const n = this.needs; let m = (n.hunger * 1.1 + n.energy + n.hygiene * 0.7 + n.fun * 0.9 + n.social * 0.8) / 4.5;
      for (const ml of this.moodlets) m += ml.v;
      return M.clamp(m, 0, 100);
    }
    moodLabel() { const m = this.mood(); return m > 82 ? 'Joyful' : m > 68 ? 'Happy' : m > 55 ? 'Content' : m > 42 ? 'Okay' : m > 28 ? 'Low' : 'Upset'; }
    remember(sim, text, v = 0, dur = 240, tags = []) {
      this.memories.unshift({ t: sim.clock.label(), day: sim.clock.day, text, tags });
      if (this.memories.length > 40) this.memories.pop();
      if (v) this.moodlets.push({ text, v, until: sim.absMin() + dur });
    }
  }

  // ------------------------------------------------------------------ action library
  // each action -> steps; step: { name, label, kind, ... } executed by Sim.runStep
  const A = {};
  const wash = (label = 'Washing hands') => [
    { kind: 'goto', to: 'sink' },
    { kind: 'do', label, dur: 1.0, ik: { R: 'faucetHandle' }, lean: 0.35, look: 'faucet', end: (s) => s.setFaucet(true) },
    { kind: 'do', label, dur: 5, ik: { R: 'sinkR', L: 'sinkL' }, lean: 0.3, look: 'sink', loopIK: 'scrub', fx: { hygiene: 1.4 } },
    { kind: 'do', label, dur: 0.9, ik: { R: 'faucetHandle' }, lean: 0.35, end: (s) => s.setFaucet(false) },
  ];
  const sitDown = [
    { kind: 'goto', to: 'chairSide' },
    { kind: 'do', label: 'Pulling out a chair', dur: 1.3, ik: { L: 'chairBack' }, look: 'chairBack', start: (s) => { s.O.chairA.target = -0.65; s.sound('chair'); } },
    { kind: 'slide', label: 'Sitting down', to: 'seatStand', dur: 1.3 },
    { kind: 'sit', label: 'Sitting down', dur: 1.4 },
  ];
  const standUp = [
    { kind: 'stand', label: 'Getting up', dur: 1.4 },
    { kind: 'slide', label: 'Getting up', to: 'chairSide', dur: 1.2 },
    { kind: 'do', label: 'Tucking the chair in', dur: 1.1, ik: { L: 'chairBack' }, look: 'chairBack', start: (s) => { s.O.chairA.target = -0.2; s.sound('chair'); } },
  ];
  A.cookMeal = {
    label: 'Cooking a meal', icon: '🍲',
    score(s, a) { if (s.O.pot.food === 'cooked' && s.O.pot.portions > 0) return 0; const h = s.clock.hour; if (h < 5.5 || h > 21.5) return 0; return s.urgency(a.needs.hunger) * 1.25 * a.personality.foodie + (s.mealTime() ? 18 : 0); },
    steps(s, a) {
      const kind = s.clock.hour < 10.5 ? 'porridge' : 'stew';
      return [
        ...wash(),
        { kind: 'goto', to: 'fridge', start: (s) => { s.O.pot.kind = kind; } },
        { kind: 'do', label: 'Opening the fridge', dur: 1.2, ik: { R: 'fridgeHandle' }, look: 'fridgeHandle', start: (s) => { s.O.fridge.target = 1; s.sound('fridge'); } },
        { kind: 'do', label: 'Getting ingredients', dur: 1.5, ik: { R: 'fridgeInside' }, lean: 0.25, look: 'fridgeInside', end: (s, a) => { a.hold.R = 'vegHand'; s.O.veg.at = 'hand'; } },
        { kind: 'do', label: 'Closing the fridge', dur: 1.1, ik: { L: 'fridgeHandle' }, start: (s) => { s.O.fridge.target = 0; }, end: (s) => s.sound('fridgeClose') },
        { kind: 'goto', to: 'prep' },
        { kind: 'do', label: 'Laying out ingredients', dur: 1.1, ik: { R: 'board' }, lean: 0.3, look: 'board', end: (s, a) => { a.hold.R = null; s.O.board.veg = 'whole'; s.sound('place'); } },
        { kind: 'do', label: 'Picking up the knife', dur: 0.9, ik: { R: 'knifeHome' }, lean: 0.3, look: 'board', end: (s, a) => { a.hold.R = 'knife'; s.O.knife.at = 'hand'; } },
        { kind: 'do', label: 'Chopping vegetables', dur: 9, ik: { R: 'board', L: 'boardHold' }, loopIK: 'chop', lean: 0.32, look: 'board', expr: 'focused', tick: (s, a, f) => { if (f > 0.55) s.O.board.veg = 'chopped'; } },
        { kind: 'do', label: 'Setting the knife down', dur: 0.8, ik: { R: 'knifeHome' }, lean: 0.3, end: (s, a) => { a.hold.R = null; s.O.knife.at = 'board'; } },
        { kind: 'do', label: 'Scooping the vegetables', dur: 1.0, ik: { R: 'board', L: 'board' }, lean: 0.35, end: (s, a) => { s.O.board.veg = 'none'; a.hold.both = 'vegChopped'; } },
        { kind: 'goto', to: 'stove' },
        { kind: 'do', label: 'Adding vegetables to the pot', dur: 1.2, ik: { R: 'potTop', L: 'potTop' }, lean: 0.3, look: 'pot', end: (s, a) => { a.hold.both = null; s.O.pot.food = 'raw'; s.O.pot.progress = 0; s.O.pot.kind = kind; s.sound('plop'); } },
        { kind: 'do', label: 'Lighting the burner', dur: 1.1, ik: { R: 'knob0' }, lean: 0.45, look: 'knob0', end: (s) => { s.O.stove.b0 = 'heating'; s.sound('ignite'); } },
        { kind: 'do', label: 'Picking up the spoon', dur: 0.8, ik: { R: 'spoonHome' }, lean: 0.3, end: (s, a) => { a.hold.R = 'spoon'; s.O.spoon.at = 'hand'; } },
        { kind: 'do', label: kind === 'stew' ? 'Simmering vegetable stew' : 'Stirring porridge', dur: 20, ik: { R: 'potStir', L: 'potHandle' }, loopIK: 'stir', lean: 0.25, look: 'pot', expr: 'content',
          tick: (s, a, f) => { const P = s.O.pot; P.progress = f; P.food = f < 0.12 ? 'raw' : f < 0.98 ? 'cooking' : 'cooked'; if (f > 0.1) s.O.stove.b0 = 'cooking'; } },
        { kind: 'do', label: 'Turning off the stove', dur: 1.0, ik: { R: 'knob0' }, lean: 0.45, end: (s) => { s.O.stove.b0 = 'off'; s.O.pot.food = 'cooked'; s.O.pot.portions = 4; s.O.pot.cookedAt = s.absMin(); s.O.kitchen.dirt = Math.min(1, s.O.kitchen.dirt + 0.35); s.sound('click'); } },
        { kind: 'do', label: 'Resting the spoon', dur: 0.8, ik: { R: 'spoonHome' }, lean: 0.3, end: (s, a) => { a.hold.R = null; s.O.spoon.at = 'rest'; } },
        ...A.serveAndEat.core(s, a, true),
      ];
    },
    done(s, a) { a.remember(s, `Cooked ${s.O.pot.kind === 'stew' ? 'vegetable stew' : 'berry porridge'} — it turned out lovely`, 8, 360, ['cooking']); },
  };
  A.serveAndEat = {
    label: 'Having leftovers', icon: '🍽️',
    score(s, a) { const P = s.O.pot; if (P.food !== 'cooked' || P.portions <= 0) return 0; if (s.clock.hour < 5.5 || s.clock.hour > 22) return 0; return s.urgency(a.needs.hunger) * 1.35 + (s.mealTime() ? 15 : 0); },
    core(s, a, fresh) {
      const st = [
        { kind: 'goto', to: 'plates' },
        { kind: 'do', label: 'Taking a plate', dur: 1.0, ik: { R: 'plateStack', L: 'plateStack' }, lean: 0.3, look: 'plateStack', end: (s, a) => { a.hold.both = 'plate'; s.O.plate.at = 'hand'; s.O.plate.food = 0; s.O.plate.kind = s.O.pot.kind; s.sound('plate'); } },
        { kind: 'goto', to: 'stove', carry: true },
      ];
      if (!fresh) st.push(
        { kind: 'do', label: 'Setting the plate down', dur: 0.8, ik: { R: 'stoveSide', L: 'stoveSide' }, lean: 0.3, end: (s, a) => { a.hold.both = null; s.O.plate.at = 'stoveSide'; s.sound('plate'); } },
        { kind: 'do', label: 'Lighting the burner', dur: 1.0, ik: { R: 'knob0' }, lean: 0.45, end: (s) => { s.O.stove.b0 = 'heating'; s.sound('ignite'); } },
        { kind: 'do', label: 'Warming up leftovers', dur: 7, ik: { R: 'potStir', L: 'potHandle' }, loopIK: 'stir', lean: 0.25, look: 'pot', start: (s, a) => { a.hold.R = 'spoon'; s.O.spoon.at = 'hand'; }, tick: (s) => { s.O.pot.temp = 1; s.O.stove.b0 = 'cooking'; } },
        { kind: 'do', label: 'Turning off the stove', dur: 0.9, ik: { R: 'knob0' }, lean: 0.45, end: (s, a) => { s.O.stove.b0 = 'off'; s.sound('click'); } },
      ); else st.push({ kind: 'do', label: 'Setting the plate down', dur: 0.8, ik: { R: 'stoveSide', L: 'stoveSide' }, lean: 0.3, end: (s, a) => { a.hold.both = null; s.O.plate.at = 'stoveSide'; s.sound('plate'); } });
      st.push(
        { kind: 'do', label: 'Serving up', dur: 3.2, ik: { R: 'serve' }, lean: 0.3, look: 'stoveSide', start: (s, a) => { a.hold.R = 'spoon'; s.O.spoon.at = 'hand'; }, tick: (s, a, f) => { s.O.plate.food = Math.min(1, f * 1.2); }, end: (s, a) => { s.O.pot.portions = Math.max(0, s.O.pot.portions - 1); if (!s.O.pot.portions) s.O.pot.food = 'empty'; a.hold.R = null; s.O.spoon.at = 'rest'; } },
        { kind: 'do', label: 'Picking up the plate', dur: 0.8, ik: { R: 'stoveSide', L: 'stoveSide' }, lean: 0.3, end: (s, a) => { a.hold.both = 'plate'; s.O.plate.at = 'hand'; } },
        { kind: 'goto', to: 'chairSide', carry: true, label: 'Carrying the meal to the table' },
        { kind: 'do', label: 'Setting the table', dur: 1.0, ik: { R: 'tablePlace', L: 'tablePlace' }, lean: 0.2, look: 'tablePlace', end: (s, a) => { a.hold.both = null; s.O.plate.at = 'table'; s.sound('plate'); } },
        ...sitDown,
        { kind: 'do', label: 'Eating', dur: 16, seated: true, ik: { R: 'bite', L: 'tableEdge' }, loopIK: 'eat', look: 'plateTable', expr: 'content', start: (s, a) => { a.hold.R = 'spoon'; s.O.spoon.at = 'hand'; },
          tick: (s, a, f, dt) => { s.O.plate.food = Math.max(0, 1 - f); a.needs.hunger = Math.min(100, a.needs.hunger + dt * 3.6); } },
        { kind: 'do', label: 'Finishing up', dur: 1.2, seated: true, ik: { R: 'plateTable' }, end: (s, a) => { a.hold.R = null; s.O.spoon.at = 'plate'; s.O.plate.dirty = true; } },
        ...standUp,
      );
      if (a.personality.neat > 0.5) st.push(...A.doDishes.steps(s, a));
      return st;
    },
    steps(s, a) { return this.core(s, a, false); },
    done(s, a) { a.remember(s, 'Enjoyed a quiet meal at the kitchen table', 5, 200, ['meal']); },
  };
  A.doDishes = {
    label: 'Washing the dishes', icon: '🧽',
    score(s, a) { return s.O.plate.dirty && s.O.plate.at === 'table' ? 25 + 45 * a.personality.neat : 0; },
    steps(s, a) {
      return [
        { kind: 'goto', to: 'chairSide' },
        { kind: 'do', label: 'Clearing the table', dur: 1.0, ik: { R: 'tablePlace', L: 'tablePlace' }, lean: 0.25, look: 'tablePlace', end: (s, a) => { a.hold.both = 'plate'; s.O.plate.at = 'hand'; s.O.spoon.at = 'plateHeld'; } },
        { kind: 'goto', to: 'sink', carry: true },
        { kind: 'do', label: 'Running the water', dur: 0.9, ik: { R: 'faucetHandle' }, lean: 0.35, end: (s) => s.setFaucet(true) },
        { kind: 'do', label: 'Washing the dishes', dur: 7, ik: { R: 'sinkR', L: 'sinkL' }, loopIK: 'scrub', lean: 0.3, look: 'sink', expr: 'content', start: (s, a) => { a.hold.both = 'plateSink'; } },
        { kind: 'do', label: 'Turning off the tap', dur: 0.9, ik: { R: 'faucetHandle' }, lean: 0.35, end: (s) => s.setFaucet(false) },
        { kind: 'goto', to: 'rack', carry: true },
        { kind: 'do', label: 'Putting the dishes away', dur: 1.0, ik: { R: 'rack', L: 'rack' }, lean: 0.3, look: 'rack', end: (s, a) => { a.hold.both = null; s.O.plate.at = 'rack'; s.O.plate.dirty = false; s.O.spoon.at = 'rest'; s.sound('plate'); } },
      ];
    },
    done(s, a) { a.remember(s, 'Did the dishes — kitchen feels tidy', 3, 120, ['chores']); },
  };
  A.makeTea = {
    label: 'Making tea', icon: '🫖',
    score(s, a) { const h = s.clock.hour; if (h < 6 || h > 21) return 0; return 20 + s.urgency(a.needs.fun) * 0.4 * a.prefs.tea + s.urgency(a.needs.energy) * 0.25 + ((h > 15 && h < 17) ? 14 : 0); },
    steps(s, a) {
      return [
        { kind: 'goto', to: 'kettle' },
        { kind: 'do', label: 'Putting the kettle on', dur: 1.0, ik: { R: 'knob3' }, lean: 0.45, look: 'kettle', end: (s) => { s.O.stove.b3 = 'heating'; s.sound('ignite'); } },
        { kind: 'do', label: 'Waiting for the kettle', dur: 9, look: 'kettle', expr: 'content', idleArms: true, tick: (s, a, f) => { s.O.kettle.heat = f; } },
        { kind: 'do', label: 'Kettle whistling', dur: 1.2, ik: { R: 'knob3' }, lean: 0.45, start: (s) => s.sound('whistle'), end: (s) => { s.O.stove.b3 = 'off'; s.O.kettle.heat = 0.6; } },
        { kind: 'goto', to: 'plates' },
        { kind: 'do', label: 'Taking a teacup', dur: 0.9, ik: { R: 'cupHome' }, lean: 0.3, look: 'cupHome', end: (s, a) => { a.hold.R = 'cup'; s.O.cup.at = 'hand'; } },
        { kind: 'goto', to: 'kettle', label: 'Pouring tea' },
        { kind: 'do', label: 'Pouring tea', dur: 3, ik: { R: 'cupPour', L: 'kettleLift' }, lean: 0.3, look: 'cupPour', start: (s, a) => { s.O.kettle.at = 'hand'; s.sound('pour'); }, end: (s, a) => { s.O.cup.tea = 1; s.O.kettle.at = 'stove'; } },
        ...sitDown,
        { kind: 'do', label: 'Sipping tea', dur: 14, seated: true, ik: { R: 'sip' }, loopIK: 'sip', look: 'window', expr: 'content', tick: (s, a, f, dt) => { s.O.cup.tea = 1 - f; a.needs.fun = Math.min(100, a.needs.fun + dt * 1.6); a.needs.energy = Math.min(100, a.needs.energy + dt * 0.5); } },
        { kind: 'do', label: 'Putting the cup down', dur: 0.9, seated: true, ik: { R: 'tablePlaceCup' }, end: (s, a) => { a.hold.R = null; s.O.cup.at = 'table'; s.O.cup.dirty = true; } },
        ...standUp,
        { kind: 'goto', to: 'chairSide' },
        { kind: 'do', label: 'Clearing the cup', dur: 0.8, ik: { R: 'tablePlaceCup' }, lean: 0.2, end: (s, a) => { a.hold.R = 'cup'; s.O.cup.at = 'hand'; } },
        { kind: 'goto', to: 'sink' },
        { kind: 'do', label: 'Rinsing the cup', dur: 0.9, ik: { L: 'faucetHandle' }, lean: 0.35, end: (s) => s.setFaucet(true) },
        { kind: 'do', label: 'Rinsing the cup', dur: 3, ik: { R: 'sinkR', L: 'sinkL' }, loopIK: 'scrub', lean: 0.3, look: 'sink' },
        { kind: 'do', label: 'Rinsing the cup', dur: 0.8, ik: { L: 'faucetHandle' }, lean: 0.35, end: (s, a) => { s.setFaucet(false); } },
        { kind: 'goto', to: 'plates' },
        { kind: 'do', label: 'Putting the cup away', dur: 0.8, ik: { R: 'cupHome' }, lean: 0.3, end: (s, a) => { a.hold.R = null; s.O.cup.at = 'counter'; s.O.cup.dirty = false; } },
      ];
    },
    done(s, a) { a.remember(s, 'A peaceful cup of tea by the window', 6, 180, ['tea']); },
  };
  A.readBook = {
    label: 'Reading', icon: '📖',
    score(s, a) { const h = s.clock.hour; if (h < 7 || h > 22.5) return 0; return s.urgency(a.needs.fun) * 0.9 * a.prefs.reading + (h > 19 ? 10 : 0); },
    steps(s, a) {
      return [
        { kind: 'goto', to: 'shelf' },
        { kind: 'do', label: 'Choosing a book', dur: 1.2, ik: { R: 'bookHome' }, lean: 0.2, look: 'bookHome', end: (s, a) => { a.hold.R = 'book'; s.O.book.at = 'hand'; } },
        ...sitDown,
        { kind: 'do', label: 'Reading a novel', dur: 22, seated: true, ik: { R: 'readR', L: 'readL' }, loopIK: 'read', look: 'readBook', expr: 'focused', start: (s, a) => { a.hold.R = null; a.hold.both = 'bookOpen'; }, tick: (s, a, f, dt) => { a.needs.fun = Math.min(100, a.needs.fun + dt * 2.4); } },
        { kind: 'do', label: 'Closing the book', dur: 0.8, seated: true, ik: { R: 'readR' }, start: (s, a) => { a.hold.both = null; a.hold.R = 'book'; } },
        ...standUp,
        { kind: 'goto', to: 'shelf' },
        { kind: 'do', label: 'Putting the book back', dur: 1.0, ik: { R: 'bookHome' }, lean: 0.2, end: (s, a) => { a.hold.R = null; s.O.book.at = 'shelf'; } },
      ];
    },
    done(s, a) { a.remember(s, 'Lost in a good novel for a while', 5, 200, ['reading']); },
  };
  A.callFamily = {
    label: 'Phoning family', icon: '☎️',
    score(s, a) { const h = s.clock.hour; if (h < 9 || h > 20.5) return 0; return s.urgency(a.needs.social) * 1.1 * a.personality.social; },
    steps(s, a) {
      const who = s.clock.hour > 9 && s.clock.hour < 17 && !s.clock.weekend() ? 'darius' : M.rand.next() < 0.5 ? 'darius' : 'elias';
      return [
        { kind: 'goto', to: 'phone', start: (s, a) => { a.vars.who = who; } },
        { kind: 'do', label: 'Lifting the receiver', dur: 1.0, ik: { R: 'handset' }, look: 'phone', end: (s, a) => { a.hold.R = 'handset'; s.O.handset.at = 'hand'; s.sound('ring'); } },
        { kind: 'do', label: who === 'darius' ? 'Calling Darius at work' : 'Checking in on Elias', dur: 16, ik: { R: 'ear' }, look: 'phone', expr: 'happy', talk: true,
          tick: (s, a, f, dt) => { a.needs.social = Math.min(100, a.needs.social + dt * 3.2); if (M.rand.next() < dt * 0.2) a.anim.expr = M.rand.next() < 0.4 ? 'joy' : 'happy'; } },
        { kind: 'do', label: 'Hanging up', dur: 1.0, ik: { R: 'handset' }, end: (s, a) => { a.hold.R = null; s.O.handset.at = 'hook'; s.sound('click'); } },
      ];
    },
    done(s, a) { const w = a.vars.who || 'darius'; const r = a.rel[w]; r.affection = Math.min(100, r.affection + 3); r.friendship = Math.min(100, r.friendship + 2); a.remember(s, w === 'darius' ? 'Lovely chat with Darius on the phone' : 'Elias told me about his day', 7, 240, ['social', w]); },
  };
  A.tidyKitchen = {
    label: 'Tidying up', icon: '🧹',
    score(s, a) { const d = s.O.kitchen.dirt; if (d < 0.3) return 0; return d * 70 * a.personality.neat; },
    steps(s, a) {
      return [
        { kind: 'goto', to: 'rack' },
        { kind: 'do', label: 'Grabbing a cloth', dur: 0.8, ik: { R: 'ragHome' }, lean: 0.3, end: (s, a) => { a.hold.R = 'rag'; s.O.rag.at = 'hand'; } },
        { kind: 'goto', to: 'stove' },
        { kind: 'do', label: 'Wiping the stove', dur: 6, ik: { R: 'wipeStove' }, loopIK: 'wipe', lean: 0.35, look: 'wipeStove', tick: (s, a, f) => { s.O.kitchen.dirt = Math.max(0.05, s.O.kitchen.dirt - 0.002); } },
        { kind: 'goto', to: 'prep' },
        { kind: 'do', label: 'Wiping the counter', dur: 6, ik: { R: 'wipePrep' }, loopIK: 'wipe', lean: 0.35, look: 'wipePrep', end: (s) => { s.O.kitchen.dirt = 0.02; } },
        { kind: 'goto', to: 'rack' },
        { kind: 'do', label: 'Hanging the cloth up', dur: 0.8, ik: { R: 'ragHome' }, lean: 0.3, end: (s, a) => { a.hold.R = null; s.O.rag.at = 'counter'; } },
      ];
    },
    done(s, a) { a.remember(s, 'Gave the kitchen a good wipe-down', 4, 180, ['chores']); },
  };
  A.windowGaze = {
    label: 'Looking out the window', icon: '🪟',
    score(s, a) { const h = s.clock.hour; return (s.clock.daylight() > 0.3 ? 14 : 4) + s.urgency(a.needs.fun) * 0.25; },
    steps() { return [{ kind: 'goto', to: 'window' }, { kind: 'do', label: 'Watching the garden', dur: 9, look: 'window', expr: 'content', idleArms: true, tick: (s, a, f, dt) => { a.needs.fun = Math.min(100, a.needs.fun + dt * 0.6); } }]; },
    done(s, a) { if (M.rand.next() < 0.4) a.remember(s, s.clock.daylight() > 0.5 ? 'Watched the birds in the garden' : 'Watched the street lamps come on', 2, 90); },
  };
  A.lightsOn = {
    label: 'Turning on the lights', icon: '💡', urgent: true,
    score(s, a) { return s.dark() && !s.O.chandelier.on ? 140 : 0; },
    steps() { return [{ kind: 'goto', to: 'switch' }, { kind: 'do', label: 'Flipping the light switch', dur: 0.9, ik: { R: 'switch' }, look: 'switch', end: (s) => { s.O.chandelier.on = true; s.sound('switch'); } }]; },
  };
  A.lampOn = {
    label: 'Turning on the lamp', icon: '🛋️',
    score(s, a) { return s.clock.daylight() < 0.45 && !s.O.lamp.on && a.personality.cozy > 0.5 ? 60 : 0; },
    steps() { return [{ kind: 'goto', to: 'lamp' }, { kind: 'do', label: 'Switching on the lamp', dur: 0.9, ik: { R: 'lampSwitch' }, lean: 0.3, look: 'lampSwitch', end: (s) => { s.O.lamp.on = true; s.sound('switch'); } }]; },
  };
  A.lightsOff = {
    label: 'Turning off the lights', icon: '🌤️',
    score(s, a) { return (s.O.chandelier.on || s.O.lamp.on) && s.clock.daylight() > 0.75 ? 45 : 0; },
    steps(s) {
      const st = [];
      if (s.O.lamp.on) st.push({ kind: 'goto', to: 'lamp' }, { kind: 'do', label: 'Switching off the lamp', dur: 0.9, ik: { R: 'lampSwitch' }, lean: 0.3, end: (s) => { s.O.lamp.on = false; s.sound('switch'); } });
      if (s.O.chandelier.on) st.push({ kind: 'goto', to: 'switch' }, { kind: 'do', label: 'Flipping the light switch', dur: 0.9, ik: { R: 'switch' }, end: (s) => { s.O.chandelier.on = false; s.sound('switch'); } });
      return st;
    },
  };
  A.doze = {
    label: 'Resting in a chair', icon: '😴',
    score(s, a) { const h = s.clock.hour; if (h > 21 || h < 9) return 0; return a.needs.energy < 40 ? s.urgency(a.needs.energy) * 0.8 : 0; },
    steps() { return [...sitDown, { kind: 'do', label: 'Dozing off', dur: 25, seated: true, look: null, expr: 'tired', eyes: 1, tick: (s, a, f, dt) => { a.needs.energy = Math.min(100, a.needs.energy + dt * 0.9); } }, ...standUp]; },
    done(s, a) { a.remember(s, 'Had a little nap at the table', 2, 120); },
  };
  A.goToBed = {
    label: 'Heading to bed', icon: '🌙',
    score(s, a) { const h = s.clock.hour; if (h >= 22.3 || h < 4) return 150; if (h > 21 && a.needs.energy < 50) return 120; return 0; },
    steps(s) {
      const st = [];
      if (s.O.lamp.on) st.push({ kind: 'goto', to: 'lamp' }, { kind: 'do', label: 'Switching off the lamp', dur: 0.9, ik: { R: 'lampSwitch' }, lean: 0.3, end: (s) => { s.O.lamp.on = false; s.sound('switch'); } });
      st.push({ kind: 'goto', to: 'switch' },
        { kind: 'do', label: 'Turning off the lights', dur: 0.9, ik: { R: 'switch' }, look: 'switch', end: (s) => { s.O.chandelier.on = false; s.sound('switch'); } },
        { kind: 'goto', to: 'door' },
        { kind: 'do', label: 'Opening the door', dur: 1.2, ik: { R: 'doorKnob' }, look: 'doorKnob', start: (s) => { s.O.door.target = 1; s.sound('door'); } },
        { kind: 'goto', to: 'hall', label: 'Going upstairs to bed', noFace: true },
        { kind: 'do', label: 'Closing the door', dur: 1.0, start: (s) => { s.O.door.target = 0; }, end: (s, a) => { s.sound('doorClose'); a.away = true; a.sleeping = true; } });
      return st;
    },
    done(s, a) { a.remember(s, 'Said goodnight to the kitchen', 0, 0, ['routine']); a.activity = 'Asleep (bedroom is Milestone 6)'; },
  };
  A.wakeUp = {
    label: 'Coming down for the day', icon: '🌅', urgent: true,
    score(s, a) { return a.away && s.clock.hour >= a.prefs.wake && s.clock.hour < 20 ? 200 : 0; },
    steps(s, a) {
      return [
        { kind: 'do', label: 'Opening the door', dur: 1.1, start: (s, a) => { a.away = false; a.sleeping = false; s.O.door.target = 1; s.sound('door'); } },
        { kind: 'goto', to: 'door', label: 'Walking into the kitchen' },
        { kind: 'do', label: 'Closing the door', dur: 1.1, ik: { L: 'doorKnob' }, look: 'doorKnob', start: (s) => { s.O.door.target = 0; }, end: (s) => s.sound('doorClose') },
      ];
    },
    done(s, a) { a.remember(s, s.clock.weekend() ? 'A slow weekend morning' : 'Up early to start the day', 3, 120, ['routine']); },
  };
  LL.Actions = A;

  // ------------------------------------------------------------------ Simulation
  class Sim {
    constructor(world, nav, audio) {
      this.world = world; this.nav = nav; this.audio = audio;
      this.clock = new Clock(); this.O = freshObjects(); this.agents = []; this.log = [];
      this.speed = 1; this.paused = false; this.t = 0; this.forced = null;
    }
    absMin() { return this.clock.day * 1440 + this.clock.min; }
    urgency(n) { const x = (100 - n) / 100; return x * x * 100; }
    mealTime() { const h = this.clock.hour; return (h > 7 && h < 9.5) || (h > 12 && h < 13.6) || (h > 18 && h < 19.8); }
    dark() { return this.clock.daylight() < 0.3; }
    sound(n) { if (this.audio) this.audio.play(n); }
    setFaucet(on) { this.O.faucet.on = on; this.sound(on ? 'tapOn' : 'tapOff'); }
    addAgent(a) { this.agents.push(a); }

    choose(a) {
      const scores = [];
      for (const [id, act] of Object.entries(A)) {
        if (a.away && id !== 'wakeUp') continue;
        if (!a.away && id === 'wakeUp') continue;
        if ((a.cooldowns[id] || 0) > this.absMin()) continue;
        let sc = act.score(this, a);
        if (sc <= 0) continue;
        if (!act.urgent) sc *= 0.9 + M.rand.next() * 0.2;
        if (a.history[0] === id && !act.urgent) sc *= 0.55; // avoid identical back-to-back routines
        scores.push([sc, id]);
      }
      scores.sort((x, y) => y[0] - x[0]);
      if (this.forced && A[this.forced] && !a.away) { const f = this.forced; this.forced = null; return { id: f, scores }; }
      if (!scores.length) return null;
      // weighted pick among top 3 for personality-driven variety
      const top = scores.slice(0, 3).filter((s) => s[0] > scores[0][0] * 0.75);
      let r = M.rand.next() * top.reduce((t, s) => t + s[0], 0);
      for (const s of top) { r -= s[0]; if (r <= 0) return { id: s[1], scores }; }
      return { id: top[0][1], scores };
    }
    start(a, id) {
      const act = A[id];
      a.action = id; a.vars = {}; a.steps = act.steps(this, a); a.stepIdx = -1; a.lastScores = null;
      this.nextStep(a);
      this.pushLog(`${a.name}: ${act.label}`);
    }
    finish(a, ok) {
      const act = A[a.action];
      if (ok && act.done) act.done(this, a);
      a.history.unshift(a.action); a.history.length = Math.min(a.history.length, 6);
      a.cooldowns[a.action] = this.absMin() + (ok ? 20 : 45);
      a.action = null; a.steps = null; a.anim.extra = null;
      a.anim.setIK('L', null); a.anim.setIK('R', null); a.anim.leanT = 0; a.anim.look = null; a.anim.eyesClosedT = 0;
    }
    abort(a, why) {
      this.pushLog(`${a.name} gave up (${why})`);
      // failure recovery: return held props home, release furniture, close appliances
      for (const k of ['R', 'L', 'both']) a.hold[k] = null;
      const O = this.O;
      for (const p of ['knife', 'spoon', 'rag', 'book', 'handset', 'cup']) if (O[p].at === 'hand' || O[p].at === 'plateHeld') O[p].at = { knife: 'board', spoon: 'rest', rag: 'counter', book: 'shelf', handset: 'hook', cup: 'counter' }[p];
      if (O.plate.at === 'hand') { O.plate.at = 'rack'; O.plate.dirty = false; }
      if (O.veg.at === 'hand') O.veg.at = 'fridge';
      O.fridge.target = 0; if (O.faucet.on) this.setFaucet(false);
      if (a.anim.sitTarget > 0) { a.anim.sitTarget = 0; }
      O.chairA.target = -0.2; O.chairA.occupied = null;
      a.remember(this, `Couldn't finish: ${A[a.action].label.toLowerCase()}`, -3, 60);
      this.finish(a, false);
    }
    nextStep(a) {
      a.stepIdx++;
      if (a.stepIdx >= a.steps.length) { this.finish(a, true); return; }
      a.stepT = 0; const st = a.steps[a.stepIdx];
      a.activity = st.label || A[a.action].label;
      this.beginStep(a, st);
    }
    beginStep(a, st) {
      const an = a.anim;
      an.extra = null; an.expr = st.expr || this.idleExpr(a); an.eyesClosedT = st.eyes || 0;
      if (st.kind === 'goto') {
        const sp = SP[st.to];
        an.leanT = 0; an.setIK('L', null); an.setIK('R', null);
        const path = this.nav.path([a.pos[0], a.pos[2]], sp.p);
        if (!path) { this.abort(a, 'no path to ' + st.to); return; }
        a.path = path; a.pathI = 1; a.goalH = st.noFace ? null : sp.h; a.moveDone = false;
        an.look = null;
        if (!st.label) a.activity = A[a.action].label;
      } else if (st.kind === 'slide') {
        const sp = SP[st.to]; a.slide = { from: a.pos.slice(), to: [sp.p[0], 0, sp.p[1]], h0: a.heading, h1: sp.h, t: 0 };
        an.setIK('L', null); an.setIK('R', null);
      } else if (st.kind === 'sit') {
        an.sitTarget = 1; this.O.chairA.occupied = a.id; an.setIK('L', null); an.setIK('R', null); this.sound('chair');
      } else if (st.kind === 'stand') {
        an.sitTarget = 0; this.O.chairA.target = -0.65; this.sound('chair');
      } else {
        an.leanT = st.lean || 0;
        if (st.start) st.start(this, a);
      }
    }
    idleExpr(a) { const m = a.mood(); return a.needs.energy < 30 ? 'tired' : m > 75 ? 'happy' : m > 55 ? 'neutral' : m > 38 ? 'neutral' : 'sad'; }

    // world-space targets for IK / look-at (resolved every frame so they follow moving furniture)
    target(name, a, t) {
      const W = this.world, O = this.O;
      const tb = LL.TABLE, chZ = O.chairA.z;
      switch (name) {
        case 'faucetHandle': return [LL.FAUCET[0] + 0.16, 1.17, -2.86];
        case 'faucet': return LL.FAUCET;
        case 'sink': return [-2.75, 1.0, -2.5];
        case 'sinkR': return [-2.66, 1.12, -2.42]; case 'sinkL': return [-2.86, 1.12, -2.42];
        case 'fridgeHandle': return W.fridgeHandle();
        case 'fridgeInside': return [2.95, 1.3, -2.45];
        case 'board': return [LL.BOARD[0] + 0.05, LL.BOARD[1] + 0.07, LL.BOARD[2] + 0.02];
        case 'boardHold': return [LL.BOARD[0] - 0.2, LL.BOARD[1] + 0.06, LL.BOARD[2] + 0.04];
        case 'knifeHome': return [LL.BOARD[0] + 0.3, LL.BOARD[1] + 0.06, LL.BOARD[2] + 0.1];
        case 'pot': return [LL.BURNER[0], 1.25, LL.BURNER[2]];
        case 'potTop': return [LL.BURNER[0], 1.45, LL.BURNER[2] + 0.1];
        case 'potStir': return [LL.BURNER[0] + 0.04, 1.5, LL.BURNER[2] + 0.06];
        case 'potHandle': return [LL.BURNER[0] - 0.3, 1.32, LL.BURNER[2]];
        case 'knob0': return [-1.3, 0.98, -2.18]; case 'knob3': return [-0.25, 0.98, -2.18];
        case 'kettle': return [-0.15, 1.2, -2.78];
        case 'kettleLift': return [-0.15, 1.42, -2.5];
        case 'spoonHome': return [0.12, 1.12, -2.55];
        case 'plateStack': return [0.62, 1.2, -2.55];
        case 'cupHome': return [0.98, 1.15, -2.6];
        case 'cupPour': return [-0.42, 1.25, -2.35];
        case 'stoveSide': return [-0.25, 1.12, -2.42];
        case 'serve': { const k = (Math.sin(t * 2.2) + 1) / 2; return V.lerp([LL.BURNER[0] + 0.05, 1.45, LL.BURNER[2] + 0.05], [-0.25, 1.25, -2.42], k); }
        case 'tablePlace': return [tb.x, tb.y + 0.12, 0.3];
        case 'tablePlaceCup': return [tb.x + 0.3, tb.y + 0.12, 0.3];
        case 'plateTable': return [tb.x, tb.y + 0.05, 0.38];
        case 'tableEdge': return [tb.x + 0.28, tb.y + 0.05, 0.24];
        case 'chairBack': return [1.0 - 0.12, 1.1, chZ - 0.23];
        case 'switch': return LL.SWITCH;
        case 'lampSwitch': return [2.0, 1.15, -2.68 + 0.12];
        case 'doorKnob': return W.doorKnob();
        case 'handset': return W.dyn.handset.rest;
        case 'phone': return [4.0, 2.0, 1.55];
        case 'window': return [-2.75, 2.4, -3.2];
        case 'rack': return [-1.95, 1.2, -2.55];
        case 'ragHome': return [-1.7, 1.12, -2.5];
        case 'wipeStove': return [-0.6 + Math.sin(t * 2.4) * 0.25, 1.1, -2.35 + Math.cos(t * 2.4) * 0.08];
        case 'wipePrep': return [1.25 + Math.sin(t * 2.4) * 0.35, 1.08, -2.4 + Math.cos(t * 2.4) * 0.08];
        case 'bookHome': return [3.7, 1.12, -0.6];
        case 'mouth': return a.mouthWorld();
        case 'bite': return null; case 'sip': return null; case 'ear': return null; case 'readR': return null; case 'readL': return null; case 'readBook': return a.bookWorld();
        case 'plateTableLook': return [tb.x, tb.y, 0.38];
        default: return null;
      }
    }
    // procedural IK loops (chop, stir, scrub, eat, sip, read, wipe) — targets relative to the agent
    loopTarget(a, st, side, t) {
      const name = st.ik[side];
      const base = this.target(name, a, t);
      const L = st.loopIK;
      if (L === 'chop' && side === 'R') { const k = Math.abs(Math.sin(t * 7.5)); return V.add(base, [Math.sin(t * 0.8) * 0.06, k * 0.12, 0]); }
      if (L === 'stir' && side === 'R') return V.add(base, [Math.cos(t * 4.2) * 0.07, Math.sin(t * 8.4) * 0.01, Math.sin(t * 4.2) * 0.06]);
      if (L === 'scrub') return V.add(base, [Math.cos(t * 6 + (side === 'L' ? 2 : 0)) * 0.05, Math.sin(t * 12) * 0.015, Math.sin(t * 6) * 0.04]);
      if (L === 'wipe') return base;
      if (L === 'eat' && side === 'R') {
        const cyc = (t % 3.2) / 3.2; // scoop -> raise -> bite -> lower
        const plate = [LL.TABLE.x + 0.02, LL.TABLE.y + 0.1, 0.36];
        const mouth = V.add(a.mouthWorld(), [0.0, -0.1, 0.16]);
        const k = cyc < 0.25 ? 0 : cyc < 0.5 ? M.easeInOut((cyc - 0.25) / 0.25) : cyc < 0.68 ? 1 : 1 - M.easeInOut((cyc - 0.68) / 0.32);
        if (cyc > 0.45 && cyc < 0.7) a.anim.chew = 1.0;
        return V.lerp(plate, mouth, k);
      }
      if (L === 'sip' && side === 'R') {
        const cyc = (t % 5) / 5; const cup = [LL.TABLE.x + 0.25, LL.TABLE.y + 0.16, 0.3];
        const mouth = V.add(a.mouthWorld(), [0.03, -0.12, 0.13]);
        const k = cyc < 0.3 ? M.easeInOut(cyc / 0.3) : cyc < 0.5 ? 1 : cyc < 0.8 ? 1 - M.easeInOut((cyc - 0.5) / 0.3) : 0;
        return V.lerp(cup, mouth, k);
      }
      if (L === 'read') { const c = a.chestWorld(); const fwd = [Math.sin(a.heading), 0, Math.cos(a.heading)], rt = [Math.cos(a.heading), 0, -Math.sin(a.heading)]; const turn = (t % 7) > 6.2 && side === 'R' ? 0.12 : 0;
        return V.add(V.add(c, V.scale(fwd, 0.36)), V.add(V.scale(rt, (side === 'R' ? -0.16 : 0.16) + (side === 'R' ? turn : 0)), [0, -0.12 + turn * 0.5, 0])); }
      if (L === 'ear' || name === 'ear') return null;
      return base;
    }
    stepIK(a, st, t) {
      const an = a.anim;
      for (const side of ['L', 'R']) {
        const name = st.ik && st.ik[side];
        if (!name) { an.setIK(side, null); continue; }
        let p = null;
        if (name === 'ear') { p = a.earWorld(); }
        else p = st.loopIK ? this.loopTarget(a, st, side, t) : this.target(name, a, t);
        if (!p) { an.setIK(side, null); continue; }
        // shorter ramp for quick reach steps so the hand arrives in time
        an.setIK(side, p, { pole: st.seated ? [side === 'L' ? 0.8 : -0.8, -0.6, -0.2] : null, rate: st.dur < 1.5 ? 9 : 6 });
      }
    }

    update(dt) {
      if (this.paused) return;
      const sdt = dt * this.speed; // sim seconds == sim minutes
      this.t += sdt; this.clock.advance(sdt);
      const O = this.O;
      // appliances & objects
      O.fridge.open = M.damp(O.fridge.open, O.fridge.target, 3.2, sdt);
      O.door.open = M.damp(O.door.open, O.door.target, 3.0, sdt);
      O.chairA.z = M.damp(O.chairA.z, O.chairA.target, 3.5, sdt);
      O.stove.heat0 = M.damp(O.stove.heat0, O.stove.b0 === 'off' ? 0 : 1, 1.5, sdt);
      O.stove.heat3 = M.damp(O.stove.heat3, O.stove.b3 === 'off' ? 0 : 1, 1.5, sdt);
      if (O.pot.food === 'cooked' && O.stove.b0 === 'off') O.pot.temp = Math.max(0, O.pot.temp - sdt * 0.004); else if (O.stove.b0 !== 'off') O.pot.temp = Math.min(1, O.pot.temp + sdt * 0.05);
      if (O.pot.food === 'cooked' && this.absMin() - O.pot.cookedAt > 14 * 60) { O.pot.food = 'empty'; O.pot.portions = 0; } // leftovers don't keep forever
      O.kitchen.dirt = Math.min(1, O.kitchen.dirt + sdt * 0.00012);
      for (const a of this.agents) this.updateAgent(a, sdt);
    }
    updateAgent(a, dt) {
      // needs decay (per sim minute)
      const n = a.needs, P = a.personality;
      n.hunger = Math.max(0, n.hunger - dt * 0.085);
      n.energy = a.sleeping ? Math.min(100, n.energy + dt * 0.2) : Math.max(0, n.energy - dt * 0.055);
      n.hygiene = Math.max(0, n.hygiene - dt * (a.sleeping ? 0.015 : 0.035));
      n.fun = Math.max(0, n.fun - dt * (a.sleeping ? 0.005 : 0.06));
      n.social = Math.max(0, n.social - dt * (a.sleeping ? 0.005 : 0.045 * P.social));
      if (a.sleeping) { n.hunger = Math.max(n.hunger, 20); }
      const now = this.absMin(); a.moodlets = a.moodlets.filter((m) => m.until > now);
      if (!a.action) {
        const c = this.choose(a);
        if (c) { a.lastScores = c.scores; this.start(a, c.id); }
        else if (!a.away) { a.activity = 'Pottering about'; a.anim.expr = this.idleExpr(a); }
      }
      if (a.action) this.runStep(a, dt);
      this.move(a, dt);
    }
    runStep(a, dt) {
      const st = a.steps[a.stepIdx]; if (!st) return;
      a.stepT += dt;
      if (a.stepT > 90) { this.abort(a, 'step timed out'); return; }
      const an = a.anim;
      if (st.kind === 'goto') {
        if (st.carry || a.hold.both === 'plate' || a.hold.both === 'vegChopped') this.carryPose(a); else an.setIK('L', null), an.setIK('R', null);
        if (a.moveDone) this.nextStep(a);
        return;
      }
      if (st.kind === 'slide') {
        const s = a.slide; s.t = Math.min(1, s.t + dt / st.dur); const k = M.easeInOut(s.t);
        const prev = a.pos.slice();
        a.pos = V.lerp(s.from, s.to, k); a.heading = s.h0 + M.angleDiff(s.h0, s.h1) * k;
        a.slideSpeed = V.dist(prev, a.pos) / Math.max(dt, 1e-4);
        if (s.t >= 1) { a.slideSpeed = 0; this.nextStep(a); }
        return;
      }
      if (st.kind === 'sit') {
        const O = this.O;
        // scoot in together with the chair once seated
        if (a.stepT > st.dur * 0.6) { O.chairA.target = -0.35; a.pos[2] = M.damp(a.pos[2], SP.seatStand.p[1] + 0.3, 3.5, dt); }
        if (a.stepT >= st.dur) { a.pos[2] = SP.seatStand.p[1] + 0.3; this.nextStep(a); }
        return;
      }
      if (st.kind === 'stand') {
        a.pos[2] = M.damp(a.pos[2], SP.seatStand.p[1], 4, dt);
        if (a.stepT > st.dur * 0.35) an.sitTarget = 0;
        if (a.stepT >= st.dur) { a.pos[2] = SP.seatStand.p[1]; this.O.chairA.occupied = null; this.nextStep(a); }
        return;
      }
      // 'do'
      const f = M.clamp(a.stepT / st.dur, 0, 1);
      if (st.ik) this.stepIK(a, st, a.stepT); else if (!st.seated && !(a.hold.both)) { an.setIK('L', null); an.setIK('R', null); }
      if (a.hold.both === 'plate' && !st.ik) this.carryPose(a);
      an.look = st.look === undefined ? null : st.look ? this.target(st.look, a, a.stepT) || (st.look === 'readBook' ? a.bookWorld() : null) : null;
      if (st.talk) an.talk = 0.2;
      if (st.fx) for (const [k, v] of Object.entries(st.fx)) a.needs[k] = Math.min(100, a.needs[k] + v * dt);
      if (st.tick) st.tick(this, a, f, dt);
      if (st.loopIK === 'chop' && Math.floor(a.stepT * 7.5 / Math.PI) !== Math.floor((a.stepT - dt) * 7.5 / Math.PI)) this.sound('chop');
      if (a.stepT >= st.dur) { if (st.end) st.end(this, a); this.nextStep(a); }
    }
    carryPose(a) {
      const fwd = [Math.sin(a.heading), 0, Math.cos(a.heading)], rt = [Math.cos(a.heading), 0, -Math.sin(a.heading)];
      const c = V.add(a.pos, V.add(V.scale(fwd, 0.42), [0, 1.24, 0]));
      a.anim.setIK('R', V.add(c, V.scale(rt, -0.15)), { rate: 8 }); a.anim.setIK('L', V.add(c, V.scale(rt, 0.15)), { rate: 8 });
    }
    move(a, dt) {
      const an = a.anim;
      let speed = 0, ang = 0;
      if (!a.moveDone && a.path) {
        const tgt = a.path[a.pathI]; const dx = tgt[0] - a.pos[0], dz = tgt[1] - a.pos[2]; const d = Math.hypot(dx, dz);
        const last = a.pathI === a.path.length - 1;
        // remaining distance along path for arrival braking
        let rem = d; for (let k = a.pathI; k < a.path.length - 1; k++) rem += Math.hypot(a.path[k + 1][0] - a.path[k][0], a.path[k + 1][1] - a.path[k][1]);
        if (d < (last ? 0.03 : 0.25)) {
          if (last) { a.pos[0] = tgt[0]; a.pos[2] = tgt[1]; a.path = null; a.speed = 0; }
          else a.pathI++;
        } else {
          const want = Math.atan2(dx, dz); const diff = M.angleDiff(a.heading, want);
          const maxV = 1.05, acc = 2.2;
          // turn in place first if facing far away; otherwise steer while walking
          const target = Math.abs(diff) > 1.4 && a.speed < 0.25 ? 0 : Math.min(maxV, Math.sqrt(2 * 1.6 * rem) + 0.05) * M.clamp(1.25 - Math.abs(diff) / 1.6, 0.25, 1);
          a.speed = a.speed < target ? Math.min(target, a.speed + acc * dt) : Math.max(target, a.speed - acc * 1.4 * dt);
          const turn = M.clamp(diff, -4.2 * dt, 4.2 * dt); a.heading += turn; ang = turn / Math.max(dt, 1e-4);
          const step = Math.min(a.speed * dt, d);
          a.pos[0] += Math.sin(a.heading) * step; a.pos[2] += Math.cos(a.heading) * step;
          speed = a.speed;
        }
        if (!a.path) { if (a.goalH == null) a.moveDone = true; }
      } else if (!a.moveDone && a.goalH != null) {
        const diff = M.angleDiff(a.heading, a.goalH);
        if (Math.abs(diff) < 0.03) { a.heading = a.goalH; a.moveDone = true; }
        else { const turn = M.clamp(diff, -3.6 * dt, 3.6 * dt); a.heading += turn; ang = turn / Math.max(dt, 1e-4); }
      } else if (!a.moveDone) a.moveDone = true;
      if (a.slideSpeed) speed = Math.max(speed, a.slideSpeed * 0.8);
      a.ch.pos = a.pos; a.ch.heading = a.heading;
      a.curSpeed = speed; a.curAng = ang;
    }

    // ---------------- save / load (full consistent state; in-progress actions resume at their current step)
    serialize() {
      return JSON.stringify({ v: 1, clock: { min: this.clock.min, day: this.clock.day }, speed: this.speed, O: this.O,
        agents: this.agents.map((a) => ({ id: a.id, pos: a.pos, heading: a.heading, needs: a.needs, rel: a.rel, memories: a.memories, moodlets: a.moodlets, cooldowns: a.cooldowns, history: a.history,
          away: a.away, sleeping: a.sleeping, hold: a.hold, action: a.action, stepIdx: a.stepIdx, vars: a.vars, sit: a.anim.sitTarget, activity: a.activity })) });
    }
    load(json) {
      const d = typeof json === 'string' ? JSON.parse(json) : json;
      if (!d || d.v !== 1) throw new Error('Unrecognised save');
      this.clock.min = d.clock.min; this.clock.day = d.clock.day; this.speed = d.speed || 1;
      this.O = Object.assign(freshObjects(), d.O);
      for (const s of d.agents) {
        const a = this.agents.find((x) => x.id === s.id); if (!a) continue;
        Object.assign(a, { pos: s.pos, heading: s.heading, needs: s.needs, rel: s.rel, memories: s.memories, moodlets: s.moodlets, cooldowns: s.cooldowns, history: s.history, away: s.away, sleeping: s.sleeping, hold: s.hold, activity: s.activity });
        a.anim.sitTarget = s.sit; a.anim.sit = s.sit; a.path = null; a.moveDone = true; a.slideSpeed = 0;
        a.action = null; a.steps = null;
        if (s.action && A[s.action]) {
          a.action = s.action; a.vars = s.vars || {}; a.steps = A[s.action].steps(this, a);
          a.stepIdx = Math.min(s.stepIdx, a.steps.length - 1) - 1;
          this.nextStep(a); // restart the saved step from its beginning
        }
      }
      this.pushLog('Game loaded');
    }
    pushLog(t) { this.log.unshift(`${this.clock.label()} — ${t}`); if (this.log.length > 60) this.log.pop(); }
  }
  // body points used by IK and props (computed from the live skeleton)
  Agent.prototype.mouthWorld = function () { const P = this.ch.P; return M4.point(this.ch.boneWorld('head'), V.sub(P.mouth, P.head)); };
  Agent.prototype.earWorld = function () { const P = this.ch.P; return M4.point(this.ch.boneWorld('head'), [-0.56, P.eye_L[1] - P.head[1] - 0.05, 0.12]); };
  Agent.prototype.chestWorld = function () { return M4.point(this.ch.boneWorld('chest'), [0, 0, 0]); };
  Agent.prototype.bookWorld = function () { const l = M4.point(this.ch.boneWorld('hand_L'), [0, -0.07, 0]), r = M4.point(this.ch.boneWorld('hand_R'), [0, -0.07, 0]); return V.add(V.lerp(l, r, 0.5), [0, 0.06, 0]); };
  LL.Sim = Sim; LL.Agent = Agent; LL.Clock = Clock;
})();
