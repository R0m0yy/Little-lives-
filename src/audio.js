// Little Lives — procedural household audio (WebAudio synthesis; no external sound files)
(function () {
  class Audio {
    constructor() { this.ctx = null; this.on = false; this.loops = {}; this.vol = 0.6; }
    enable() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
        this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 2; this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        // brown noise for room tone
        this.brown = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const b = this.brown.getChannelData(0); let l = 0;
        for (let i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = l * 3.5; }
      }
      this.ctx.resume && this.ctx.resume(); this.on = true; this.master.gain.value = this.vol;
      this.loop('room', true, { buf: 'brown', freq: 400, type: 'lowpass', gain: 0.05 });
      return true;
    }
    disable() { this.on = false; if (this.master) this.master.gain.value = 0; }
    _noise(dur, freq, q, gain, type = 'bandpass', t0 = 0, decay = true) {
      const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); const t = c.currentTime + t0;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    }
    _tone(freq, dur, gain, type = 'sine', t0 = 0, slide) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
      o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
    }
    play(name) {
      if (!this.on || !this.ctx) return;
      const r = Math.random;
      switch (name) {
        case 'step': this._noise(0.07, 260 + r() * 80, 1.2, 0.12, 'lowpass'); this._noise(0.03, 2200, 3, 0.03); break;
        case 'chop': this._noise(0.05, 1800, 2, 0.25); this._tone(140, 0.06, 0.15, 'triangle'); break;
        case 'fridge': this._noise(0.25, 300, 0.8, 0.12, 'lowpass'); this._tone(90, 0.2, 0.05); break;
        case 'fridgeClose': this._tone(70, 0.18, 0.3, 'sine', 0, 45); this._noise(0.1, 500, 1, 0.12, 'lowpass'); break;
        case 'place': case 'plop': this._tone(220, 0.1, 0.12, 'triangle', 0, 120); this._noise(0.06, 900, 1, 0.08); break;
        case 'plate': this._tone(1650 + r() * 200, 0.35, 0.05); this._tone(2480, 0.25, 0.03); this._noise(0.04, 3000, 2, 0.05); break;
        case 'ignite': this._noise(0.4, 1200, 0.6, 0.12, 'bandpass'); this._tone(60, 0.3, 0.05); break;
        case 'click': case 'switch': this._noise(0.025, 3500, 4, 0.25); this._tone(900, 0.03, 0.06, 'square'); break;
        case 'tapOn': this._tone(500, 0.08, 0.05, 'triangle', 0, 380); break; case 'tapOff': this._tone(380, 0.08, 0.05, 'triangle', 0, 500); break;
        case 'chair': this._noise(0.35, 380, 2.5, 0.09, 'bandpass'); this._noise(0.2, 160, 3, 0.06, 'bandpass', 0.12); break;
        case 'door': this._tone(240, 0.6, 0.03, 'sawtooth', 0, 330); this._noise(0.3, 600, 2, 0.05); break;
        case 'doorClose': this._tone(80, 0.2, 0.35, 'sine', 0, 50); this._noise(0.12, 400, 1, 0.15, 'lowpass'); break;
        case 'pour': for (let k = 0; k < 6; k++) this._noise(0.4, 900 + k * 120, 4, 0.05, 'bandpass', k * 0.35); break;
        case 'whistle': this._tone(1700, 1.0, 0.04, 'sine', 0, 1850); this._tone(2550, 1.0, 0.015, 'sine'); break;
        case 'ring': for (let k = 0; k < 6; k++) { this._tone(1250, 0.06, 0.05, 'square', k * 0.08); } break;
      }
    }
    // continuous loops follow household state (sizzle while cooking, running water, kettle rumble, clock)
    loop(id, on, o = {}) {
      if (!this.ctx) return;
      const L = this.loops[id];
      if (on && !L && this.on) {
        const c = this.ctx, s = c.createBufferSource(); s.buffer = o.buf === 'brown' ? this.brown : this.noise; s.loop = true;
        const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.value = o.freq || 1000; f.Q.value = o.q || 0.7;
        const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(o.gain || 0.05, c.currentTime, 0.3);
        s.connect(f); f.connect(g); g.connect(this.master); s.start();
        let lfo = null; if (o.lfo) { lfo = c.createOscillator(); lfo.frequency.value = o.lfo; const lg = c.createGain(); lg.gain.value = (o.gain || 0.05) * 0.6; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
        this.loops[id] = { s, g, lfo };
      } else if (!on && L) {
        L.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.25); const s = L.s, lf = L.lfo; setTimeout(() => { try { s.stop(); lf && lf.stop(); } catch (e) {} }, 900);
        delete this.loops[id];
      }
    }
    sync(sim) {
      if (!this.on) return;
      const O = sim.O;
      this.loop('sizzle', O.stove.heat0 > 0.3 && O.pot.food !== 'empty', { freq: 4200, q: 0.4, gain: 0.035, type: 'highpass', lfo: 6 });
      this.loop('bubble', O.pot.food === 'cooking' && O.stove.heat0 > 0.6, { freq: 380, q: 6, gain: 0.05, lfo: 9 });
      this.loop('water', O.faucet.on, { freq: 2400, q: 0.5, gain: 0.07 });
      this.loop('kettle', O.stove.heat3 > 0.3, { freq: 220, q: 3, gain: 0.04, lfo: 3 });
      this.loop('fridgehum', O.fridge.open > 0.1, { freq: 120, q: 4, gain: 0.03 });
    }
  }
  LL.Audio = Audio;
})();
