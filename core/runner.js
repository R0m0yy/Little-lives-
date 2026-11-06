// Little Lives core — fixed-timestep driver. The renderer calls advance(realSeconds) once per frame;
// the sim always advances in whole ticks, independent of frame rate. `alpha` is the leftover fraction
// of a tick, for interpolating visuals between the previous and current sim state.
import { TICKS_PER_MIN } from './clock.js';

export class FixedStepRunner {
  constructor(sim, { maxTicksPerAdvance = 1200 } = {}) { this.sim = sim; this.acc = 0; this.paused = false; this.maxTicks = maxTicksPerAdvance; this.alpha = 0; }
  /** @returns number of ticks executed */
  advance(realSeconds) {
    if (this.paused) return 0;
    // 1 real second at speed 1 == 1 sim minute == TICKS_PER_MIN ticks
    this.acc += Math.max(0, realSeconds) * this.sim.speed * TICKS_PER_MIN;
    let n = Math.floor(this.acc);
    if (n > this.maxTicks) { n = this.maxTicks; this.acc = n; } // drop backlog after a long stall instead of spiralling
    this.acc -= n;
    this.sim.run(n);
    this.alpha = this.acc;
    return n;
  }
}
