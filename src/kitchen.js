// Little Lives — Victorian kitchen module (ground-floor right bay of the Reference-B house) on a wooden tabletop
(function () {
  const { M, V, Q, M4 } = LL; const lin = LL.lin; const MB = LL.MeshBuilder;
  const ROOM = { x0: -4, x1: 4, z0: -3, z1: 3, h: 4.6 };
  LL.ROOM = ROOM;

  function build(R, tex) {
    const groups = {};
    const G = (k) => (groups[k] = groups[k] || new MB());
    const dyn = {}; // dynamic objects: { mesh, model, ... }
    const C = (h) => lin(h);
    const cream = C('#efe3c8'), trim = C('#f6efe0'), brass = C('#c99a45'), iron = C('#1f1c1b'), copper = C('#b8673a'), white = C('#f4f1ea');
    const { x0, x1, z0, z1, h } = ROOM;

    // ---------------- shell: floor, walls, ceiling (interior)
    let g = G('floor'); g.set({ color: [1, 1, 1], spec: 0.25, shin: 0.45, uvScale: 0.22 });
    g.pushT(0, -0.04, 0); g.box(x1 - x0, 0.08, z1 - z0 + 0.3); g.pop();
    g = G('wall'); g.set({ color: [1, 1, 1], spec: 0.03, shin: 0.1, uvScale: 0.55 });
    g.pushT(0, h / 2, z0 - 0.075); g.box(x1 - x0, h, 0.15); g.pop();                 // back
    { const dz0 = 0.35, dz1 = 1.65, dt = 3.3; // left wall split around the hallway door opening
      g.pushT(x0 - 0.075, h / 2, (z0 + dz0) / 2); g.box(0.15, h, dz0 - z0); g.pop();
      g.pushT(x0 - 0.075, h / 2, (dz1 + z1) / 2); g.box(0.15, h, z1 - dz1); g.pop();
      g.pushT(x0 - 0.075, (dt + h) / 2, (dz0 + dz1) / 2); g.box(0.15, h - dt, dz1 - dz0); g.pop(); }
    g.pushT(x1 + 0.075, h / 2, 0); g.box(0.15, h, z1 - z0); g.pop();                 // right
    // backsplash tiles
    g = G('tile'); g.set({ color: [1, 1, 1], spec: 0.5, shin: 0.75, uvScale: 0.5 });
    g.pushT(0, 1.75, z0 + 0.012); g.box(x1 - x0 - 0.02, 1.45, 0.02); g.pop();
    // wainscot on side walls + chair rail + skirting (painted wood)
    g = G('paint'); g.set({ color: cream, spec: 0.12, shin: 0.35, uvScale: 0.5 });
    for (const sx of [-1, 1]) {
      const wx = sx < 0 ? x0 + 0.03 : x1 - 0.03;
      g.pushT(wx, 0.7, 0.6); g.box(0.06, 1.4, z1 - z0 - 1.2 + 0.0); g.pop();
      g.set({ color: trim }); g.pushT(wx + -sx * 0.02, 1.42, 0); g.box(0.1, 0.07, z1 - z0); g.pop();
      for (let k = 0; k < 6; k++) { g.pushT(wx - sx * 0.035, 0.7, -2.2 + k * 0.95); g.rbox(0.03, 1.0, 0.7, 0.012, 2); g.pop(); }
      g.set({ color: cream });
    }
    g.set({ color: trim });
    g.pushT(0, h - 0.09, z0 + 0.08); g.rbox(x1 - x0, 0.18, 0.16, 0.05, 2); g.pop();               // crown molding
    for (const sx of [-1, 1]) { g.pushT(sx < 0 ? x0 + 0.08 : x1 - 0.08, h - 0.09, 0); g.rbox(0.16, 0.18, z1 - z0, 0.05, 2); g.pop(); }
    // ceiling
    g = G('paint'); g.set({ color: C('#f2ead8') }); g.pushT(0, h + 0.06, 0); g.box(x1 - x0 + 0.3, 0.12, z1 - z0 + 0.3); g.pop();

    // ---------------- WINDOW above the sink (sky quad animates with time of day)
    const win = { x: -2.75, y: 2.45, w: 1.5, hh: 1.6 };
    g = G('paint'); g.set({ color: trim });
    g.pushT(win.x, win.y - win.hh / 2 - 0.06, z0 + 0.1); g.rbox(win.w + 0.3, 0.1, 0.22, 0.03, 2); g.pop(); // sill
    for (const sx of [-1, 1]) { g.pushT(win.x + sx * (win.w / 2 + 0.06), win.y, z0 + 0.05); g.box(0.12, win.hh + 0.1, 0.1); g.pop(); }
    g.pushT(win.x, win.y + win.hh / 2 + 0.06, z0 + 0.05); g.box(win.w + 0.24, 0.12, 0.1); g.pop();
    g.pushT(win.x, win.y, z0 + 0.04); g.box(0.05, win.hh, 0.05); g.pop();
    g.pushT(win.x, win.y + 0.25, z0 + 0.04); g.box(win.w, 0.05, 0.05); g.pop();
    { const s = new MB(); s.set({ color: [1, 1, 1], emis: 0 }); s.pushT(win.x, win.y, z0 + 0.005); s.box(win.w, win.hh, 0.01); s.pop();
      dyn.sky = { mesh: R.upload(s.build()), model: M4.ident(), tex: tex.sky, unlit: true, emis: 1, visible: true, tint: [1, 1, 1, 1], noShadow: true }; }
    // cafe curtains (animated sway)
    for (const sx of [-1, 1]) {
      const c = new MB(); c.set({ color: C('#f3d9d0'), spec: 0.02 });
      c.grid(10, 6, (u, v) => [sx * (u * 0.42), -v * 0.9, Math.sin(u * Math.PI * 5) * 0.03], { us: 2, vs: 1 });
      dyn['curtain' + sx] = { mesh: R.upload(c.build()), model: M4.translate(win.x + sx * win.w / 2 - sx * 0.42, win.y + win.hh / 2 - 0.05, z0 + 0.14), tex: tex.lace, interior: true, visible: true, wrap: 0.5, base: [win.x + sx * (win.w / 2 - 0.42), win.y + win.hh / 2 - 0.05, z0 + 0.14] };
    }
    g = G('plain'); g.set({ color: brass, spec: 0.8, shin: 0.8 });
    g.pushT(win.x, win.y + win.hh / 2 - 0.04, z0 + 0.14, Q.euler(0, 0, Math.PI / 2)); g.cyl(0.015, 0.015, win.w + 0.3, 8); g.pop();

    // ---------------- LOWER CABINETS + butcher-block counters
    const cab = (xa, xb, drawers) => {
      const cw = xb - xa, cx = (xa + xb) / 2, d = 0.72, zc = z0 + d / 2;
      let p = G('paint'); p.set({ color: cream, spec: 0.12, shin: 0.35 });
      p.pushT(cx, 0.5, zc); p.box(cw, 0.92, d); p.pop();
      p.set({ color: C('#3b2a20') }); p.pushT(cx, 0.04, zc + 0.03); p.box(cw, 0.08, d - 0.06); p.pop(); // toe kick
      p.set({ color: cream });
      const n = Math.max(1, Math.round(cw / 0.62)), dw = cw / n;
      for (let k = 0; k < n; k++) {
        const dx = xa + dw * (k + 0.5);
        if (drawers) { p.pushT(dx, 0.84, zc + d / 2 + 0.02); p.rbox(dw - 0.06, 0.16, 0.04, 0.015, 2); p.pop(); }
        p.pushT(dx, drawers ? 0.44 : 0.5, zc + d / 2 + 0.02); p.rbox(dw - 0.06, drawers ? 0.6 : 0.78, 0.04, 0.015, 2); p.pop();
        p.pushT(dx, drawers ? 0.44 : 0.5, zc + d / 2 + 0.045); p.rbox(dw - 0.22, drawers ? 0.42 : 0.58, 0.02, 0.01, 2); p.pop();
        const b = G('plain'); b.set({ color: brass, spec: 0.85, shin: 0.85 });
        b.pushT(dx + (k % 2 ? -1 : 1) * (dw / 2 - 0.1), drawers ? 0.6 : 0.68, zc + d / 2 + 0.07); b.sphere(0.022, 0.022, 0.022, 10, 8); b.pop();
        if (drawers) { b.pushT(dx, 0.84, zc + d / 2 + 0.06, Q.euler(0, 0, Math.PI / 2)); b.cyl(0.012, 0.012, 0.16, 6); b.pop(); }
      }
      const w = G('wood'); w.set({ color: C('#c28b55'), spec: 0.3, shin: 0.5, uvScale: 0.6 });
      w.pushT(cx, 1.0, zc + 0.03); w.rbox(cw + 0.04, 0.08, d + 0.08, 0.02, 2); w.pop();
    };
    cab(-3.98, -1.55, false); cab(0.35, 2.3, true);
    // farmhouse sink (ceramic) cut into the counter
    g = G('plain'); g.set({ color: white, spec: 0.7, shin: 0.85 });
    g.pushT(win.x, 0.82, z0 + 0.42); g.rbox(1.0, 0.36, 0.62, 0.05, 3); g.pop();
    g.set({ color: C('#d9d4ca') }); g.pushT(win.x, 1.0, z0 + 0.42); g.box(0.84, 0.012, 0.48); g.pop(); // basin
    g.set({ color: brass, spec: 0.9, shin: 0.9 });
    const fx = win.x, fz = z0 + 0.1;
    g.pushT(fx, 1.04, fz); g.cyl(0.035, 0.04, 0.05, 10); g.pop();
    g.tube([[fx, 1.06, fz], [fx, 1.42, fz], [fx, 1.5, fz + 0.06], [fx, 1.46, fz + 0.18], [fx, 1.36, fz + 0.22]], 0.022, 8);
    for (const sx of [-1, 1]) { g.pushT(fx + sx * 0.16, 1.06, fz + 0.02); g.cyl(0.02, 0.02, 0.08, 8); g.pop(); g.pushT(fx + sx * 0.16, 1.15, fz + 0.02); g.sphere(0.035, 0.02, 0.035, 10, 6); g.pop(); }
    LL.FAUCET = [fx, 1.34, fz + 0.22];
    // dish rack
    g.set({ color: C('#a9a39a'), spec: 0.6 });
    g.pushT(-1.95, 1.05, z0 + 0.4); g.box(0.6, 0.02, 0.4); g.pop();
    for (let k = 0; k < 7; k++) { g.pushT(-2.2 + k * 0.08, 1.12, z0 + 0.4); g.box(0.008, 0.14, 0.36); g.pop(); }

    // ---------------- RANGE (cast iron, double oven, brass trims)
    const rx0 = -1.5, rx1 = 0.3, rcx = (rx0 + rx1) / 2;
    g = G('plain'); g.set({ color: iron, spec: 0.35, shin: 0.55 });
    g.pushT(rcx, 0.52, z0 + 0.38); g.rbox(rx1 - rx0, 0.96, 0.74, 0.03, 2); g.pop();
    g.pushT(rcx, 1.03, z0 + 0.38); g.rbox(rx1 - rx0 + 0.04, 0.06, 0.78, 0.02, 2); g.pop();
    g.pushT(rcx, 1.25, z0 + 0.08); g.rbox(rx1 - rx0, 0.42, 0.1, 0.02, 2); g.pop(); // backguard
    g.set({ color: brass, spec: 0.9, shin: 0.85 });
    g.pushT(rcx, 1.42, z0 + 0.14, Q.euler(0, 0, Math.PI / 2)); g.cyl(0.02, 0.02, rx1 - rx0 - 0.1, 8); g.pop();
    for (const ox of [-0.44, 0.44]) {
      g.set({ color: C('#2b2624') }); g.pushT(rcx + ox, 0.5, z0 + 0.76); g.rbox(0.8, 0.72, 0.04, 0.03, 2); g.pop();
      g.set({ color: brass }); g.pushT(rcx + ox, 0.9, z0 + 0.82, Q.euler(0, 0, Math.PI / 2)); g.cyl(0.018, 0.018, 0.6, 8); g.pop();
      g.pushT(rcx + ox, 0.5, z0 + 0.785); g.box(0.5, 0.36, 0.01); g.pop();
    }
    for (let k = 0; k < 5; k++) { g.set({ color: brass }); g.pushT(rx0 + 0.2 + k * 0.35, 0.98, z0 + 0.77, Q.euler(Math.PI / 2, 0, 0)); g.cyl(0.035, 0.03, 0.05, 10); g.pop(); }
    // oven window glow (dynamic emissive)
    { const s = new MB(); s.set({ color: C('#ff9a40') }); for (const ox of [-0.44, 0.44]) { s.pushT(rcx + ox, 0.5, z0 + 0.792); s.box(0.42, 0.28, 0.005); s.pop(); }
      dyn.ovenGlow = { mesh: R.upload(s.build()), model: M4.ident(), visible: true, interior: true, emis: 0, tint: [0.25, 0.2, 0.18, 1] }; }
    // burners: front-left = pot, back-right = kettle
    const burners = [[rx0 + 0.45, z0 + 0.55], [rx1 - 0.45, z0 + 0.55], [rx0 + 0.45, z0 + 0.22], [rx1 - 0.45, z0 + 0.22]];
    for (const [bx, bz] of burners) { g.set({ color: C('#0e0d0d'), spec: 0.4 }); g.pushT(bx, 1.065, bz); g.torus(0.16, 0.02, 20, 6); g.pop(); g.pushT(bx, 1.065, bz); g.torus(0.08, 0.015, 16, 6); g.pop(); }
    { const s = new MB(); s.set({ color: C('#ff4a14') }); s.pushT(burners[0][0], 1.07, burners[0][1]); s.torus(0.12, 0.018, 24, 6); s.pop();
      dyn.burnerGlow = { mesh: R.upload(s.build()), model: M4.ident(), visible: false, interior: true, emis: 2.5, unlit: true }; }
    LL.BURNER = [burners[0][0], 1.08, burners[0][1]];
    { const s = new MB(); s.set({ color: C('#ff4a14') }); s.pushT(burners[3][0], 1.07, burners[3][1]); s.torus(0.12, 0.018, 24, 6); s.pop();
      dyn.burnerGlow3 = { mesh: R.upload(s.build()), model: M4.ident(), visible: false, interior: true, emis: 2.5, unlit: true }; }
    { const s = new MB(); M.rand.seed(4); for (let k = 0; k < 40; k++) { s.set({ color: [C('#8a5a2a'), C('#c9a05a'), C('#6b8f3a')][k % 3] }); const onStove = k % 2; s.pushT(onStove ? -0.6 + (M.rand.next() - 0.5) * 1.4 : 1.3 + (M.rand.next() - 0.5) * 1.6, onStove ? 1.065 : 1.045, -2.3 - M.rand.next() * 0.4); s.sphere(0.012 + M.rand.next() * 0.012, 0.006, 0.012, 6, 4); s.pop(); }
      dyn.crumbs = { mesh: R.upload(s.build()), model: M4.ident(), visible: false, interior: true, tint: [1, 1, 1, 1], blend: true, noShadow: true }; }
    // hood
    g = G('paint'); g.set({ color: cream });
    g.pushT(rcx, 2.92, z0 + 0.36); g.lathe([[0.32, 0.55], [0.36, 0.5], [0.9, 0], [0.95, -0.02], [0.95, -0.12]], 4, { deform: (p) => [p[0] * 1.3, p[1], p[2] * 0.6] }); g.pop();
    g.set({ color: trim }); g.pushT(rcx, 3.75, z0 + 0.25); g.box(0.6, 0.9, 0.5); g.pop();
    // copper pots hanging on rail
    g = G('plain'); g.set({ color: copper, spec: 0.85, shin: 0.75 });
    for (const [px, r] of [[rx0 + 0.15, 0.13], [rx1 - 0.15, 0.11]]) { g.pushT(px, 2.15, z0 + 0.2); g.lathe([[r, 0.0], [r, -0.18], [r * 0.9, -0.24], [0, -0.25]], 18); g.pop(); g.tube([[px, 2.15, z0 + 0.2 + r], [px, 2.45, z0 + 0.12]], 0.012, 6); }

    // ---------------- open shelves + crockery above prep counter
    g = G('wood'); g.set({ color: C('#b88050'), uvScale: 0.6 });
    for (const sy of [2.3, 2.9]) { g.pushT(1.32, sy, z0 + 0.18); g.box(1.9, 0.06, 0.36); g.pop(); }
    g.set({ color: C('#8a5a36') }); for (const sx of [0.4, 2.24]) { g.pushT(sx, 2.6, z0 + 0.18); g.box(0.05, 0.75, 0.36); g.pop(); }
    g = G('plain');
    for (let k = 0; k < 6; k++) { g.set({ color: k % 2 ? C('#f6f2ea') : C('#d9e4ee'), spec: 0.6, shin: 0.8 }); g.pushT(0.6 + k * 0.08, 2.53, z0 + 0.2, Q.euler(0, 0, 0.06 * (k - 2))); g.cyl(0.19, 0.19, 0.02, 20); g.pop(); }
    for (let k = 0; k < 4; k++) { g.set({ color: [C('#e8ddc8'), C('#a7c3d6'), C('#e3b9a9'), C('#c9d6b3')][k], spec: 0.6, shin: 0.8 }); g.pushT(1.35 + k * 0.22, 2.33, z0 + 0.2); g.lathe([[0.07, 0.17], [0.08, 0.1], [0.07, 0]], 14); g.pop(); g.disk(0.0, 0, 4); }
    for (let k = 0; k < 5; k++) { g.set({ color: C('#efe7d3'), spec: 0.5 }); g.pushT(0.6 + k * 0.32, 2.93, z0 + 0.2); g.lathe([[0.08, 0.26], [0.09, 0.2], [0.09, 0.02], [0.08, 0]], 14); g.pop(); g.set({ color: C('#7a5038') }); g.pushT(0.6 + k * 0.32, 3.19, z0 + 0.2); g.cyl(0.07, 0.07, 0.04, 12); g.pop(); }
    // teapot on top shelf
    g.set({ color: C('#7ea3bf'), spec: 0.7, shin: 0.8 }); g.pushT(2.0, 2.94, z0 + 0.2); g.sphere(0.14, 0.12, 0.14, 16, 12); g.pop();
    // plate stack (the top plate is the dynamic, usable plate)
    g = G('plain'); for (let k = 0; k < 3; k++) { g.set({ color: C('#f7f4ec'), spec: 0.6, shin: 0.85 }); g.pushT(0.62, 1.04 + k * 0.035, -2.55); g.lathe([[0.2, 0.035], [0.21, 0.03], [0.12, 0.008], [0.1, 0], [0, 0]], 24); g.pop(); }
    // low bookshelf on the right wall
    g = G('wood'); g.set({ color: C('#7a4b2c'), spec: 0.35, uvScale: 0.6 });
    g.pushT(3.75, 0.5, -0.6); g.rbox(0.46, 1.0, 0.95, 0.02, 2); g.pop();
    g.set({ color: C('#5e3720') }); g.pushT(3.52, 0.5, -0.6); g.box(0.02, 0.86, 0.82); g.pop();
    for (let k = 0; k < 9; k++) { g = G('plain'); g.set({ color: [C('#7a3b2e'), C('#3f5a4a'), C('#b08a4a'), C('#4a3f6a')][k % 4], spec: 0.2 }); g.pushT(3.72, 0.32 + (k % 2) * 0.0, -0.95 + k * 0.085); g.box(0.3, 0.36 - (k % 3) * 0.04, 0.07); g.pop(); }
    g.set({ color: C('#b56a43') }); g.pushT(3.75, 1.0, -0.25); g.cyl(0.08, 0.07, 0.14, 12); g.pop(); g.set({ color: C('#5e8a43') }); g.pushT(3.75, 1.22, -0.25); g.sphere(0.14, 0.12, 0.12, 10, 8); g.pop();
    // cutting board with knife (knife is a dynamic prop)
    g = G('wood'); g.set({ color: C('#d6a671'), spec: 0.25 });
    g.pushT(1.25, 1.055, z0 + 0.45); g.rbox(0.7, 0.04, 0.42, 0.015, 2); g.pop();
    LL.BOARD = [1.25, 1.08, z0 + 0.45];
    // counter lamp (warm table lamp, as in reference)
    g = G('plain'); g.set({ color: brass, spec: 0.8, shin: 0.8 });
    g.pushT(2.0, 1.04, z0 + 0.32); g.lathe([[0.1, 0.04], [0.11, 0], [0.04, 0.05], [0.03, 0.45], [0.05, 0.48]].map(([r, y]) => [r, y]).reverse(), 14); g.pop();
    { const s = new MB(); s.set({ color: C('#f7e3bd'), spec: 0.05 }); s.pushT(2.0, 1.52, z0 + 0.32); s.lathe([[0.13, 0.22], [0.24, 0]], 20); s.pop();
      dyn.lampShade = { mesh: R.upload(s.build()), model: M4.ident(), visible: true, interior: true, emis: 0, wrap: 0.6 }; }
    // jars + bread box + plants on counters
    g = G('plain');
    g.set({ color: C('#d4b26a'), spec: 0.4 }); g.pushT(-3.65, 1.04, z0 + 0.35); g.rbox(0.42, 0.3, 0.32, 0.06, 3); g.pop();
    for (const [px, pz, s] of [[-3.3, z0 + 0.2, 1], [-2.2, z0 + 0.12, 0.7], [2.18, z0 + 0.55, 0.8]]) {
      g.set({ color: C('#b56a43'), spec: 0.2 }); g.pushT(px, 1.04, pz); g.lathe([[0.1 * s, 0.2 * s], [0.09 * s, 0.02], [0.08 * s, 0]], 14); g.pop();
      g.set({ color: C('#5e8a43'), spec: 0.15 });
      for (let k = 0; k < 7; k++) { const a = k * 2.4; g.pushT(px + Math.cos(a) * 0.06 * s, 1.04 + 0.27 * s, pz + Math.sin(a) * 0.06 * s, Q.euler(Math.cos(a) * 0.6, a, Math.sin(a) * 0.6)); g.sphere(0.05 * s, 0.16 * s, 0.025 * s, 8, 6); g.pop(); }
    }
    // window-sill herbs
    for (let k = 0; k < 3; k++) { g.set({ color: C('#c4763f') }); g.pushT(win.x - 0.45 + k * 0.45, win.y - win.hh / 2, z0 + 0.12); g.cyl(0.07, 0.06, 0.12, 12); g.pop(); g.set({ color: C('#6d9a4c') }); g.pushT(win.x - 0.45 + k * 0.45, win.y - win.hh / 2 + 0.2, z0 + 0.12); g.sphere(0.1, 0.1, 0.08, 10, 8); g.pop(); }

    // ---------------- REFRIGERATOR (vintage, door is dynamic)
    const fr = { x0: 2.42, x1: 3.88, hgt: 2.9, d: 0.8 };
    g = G('paint'); g.set({ color: C('#efe6d0'), spec: 0.45, shin: 0.7 });
    g.pushT((fr.x0 + fr.x1) / 2, fr.hgt / 2, z0 + fr.d / 2 - 0.02); g.rbox(fr.x1 - fr.x0, fr.hgt, fr.d - 0.06, 0.12, 3); g.pop();
    g.set({ color: C('#d8cfb8') }); g.pushT((fr.x0 + fr.x1) / 2, 1.35, z0 + fr.d - 0.08); g.box(fr.x1 - fr.x0 - 0.2, 2.4, 0.02); g.pop(); // interior back face
    g = G('plain'); g.set({ color: C('#e9eef0'), spec: 0.3 });
    for (const sy of [0.55, 1.15, 1.75]) { g.pushT((fr.x0 + fr.x1) / 2, sy, z0 + fr.d - 0.25); g.box(fr.x1 - fr.x0 - 0.24, 0.03, 0.4); g.pop(); }
    g.set({ color: C('#e0703a') }); for (let k = 0; k < 4; k++) { g.pushT(2.75 + k * 0.1, 1.2, z0 + 0.6, Q.euler(Math.PI / 2, 0, 0)); g.cyl(0.03, 0.012, 0.25, 8); g.pop(); }
    g.set({ color: C('#c9302c') }); g.pushT(3.4, 1.25, z0 + 0.6); g.sphere(0.09, 0.08, 0.09, 12, 10); g.pop();
    g.set({ color: C('#f4efe2') }); g.pushT(3.0, 1.82, z0 + 0.6); g.cyl(0.08, 0.08, 0.26, 12); g.pop();
    g.set({ color: C('#6ea047') }); g.pushT(3.45, 0.66, z0 + 0.6); g.sphere(0.16, 0.12, 0.14, 12, 10); g.pop();
    { const d = new MB(); d.set({ color: C('#f2e9d3'), spec: 0.45, shin: 0.7 });
      const dw = fr.x1 - fr.x0 - 0.08;
      d.pushT(-dw / 2, 1.42, 0.06); d.rbox(dw, 2.62, 0.12, 0.08, 3); d.pop();
      d.set({ color: brass, spec: 0.9, shin: 0.85 }); d.pushT(-dw + 0.14, 1.65, 0.16); d.rbox(0.07, 0.42, 0.06, 0.025, 2); d.pop();
      d.pushT(-dw / 2, 2.55, 0.125); d.box(0.5, 0.06, 0.01); d.pop();
      dyn.fridgeDoor = { mesh: R.upload(d.build()), model: M4.ident(), visible: true, interior: true, pivot: [fr.x1 - 0.04, 0, z0 + fr.d - 0.02], tex: tex.paint };
    }
    { const s = new MB(); s.set({ color: C('#fff4d8') }); s.pushT((fr.x0 + fr.x1) / 2, 2.3, z0 + 0.45); s.box(0.5, 0.03, 0.2); s.pop();
      dyn.fridgeLight = { mesh: R.upload(s.build()), model: M4.ident(), visible: false, interior: true, unlit: true, emis: 2 }; }

    // ---------------- LEFT WALL: door to hallway + light switch; RIGHT WALL: telephone + clock + frame
    const door = { z0: 0.35, z1: 1.65, top: 3.3 };
    // carve the door opening by drawing the hallway stub behind it (dark corridor)
    g = G('wall'); g.set({ color: C('#9f8a70') });
    g.pushT(x0 - 1.1, h / 2, door.z0 - 0.08); g.box(2.0, h, 0.12); g.pop(); g.pushT(x0 - 1.1, h / 2, door.z1 + 0.08); g.box(2.0, h, 0.12); g.pop();
    g.pushT(x0 - 2.1, h / 2, (door.z0 + door.z1) / 2); g.box(0.12, h, door.z1 - door.z0 + 0.3); g.pop();
    g = G('floor'); g.pushT(x0 - 1.1, -0.04, (door.z0 + door.z1) / 2); g.box(2.1, 0.08, door.z1 - door.z0 + 0.3); g.pop();
    g = G('paint'); g.set({ color: trim });
    g.pushT(x0 + 0.02, door.top + 0.08, (door.z0 + door.z1) / 2); g.rbox(0.12, 0.16, door.z1 - door.z0 + 0.32, 0.03, 2); g.pop();
    for (const dz of [door.z0 - 0.08, door.z1 + 0.08]) { g.pushT(x0 + 0.02, door.top / 2, dz); g.rbox(0.12, door.top, 0.14, 0.03, 2); g.pop(); }
    LL.DOOR = { ...door, x: x0 };
    { const d = new MB(); d.set({ color: C('#7a4a2c'), spec: 0.3, shin: 0.5, uvScale: 0.8 });
      const dl = door.z1 - door.z0;
      d.pushT(0, door.top / 2, -dl / 2); d.box(0.07, door.top, dl); d.pop();
      d.set({ color: C('#8d5a37') }); for (const [py, ph] of [[0.85, 1.2], [2.35, 1.4]]) { d.pushT(0.045, py, -dl / 2); d.rbox(0.03, ph, dl - 0.3, 0.012, 2); d.pop(); }
      d.set({ color: brass, spec: 0.9, shin: 0.85 }); d.pushT(0.08, 1.45, -dl + 0.14); d.sphere(0.045, 0.045, 0.045, 10, 8); d.pop();
      dyn.door = { mesh: R.upload(d.build()), model: M4.ident(), visible: true, interior: true, pivot: [x0 + 0.03, 0, door.z1], tex: tex.wood };
    }
    // the dark hallway wall behind is intentionally unlit-ish: separate wall group so it reads as "rest of house"
    g = G('plain'); g.set({ color: brass, spec: 0.9, shin: 0.85 });
    g.pushT(x0 + 0.02, 1.62, -0.25); g.rbox(0.02, 0.24, 0.14, 0.02, 2); g.pop();
    { const s = new MB(); s.set({ color: C('#efe7d6'), spec: 0.5 }); s.pushT(0, 0, 0); s.box(0.03, 0.08, 0.025); s.pop();
      dyn.switchToggle = { mesh: R.upload(s.build()), model: M4.translate(x0 + 0.04, 1.62, -0.25), visible: true, interior: true }; }
    LL.SWITCH = [x0 + 0.04, 1.62, -0.25];
    // wall telephone (wood box with brass bells) on the right wall
    g = G('wood'); g.set({ color: C('#6b3f24'), spec: 0.35 });
    g.pushT(x1 - 0.1, 1.95, 1.55); g.rbox(0.12, 0.62, 0.38, 0.03, 2); g.pop();
    g = G('plain'); g.set({ color: brass, spec: 0.9 });
    for (const dz of [-0.09, 0.09]) { g.pushT(x1 - 0.2, 2.12, 1.55 + dz); g.sphere(0.07, 0.07, 0.035, 12, 8, { deform: (p) => [p[0] * 0.5, p[1], p[2]] }); g.pop(); }
    g.set({ color: iron }); g.pushT(x1 - 0.22, 1.88, 1.55, Q.euler(0, 0, -1.2)); g.cyl(0.03, 0.04, 0.16, 10); g.pop();
    { const s = new MB(); s.set({ color: iron, spec: 0.5 }); s.cyl(0.03, 0.03, 0.18, 10); s.pushT(0, 0.18, 0); s.cyl(0.05, 0.035, 0.05, 10); s.pop();
      dyn.handset = { mesh: R.upload(s.build()), model: M4.translate(x1 - 0.2, 1.72, 1.78), visible: true, interior: true, rest: [x1 - 0.2, 1.72, 1.78] }; }
    // clock (hands dynamic)
    g = G('wood'); g.set({ color: C('#5a3520') }); g.pushT(x1 - 0.05, 3.45, 0.2, Q.euler(0, 0, Math.PI / 2)); g.cyl(0.36, 0.36, 0.06, 28); g.pop();
    { const s = new MB(); s.set({ color: [1, 1, 1] }); s.pushT(x1 - 0.12, 3.45, 0.2, Q.euler(0, 0, Math.PI / 2)); s.disk(0.31, 0, 28, false); s.pop();
      dyn.clockFace = { mesh: R.upload(s.build()), model: M4.ident(), visible: true, interior: true, tex: tex.clock }; }
    for (const [k, len, wd] of [['hourHand', 0.17, 0.025], ['minHand', 0.26, 0.016]]) {
      const s = new MB(); s.set({ color: C('#2a1d14') }); s.pushT(0, len / 2, 0); s.box(0.01, len, wd); s.pop();
      dyn[k] = { mesh: R.upload(s.build()), model: M4.ident(), visible: true, interior: true, at: [x1 - 0.135, 3.45, 0.2] };
    }
    // framed botanical print on the right wall
    g = G('wood'); g.set({ color: C('#c49a52'), spec: 0.6 }); g.pushT(x1 - 0.05, 2.75, -1.0); g.rbox(0.06, 0.8, 0.62, 0.02, 2); g.pop();
    g = G('plain'); g.set({ color: C('#efe5cf') }); g.pushT(x1 - 0.085, 2.75, -1.0); g.box(0.01, 0.64, 0.46); g.pop();
    g.set({ color: C('#6d8f55') }); g.pushT(x1 - 0.095, 2.72, -1.0); g.sphere(0.005, 0.18, 0.1, 8, 8); g.pop();
    g.set({ color: C('#d67b84') }); g.pushT(x1 - 0.096, 2.9, -1.0); g.sphere(0.005, 0.07, 0.07, 8, 8); g.pop();

    // ---------------- CHANDELIER (brass, 5 arms) over the table + rug + table + chairs
    const TABLE = { x: 1.0, z: 1.0, r: 0.82, y: 0.9 };
    LL.TABLE = TABLE;
    g = G('plain'); g.set({ color: brass, spec: 0.9, shin: 0.85 });
    g.pushT(TABLE.x, h - 0.5, TABLE.z); g.cyl(0.015, 0.015, 0.5, 6); g.pop();
    g.pushT(TABLE.x, h - 0.75, TABLE.z); g.sphere(0.09, 0.14, 0.09, 12, 10); g.pop();
    const bulbs = [];
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; const bx = TABLE.x + Math.cos(a) * 0.36, bz = TABLE.z + Math.sin(a) * 0.36;
      g.tube([[TABLE.x, h - 0.8, TABLE.z], [TABLE.x + Math.cos(a) * 0.25, h - 0.9, TABLE.z + Math.sin(a) * 0.25], [bx, h - 0.82, bz]], 0.014, 6);
      g.pushT(bx, h - 0.82, bz); g.cyl(0.04, 0.03, 0.05, 10); g.pop(); bulbs.push([bx, h - 0.72, bz]); }
    { const s = new MB(); s.set({ color: C('#fbe7c0'), spec: 0.2 }); for (const b of bulbs) { s.pushT(b[0], b[1], b[2]); s.lathe([[0.03, 0.08], [0.09, -0.06], [0.06, -0.1]], 12); s.pop(); }
      dyn.chandelierShades = { mesh: R.upload(s.build()), model: M4.ident(), visible: true, interior: true, emis: 0, wrap: 0.6 }; }
    LL.CHANDELIER = [TABLE.x, h - 0.85, TABLE.z];
    g = G('rug'); g.set({ color: [1, 1, 1], spec: 0.02, uvScale: 1 });
    g.pushT(TABLE.x, 0.006, TABLE.z); g.grid(1, 1, (u, v) => [(u - 0.5) * 3.4, 0, (v - 0.5) * 2.5], { uv: (u, v) => [u, v] }); g.pop();
    // pedestal table with cloth
    g = G('wood'); g.set({ color: C('#7a4b2c'), spec: 0.35, uvScale: 0.6 });
    g.pushT(TABLE.x, 0, TABLE.z); g.lathe([[0.04, TABLE.y - 0.05], [0.09, TABLE.y - 0.12], [0.06, 0.6], [0.1, 0.45], [0.07, 0.25], [0.12, 0.12], [0.4, 0.04], [0.4, 0]], 18); g.pop();
    g = G('cloth'); g.set({ color: [1, 1, 1], spec: 0.04, uvScale: 1 });
    g.pushT(TABLE.x, TABLE.y, TABLE.z); g.lathe([[0.0, 0.02], [TABLE.r, 0.02], [TABLE.r + 0.04, -0.02], [TABLE.r + 0.05, -0.3]], 40, { us: 6, vs: 1, deform: (p, u, v) => { const k = v > 0.6 ? 1 + 0.03 * Math.sin(u * Math.PI * 2 * 14) : 1; return [p[0] * k, p[1], p[2] * k]; } }); g.pop();
    // vase with flowers on the table
    g = G('plain'); g.set({ color: C('#e9eef2'), spec: 0.7, shin: 0.85 }); g.pushT(TABLE.x + 0.25, TABLE.y + 0.02, TABLE.z + 0.15); g.lathe([[0.04, 0.25], [0.03, 0.2], [0.07, 0.08], [0.05, 0]], 14); g.pop();
    for (let k = 0; k < 6; k++) { const a = k * 1.05; g.set({ color: [C('#e8728a'), C('#f5d36b'), C('#f2f0ea')][k % 3], spec: 0.1 }); g.pushT(TABLE.x + 0.25 + Math.cos(a) * 0.07, TABLE.y + 0.33 + (k % 2) * 0.04, TABLE.z + 0.15 + Math.sin(a) * 0.07); g.sphere(0.045, 0.04, 0.045, 10, 8); g.pop(); }
    // chairs (A is dynamic so it can be pulled out)
    const chairMesh = () => {
      const c = new MB(); c.set({ color: C('#8a5634'), spec: 0.35, shin: 0.5, uvScale: 0.6 });
      c.pushT(0, 0.37, 0); c.rbox(0.56, 0.06, 0.52, 0.02, 2); c.pop();
      c.set({ color: C('#c9a57a') }); c.pushT(0, 0.41, 0.02); c.rbox(0.5, 0.04, 0.44, 0.02, 2); c.pop(); // cushion (seat top 0.43)
      c.set({ color: C('#7a4a2c') });
      for (const [lx, lz] of [[-0.23, -0.21], [0.23, -0.21], [-0.23, 0.21], [0.23, 0.21]]) { c.pushT(lx, 0, lz); c.cyl(0.025, 0.02, 0.35, 8); c.pop(); }
      for (const lx of [-0.23, 0.23]) { c.pushT(lx, 0.37, -0.23); c.cyl(0.024, 0.024, 0.75, 8); c.pop(); c.pushT(lx, 1.14, -0.23); c.sphere(0.035, 0.035, 0.035, 8, 6); c.pop(); }
      c.pushT(0, 1.02, -0.23); c.rbox(0.5, 0.14, 0.04, 0.02, 2); c.pop();
      for (let k = 0; k < 3; k++) { c.pushT(-0.12 + k * 0.12, 0.72, -0.23); c.box(0.035, 0.55, 0.025); c.pop(); }
      return R.upload(c.build());
    };
    const chairs = [
      { id: 'chairA', x: TABLE.x, z: TABLE.z - TABLE.r - 0.38, rot: 0 },
      { id: 'chairB', x: TABLE.x + TABLE.r + 0.38, z: TABLE.z, rot: -Math.PI / 2 },
      { id: 'chairC', x: TABLE.x - TABLE.r - 0.38, z: TABLE.z, rot: Math.PI / 2 },
    ];
    const cm = chairMesh();
    for (const c of chairs) dyn[c.id] = { mesh: cm, model: M4.mul(M4.translate(c.x, 0, c.z), M4.rotY(c.rot)), visible: true, interior: true, tex: tex.wood, home: c };
    LL.CHAIRS = chairs;

    // ---------------- dynamic small props: pot, kettle, plate, food, knife, spoon, veg, cloth, book, cup, water stream
    const prop = (name, fn, extra) => { const s = new MB(); fn(s); dyn[name] = { mesh: R.upload(s.build()), model: M4.ident(), visible: true, interior: true, ...extra }; };
    prop('pot', (s) => { s.set({ color: copper, spec: 0.85, shin: 0.75 }); s.lathe([[0.22, 0.26], [0.23, 0.25], [0.22, 0.02], [0.2, 0], [0, 0]], 22); s.set({ color: C('#3a2014') }); for (const sx of [-1, 1]) { s.pushT(sx * 0.27, 0.2, 0, Q.euler(0, 0, sx * 0.3)); s.rbox(0.1, 0.04, 0.06, 0.015, 2); s.pop(); } });
    prop('potFood', (s) => { s.set({ color: [1, 1, 1], spec: 0.5, shin: 0.6 }); s.disk(0.205, 0, 22, true); }, { tex: tex.stew });
    prop('kettle', (s) => { s.set({ color: C('#d9d2c2'), spec: 0.75, shin: 0.8 }); s.sphere(0.17, 0.15, 0.17, 18, 12, { deform: (p) => [p[0], p[1] < 0 ? p[1] * 0.7 : p[1], p[2]] }); s.tube([[0.14, 0.0, 0], [0.26, 0.08, 0], [0.3, 0.14, 0]], (t) => 0.035 - t * 0.02, 8); s.set({ color: C('#2a1d14') }); s.tube([[-0.1, 0.12, 0], [-0.06, 0.28, 0], [0.06, 0.28, 0], [0.1, 0.12, 0]], 0.018, 6); });
    prop('plate', (s) => { s.set({ color: C('#f7f4ec'), spec: 0.6, shin: 0.85 }); s.lathe([[0.2, 0.035], [0.21, 0.03], [0.12, 0.008], [0.1, 0], [0, 0]], 24); s.set({ color: C('#6b8fb4') }); s.pushT(0, 0.031, 0); s.torus(0.18, 0.006, 32, 4); s.pop(); });
    prop('plateFood', (s) => { s.set({ color: [1, 1, 1], spec: 0.45, shin: 0.55 }); s.sphere(0.12, 0.05, 0.12, 18, 8, { t1: 0.5 }); }, { tex: tex.stew });
    prop('knife', (s) => { s.set({ color: C('#d8dde0'), spec: 0.9, shin: 0.9 }); s.pushT(0, -0.12, 0); s.box(0.012, 0.2, 0.05); s.pop(); s.set({ color: C('#4a2c1c') }); s.pushT(0, 0.03, 0); s.box(0.025, 0.12, 0.03); s.pop(); });
    prop('spoon', (s) => { s.set({ color: C('#cfd3d6'), spec: 0.9, shin: 0.9 }); s.pushT(0, -0.04, 0); s.cyl(0.008, 0.008, 0.2, 6); s.pop(); s.pushT(0, -0.07, 0); s.sphere(0.03, 0.012, 0.022, 10, 6); s.pop(); });
    prop('vegWhole', (s) => { s.set({ color: C('#e0703a'), spec: 0.3 }); for (let k = 0; k < 3; k++) { s.pushT(-0.1 + k * 0.08, 0.03, 0, Q.euler(Math.PI / 2, 0.2 * k, 0)); s.cyl(0.03, 0.012, 0.22, 8); s.pop(); } s.set({ color: C('#c9302c') }); s.pushT(0.16, 0.06, 0.02); s.sphere(0.07, 0.065, 0.07, 12, 10); s.pop(); s.set({ color: C('#6ea047') }); s.pushT(-0.16, 0.05, -0.04); s.sphere(0.08, 0.05, 0.07, 10, 8); s.pop(); });
    prop('vegChopped', (s) => { for (let k = 0; k < 16; k++) { s.set({ color: [C('#e0703a'), C('#c9302c'), C('#6ea047')][k % 3], spec: 0.3 }); s.pushT(-0.14 + (k % 6) * 0.05, 0.015, -0.06 + Math.floor(k / 6) * 0.06); s.rbox(0.035, 0.025, 0.035, 0.008, 1); s.pop(); } });
    prop('vegHand', (s) => { s.set({ color: C('#e0703a'), spec: 0.3 }); for (let k = 0; k < 3; k++) { s.pushT(-0.03 + k * 0.03, -0.06, 0.02, Q.euler(0.2 * k, 0, 0)); s.cyl(0.025, 0.01, 0.18, 8); s.pop(); } s.set({ color: C('#c9302c') }); s.pushT(0.02, -0.05, 0.07); s.sphere(0.055, 0.05, 0.055, 10, 8); s.pop(); });
    prop('rag', (s) => { s.set({ color: C('#a8c3d8'), spec: 0.05 }); s.rbox(0.14, 0.03, 0.1, 0.012, 2); });
    prop('book', (s) => { s.set({ color: [1, 1, 1], spec: 0.15 }); s.rbox(0.32, 0.04, 0.24, 0.008, 1); }, { tex: tex.bookCover });
    prop('bookOpen', (s) => { s.set({ color: [1, 1, 1], spec: 0.05 }); s.grid(8, 1, (u, v) => [(u - 0.5) * 0.46, Math.sin(u * Math.PI) * 0.03 - 0.015 * Math.cos(u * Math.PI * 2), (v - 0.5) * 0.3], { uv: (u, v) => [u, v] }); }, { tex: tex.pages });
    prop('cup', (s) => { s.set({ color: C('#f3eee4'), spec: 0.6, shin: 0.85 }); s.lathe([[0.06, 0.11], [0.055, 0.02], [0.04, 0], [0, 0]], 16); s.set({ color: C('#6b8fb4') }); s.pushT(0.07, 0.06, 0, Q.euler(Math.PI / 2, 0, 0)); s.torus(0.025, 0.008, 12, 4); s.pop(); s.set({ color: C('#8a4a22') }); s.pushT(0, 0.095, 0); s.disk(0.052, 0, 14); s.pop(); });
    { const s = new MB(); s.set({ color: C('#cfe6f2'), spec: 0.9, shin: 0.9 }); s.pushT(0, -0.32, 0); s.cyl(0.016, 0.012, 0.32, 8); s.pop();
      dyn.water = { mesh: R.upload(s.build()), model: M4.translate(LL.FAUCET[0], LL.FAUCET[1], LL.FAUCET[2]), visible: false, interior: true, tint: [1, 1, 1, 0.55], blend: true, emis: 0.3 }; }

    // ---------------- EXTERIOR: dollhouse facade of the bay (siding, trim, corner posts, brackets, cornice, roof, porch, flowers)
    const ext = (k) => G(k + '_ext');
    g = ext('siding'); g.set({ color: C('#efe5d0'), spec: 0.1, shin: 0.3, uvScale: 0.5 });
    g.pushT(0, h / 2 + 0.05, z0 - 0.17); g.box(x1 - x0 + 0.5, h + 0.3, 0.04); g.pop();
    g.pushT(x1 + 0.17, h / 2 + 0.05, 0); g.box(0.04, h + 0.3, z1 - z0 + 0.2); g.pop();
    g.pushT(x0 - 2.17, h / 2 + 0.05, 0); g.box(0.04, h + 0.3, z1 - z0 + 0.2); g.pop();
    g = ext('paint'); g.set({ color: trim, spec: 0.2, shin: 0.4 });
    // base plinth & floor edge
    g.pushT(-1.0, -0.3, 0.05); g.rbox(x1 - x0 + 2.6, 0.42, z1 - z0 + 0.6, 0.04, 2); g.pop();
    // second-storey floor band (face of ceiling) with dentils
    g.pushT(-1.0, h + 0.17, z1 + 0.02); g.rbox(x1 - x0 + 2.7, 0.3, 0.2, 0.03, 2); g.pop();
    for (let k = 0; k < 40; k++) { g.pushT(x0 - 2.2 + k * 0.27, h + 0.0, z1 + 0.1); g.box(0.12, 0.1, 0.06); g.pop(); }
    // turned corner posts
    for (const px of [x0 - 0.02, x1 + 0.12, x0 - 2.1]) {
      g.pushT(px, 0, z1 + 0.02);
      g.lathe([[0.1, h], [0.13, h - 0.05], [0.07, h - 0.25], [0.09, h - 0.4], [0.06, h - 0.6], [0.06, 1.0], [0.1, 0.8], [0.07, 0.6], [0.12, 0.4], [0.12, 0.05], [0.14, 0]], 14);
      g.pop();
    }
    // gingerbread brackets at post tops
    for (const [px, sx] of [[x0 - 0.02, 1], [x1 + 0.12, -1], [x0 - 0.02, -1], [x0 - 2.1, 1]]) {
      const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([px + sx * (0.08 + t * 0.6), h - 0.05 - Math.pow(1 - t, 2) * 0.6, z1 + 0.02]); }
      g.tube(pts, 0.03, 6, { flat: 0.6 });
      for (let k = 0; k < 3; k++) { g.pushT(px + sx * (0.2 + k * 0.16), h - 0.12 - k * 0.0, z1 + 0.02); g.torus(0.05, 0.012, 12, 4); g.pop(); }
    }
    // porch railing on the right (wraparound porch from the reference)
    g.pushT(x1 + 0.95, 0.75, 1.2); g.rbox(1.5, 0.06, 0.08, 0.02, 2); g.pop();
    g.pushT(x1 + 1.7, 0.75, -0.4); g.rbox(0.08, 0.06, 3.2, 0.02, 2); g.pop();
    for (let k = 0; k < 9; k++) { g.pushT(x1 + 0.3 + k * 0.17, 0.02, 1.2); g.lathe([[0.025, 0.72], [0.04, 0.55], [0.02, 0.35], [0.045, 0.15], [0.025, 0]], 8); g.pop(); }
    for (let k = 0; k < 16; k++) { g.pushT(x1 + 1.7, 0.02, 1.0 - k * 0.19); g.lathe([[0.025, 0.72], [0.04, 0.55], [0.02, 0.35], [0.045, 0.15], [0.025, 0]], 8); g.pop(); }
    g.pushT(x1 + 1.7, 0, 1.2); g.lathe([[0.07, h], [0.07, 0]], 10); g.pop();
    g = ext('floor'); g.set({ color: [0.9, 0.85, 0.8], uvScale: 0.25 }); g.pushT(x1 + 0.95, -0.02, -0.4); g.box(1.6, 0.06, 3.4); g.pop();
    // porch roof (slate) + side bay window block of the house to the left (dining room stub, shell only)
    g = ext('slate'); g.set({ color: [1, 1, 1], spec: 0.2, shin: 0.4, uvScale: 0.6 });
    g.pushT(x1 + 0.95, h + 0.05, -0.4, Q.euler(0, 0, -0.35)); g.box(1.9, 0.08, 3.8); g.pop();
    // main gable roof over the bay (upper storeys are Milestone 6 — this cap keeps the module reading as the Reference-B house)
    const rW = x1 - x0 + 2.9, rD = z1 - z0 + 0.7;
    { // two pitched planes + gable front
      const r = ext('slate'); const yb = h + 0.32, yt = h + 2.3;
      r.grid(1, 1, (u, v) => [-1.0 + (u - 0.5) * rW, M.lerp(yb, yt, v), M.lerp(z1 + 0.25, 0, v)], { uv: (u, v) => [u * 5, v * 2.5], flip: true });
      r.grid(1, 1, (u, v) => [-1.0 + (u - 0.5) * rW, M.lerp(yb, yt, v), M.lerp(z0 - 0.35, 0, v)], { uv: (u, v) => [u * 5, v * 2.5] });
      const tr = ext('paint');
      tr.set({ color: trim });
      tr.pushT(-1.0 + rW / 2, yt + 0.02, 0, Q.euler(0, 0, Math.PI / 2)); tr.cyl(0.05, 0.05, rW, 8); tr.pop(); // cyl grows from its base: start at the right end
      // cresting finials along the ridge
      for (let k = 0; k < 14; k++) { tr.pushT(-1.0 - rW / 2 + 0.3 + k * (rW - 0.6) / 13, yt + 0.05, 0); tr.lathe([[0.0, 0.22], [0.03, 0.16], [0.015, 0.1], [0.04, 0.04], [0.02, 0]], 8); tr.pop(); }
      // fascia with scalloped barge board along the front eave
      tr.pushT(-1.0, yb - 0.02, z1 + 0.27); tr.box(rW, 0.12, 0.05); tr.pop();
      for (let k = 0; k < 34; k++) { tr.pushT(-1.0 - rW / 2 + 0.17 + k * 0.33, yb - 0.1, z1 + 0.28, Q.euler(Math.PI / 2, 0, 0)); tr.cyl(0.1, 0.1, 0.03, 10); tr.pop(); }
      // dormer window on the roof (lit at night)
      const dx = 1.0, dzs = 1.5;
      const dw2 = ext('siding'); dw2.pushT(dx, yb + 0.9, dzs * 0.55); dw2.box(1.3, 1.2, 1.2); dw2.pop();
      tr.pushT(dx, yb + 1.0, dzs * 0.55 + 0.61); tr.box(0.84, 0.86, 0.04); tr.pop();
      const sl = ext('slate'); sl.pushT(dx, yb + 1.75, dzs * 0.55, Q.euler(0, 0, 0.6)); sl.box(1.0, 0.06, 1.4); sl.pop(); sl.pushT(dx, yb + 1.75, dzs * 0.55, Q.euler(0, 0, -0.6)); sl.box(1.0, 0.06, 1.4); sl.pop();
      LL.DORMER = [dx, yb + 1.0, dzs * 0.55 + 0.64];
    }
    { const s = new MB(); s.set({ color: [1, 1, 1] }); s.pushT(LL.DORMER[0], LL.DORMER[1], LL.DORMER[2]); s.box(0.7, 0.72, 0.01); s.pop();
      dyn.dormerGlow = { mesh: R.upload(s.build()), model: M4.ident(), visible: true, unlit: true, emis: 1, tint: [1, 0.8, 0.5, 1], noShadow: true }; }
    // dining-room stub to the left (closed shell with lit windows — the rest of the house is Milestone 6)
    g = ext('siding'); g.pushT(x0 - 1.1, h / 2, z1 - 0.02); g.box(2.0, h, 0.04); g.pop();
    g = ext('paint'); for (const wy of [1.5]) { g.pushT(x0 - 1.1, wy + 0.6, z1 + 0.02); g.rbox(1.1, 1.6, 0.06, 0.02, 2); g.pop(); }
    { const s = new MB(); s.set({ color: [1, 1, 1] }); s.pushT(x0 - 1.1, 2.1, z1 + 0.06); s.box(0.86, 1.36, 0.01); s.pop();
      dyn.stubWindow = { mesh: R.upload(s.build()), model: M4.ident(), visible: true, unlit: true, emis: 1, tint: [1, 0.82, 0.55, 1], noShadow: true }; }
    g = ext('paint'); g.pushT(x0 - 1.1, 2.1, z1 + 0.07); g.box(0.04, 1.36, 0.02); g.pop(); g.pushT(x0 - 1.1, 2.1, z1 + 0.07); g.box(0.86, 0.04, 0.02); g.pop();
    // flower beds along the front (as in the reference)
    g = ext('plain'); M.rand.seed(99);
    for (let k = 0; k < 70; k++) {
      const px = x0 - 2.3 + M.rand.next() * (x1 - x0 + 4.4), pz = z1 + 0.45 + M.rand.next() * 0.35;
      g.set({ color: C('#4f7a3a'), spec: 0.1 }); g.pushT(px, -0.26, pz); g.sphere(0.12, 0.1, 0.1, 8, 6); g.pop();
      g.set({ color: [C('#f28fb0'), C('#ffffff'), C('#f6c84f'), C('#c36fd1'), C('#ff8a7a')][k % 5] }); g.pushT(px + (M.rand.next() - 0.5) * 0.1, -0.15, pz); g.sphere(0.04, 0.035, 0.04, 6, 5); g.pop();
    }
    g.set({ color: C('#6b4a32') }); g.pushT(-0.15, -0.36, z1 + 0.6); g.box(x1 - x0 + 4.6, 0.12, 0.5); g.pop();

    // ---------------- REAL-WORLD TABLE + blurred living room backdrop
    g = ext('walnut'); g.set({ color: [1, 1, 1], spec: 0.35, shin: 0.6, uvScale: 0.12 });
    g.pushT(0, -0.62, 0); g.box(34, 0.4, 18); g.pop();
    { const s = new MB(); s.set({ color: [1, 1, 1] }); s.grid(1, 1, (u, v) => [(u - 0.5) * 120, (0.5 - v) * 60, 0], { uv: (u, v) => [u, v] });
      dyn.backdrop = { mesh: R.upload(s.build()), model: M4.translate(0, 12, -36), visible: true, unlit: true, emis: 1, tex: tex.backdrop, noShadow: true }; }

    // upload static groups
    const texFor = { floor: tex.planks, wall: tex.wallpaper, tile: tex.tiles, paint: tex.paint, wood: tex.wood, rug: tex.rug, cloth: tex.cloth, slate: tex.slate, walnut: tex.walnut, siding: tex.siding, plain: null };
    const statics = [];
    for (const [k, b] of Object.entries(groups)) {
      const isExt = k.endsWith('_ext'), base = k.replace('_ext', '');
      statics.push({ mesh: R.upload(b.build()), model: M4.ident(), tex: texFor[base], visible: true, interior: !isExt, wrap: base === 'cloth' || base === 'rug' ? 0.4 : 0.1, key: k });
    }
    return { statics, dyn, TABLE, win };
  }
  LL.buildKitchen = build;
})();
