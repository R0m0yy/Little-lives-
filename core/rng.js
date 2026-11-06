// Little Lives core — seedable xorshift32 RNG. One instance per Sim; its state is saved (LL-010).
export class Rng {
  constructor(seed = 1234567) { this.s = (seed >>> 0) || 1; }
  seed(v) { this.s = (v >>> 0) || 1; }
  next() { let s = this.s; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; this.s = s; return s / 4294967296; }
  get state() { return this.s; }
  set state(v) { this.s = (v >>> 0) || 1; }
}
