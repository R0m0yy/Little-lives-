// Little Lives core — integer-tick clock. Authoritative time is (day, tickOfDay); minutes are derived,
// so save/restore and determinism never depend on accumulated floating-point minutes.
import { smooth } from './math.js';

export const TICKS_PER_MIN = 30;                 // 1 tick = 2 sim-seconds; at 1x speed 1 real second = 1 sim minute
export const TICK_MIN = 1 / TICKS_PER_MIN;       // sim minutes per tick
export const TICKS_PER_DAY = 1440 * TICKS_PER_MIN;
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const minToTicks = (m) => Math.max(1, Math.round(m * TICKS_PER_MIN));

export class Clock {
  constructor(day = 0, tickOfDay = (7 * 60 + 5) * TICKS_PER_MIN) { this.day = day; this.tickOfDay = tickOfDay; }
  get min() { return this.tickOfDay / TICKS_PER_MIN; }
  get hour() { return this.min / 60; }
  get absTick() { return this.day * TICKS_PER_DAY + this.tickOfDay; }
  absMin() { return this.absTick / TICKS_PER_MIN; }
  setHour(h) { this.tickOfDay = Math.round(((h % 24) + 24) % 24 * 60 * TICKS_PER_MIN) % TICKS_PER_DAY; }
  step() { if (++this.tickOfDay >= TICKS_PER_DAY) { this.tickOfDay = 0; this.day++; } }
  weekend() { return this.day % 7 >= 5; }
  label() { const h = Math.floor(this.min / 60), m = Math.floor(this.min % 60); const ap = h < 12 ? 'AM' : 'PM'; const hh = h % 12 || 12; return `${DAYS[this.day % 7]} ${hh}:${String(m).padStart(2, '0')} ${ap}`; }
  period() { const h = this.hour; return h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night'; }
  daylight() { const h = this.hour; if (h < 5.3 || h > 20.6) return 0; if (h < 7.6) return smooth((h - 5.3) / 2.3); if (h > 17.6) return 1 - smooth((h - 17.6) / 3.0); return 1; }
}
