// Little Lives core — action library.
//
// Contract (fixes LL-008 / LL-009 / LL-011):
//  * plan(s, a)  — runs ONCE when the action starts; reads world/clock/RNG and returns plain-JSON params.
//  * steps(p)    — PURE function of params. Never reads the world, so a saved task rebuilds the identical
//                  step list on load even if the lamp, recipe cutoff or anything else has changed since.
//  * Every step has a stable `id` (phase id) unique within the action; saves store the phase id, not an index.
//  * start/end callbacks run for EVERY step kind (goto, slide, sit, stand, do); tick runs every tick.
//  * Presentation hints (ik, look, lean, loopIK, expr, seated, talk, idleArms, eyes, carry, noFace) are data
//    for the renderer/animation layer; the core never resolves them.
//  * params spec: { key: [enum values] | 'bool' } — used by save validation.
const pre = (p, steps) => steps.map((s) => ({ ...s, id: `${p}.${s.id}` }));

const wash = (label, dur = 5, rate = 1.4) => [
  { id: 'goto', kind: 'goto', to: 'sink' },
  { id: 'tapOn', kind: 'do', label, dur: 1.0, ik: { R: 'faucetHandle' }, lean: 0.35, look: 'faucet', end: (s, a) => s.claim(a, 'faucet') },
  { id: 'scrub', kind: 'do', label, dur, ik: { R: 'sinkR', L: 'sinkL' }, lean: 0.3, look: 'sink', loopIK: 'scrub', fx: { hygiene: rate } },
  { id: 'tapOff', kind: 'do', label, dur: 0.9, ik: { R: 'faucetHandle' }, lean: 0.35, end: (s, a) => s.release(a, 'faucet') },
];
const sitDown = pre('sit', [
  { id: 'approach', kind: 'goto', to: 'chairSide' },
  { id: 'pull', kind: 'do', label: 'Pulling out a chair', dur: 1.3, ik: { L: 'chairBack' }, look: 'chairBack', start: (s, a) => s.claim(a, 'chairA') },
  { id: 'slide', kind: 'slide', label: 'Sitting down', to: 'seatStand', dur: 1.3 },
  { id: 'sit', kind: 'sit', label: 'Sitting down', dur: 1.4 },
]);
const standUp = pre('stand', [
  { id: 'stand', kind: 'stand', label: 'Getting up', dur: 1.4 },
  { id: 'slide', kind: 'slide', label: 'Getting up', to: 'chairSide', dur: 1.2 },
  { id: 'tuck', kind: 'do', label: 'Tucking the chair in', dur: 1.1, ik: { L: 'chairBack' }, look: 'chairBack', start: (s, a) => { s.release(a, 'chairA'); s.emit('sound', 'chair'); } },
]);
const lampOffSteps = (pfx) => pre(pfx, [
  { id: 'goto', kind: 'goto', to: 'lamp' },
  { id: 'switch', kind: 'do', label: 'Switching off the lamp', dur: 0.9, ik: { R: 'lampSwitch' }, lean: 0.3, end: (s) => { s.O.lamp.on = false; s.emit('sound', 'switch'); } },
]);

function dishesSteps() {
  return [
    { id: 'goto', kind: 'goto', to: 'chairSide' },
    { id: 'clear', kind: 'do', label: 'Clearing the table', dur: 1.0, ik: { R: 'tablePlace', L: 'tablePlace' }, lean: 0.25, look: 'tablePlace',
      end: (s, a) => { s.take(a, 'plate', 'both'); if (s.O.items.spoon.at !== 'held') s.place('spoon', 'plate'); } },
    { id: 'toSink', kind: 'goto', to: 'sink', carry: true },
    { id: 'tapOn', kind: 'do', label: 'Running the water', dur: 0.9, ik: { R: 'faucetHandle' }, lean: 0.35, start: (s, a) => s.place('plate', 'sink'), end: (s, a) => s.claim(a, 'faucet') },
    { id: 'wash', kind: 'do', label: 'Washing the dishes', dur: 7, ik: { R: 'sinkR', L: 'sinkL' }, loopIK: 'scrub', lean: 0.3, look: 'sink', expr: 'content' },
    { id: 'tapOff', kind: 'do', label: 'Turning off the tap', dur: 0.9, ik: { R: 'faucetHandle' }, lean: 0.35, end: (s, a) => { s.release(a, 'faucet'); s.take(a, 'plate', 'both'); } },
    { id: 'toRack', kind: 'goto', to: 'rack', carry: true },
    { id: 'putAway', kind: 'do', label: 'Putting the dishes away', dur: 1.0, ik: { R: 'rack', L: 'rack' }, lean: 0.3, look: 'rack',
      end: (s, a) => { s.place('plate', 'rack'); s.O.items.plate.dirty = false; s.O.items.plate.food = 0; s.place('spoon', 'rest'); s.emit('sound', 'plate'); } },
  ];
}

