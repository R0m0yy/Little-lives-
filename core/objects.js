// Little Lives core — household object state.
// LL-038: every portable item has ONE authoritative location (`at`). When held, `at === 'held'` and
// `by`/`hand` name the holder. What an agent is holding is *derived* from item state (Sim.heldBy),
// never stored separately, so a hand slot and an item location can no longer disagree.

/** Item id -> home location (used by abort cleanup) and every location the item may legally occupy. */
export const ITEMS = {
  veg:     { home: 'fridge',  at: ['fridge', 'board', 'held'] },
  knife:   { home: 'board',   at: ['board', 'held'] },
  spoon:   { home: 'rest',    at: ['rest', 'plate', 'held'] },
  rag:     { home: 'counter', at: ['counter', 'held'] },
  book:    { home: 'shelf',   at: ['shelf', 'held'] },
  handset: { home: 'hook',    at: ['hook', 'held'] },
  cup:     { home: 'counter', at: ['counter', 'table', 'held'] },
  plate:   { home: 'rack',    at: ['stack', 'rack', 'stoveSide', 'table', 'sink', 'held'] },
  kettle:  { home: 'stove',   at: ['stove', 'held'] },
};
export const HANDS = ['R', 'L', 'both'];

const item = (at, extra = {}) => ({ at, by: null, hand: null, ...extra });

export function freshObjects() {
  return {
    items: {
      veg: item('fridge', { state: 'whole' }),      // whole | chopped
      knife: item('board'), spoon: item('rest'), rag: item('counter'),
      book: item('shelf', { open: false }),
      handset: item('hook'),
      cup: item('counter', { tea: 0, dirty: false }),
      plate: item('stack', { food: 0, kind: 'stew', dirty: false }),
      kettle: item('stove', { heat: 0 }),
    },
    // resource claims: resource id -> agent id | null (see resources.js)
    res: { burner0: null, burner3: null, faucet: null, fridge: null, chairA: null, door: null },
    fridge: { open: 0, target: 0 },
    stove: { b0: 'off', b3: 'off', heat0: 0, heat3: 0 },
    pot: { food: 'empty', progress: 0, portions: 0, kind: 'stew', temp: 0, cookedAt: -1 },
    faucet: { on: false }, chandelier: { on: false }, lamp: { on: false },
    door: { open: 0, target: 0 },
    chairA: { z: -0.2, target: -0.2, occupied: null },
    kitchen: { dirt: 0.15 },
  };
}

/** Throws if any agent has two items in one hand, or a two-handed item plus a one-handed one. */
export function checkHands(items) {
  const slots = {};
  for (const [id, it] of Object.entries(items)) {
    if (it.at !== 'held') { if (it.by != null || it.hand != null) throw new Error(`item ${id} not held but has holder`); continue; }
    if (!it.by || !HANDS.includes(it.hand)) throw new Error(`item ${id} held without valid holder/hand`);
    const s = (slots[it.by] ||= {});
    if (s[it.hand]) throw new Error(`${it.by} holds ${s[it.hand]} and ${id} in hand ${it.hand}`);
    if (it.hand === 'both' && (s.R || s.L)) throw new Error(`${it.by} cannot hold ${id} two-handed while holding ${s.R || s.L}`);
    if (it.hand !== 'both' && s.both) throw new Error(`${it.by} cannot hold ${id} while holding ${s.both} two-handed`);
    s[it.hand] = id;
  }
}
