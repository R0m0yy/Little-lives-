// Little Lives — bootstrap, camera system (overview / room / follow / director / cinematic), UI, loop, test API
(function () {
  const { M, V, Q, M4 } = LL;
  const $ = (s) => document.querySelector(s);
  // LL-030: save-derived strings (memories, relationship names/labels, action labels) must never be parsed as HTML
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (v) => (Number.isFinite(+v) ? Math.max(0, Math.min(100, +v)) : 0);
  const params = new URLSearchParams(location.hash.slice(1).replace(/,/g, '&'));
  const TEST = params.has('test');
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 600;

  let R, sim, world, naomi, anim, agent, audio;
  const canvas = $('#view');
  function boot() {
    try { R = new LL.Renderer(canvas, { mobile, preserve: TEST }); }
    catch (e) { $('#loading').innerHTML = `<div class="err">This device can't run the 3D view (WebGL2 unavailable).<br><small>${e.message}</small></div>`; return; }
    const T = LL.Tex;
    const tex = {
      planks: R.texture(T.planks()), wallpaper: R.texture(T.wallpaper()), tiles: R.texture(T.tiles()), paint: R.texture(T.paint([252, 249, 242])), wood: R.texture(T.grain([235, 225, 215], 0.14)),
      rug: R.texture(T.rug(), { clamp: true }), cloth: R.texture(T.cloth()), slate: R.texture(T.slate()), walnut: R.texture(T.walnut()), siding: R.texture(T.siding()), backdrop: R.texture(T.backdrop(), { clamp: true }),
      sky: R.texture(T.sky(), { clamp: true }), lace: R.texture(T.lace()), clock: R.texture(T.clockFace(), { clamp: true }), stew: R.texture(T.stew()), porridge: R.texture(T.porridge()),
      bookCover: R.texture(T.book('#6a2e3e')), pages: R.texture(T.pages(), { clamp: true }),
      iris: R.texture(T.iris([74, 44, 26]), { clamp: true }), hair: R.texture(T.hair()), floral: R.texture(T.floral()), paintCloth: R.texture(T.paint([252, 250, 246])),
    };
    const kit = LL.buildKitchen(R, tex);
    world = new LL.World(R, kit, tex);
    naomi = new LL.Character(R, LL.CharacterSpecs.naomi, tex);
    anim = new LL.Animator(naomi);
    // navigation: kitchen floor + hallway stub through the door
    const nav = new LL.NavGrid({ x0: -6.2, x1: 4.0, z0: -3.0, z1: 3.0 }, 0.1, 0.42);
    const Rm = LL.ROOM, D = LL.DOOR;
    nav.addStatic({ type: 'rect', x0: -4.0, x1: 3.9, z0: -3.0, z1: -2.24 });                 // counters, range, fridge
    nav.addStatic({ type: 'circle', x: LL.TABLE.x, z: LL.TABLE.z, r: LL.TABLE.r + 0.05 });   // table
    for (const c of LL.CHAIRS.slice(1)) nav.addStatic({ type: 'rect', x0: c.x - 0.3, x1: c.x + 0.3, z0: c.z - 0.3, z1: c.z + 0.3 });
    nav.addStatic({ type: 'rect', x0: 3.5, x1: 4.0, z0: -1.1, z1: -0.1 });                   // bookshelf
    nav.setDynamic('chairA', { type: 'rect', x0: 0.72, x1: 1.28, z0: -0.48, z1: 0.08 });
    nav.bake((x, z) => (x > Rm.x0 + 0.15 && x < Rm.x1 - 0.15 && z > Rm.z0 && z < Rm.z1 - 0.25) || (x <= Rm.x0 + 0.15 && x > -6.0 && z > D.z0 + 0.05 && z < D.z1 - 0.05));
    audio = new LL.Audio();
    sim = new LL.Sim(world, nav, audio);
    agent = new LL.Agent('naomi', naomi, anim, {
      name: 'Naomi',
      personality: { neat: 0.8, social: 1.0, foodie: 1.15, cozy: 0.85, playful: 0.5 },
      prefs: { tea: 1.2, reading: 1.0, wake: 6.9 },
      rel: { darius: { label: 'Husband', affection: 82, trust: 85, friendship: 74, conflict: 8 }, elias: { label: 'Son', affection: 88, trust: 70, friendship: 62, conflict: 18 }, laila: { label: 'Daughter', affection: 92, trust: 80, friendship: 70, conflict: 6 } },
    });
    sim.addAgent(agent);
    M.rand.seed((Date.now() & 0xffff) + 7);
    if (params.has('seed')) M.rand.seed(+params.get('seed'));
    if (params.has('time')) sim.clock.min = +params.get('time') * 60;
    world.sync(sim, 0); anim.update(0.016, 0, 0);
    setupInput(); setupUI();
    window.READY = true;
    if (!TEST) { $('#loading').classList.add('gone'); showStart(); requestAnimationFrame(loop); }
    else { $('#loading').classList.add('gone'); $('#start').classList.add('gone'); }
  }

  // ------------------------------------------------------------------ camera
  const SHOTS = {
    house: { t: [-1.0, 2.9, 0], d: 23, yaw: 0.1, pitch: 0.15, fov: 0.6, ap: 1.6 },
    kitchen: { t: [0.1, 1.8, -0.1], d: 13.5, yaw: 0.04, pitch: 0.12, fov: 0.6, ap: 1.9 },
    stove: { t: [-0.9, 1.45, -1.9], d: 6.2, yaw: 0.58, pitch: 0.14, fov: 0.55, ap: 2.4 },
    prep: { t: [1.2, 1.45, -1.9], d: 6.0, yaw: -0.56, pitch: 0.14, fov: 0.55, ap: 2.4 },
    sink: { t: [-2.6, 1.5, -1.8], d: 6.4, yaw: 0.6, pitch: 0.12, fov: 0.55, ap: 2.4 },
    fridge: { t: [2.8, 1.6, -1.5], d: 6.8, yaw: -0.62, pitch: 0.1, fov: 0.55, ap: 2.2 },
    table: { t: [1.0, 1.25, 0.2], d: 6.2, yaw: -0.12, pitch: 0.16, fov: 0.55, ap: 2.4 },
    phone: { t: [3.2, 1.8, 1.2], d: 6.0, yaw: -0.5, pitch: 0.08, fov: 0.55, ap: 2.3 },
    door: { t: [-3.0, 1.7, 0.8], d: 7.0, yaw: -0.38, pitch: 0.1, fov: 0.55, ap: 2.2 },
  };
  const cam = { mode: 'house', t: SHOTS.house.t.slice(), d: 23, yaw: 0.1, pitch: 0.15, fov: 0.6, ap: 1.6, uYaw: 0, uPitch: 0, uZoom: 1, shot: 'house', shotT: 0, cineT: -1 };
  function shotFor(a) {
    if (a.away) return 'house';
    const p = a.pos, st = a.steps && a.steps[a.stepIdx];
    if (st && st.seated || (a.anim.sit > 0.3)) return 'table';
    if (st && st.kind === 'goto') return 'follow';
    if (p[2] < -1.2) { if (p[0] < -1.9) return 'sink'; if (p[0] < 0.2) return 'stove'; if (p[0] < 2.4) return 'prep'; return 'fridge'; }
    if (p[0] > 3.0 && p[2] > 0.8) return 'phone';
    if (p[0] < -3.0) return 'door';
    return 'follow';
  }
  function camGoal() {
    let s;
    if (cam.mode === 'cinematic') {
      const t = cam.cineT;
      if (t < 4) s = SHOTS.house;
      else if (t < 9) s = SHOTS.kitchen;
      else if (cine.ending) s = cine.endT < 2.5 ? SHOTS.kitchen : SHOTS.house;
      else { const k = shotFor(agent); s = k === 'follow' ? followShot() : SHOTS[k]; }
    } else if (cam.mode === 'director') { const k = shotFor(agent); s = k === 'follow' ? followShot() : SHOTS[k]; }
    else if (cam.mode === 'follow') s = followShot();
    else s = SHOTS[cam.mode];
    return s;
  }
  function followShot() {
    const p = agent.pos; const sit = agent.anim.sit;
    return { t: [M.clamp(p[0], -3.2, 3.2), 1.55 - sit * 0.35, M.clamp(p[2], -2.2, 1.6) + 0.2], d: 7.2, yaw: M.clamp(-p[0] * 0.04, -0.2, 0.2), pitch: 0.13, fov: 0.55, ap: 2.3 };
  }
  function updateCam(dt) {
    const s = camGoal();
    const k = cam.mode === 'cinematic' && cam.cineT >= 4 && cam.cineT < 9 ? 0.9 : 2.2; // slow, smooth push-in during the cinematic
    for (let i = 0; i < 3; i++) cam.t[i] = M.damp(cam.t[i], s.t[i], k, dt);
    cam.d = M.damp(cam.d, s.d * cam.uZoom, k, dt); cam.yaw = M.damp(cam.yaw, s.yaw + cam.uYaw, k, dt); cam.pitch = M.damp(cam.pitch, s.pitch + cam.uPitch, k, dt);
    cam.fov = M.damp(cam.fov, s.fov, k, dt); cam.ap = M.damp(cam.ap, s.ap, k, dt);
  }
  function camMatrices(w, h) {
    const near = 0.25, far = 120;
    if (cam.override) { const o = cam.override; return { view: M4.lookAt(o.eye, o.t, [0, 1, 0]), proj: M4.persp(o.fov || 0.6, w / h, 0.05, far), eye: o.eye, near: 0.05, far }; }
    const cp = Math.cos(cam.pitch), eye = [cam.t[0] + Math.sin(cam.yaw) * cp * cam.d, cam.t[1] + Math.sin(cam.pitch) * cam.d, cam.t[2] + Math.cos(cam.yaw) * cp * cam.d];
    return { view: M4.lookAt(eye, cam.t, [0, 1, 0]), proj: M4.persp(cam.fov, w / h, near, far), eye, near, far };
  }
  function setCam(mode) { cam.mode = mode; cam.uYaw = 0; cam.uPitch = 0; cam.uZoom = 1; document.querySelectorAll('[data-cam]').forEach((b) => b.classList.toggle('on', b.dataset.cam === mode)); if (mode !== 'cinematic') cine.active = false; }

  // ------------------------------------------------------------------ cinematic (Section 27)
  const cine = { active: false, ending: false, endT: 0, watchStep: false };
  function startCinematic() {
    cine.active = true; cine.ending = false; cine.endT = 0; cine.sawEat = false;
    setCam('cinematic'); cine.active = true; cam.cineT = 0;
    // Naomi becomes genuinely hungry at lunchtime; the AI still chooses and runs the cooking action itself
    if (agent.action) sim.abort(agent, 'cinematic reset');
    agent.away = false; agent.sleeping = false; agent.pos = [-1.8, 0, -0.6]; agent.heading = Math.PI * 0.85; agent.anim.sit = agent.anim.sitTarget = 0;
    sim.O = Object.assign(sim.O, { pot: { food: 'empty', progress: 0, portions: 0, kind: 'stew', temp: 0, cookedAt: -1 } });
    sim.O.plate = { at: 'stack', food: 0, kind: 'stew', dirty: false }; sim.O.door.target = 0; sim.O.door.open = 0;
    sim.clock.min = 12 * 60 + 5; agent.needs.hunger = 22; agent.cooldowns = {};
    sim.forced = 'cookMeal'; sim.speed = 1;
  }
  function updateCinematic(dt) {
    if (cam.mode !== 'cinematic') return;
    cam.cineT += dt;
    if (agent.activity === 'Eating') cine.sawEat = true;
    if (cine.sawEat && agent.anim.sit < 0.2 && !cine.ending) { cine.ending = true; cine.endT = 0; }
    if (cine.ending) { cine.endT += dt; if (cine.endT > 9) { setCam('house'); toast('Cinematic finished'); } }
  }

  // ------------------------------------------------------------------ input (touch + mouse)
  function setupInput() {
    const pts = new Map(); let pinch0 = 0, zoom0 = 1, last = null, tapT = 0;
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY];
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = cam.uZoom; }
      const now = performance.now(); if (now - tapT < 300) setCam(cam.mode === 'follow' ? 'kitchen' : 'follow'); tapT = now; });
    canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1 && last) { cam.uYaw = M.clamp(cam.uYaw - (e.clientX - last[0]) * 0.004, -0.6, 0.6); cam.uPitch = M.clamp(cam.uPitch + (e.clientY - last[1]) * 0.003, -0.1, 0.45); last = [e.clientX, e.clientY]; }
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); cam.uZoom = M.clamp(zoom0 * pinch0 / Math.max(d, 1), 0.45, 1.8); }
    });
    const up = (e) => { pts.delete(e.pointerId); last = pts.size ? [...pts.values()][0] : null; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.uZoom = M.clamp(cam.uZoom * (1 + e.deltaY * 0.001), 0.45, 1.8); }, { passive: false });
  }

  // ------------------------------------------------------------------ UI
  let uiTab = 'needs';
  const NEEDS = [['hunger', 'Hunger', '#d98b5f'], ['energy', 'Energy', '#e0b851'], ['hygiene', 'Hygiene', '#7fb3c9'], ['fun', 'Fun', '#b98fd0'], ['social', 'Social', '#df8fa6']];
  function setupUI() {
    document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => { const s = +b.dataset.speed; if (s === 0) sim.paused = !sim.paused; else { sim.paused = false; sim.speed = s; } refreshSpeed(); }));
    document.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => b.dataset.cam === 'cinematic' ? startCinematic() : setCam(b.dataset.cam)));
    $('#card').addEventListener('click', (e) => { if (e.target.closest('.tabs')) return; $('#card').classList.toggle('open'); });
    document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { uiTab = b.dataset.tab; document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#menuBtn').addEventListener('click', () => $('#menu').classList.toggle('open'));
    $('#mSave').addEventListener('click', () => { const ok = saveLocal(); toast(ok ? 'Saved on this device' : 'This browser blocked local saving — use “Copy save code”'); });
    $('#mLoad').addEventListener('click', () => { const ok = loadLocal(); toast(ok ? 'Loaded your saved household' : 'No save found on this device'); });
    $('#mCopy').addEventListener('click', async () => { const code = btoa(unescape(encodeURIComponent(sim.serialize()))); $('#codeBox').value = code; $('#codeWrap').classList.add('open'); try { await navigator.clipboard.writeText(code); toast('Save code copied'); } catch (e) { toast('Select the code and copy it'); } });
    $('#mPaste').addEventListener('click', () => { $('#codeBox').value = ''; $('#codeWrap').classList.add('open'); });
    $('#codeLoad').addEventListener('click', () => { try { sim.load(decodeURIComponent(escape(atob($('#codeBox').value.trim())))); $('#codeWrap').classList.remove('open'); toast('Save code loaded'); } catch (e) { toast('That save code could not be read'); } });
    $('#codeClose').addEventListener('click', () => $('#codeWrap').classList.remove('open'));
    $('#mSound').addEventListener('click', () => { if (audio.on) { audio.disable(); toast('Sound off'); } else { audio.enable(); toast('Sound on'); } });
    $('#mStats').addEventListener('click', () => $('#stats').classList.toggle('open'));
    refreshSpeed();
  }
  function refreshSpeed() { document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', (+b.dataset.speed === 0 && sim.paused) || (!sim.paused && +b.dataset.speed === sim.speed))); }
  let toastT = 0; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }
  let uiAcc = 0;
  function updateUI(dt) {
    uiAcc += dt; if (uiAcc < 0.2) return; uiAcc = 0;
    $('#clock').textContent = sim.clock.label(); $('#period').textContent = sim.clock.period() + (sim.clock.weekend() ? ' · Weekend' : '');
    const a = agent; const act = a.action ? LL.Actions[a.action] : null;
    $('#activity').textContent = (act ? act.icon + ' ' : '') + a.activity;
    $('#mood').textContent = a.moodLabel(); $('#moodDot').style.background = `hsl(${a.mood() * 1.2},55%,58%)`;
    const body = $('#cardBody');
    if (uiTab === 'needs') body.innerHTML = NEEDS.map(([k, l, c]) => `<div class="need"><span>${l}</span><div class="bar"><i style="width:${pct(a.needs[k]).toFixed(0)}%;background:${c}"></i></div></div>`).join('') +
      `<div class="sub">Next on her mind: ${(a.lastScores || []).slice(0, 3).map((s) => (LL.Actions[s[1]] ? esc(LL.Actions[s[1]].label.toLowerCase()) : '')).join(' · ') || '—'}</div>`;
    else if (uiTab === 'rel') body.innerHTML = Object.entries(a.rel).map(([k, r]) => `<div class="rel"><b>${esc(k[0].toUpperCase() + k.slice(1))}</b> <small>${esc(r.label)}</small><div class="bar"><i style="width:${pct(r.affection)}%;background:#df8fa6"></i></div><small>Trust ${esc(r.trust)} · Friendship ${esc(r.friendship)} · Conflict ${esc(r.conflict)}</small></div>`).join('') + '<div class="sub">Darius, Elias and Laila move in at Milestone 5.</div>';
    else if (uiTab === 'mem') body.innerHTML = a.memories.slice(0, 7).map((m) => `<div class="mem"><small>${esc(m.t)}</small>${esc(m.text)}</div>`).join('') || '<div class="sub">No memories yet today.</div>';
    else body.innerHTML = Object.entries(a.personality).map(([k, v]) => `<div class="need"><span>${k[0].toUpperCase() + k.slice(1)}</span><div class="bar"><i style="width:${Math.min(100, v * 80)}%;background:#a9b48a"></i></div></div>`).join('') + `<div class="sub">Wakes around ${Math.floor(a.prefs.wake)}:${String(Math.round((a.prefs.wake % 1) * 60)).padStart(2, '0')} · loves tea and cooking</div>`;
    if ($('#stats').classList.contains('open')) $('#stats').textContent = `${fps.toFixed(0)} fps · ${R.stats.draws} draws · ${(R.stats.tris / 1000).toFixed(0)}k tris · ${R.W}×${R.H}`;
  }
  function showStart() {
    const has = (() => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } })();
    $('#stContinue').style.display = has ? '' : 'none';
    const go = (cont) => { audio.enable(); if (cont) loadLocal(); $('#start').classList.add('gone'); setTimeout(() => setCam('kitchen'), 2500); };
    $('#stNew').addEventListener('click', () => go(false)); $('#stContinue').addEventListener('click', () => go(true));
    $('#stQuiet').addEventListener('click', () => { $('#start').classList.add('gone'); setTimeout(() => setCam('kitchen'), 2500); });
  }
  const SAVE_KEY = 'littlelives.save.v1';
  function saveLocal() { try { localStorage.setItem(SAVE_KEY, sim.serialize()); return true; } catch (e) { return false; } }
  function loadLocal() { try { const s = localStorage.getItem(SAVE_KEY); if (!s) return false; sim.load(s); return true; } catch (e) { return false; } }

  // ------------------------------------------------------------------ frame
  let fps = 60, lastT = performance.now(), autosave = 0, stepPhase = 0;
  function frame(dt) {
    sim.update(dt);
    const sdt = sim.paused ? 0 : dt * sim.speed;
    anim.update(sdt, agent.curSpeed || 0, agent.curAng || 0);
    // footsteps from the locomotion phase
    if (agent.curSpeed > 0.2 && sim.speed <= 3) { const ph = Math.floor(anim.phase / Math.PI); if (ph !== stepPhase) { stepPhase = ph; audio.play('step'); } }
    world.sync(sim, sdt); audio.sync(sim);
    updateCinematic(dt); updateCam(dt);
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    R.resize(w, h);
    const c = camMatrices(w, h);
    const focus = cam.override ? V.dist(c.eye, cam.override.t) : V.dist(c.eye, cam.t);
    R.render({ items: [...world.items, ...naomi.items], cam: c, env: world.env, shadowCenter: [-0.5, 1.5, 0], shadowRadius: 8.5, particles: world.drawParticles, post: { focus, aperture: cam.ap, maxR: mobile ? 7 : 10 } });
    updateUI(dt);
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    fps = M.lerp(fps, 1 / Math.max(dt, 1e-3), 0.05);
    frame(dt);
    autosave += dt; if (autosave > 60) { autosave = 0; saveLocal(); }
    requestAnimationFrame(loop);
  }
  // ------------------------------------------------------------------ test / capture API (used by the QA harness)
  window.LLAPI = {
    get sim() { return sim; }, get agent() { return agent; }, get world() { return world; }, get cam() { return cam; },
    frame: (dt = 1 / 30, n = 1) => { for (let i = 0; i < n; i++) frame(dt); return true; },
    // fast-forward the simulation with coarse steps but full logic (no rendering) — for multi-day soak tests
    soak: (simMinutes, dt = 0.25) => { const s0 = sim.speed; sim.speed = 1; const n = Math.ceil(simMinutes / dt); for (let i = 0; i < n; i++) { sim.update(dt); anim.update(dt, agent.curSpeed || 0, agent.curAng || 0); world.sync(sim, dt); } sim.speed = s0; return true; },
    setCam, startCinematic, cine,
    debugCam: (eye, t, fov) => { cam.override = eye ? { eye, t, fov } : null; },
    snap: () => { const s = camGoal(); cam.t = s.t.slice(); cam.d = s.d; cam.yaw = s.yaw; cam.pitch = s.pitch; cam.fov = s.fov; cam.ap = s.ap; },
    until: (pred, maxMin = 600, dt = 0.1) => { const f = new Function('a', 'sim', 'return ' + pred); let m = 0; while (m < maxMin) { sim.update(dt); anim.update(dt, agent.curSpeed || 0, agent.curAng || 0); world.sync(sim, dt); m += dt; if (f(agent, sim)) return +m.toFixed(1); } return -1; },
    state: () => ({ clock: sim.clock.label(), action: agent.action, step: agent.stepIdx, activity: agent.activity, pos: agent.pos.map((v) => +v.toFixed(2)), needs: Object.fromEntries(Object.entries(agent.needs).map(([k, v]) => [k, +v.toFixed(1)])), mood: agent.moodLabel(), away: agent.away, sit: +agent.anim.sit.toFixed(2), O: sim.O }),
  };
  window.addEventListener('load', () => setTimeout(boot, 30));
})();