function serveSteps(fresh, neat) {
  const st = [
    { id: 'toPlates', kind: 'goto', to: 'plates' },
    { id: 'takePlate', kind: 'do', label: 'Taking a plate', dur: 1.0, ik: { R: 'plateStack', L: 'plateStack' }, lean: 0.3, look: 'plateStack',
      end: (s, a) => { const P = s.O.items.plate; s.take(a, 'plate', 'both'); P.food = 0; P.kind = s.O.pot.kind; s.emit('sound', 'plate'); } },
    { id: 'toStove', kind: 'goto', to: 'stove', carry: true },
    { id: 'plateDown', kind: 'do', label: 'Setting the plate down', dur: 0.8, ik: { R: 'stoveSide', L: 'stoveSide' }, lean: 0.3, end: (s) => { s.place('plate', 'stoveSide'); s.emit('sound', 'plate'); } },
  ];
  if (!fresh) st.push(
    { id: 'light', kind: 'do', label: 'Lighting the burner', dur: 1.0, ik: { R: 'knob0' }, lean: 0.45, end: (s, a) => { s.claim(a, 'burner0'); s.emit('sound', 'ignite'); } },
    { id: 'warm', kind: 'do', label: 'Warming up leftovers', dur: 7, ik: { R: 'potStir', L: 'potHandle' }, loopIK: 'stir', lean: 0.25, look: 'pot',
      start: (s, a) => s.take(a, 'spoon', 'R'), tick: (s) => { s.O.pot.temp = 1; if (s.O.stove.b0 !== 'off') s.O.stove.b0 = 'cooking'; } },
    { id: 'off', kind: 'do', label: 'Turning off the stove', dur: 0.9, ik: { R: 'knob0' }, lean: 0.45, end: (s, a) => { s.release(a, 'burner0'); s.emit('sound', 'click'); } },
  );
  st.push(
    { id: 'serve', kind: 'do', label: 'Serving up', dur: 3.2, ik: { R: 'serve' }, lean: 0.3, look: 'stoveSide',
      start: (s, a) => s.take(a, 'spoon', 'R'), tick: (s, a, f) => { s.O.items.plate.food = Math.min(1, f * 1.2); },
      end: (s) => { const P = s.O.pot; P.portions = Math.max(0, P.portions - 1); if (!P.portions) P.food = 'empty'; s.place('spoon', 'rest'); } },
    { id: 'pickUp', kind: 'do', label: 'Picking up the plate', dur: 0.8, ik: { R: 'stoveSide', L: 'stoveSide' }, lean: 0.3, end: (s, a) => s.take(a, 'plate', 'both') },
    { id: 'carry', kind: 'goto', to: 'chairSide', carry: true, label: 'Carrying the meal to the table' },
    { id: 'setTable', kind: 'do', label: 'Setting the table', dur: 1.0, ik: { R: 'tablePlace', L: 'tablePlace' }, lean: 0.2, look: 'tablePlace', end: (s) => { s.place('plate', 'table'); s.emit('sound', 'plate'); } },
    ...sitDown,
    { id: 'eat', kind: 'do', label: 'Eating', dur: 16, seated: true, ik: { R: 'bite', L: 'tableEdge' }, loopIK: 'eat', look: 'plateTable', expr: 'content',
      start: (s, a) => s.take(a, 'spoon', 'R'), tick: (s, a, f, dt) => { s.O.items.plate.food = Math.max(0, 1 - f); a.needs.hunger = Math.min(100, a.needs.hunger + dt * 3.6); } },
    { id: 'finish', kind: 'do', label: 'Finishing up', dur: 1.2, seated: true, ik: { R: 'plateTable' }, end: (s) => { s.place('spoon', 'plate'); s.O.items.plate.dirty = true; } },
    ...standUp,
  );
  if (neat) st.push(...pre('dishes', dishesSteps()));
  return st;
}

