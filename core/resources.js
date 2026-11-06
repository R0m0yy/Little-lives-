// Little Lives core — claimable household resources (LL-013).
// A step that turns something on CLAIMS it for the agent; the matching step RELEASES it.
// Aborting a task releases every claim the agent still owns, which runs the same release handler,
// so burners, taps, the fridge door, the chair and the room door are always left in a safe state.
// Claims are per agent, so two agents can't both own a burner (needed for the four-person family).
export const RESOURCES = {
  burner0: { acquire(s) { s.O.stove.b0 = 'heating'; }, release(s) { s.O.stove.b0 = 'off'; } },
  burner3: { acquire(s) { s.O.stove.b3 = 'heating'; }, release(s) { s.O.stove.b3 = 'off'; } },
  faucet:  { acquire(s) { s.O.faucet.on = true; s.emit('sound', 'tapOn'); }, release(s) { if (s.O.faucet.on) s.emit('sound', 'tapOff'); s.O.faucet.on = false; } },
  fridge:  { acquire(s) { s.O.fridge.target = 1; s.emit('sound', 'fridge'); }, release(s) { s.O.fridge.target = 0; } },
  chairA:  { acquire(s) { s.O.chairA.target = -0.65; s.emit('sound', 'chair'); },
             release(s, a) { s.O.chairA.target = -0.2; if (s.O.chairA.occupied === a.id) s.O.chairA.occupied = null; a.seated = false; } },
  door:    { acquire(s) { s.O.door.target = 1; s.emit('sound', 'door'); }, release(s) { s.O.door.target = 0; } },
};

export class ResourceBusy extends Error {
  constructor(res, owner) { super(`${res} in use by ${owner}`); this.res = res; this.owner = owner; }
}
