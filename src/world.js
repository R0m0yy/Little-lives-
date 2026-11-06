// Little Lives — visual sync: household object states -> meshes, held props, lighting, day/night, particles
(function () {
  const { M, V, Q, M4 } = LL; const lin = LL.lin;
  const T = (x, y, z) => M4.translate(x, y, z);
  const mul = (...m) => m.reduce((a, b) => M4.mul(a, b));
  const rx = (a) => M4.trs([0, 0, 0], Q.axis([1, 0, 0], a)), ry = (a) => M4.rotY(a), rz = (a) => M4.trs([0, 0, 0], Q.axis([0, 0, 1], a));
  const S = (s) => M4.trs([0, 0, 0], null, Array.isArray(s) ? s : [s, s, s]);

  class World {
    constructor(R, kit, tex) {
      this.R = R; this.dyn = kit.dyn; this.statics = kit.statics; this.tex = tex; this.particles = []; this.t = 0;
      this.items = [...this.statics, ...Object.values(this.dyn)];
      this.env = { keyDir: [-0.42, 0.62, 0.72], keyCol: [1, 1, 1], sky: [0.3, 0.3, 0.3], ground: [0.2, 0.15, 0.1], lights: [], room: [LL.ROOM.x0, LL.ROOM.x1, LL.ROOM.z0, 0], roomFloor: 0, clear: [0.1, 0.08, 0.06] };
    }
    fridgeHandle() { const d = this.dyn.fridgeDoor; return M4.point(d.model, [-(1.46 - 0.08) + 0.14, 1.65, 0.2]); }
    doorKnob() { const d = this.dyn.door; return M4.point(d.model, [0.1, 1.45, -1.3 + 0.14]); }
    handPos(a, side) { return M4.point(a.ch.boneWorld('hand_' + side), [0, -0.075, 0.01]); }
    sync(sim, dt) {
      this.t += dt;
      const D = this.dyn, O = sim.O, a = sim.agents[0], clk = sim.clock;
      // appliances
      D.fridgeDoor.model = mul(T(...D.fridgeDoor.pivot), ry(M.smooth(O.fridge.open) * 1.75));
      D.fridgeLight.visible = O.fridge.open > 0.08;
      D.door.model = mul(T(...D.door.pivot), ry(M.smooth(O.door.open) * 1.45));
      D.chairA.model = mul(T(LL.TABLE.x, 0, O.chairA.z), ry(0));
      D.burnerGlow.visible = O.stove.heat0 > 0.02; D.burnerGlow.emis = 2.5 * O.stove.heat0; D.burnerGlow.tint = [1, 1, 1, 1];
      D.burnerGlow3.visible = O.stove.heat3 > 0.02; D.burnerGlow3.emis = 2.5 * O.stove.heat3;
      D.switchToggle.model = mul(T(...LL.SWITCH), rz(O.chandelier.on ? 0.35 : -0.35));
      D.chandelierShades.emis = O.chandelier.on ? 1.6 : 0; D.lampShade.emis = O.lamp.on ? 1.5 : 0;
      D.water.visible = O.faucet.on; if (O.faucet.on) D.water.model = mul(T(...LL.FAUCET), S([1 + Math.sin(this.t * 40) * 0.1, 1, 1 + Math.cos(this.t * 37) * 0.1]));
      D.crumbs.visible = O.kitchen.dirt > 0.28; D.crumbs.tint = [1, 1, 1, M.clamp((O.kitchen.dirt - 0.28) * 3, 0, 1)];
      // pot & food states (raw -> cooking -> cooked)
      const P = O.pot, bur = LL.BURNER;
      D.pot.model = T(bur[0], bur[1], bur[2]);
      D.potFood.visible = P.food !== 'empty';
      D.potFood.tex = P.kind === 'stew' ? this.tex.stew : this.tex.porridge;
      D.potFood.model = T(bur[0], bur[1] + 0.12 + 0.06 * Math.min(1, P.portions / 4 + (P.food !== 'cooked' ? 1 : 0)), bur[2]);
      const ck = P.food === 'raw' ? 0 : P.food === 'cooking' ? P.progress : 1;
      D.potFood.tint = [M.lerp(1.15, 1, ck), M.lerp(1.25, 0.95, ck), M.lerp(0.85, 0.9, ck), 1];
      // kettle
      D.kettle.model = O.kettle.at === 'hand' ? mul(T(...V.add(this.handPos(a, 'L'), [0.05, -0.12, 0])), ry(a.heading + Math.PI / 2), rz(-0.55)) : T(-0.15, 1.24, -2.78);
      // cutting board vegetables
      D.vegWhole.visible = O.board.veg === 'whole'; D.vegWhole.model = T(LL.BOARD[0] - 0.05, LL.BOARD[1] - 0.005, LL.BOARD[2]);
      D.vegChopped.visible = O.board.veg === 'chopped' || a.hold.both === 'vegChopped';
      if (a.hold.both === 'vegChopped') D.vegChopped.model = mul(T(...V.lerp(this.handPos(a, 'L'), this.handPos(a, 'R'), 0.5)), ry(a.heading), S(0.6));
      else D.vegChopped.model = T(LL.BOARD[0] + 0.02, LL.BOARD[1] - 0.005, LL.BOARD[2]);
      // props: held or at home
      const hm = (side, off, rot) => mul(a.ch.boneWorld('hand_' + side), T(...off), rot || M4.ident());
      const level = (p, h, extra) => mul(T(...p), ry(h), extra || M4.ident());
      const R_ = a.hold.R;
      D.vegHand.visible = R_ === 'vegHand'; if (D.vegHand.visible) D.vegHand.model = hm('R', [0, -0.05, 0.04]);
      D.knife.model = O.knife.at === 'hand' ? hm('R', [0, -0.07, 0.025], rx(0.3)) : mul(T(LL.BOARD[0] + 0.32, LL.BOARD[1] - 0.005, LL.BOARD[2] + 0.12), ry(0.3), rz(Math.PI / 2));
      const plateM = this.plateModel(a, O);
      D.plate.model = plateM;
      D.plateFood.visible = O.plate.food > 0.02 && O.plate.at !== 'stack' && O.plate.at !== 'rack';
      D.plateFood.tex = O.plate.kind === 'stew' ? this.tex.stew : this.tex.porridge;
      const fs = Math.sqrt(Math.max(0.05, O.plate.food));
      D.plateFood.model = mul(plateM, T(0, 0.012, 0), S([fs, fs, fs]));
      D.spoon.model = O.spoon.at === 'hand' ? hm('R', [0, -0.06, 0.03], rx(0.5)) : O.spoon.at === 'plate' ? mul(T(LL.TABLE.x + 0.14, LL.TABLE.y + 0.03, 0.4), ry(0.4), rz(Math.PI / 2)) : O.spoon.at === 'plateHeld' ? mul(plateM, T(0.1, 0.03, 0), rz(Math.PI / 2)) : mul(T(0.14, 1.058, -2.55), rz(Math.PI / 2));
      D.rag.model = O.rag.at === 'hand' ? level(V.add(this.handPos(a, 'R'), [0, -0.05, 0]), a.heading) : T(-1.7, 1.06, -2.5);
      D.cup.model = O.cup.at === 'hand' ? level(V.add(this.handPos(a, 'R'), [0, -0.09, 0.02]), a.heading) : O.cup.at === 'table' ? T(LL.TABLE.x + 0.3, LL.TABLE.y + 0.005, 0.3) : T(0.98, 1.04, -2.6);
      D.handset.model = O.handset.at === 'hand' ? hm('R', [0, -0.08, 0.02], rx(-1.2)) : T(...D.handset.rest);
      D.book.visible = a.hold.both !== 'bookOpen';
      D.book.model = O.book.at === 'hand' && a.hold.R === 'book' ? level(V.add(this.handPos(a, 'R'), [0, -0.04, 0]), a.heading, rz(0.2)) : mul(T(3.72, 1.07, -0.6), ry(0.3));
      D.bookOpen.visible = a.hold.both === 'bookOpen';
      if (D.bookOpen.visible) D.bookOpen.model = mul(T(...a.bookWorld()), ry(a.heading), rx(-0.95));
      // clock + window sky + curtains
      const hr = clk.min / 60;
      for (const [k, ang] of [['hourHand', (hr % 12) / 12 * Math.PI * 2], ['minHand', (clk.min % 60) / 60 * Math.PI * 2]]) D[k].model = mul(T(...D[k].at), rx(ang));
      for (const sx of [-1, 1]) D['curtain' + sx].model = mul(T(...D['curtain' + sx].base), rz(Math.sin(this.t * 0.7 + sx) * 0.015 * (sim.speed > 0 ? 1 : 0)), ry(Math.sin(this.t * 0.5 + sx * 2) * 0.03));
      // lighting & day/night
      const day = clk.daylight(), h = clk.hour;
      const dusk = Math.max(0, 1 - Math.abs(h - 19.0) / 1.6) + Math.max(0, 1 - Math.abs(h - 6.4) / 1.2);
      const skyDay = [0.55, 0.72, 0.92], skyNight = [0.03, 0.05, 0.12], skyDusk = [0.95, 0.55, 0.35];
      let sky = V.lerp(skyNight, skyDay, day); sky = V.lerp(sky, skyDusk, M.clamp(dusk, 0, 1) * 0.6 * (1 - day * 0.5));
      D.sky.tint = [sky[0] * 1.3, sky[1] * 1.3, sky[2] * 1.3, 1];
      const winGlow = 1 - day; D.dormerGlow.tint = V.lerp([0.18, 0.22, 0.3], [1.1, 0.8, 0.45], winGlow).concat(1); D.stubWindow.tint = V.lerp([0.2, 0.25, 0.32], [1.0, 0.76, 0.45], winGlow).concat(1);
      D.backdrop.tint = V.lerp([0.42, 0.36, 0.32], [0.9, 0.86, 0.82], day).concat(1);
      const env = this.env;
      env.keyCol = V.lerp([0.55, 0.4, 0.28], [1.05, 0.98, 0.9], day);
      env.sky = V.lerp([0.13, 0.1, 0.09], [0.36, 0.36, 0.38], day); env.ground = V.lerp([0.08, 0.06, 0.05], [0.2, 0.16, 0.12], day);
      env.clear = V.lerp([0.05, 0.04, 0.035], [0.22, 0.2, 0.18], day);
      const L = [];
      if (O.chandelier.on) L.push({ p: LL.CHANDELIER, r: 9, c: [1, 0.72, 0.42], i: 2.4 });
      if (O.lamp.on) L.push({ p: [2.0, 1.55, -2.68], r: 4.5, c: [1, 0.68, 0.38], i: 1.8 });
      if (day > 0.01) L.push({ p: [-2.75, 2.5, -2.35], r: 8, c: V.lerp([1, 0.65, 0.45], [0.8, 0.9, 1.0], day), i: 1.4 * day });
      if (O.stove.heat0 > 0.02) L.push({ p: [bur[0], 1.25, bur[2] + 0.1], r: 2.2, c: [1, 0.45, 0.15], i: O.stove.heat0 * 1.3 });
      if (O.stove.heat3 > 0.02) L.push({ p: [-0.15, 1.25, -2.65], r: 2.0, c: [1, 0.45, 0.15], i: O.stove.heat3 * 1.0 });
      if (O.fridge.open > 0.08) L.push({ p: [3.1, 1.6, -2.1], r: 2.6, c: [0.85, 0.92, 1], i: O.fridge.open * 1.2 });
      L.push({ p: [-0.5, 3.2, 2.2], r: 10, c: [1, 0.85, 0.7], i: 0.25 + 0.2 * day }); // soft fill bouncing in through the open front
      env.lights = L;
      // particles: steam from the pot, kettle, hot plate; dust motes in sunlight
      const emit = (p, v, life, s, c) => this.particles.push({ p: p.slice(), v, life, max: life, s, c });
      const sd = dt * Math.max(1, sim.speed * 0.5);
      if (P.food !== 'empty' && P.temp > 0.3 && M.rand.next() < sd * 9 * P.temp) emit([bur[0] + (M.rand.next() - 0.5) * 0.25, 1.35, bur[2] + (M.rand.next() - 0.5) * 0.25], [0, 0.35, 0.05], 2.2, 0.07, [0.9, 0.9, 0.9]);
      if (O.kettle.heat > 0.5 && O.stove.b3 !== 'off' && M.rand.next() < sd * 14) emit([0.15, 1.38, -2.78], [0.25, 0.45, 0.1], 1.4, 0.05, [0.95, 0.95, 0.95]);
      if (O.plate.food > 0.1 && (O.plate.at === 'table' || O.plate.at === 'hand') && P.temp > 0.2 && M.rand.next() < sd * 3) emit(V.add(M4.point(plateM, [0, 0.08, 0]), [(M.rand.next() - 0.5) * 0.1, 0, 0]), [0, 0.22, 0], 1.6, 0.045, [0.85, 0.85, 0.85]);
      if (day > 0.5 && M.rand.next() < dt * 2) emit([-2.75 + (M.rand.next() - 0.5) * 2, 1 + M.rand.next() * 2.5, -2.2 + M.rand.next() * 2], [(M.rand.next() - 0.5) * 0.03, -0.01, 0.02], 6, 0.012, [1, 0.95, 0.8]);
      const out = [];
      for (const p of this.particles) {
        p.life -= dt * (sim.speed > 0 ? 1 : 0); if (p.life <= 0) continue;
        p.p[0] += p.v[0] * dt; p.p[1] += p.v[1] * dt; p.p[2] += p.v[2] * dt; p.v[0] += (M.rand.next() - 0.5) * dt * 0.2;
        const k = p.life / p.max, fade = Math.sin(k * Math.PI);
        out.push({ p: p.p, s: p.s * (1.6 - k * 0.8), c: V.scale(p.c, fade * 0.35) });
      }
      this.particles = this.particles.filter((p) => p.life > 0).slice(-300);
      this.drawParticles = out;
      // character visibility (away = upstairs; the hallway is visible only through the open door)
      for (const it of a.ch.items) it.visible = !(a.away && O.door.open < 0.05);
    }
    plateModel(a, O) {
      const at = O.plate.at;
      if (at === 'hand' || a.hold.both === 'plateSink') {
        const mid = V.lerp(this.handPos(a, 'L'), this.handPos(a, 'R'), 0.5);
        return a.hold.both === 'plateSink' ? mul(T(...V.add(mid, [0, -0.02, 0])), ry(a.heading), rx(-0.6)) : mul(T(...V.add(mid, [0, -0.035, 0])), ry(a.heading));
      }
      if (at === 'stoveSide') return T(-0.25, 1.07, -2.42);
      if (at === 'table') return T(LL.TABLE.x, LL.TABLE.y + 0.005, 0.38);
      if (at === 'rack') return mul(T(-1.95, 1.24, -2.55), rx(-1.3));
      return T(0.62, 1.04 + 0.11, -2.55);
    }
  }
  LL.World = World;
})();