export const ACTIONS = {};
const A = ACTIONS;

A.cookMeal = {
  label: 'Cooking a meal', icon: '🍲',
  params: { kind: ['porridge', 'stew'], neat: 'bool' },
  score(s, a) { if (s.O.pot.food === 'cooked' && s.O.pot.portions > 0) return 0; const h = s.clock.hour; if (h < 5.5 || h > 21.5) return 0; return s.urgency(a.needs.hunger) * 1.25 * a.personality.foodie + (s.mealTime() ? 18 : 0); },
  plan(s, a) { return { kind: s.clock.hour < 10.5 ? 'porridge' : 'stew', neat: a.personality.neat > 0.5 }; },
  steps(p) {
    const kind = p.kind;
    return [
      ...pre('wash', wash('Washing hands')),
      { id: 'toFridge', kind: 'goto', to: 'fridge', start: (s) => { s.O.pot.kind = kind; } },
      { id: 'openFridge', kind: 'do', label: 'Opening the fridge', dur: 1.2, ik: { R: 'fridgeHandle' }, look: 'fridgeHandle', start: (s, a) => s.claim(a, 'fridge') },
      { id: 'getVeg', kind: 'do', label: 'Getting ingredients', dur: 1.5, ik: { R: 'fridgeInside' }, lean: 0.25, look: 'fridgeInside', end: (s, a) => { s.O.items.veg.state = 'whole'; s.take(a, 'veg', 'R'); } },
      { id: 'closeFridge', kind: 'do', label: 'Closing the fridge', dur: 1.1, ik: { L: 'fridgeHandle' }, start: (s, a) => s.release(a, 'fridge'), end: (s) => s.emit('sound', 'fridgeClose') },
      { id: 'toPrep', kind: 'goto', to: 'prep' },
      { id: 'layOut', kind: 'do', label: 'Laying out ingredients', dur: 1.1, ik: { R: 'board' }, lean: 0.3, look: 'board', end: (s) => { s.place('veg', 'board'); s.emit('sound', 'place'); } },
      { id: 'takeKnife', kind: 'do', label: 'Picking up the knife', dur: 0.9, ik: { R: 'knifeHome' }, lean: 0.3, look: 'board', end: (s, a) => s.take(a, 'knife', 'R') },
      { id: 'chop', kind: 'do', label: 'Chopping vegetables', dur: 9, ik: { R: 'board', L: 'boardHold' }, loopIK: 'chop', lean: 0.32, look: 'board', expr: 'focused', sfx: 'chop',
        tick: (s, a, f) => { if (f > 0.55) s.O.items.veg.state = 'chopped'; } },
      { id: 'knifeDown', kind: 'do', label: 'Setting the knife down', dur: 0.8, ik: { R: 'knifeHome' }, lean: 0.3, end: (s) => s.place('knife', 'board') },
      { id: 'scoop', kind: 'do', label: 'Scooping the vegetables', dur: 1.0, ik: { R: 'board', L: 'board' }, lean: 0.35, end: (s, a) => { s.O.items.veg.state = 'chopped'; s.take(a, 'veg', 'both'); } },
      { id: 'toStove', kind: 'goto', to: 'stove', carry: true },
      { id: 'addVeg', kind: 'do', label: 'Adding vegetables to the pot', dur: 1.2, ik: { R: 'potTop', L: 'potTop' }, lean: 0.3, look: 'pot',
        end: (s) => { s.place('veg', 'fridge'); s.O.items.veg.state = 'whole'; const P = s.O.pot; P.food = 'raw'; P.progress = 0; P.kind = kind; s.emit('sound', 'plop'); } },
      { id: 'light', kind: 'do', label: 'Lighting the burner', dur: 1.1, ik: { R: 'knob0' }, lean: 0.45, look: 'knob0', end: (s, a) => { s.claim(a, 'burner0'); s.emit('sound', 'ignite'); } },
      { id: 'takeSpoon', kind: 'do', label: 'Picking up the spoon', dur: 0.8, ik: { R: 'spoonHome' }, lean: 0.3, end: (s, a) => s.take(a, 'spoon', 'R') },
      { id: 'simmer', kind: 'do', label: kind === 'stew' ? 'Simmering vegetable stew' : 'Stirring porridge', dur: 20, ik: { R: 'potStir', L: 'potHandle' }, loopIK: 'stir', lean: 0.25, look: 'pot', expr: 'content',
        tick: (s, a, f) => { const P = s.O.pot; P.progress = f; P.food = f < 0.12 ? 'raw' : f < 0.98 ? 'cooking' : 'cooked'; if (f > 0.1 && s.O.stove.b0 !== 'off') s.O.stove.b0 = 'cooking'; } },
      { id: 'stoveOff', kind: 'do', label: 'Turning off the stove', dur: 1.0, ik: { R: 'knob0' }, lean: 0.45,
        end: (s, a) => { s.release(a, 'burner0'); const P = s.O.pot; P.food = 'cooked'; P.portions = 4; P.cookedAt = s.absMin(); s.O.kitchen.dirt = Math.min(1, s.O.kitchen.dirt + 0.35); s.emit('sound', 'click'); } },
      { id: 'restSpoon', kind: 'do', label: 'Resting the spoon', dur: 0.8, ik: { R: 'spoonHome' }, lean: 0.3, end: (s) => s.place('spoon', 'rest') },
      ...pre('eat', serveSteps(true, p.neat)),
    ];
  },
  done(s, a, p) { a.remember(s, `Cooked ${p.kind === 'stew' ? 'vegetable stew' : 'berry porridge'} — it turned out lovely`, 8, 360, ['cooking']); },
};
A.serveAndEat = {
  label: 'Having leftovers', icon: '🍽️',
  params: { neat: 'bool' },
  score(s, a) { const P = s.O.pot; if (P.food !== 'cooked' || P.portions <= 0) return 0; if (s.clock.hour < 5.5 || s.clock.hour > 22) return 0; return s.urgency(a.needs.hunger) * 1.35 + (s.mealTime() ? 15 : 0); },
  plan(s, a) { return { neat: a.personality.neat > 0.5 }; },
  steps(p) { return serveSteps(false, p.neat); },
  done(s, a) { a.remember(s, 'Enjoyed a quiet meal at the kitchen table', 5, 200, ['meal']); },
};
A.doDishes = {
  label: 'Washing the dishes', icon: '🧽',
  params: {},
  score(s, a) { const P = s.O.items.plate; return P.dirty && P.at === 'table' ? 25 + 45 * a.personality.neat : 0; },
  plan() { return {}; },
  steps() { return dishesSteps(); },
  done(s, a) { a.remember(s, 'Did the dishes — kitchen feels tidy', 3, 120, ['chores']); },
};
A.makeTea = {
  label: 'Making tea', icon: '🫖',
  params: {},
  score(s, a) { const h = s.clock.hour; if (h < 6 || h > 21) return 0; return 20 + s.urgency(a.needs.fun) * 0.4 * a.prefs.tea + s.urgency(a.needs.energy) * 0.25 + ((h > 15 && h < 17) ? 14 : 0); },
  plan() { return {}; },
  steps() {
    return [
      { id: 'toKettle', kind: 'goto', to: 'kettle' },
      { id: 'kettleOn', kind: 'do', label: 'Putting the kettle on', dur: 1.0, ik: { R: 'knob3' }, lean: 0.45, look: 'kettle', end: (s, a) => { s.claim(a, 'burner3'); s.emit('sound', 'ignite'); } },
      { id: 'wait', kind: 'do', label: 'Waiting for the kettle', dur: 9, look: 'kettle', expr: 'content', idleArms: true, tick: (s, a, f) => { s.O.items.kettle.heat = f; } },
      { id: 'whistle', kind: 'do', label: 'Kettle whistling', dur: 1.2, ik: { R: 'knob3' }, lean: 0.45, start: (s) => s.emit('sound', 'whistle'), end: (s, a) => { s.release(a, 'burner3'); s.O.items.kettle.heat = 0.6; } },
      { id: 'toPlates', kind: 'goto', to: 'plates' },
      { id: 'takeCup', kind: 'do', label: 'Taking a teacup', dur: 0.9, ik: { R: 'cupHome' }, lean: 0.3, look: 'cupHome', end: (s, a) => s.take(a, 'cup', 'R') },
      { id: 'toPour', kind: 'goto', to: 'kettle', label: 'Pouring tea' },
      { id: 'pour', kind: 'do', label: 'Pouring tea', dur: 3, ik: { R: 'cupPour', L: 'kettleLift' }, lean: 0.3, look: 'cupPour',
        start: (s, a) => { s.take(a, 'kettle', 'L'); s.emit('sound', 'pour'); }, end: (s) => { s.O.items.cup.tea = 1; s.place('kettle', 'stove'); } },
      ...sitDown,
      { id: 'sip', kind: 'do', label: 'Sipping tea', dur: 14, seated: true, ik: { R: 'sip' }, loopIK: 'sip', look: 'window', expr: 'content',
        tick: (s, a, f, dt) => { s.O.items.cup.tea = 1 - f; a.needs.fun = Math.min(100, a.needs.fun + dt * 1.6); a.needs.energy = Math.min(100, a.needs.energy + dt * 0.5); } },
      { id: 'cupDown', kind: 'do', label: 'Putting the cup down', dur: 0.9, seated: true, ik: { R: 'tablePlaceCup' }, end: (s) => { s.place('cup', 'table'); s.O.items.cup.dirty = true; } },
      ...standUp,
      { id: 'toTable', kind: 'goto', to: 'chairSide' },
      { id: 'clearCup', kind: 'do', label: 'Clearing the cup', dur: 0.8, ik: { R: 'tablePlaceCup' }, lean: 0.2, end: (s, a) => s.take(a, 'cup', 'R') },
      { id: 'toSink', kind: 'goto', to: 'sink' },
      { id: 'tapOn', kind: 'do', label: 'Rinsing the cup', dur: 0.9, ik: { L: 'faucetHandle' }, lean: 0.35, end: (s, a) => s.claim(a, 'faucet') },
      { id: 'rinse', kind: 'do', label: 'Rinsing the cup', dur: 3, ik: { R: 'sinkR', L: 'sinkL' }, loopIK: 'scrub', lean: 0.3, look: 'sink' },
      { id: 'tapOff', kind: 'do', label: 'Rinsing the cup', dur: 0.8, ik: { L: 'faucetHandle' }, lean: 0.35, end: (s, a) => s.release(a, 'faucet') },
      { id: 'toShelf', kind: 'goto', to: 'plates' },
      { id: 'putAway', kind: 'do', label: 'Putting the cup away', dur: 0.8, ik: { R: 'cupHome' }, lean: 0.3, end: (s) => { s.place('cup', 'counter'); s.O.items.cup.dirty = false; s.O.items.cup.tea = 0; } },
    ];
  },
  done(s, a) { a.remember(s, 'A peaceful cup of tea by the window', 6, 180, ['tea']); },
};
A.readBook = {
  label: 'Reading', icon: '📖',
  params: {},
  score(s, a) { const h = s.clock.hour; if (h < 7 || h > 22.5) return 0; return s.urgency(a.needs.fun) * 0.9 * a.prefs.reading + (h > 19 ? 10 : 0); },
  plan() { return {}; },
  steps() {
    return [
      { id: 'toShelf', kind: 'goto', to: 'shelf' },
      { id: 'choose', kind: 'do', label: 'Choosing a book', dur: 1.2, ik: { R: 'bookHome' }, lean: 0.2, look: 'bookHome', end: (s, a) => s.take(a, 'book', 'R') },
      ...sitDown,
      { id: 'read', kind: 'do', label: 'Reading a novel', dur: 22, seated: true, ik: { R: 'readR', L: 'readL' }, loopIK: 'read', look: 'readBook', expr: 'focused',
        start: (s, a) => { s.take(a, 'book', 'both'); s.O.items.book.open = true; }, tick: (s, a, f, dt) => { a.needs.fun = Math.min(100, a.needs.fun + dt * 2.4); } },
      { id: 'close', kind: 'do', label: 'Closing the book', dur: 0.8, seated: true, ik: { R: 'readR' }, start: (s, a) => { s.O.items.book.open = false; s.take(a, 'book', 'R'); } },
      ...standUp,
      { id: 'back', kind: 'goto', to: 'shelf' },
      { id: 'putBack', kind: 'do', label: 'Putting the book back', dur: 1.0, ik: { R: 'bookHome' }, lean: 0.2, end: (s) => s.place('book', 'shelf') },
    ];
  },
  done(s, a) { a.remember(s, 'Lost in a good novel for a while', 5, 200, ['reading']); },
};
A.callFamily = {
  label: 'Phoning family', icon: '☎️',
  params: { who: ['darius', 'elias'] },
  score(s, a) { const h = s.clock.hour; if (h < 9 || h > 20.5) return 0; return s.urgency(a.needs.social) * 1.1 * a.personality.social; },
  // LL-009: the recipient is decided once, persisted in params, and used by both the label and done().
  plan(s) { const h = s.clock.hour; return { who: h > 9 && h < 17 && !s.clock.weekend() ? 'darius' : s.rng.next() < 0.5 ? 'darius' : 'elias' }; },
  steps(p) {
    return [
      { id: 'toPhone', kind: 'goto', to: 'phone' },
      { id: 'lift', kind: 'do', label: 'Lifting the receiver', dur: 1.0, ik: { R: 'handset' }, look: 'phone', end: (s, a) => { s.take(a, 'handset', 'R'); s.emit('sound', 'ring'); } },
      { id: 'talk', kind: 'do', label: p.who === 'darius' ? 'Calling Darius at work' : 'Checking in on Elias', dur: 16, ik: { R: 'ear' }, look: 'phone', expr: 'happy', talk: true,
        tick: (s, a, f, dt) => { a.needs.social = Math.min(100, a.needs.social + dt * 3.2); } },
      { id: 'hangUp', kind: 'do', label: 'Hanging up', dur: 1.0, ik: { R: 'handset' }, end: (s) => { s.place('handset', 'hook'); s.emit('sound', 'click'); } },
    ];
  },
  done(s, a, p) {
    const r = a.rel[p.who];
    if (r) { r.affection = Math.min(100, r.affection + 3); r.friendship = Math.min(100, r.friendship + 2); }
    a.remember(s, p.who === 'darius' ? 'Lovely chat with Darius on the phone' : 'Elias told me about his day', 7, 240, ['social', p.who]);
  },
};
A.tidyKitchen = {
  label: 'Tidying up', icon: '🧹',
  params: {},
  score(s, a) { const d = s.O.kitchen.dirt; if (d < 0.3) return 0; return d * 70 * a.personality.neat; },
  plan() { return {}; },
  steps() {
    return [
      { id: 'toRack', kind: 'goto', to: 'rack' },
      { id: 'takeRag', kind: 'do', label: 'Grabbing a cloth', dur: 0.8, ik: { R: 'ragHome' }, lean: 0.3, end: (s, a) => s.take(a, 'rag', 'R') },
      { id: 'toStove', kind: 'goto', to: 'stove' },
      { id: 'wipeStove', kind: 'do', label: 'Wiping the stove', dur: 6, ik: { R: 'wipeStove' }, loopIK: 'wipe', lean: 0.35, look: 'wipeStove', tick: (s) => { s.O.kitchen.dirt = Math.max(0.05, s.O.kitchen.dirt - 0.002); } },
      { id: 'toPrep', kind: 'goto', to: 'prep' },
      { id: 'wipePrep', kind: 'do', label: 'Wiping the counter', dur: 6, ik: { R: 'wipePrep' }, loopIK: 'wipe', lean: 0.35, look: 'wipePrep', end: (s) => { s.O.kitchen.dirt = 0.02; } },
      { id: 'back', kind: 'goto', to: 'rack' },
      { id: 'hangRag', kind: 'do', label: 'Hanging the cloth up', dur: 0.8, ik: { R: 'ragHome' }, lean: 0.3, end: (s) => s.place('rag', 'counter') },
    ];
  },
  done(s, a) { a.remember(s, 'Gave the kitchen a good wipe-down', 4, 180, ['chores']); },
};
// LL-007: hygiene previously had no utility-scored recovery action (only the 5-minute hand-wash inside cooking).
// Until the bathroom module exists this is a wash at the kitchen sink; Stage 2 moves it to the bathroom.
A.freshenUp = {
  label: 'Freshening up', icon: '🧼',
  params: {},
  score(s, a) { const n = a.needs.hygiene; if (n > 65) return 0; return s.urgency(n) * 1.4 + (n < 30 ? 30 : 0); },
  plan() { return {}; },
  steps() { return pre('wash', wash('Freshening up at the sink', 6, 7)); },
  done(s, a) { a.remember(s, 'Splashed some water on my face — much better', 2, 90, ['hygiene']); },
};
A.windowGaze = {
  label: 'Looking out the window', icon: '🪟',
  params: {},
  score(s, a) { return (s.clock.daylight() > 0.3 ? 14 : 4) + s.urgency(a.needs.fun) * 0.25; },
  plan() { return {}; },
  steps() { return [{ id: 'goto', kind: 'goto', to: 'window' }, { id: 'watch', kind: 'do', label: 'Watching the garden', dur: 9, look: 'window', expr: 'content', idleArms: true, tick: (s, a, f, dt) => { a.needs.fun = Math.min(100, a.needs.fun + dt * 0.6); } }]; },
  done(s, a) { if (s.rng.next() < 0.4) a.remember(s, s.clock.daylight() > 0.5 ? 'Watched the birds in the garden' : 'Watched the street lamps come on', 2, 90); },
};
A.lightsOn = {
  label: 'Turning on the lights', icon: '💡', urgent: true,
  params: {},
  score(s) { return s.dark() && !s.O.chandelier.on ? 140 : 0; },
  plan() { return {}; },
  steps() { return [{ id: 'goto', kind: 'goto', to: 'switch' }, { id: 'flip', kind: 'do', label: 'Flipping the light switch', dur: 0.9, ik: { R: 'switch' }, look: 'switch', end: (s) => { s.O.chandelier.on = true; s.emit('sound', 'switch'); } }]; },
};
A.lampOn = {
  label: 'Turning on the lamp', icon: '🛋️',
  params: {},
  score(s, a) { return s.clock.daylight() < 0.45 && !s.O.lamp.on && a.personality.cozy > 0.5 ? 60 : 0; },
  plan() { return {}; },
  steps() { return [{ id: 'goto', kind: 'goto', to: 'lamp' }, { id: 'switch', kind: 'do', label: 'Switching on the lamp', dur: 0.9, ik: { R: 'lampSwitch' }, lean: 0.3, look: 'lampSwitch', end: (s) => { s.O.lamp.on = true; s.emit('sound', 'switch'); } }]; },
};
A.lightsOff = {
  label: 'Turning off the lights', icon: '🌤️',
  params: { lamp: 'bool', chandelier: 'bool' },
  score(s) { return (s.O.chandelier.on || s.O.lamp.on) && s.clock.daylight() > 0.75 ? 45 : 0; },
  plan(s) { return { lamp: s.O.lamp.on, chandelier: s.O.chandelier.on }; },
  steps(p) {
    const st = [];
    if (p.lamp) st.push(...lampOffSteps('lamp'));
    if (p.chandelier) st.push({ id: 'toSwitch', kind: 'goto', to: 'switch' }, { id: 'flip', kind: 'do', label: 'Flipping the light switch', dur: 0.9, ik: { R: 'switch' }, end: (s) => { s.O.chandelier.on = false; s.emit('sound', 'switch'); } });
    return st;
  },
};
A.doze = {
  label: 'Resting in a chair', icon: '😴',
  params: {},
  score(s, a) { const h = s.clock.hour; if (h > 21 || h < 9) return 0; return a.needs.energy < 40 ? s.urgency(a.needs.energy) * 0.8 : 0; },
  plan() { return {}; },
  steps() { return [...sitDown, { id: 'doze', kind: 'do', label: 'Dozing off', dur: 25, seated: true, look: null, expr: 'tired', eyes: 1, tick: (s, a, f, dt) => { a.needs.energy = Math.min(100, a.needs.energy + dt * 0.9); } }, ...standUp]; },
  done(s, a) { a.remember(s, 'Had a little nap at the table', 2, 120); },
};
A.goToBed = {
  label: 'Heading to bed', icon: '🌙',
  params: { lamp: 'bool' },
  score(s, a) { const h = s.clock.hour; if (h >= 22.3 || h < 4) return 150; if (h > 21 && a.needs.energy < 50) return 120; return 0; },
  // LL-011: whether the lamp step exists is decided here and persisted, so a load can't shift the phases.
  plan(s) { return { lamp: s.O.lamp.on }; },
  steps(p) {
    const st = [];
    if (p.lamp) st.push(...lampOffSteps('lamp'));
    st.push(
      { id: 'toSwitch', kind: 'goto', to: 'switch' },
      { id: 'lightsOff', kind: 'do', label: 'Turning off the lights', dur: 0.9, ik: { R: 'switch' }, look: 'switch', end: (s) => { s.O.chandelier.on = false; s.emit('sound', 'switch'); } },
      { id: 'toDoor', kind: 'goto', to: 'door' },
      { id: 'openDoor', kind: 'do', label: 'Opening the door', dur: 1.2, ik: { R: 'doorKnob' }, look: 'doorKnob', start: (s, a) => s.claim(a, 'door') },
      { id: 'toHall', kind: 'goto', to: 'hall', label: 'Going upstairs to bed', noFace: true },
      { id: 'closeDoor', kind: 'do', label: 'Closing the door', dur: 1.0, start: (s, a) => s.release(a, 'door'), end: (s, a) => { s.emit('sound', 'doorClose'); a.away = true; a.sleeping = true; } },
    );
    return st;
  },
  done(s, a) { a.remember(s, 'Said goodnight to the kitchen', 0, 0, ['routine']); a.activity = 'Asleep (off-room)'; },
};
A.wakeUp = {
  label: 'Coming down for the day', icon: '🌅', urgent: true,
  params: {},
  score(s, a) { return a.away && s.clock.hour >= a.prefs.wake && s.clock.hour < 20 ? 200 : 0; },
  plan() { return {}; },
  steps() {
    return [
      { id: 'openDoor', kind: 'do', label: 'Opening the door', dur: 1.1, start: (s, a) => { a.away = false; a.sleeping = false; s.claim(a, 'door'); } },
      { id: 'enter', kind: 'goto', to: 'door', label: 'Walking into the kitchen' },
      { id: 'closeDoor', kind: 'do', label: 'Closing the door', dur: 1.1, ik: { L: 'doorKnob' }, look: 'doorKnob', start: (s, a) => s.release(a, 'door'), end: (s) => s.emit('sound', 'doorClose') },
    ];
  },
  done(s, a) { a.remember(s, s.clock.weekend() ? 'A slow weekend morning' : 'Up early to start the day', 3, 120, ['routine']); },
};

/** Every param combination an action's spec allows (used by tests and save validation). */
export function paramCombos(act) {
  let out = [{}];
  for (const [k, spec] of Object.entries(act.params)) {
    const vals = spec === 'bool' ? [false, true] : spec;
    out = out.flatMap((o) => vals.map((v) => ({ ...o, [k]: v })));
  }
  return out;
}
