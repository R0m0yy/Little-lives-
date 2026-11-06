// Little Lives — reusable stylised doll character builder (shared skeleton, modular face/hair/outfit)
(function () {
  const { M, V, Q, M4 } = LL;
  const MB = LL.MeshBuilder;
  const lin = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.pow(c / 255, 2.2)); };
  LL.lin = lin;

  // ---- Shared skeleton standard (names are the retarget contract for every Little Lives character)
  const BONES = ['root', 'pelvis', 'spine', 'chest', 'neck', 'head',
    'upperarm_L', 'forearm_L', 'hand_L', 'upperarm_R', 'forearm_R', 'hand_R',
    'thigh_L', 'shin_L', 'foot_L', 'thigh_R', 'shin_R', 'foot_R',
    'eye_L', 'eye_R', 'lid_L', 'lid_R', 'brow_L', 'brow_R', 'mouth', 'mouthO',
    'fingers_L', 'fingers_R', 'skirtF', 'skirtB'];
  const PARENT = { root: null, pelvis: 'root', spine: 'pelvis', chest: 'spine', neck: 'chest', head: 'neck',
    upperarm_L: 'chest', forearm_L: 'upperarm_L', hand_L: 'forearm_L', upperarm_R: 'chest', forearm_R: 'upperarm_R', hand_R: 'forearm_R',
    thigh_L: 'pelvis', shin_L: 'thigh_L', foot_L: 'shin_L', thigh_R: 'pelvis', shin_R: 'thigh_R', foot_R: 'shin_R',
    eye_L: 'head', eye_R: 'head', lid_L: 'head', lid_R: 'head', brow_L: 'head', brow_R: 'head', mouth: 'head', mouthO: 'head',
    fingers_L: 'hand_L', fingers_R: 'hand_R', skirtF: 'pelvis', skirtB: 'pelvis' };
  const BI = Object.fromEntries(BONES.map((b, i) => [b, i]));
  LL.BONES = BONES; LL.BI = BI;

  // Proportion system: Naomi is the base (1.0). Other ages scale body & head independently.
  function skeleton(sp) {
    const b = sp.body, w = sp.width, hr = sp.headR;
    const hip = 0.98 * b, knee = 0.52 * b, ankle = 0.09 * b;
    const waist = 1.22 * b, chest = 1.46 * b, shoulder = 1.62 * b, neck = 1.70 * b, headBase = 1.80 * b;
    const hc = [0, headBase + hr * (0.96 - (sp.headDrop || 0)), 0.02];
    // face layout (v3, measured from the design board): eyes sit well below the head's equator, mouth close to the chin
    const ex = hr * (sp.eyeX || 0.36), ey = hc[1] - hr * (sp.eyeY ?? 0.2);
    const P = {
      root: [0, 0, 0], pelvis: [0, 1.02 * b, 0], spine: [0, waist, 0], chest: [0, chest, 0], neck: [0, neck, 0], head: [0, headBase, 0],
      upperarm_L: [0.27 * w, shoulder, 0], forearm_L: [0.33 * w, 1.30 * b, 0], hand_L: [0.37 * w, 1.03 * b, 0],
      thigh_L: [0.13 * w, hip, 0], shin_L: [0.13 * w, knee, 0], foot_L: [0.13 * w, ankle, 0],
      eye_L: [ex, ey, hc[2] + hr * 0.78], lid_L: [ex, ey, hc[2] + hr * 0.78], brow_L: [ex + 0.01, ey + hr * 0.42, 0],
      mouth: [0, hc[1] - hr * (sp.mouthY || 0.6), 0], mouthO: [0, hc[1] - hr * (sp.mouthY || 0.6), 0], fingers_L: [0.38 * w, 0.95 * b, 0],
      skirtF: [0, 1.15 * b, 0], skirtB: [0, 1.15 * b, 0],
    };
    for (const k of Object.keys(P)) if (k.endsWith('_L')) { const p = P[k]; P[k.replace('_L', '_R')] = [-p[0], p[1], p[2]]; }
    return { P, hc, hr, b, w, ex, ey };
  }

  // chain weights: project p onto polyline of joints; blend at joints
  // chain = [[boneIndex, jointPos], ...]; segment k (J_k -> J_k+1) belongs to bone k, beyond the last joint -> last bone
  function chainW(p, chain, blend = 0.05) {
    const n = chain.length - 1;
    let bestD = Infinity, bestS = 0, acc = 0; const sj = [0];
    for (let k = 0; k < n; k++) {
      const a = chain[k][1], ab = V.sub(chain[k + 1][1], a), L = V.len(ab);
      const t = M.clamp(V.dot(V.sub(p, a), ab) / (L * L), k === 0 ? -50 : 0, k === n - 1 ? 50 : 1);
      const d = V.dist(p, V.add(a, V.scale(ab, t)));
      if (d < bestD) { bestD = d; bestS = acc + t * L; }
      acc += L; sj.push(acc);
    }
    for (let j = 1; j <= n; j++) if (Math.abs(bestS - sj[j]) < blend) {
      const wgt = M.smooth((bestS - sj[j] + blend) / (2 * blend));
      return [chain[j - 1][0], chain[j][0], 1 - wgt, wgt];
    }
    let k = 0; while (k < n && bestS >= sj[k + 1]) k++;
    return [chain[k][0], chain[k][0], 1, 0];
  }

  function buildCharacter(R, sp) {
    const S = skeleton(sp); const P = S.P, hc = S.hc, hr = S.hr, b = S.b, w = S.w;
    const groups = {}; // texture key -> builder
    const G = (key) => (groups[key] = groups[key] || new MB());
    const skinC = lin(sp.skin), blush = lin(sp.blush || '#e8907a');
    const J = (n) => [BI[n], P[n]];

    // ---------- HEAD (shared topology, parameterised shape)
    const head = G('skin'); head.set({ color: skinC, spec: 0.12, shin: 0.3, bone: BI.head, skin: null });
    // v3 head: wide round "apple" face — fullest at the cheeks, broad soft chin (no pointed jaw), slightly flattened face plane
    const headDeform = (p) => {
      let [x, y, z] = p; const yn = y / hr, zf = z / hr;
      const lower = M.smooth((-yn - 0.2) / 0.8);
      x *= 1 - sp.jaw * lower * lower;
      z *= 1 - 0.08 * lower * lower;
      const ck = Math.exp(-Math.pow((yn + 0.36) / 0.42, 2)) * M.smooth((zf + 0.35) / 0.9);
      x *= 1 + sp.cheek * ck;
      if (z > 0) z *= sp.faceFlat * (1 + sp.cheek * 0.35 * ck);
      if (yn < -0.55) y = -hr * (0.55 + (-yn - 0.55) * 0.82); // soften & lift the chin
      if (yn > 0.2 && z < 0) z *= 1.03;                         // fuller cranium at the back
      return [x, y, z];
    };
    head.pushT(hc[0], hc[1], hc[2]);
    head.sphere(hr * sp.headW, hr, hr, 48, 36, {
      deform: headDeform,
      colFn: (u, v, p) => {
        let c = skinC.slice();
        for (const sx of [1, -1]) {
          const d = Math.hypot((p[0] - sx * hr * 0.52) * 0.9, p[1] + hr * 0.44, (p[2] - hr * 0.7) * 1.4);
          const k = Math.exp(-(d * d) / (hr * hr * 0.045)) * 0.55;
          c = V.lerp(c, blush, k);
        }
        return c;
      },
    });
    head.pop();
    // sample front surface for feature placement
    const front = [];
    { const d = head.v; for (let k = 0; k < d.length; k += MB.STRIDE) if (d[k + 2] > hc[2] + hr * 0.2) front.push([d[k], d[k + 1], d[k + 2]]); }
    const surfZ = (x, y) => {
      let ws = 0, zs = 0;
      for (const f of front) { const dd = (f[0] - x) ** 2 + (f[1] - y) ** 2 + 1e-5; if (dd > 0.01) continue; const wgt = 1 / (dd * dd); ws += wgt; zs += f[2] * wgt; }
      return ws ? zs / ws : hc[2] + hr;
    };
    // ears
    for (const sx of [1, -1]) {
      head.pushT(sx * hr * sp.headW * 1.0, hc[1] - hr * 0.22, hc[2] - 0.03, Q.euler(0, sx * 0.45, 0));
      head.sphere(hr * 0.11, hr * 0.19, hr * 0.13, 14, 10); head.pop();
      head.set({ color: V.lerp(skinC, blush, 0.3) });
      head.pushT(sx * hr * sp.headW * 1.04, hc[1] - hr * 0.22, hc[2] - 0.02, Q.euler(0, sx * 0.45, 0));
      head.sphere(hr * 0.05, hr * 0.12, hr * 0.07, 10, 8); head.pop();
      head.set({ color: skinC });
    }
    // nose: small rounded button with soft nostril wings
    head.set({ color: V.lerp(skinC, blush, 0.1) });
    {
      const ny = hc[1] - hr * (sp.noseY || 0.44), nz = surfZ(0, ny);
      head.pushT(0, ny, nz - hr * 0.035); head.sphere(hr * 0.075 * sp.nose, hr * 0.062 * sp.nose, hr * 0.075, 14, 10); head.pop();
      for (const sx of [1, -1]) { head.pushT(sx * hr * 0.055 * sp.nose, ny - hr * 0.018, nz - hr * 0.05); head.sphere(hr * 0.04 * sp.nose, hr * 0.035, hr * 0.05, 10, 8); head.pop(); }
      head.set({ color: skinC });
    }
    // neck
    const neck = G('skin'); neck.set({ color: skinC, bone: -1, skin: (p) => chainW(p, [J('chest'), J('neck'), J('head')], 0.05) });
    neck.pushT(0, P.chest[1] + 0.12 * b, 0); neck.lathe([[0.098 * w * (sp.neckW || 1), P.head[1] + 0.14 - (P.chest[1] + 0.12 * b)], [0.105 * w * (sp.neckW || 1), 0]], 18); neck.pop();

    // ---------- EYES: layered eyeball (sclera+iris+pupil+catchlight texture), lid shell + lashes, brows
    const eyeR = hr * sp.eye;
    const eyes = G('eye'); eyes.set({ color: [1, 1, 1], spec: 0.9, shin: 0.95, skin: null });
    for (const side of ['L', 'R']) {
      const e = P['eye_' + side];
      const z = surfZ(e[0], e[1]) - eyeR * (sp.eyeSink || 0.62); P['eye_' + side] = [e[0], e[1], z]; P['lid_' + side] = [e[0], e[1], z];
      eyes.set({ bone: BI['eye_' + side] }); eyes.pushT(e[0], e[1], z);
      eyes.sphere(eyeR, eyeR, eyeR, 28, 20, { uv: (u, v, p) => [0.5 + p[0] / (2 * eyeR), 0.5 - (p[1] + eyeR * (sp.irisDrop || 0)) / (2 * eyeR)] });
      eyes.pop();
      // lid + lashes (move with lid bone)
      const lid = G('skin'); lid.set({ color: V.lerp(skinC, blush, 0.12), spec: 0.1, bone: BI['lid_' + side], skin: null });
      lid.pushT(e[0], e[1], z); lid.sphere(eyeR * 1.06, eyeR * 1.06, eyeR * 1.06, 24, 10, { t0: 0, t1: 0.5, p0: -0.24, p1: 0.24 }); lid.pop();
      const lash = G('dark'); lash.set({ color: lin('#1b0f0c'), spec: 0.2, shin: 0.4, bone: BI['lid_' + side], skin: null });
      const pts = [], sx = side === 'L' ? 1 : -1;
      for (let k = 0; k <= 12; k++) {
        const ang = (-1 + 2 * k / 12) * 1.32; // around the front of the eye
        const outer = sx * Math.sin(ang) > 0 ? M.smooth((Math.abs(ang) - 0.7) / 0.55) : 0; // winged outer corner
        const rr = eyeR * (1.08 + outer * 0.12);
        pts.push([e[0] + Math.sin(ang) * rr, e[1] + outer * eyeR * 0.2, z + Math.cos(ang) * rr]);
      }
      // thick upper lash line, heaviest toward the outer corner (design board)
      lash.tube(pts, (t) => { const o = sx > 0 ? t : 1 - t; return eyeR * (0.06 + 0.07 * Math.sin(t * Math.PI) + 0.04 * o); }, 6, { flat: 0.55 });
      for (let k = 0; k < 3; k++) { // three lash flicks at the outer corner
        const a0 = sx * (0.95 + k * 0.17), r0 = eyeR * 1.12;
        const p0 = [e[0] + Math.sin(a0) * r0, e[1] + eyeR * (0.12 + k * 0.06), z + Math.cos(a0) * r0];
        const p1 = V.add(p0, [sx * eyeR * (0.2 + k * 0.03), eyeR * (0.12 - k * 0.06), -eyeR * 0.05]);
        lash.tube([p0, V.lerp(p0, p1, 0.5), p1], (t) => eyeR * 0.045 * (1 - t * 0.85), 5);
      }
      // brows: short, thick, softly arched, sitting close above the eye
      const brow = G('dark'); brow.set({ color: lin(sp.browColor || '#2a1710'), bone: BI['brow_' + side], skin: null });
      const bp = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8; const x = e[0] + sx * (-eyeR * 0.72 + t * eyeR * 1.62);
        const y = e[1] + eyeR * (sp.browY || 1.42) + Math.sin(t * Math.PI * 0.85) * eyeR * 0.3 - t * eyeR * 0.12;
        bp.push([x, y, surfZ(x, y) + 0.008]);
      }
      P['brow_' + side] = [e[0], e[1] + eyeR * 1.5, bp[4][2]];
      brow.tube(bp, (t) => eyeR * (0.13 + 0.04 * Math.sin(t * Math.PI * 0.7) - 0.1 * t * t) * sp.browW, 6, { flat: 0.5 });
    }
    // mouth: smile arc + open mouth (both on dedicated bones -> expression via bone scale)
    {
      const my = P.mouth[1], mz = surfZ(0, my); P.mouth = [0, my, mz]; P.mouthO = [0, my, mz];
      const mo = G('dark'); mo.set({ color: lin(sp.lip || '#8a3b33'), spec: 0.3, shin: 0.5, bone: BI.mouth });
      const pts = []; const mw = hr * (sp.mouthW || 0.11);
      for (let k = 0; k <= 10; k++) { const t = -1 + 2 * k / 10; const x = t * mw; const y = my + t * t * hr * 0.035; pts.push([x, y, surfZ(x, y) + 0.004]); }
      mo.tube(pts, (t) => hr * (0.012 + 0.016 * Math.sin(t * Math.PI)), 6, { flat: 0.6 });
      // soft lower lip
      mo.set({ color: V.lerp(lin(sp.lip || '#8a3b33'), skinC, 0.72), bone: BI.head });
      { const ly = my - hr * 0.05; mo.pushT(0, ly, surfZ(0, ly) - hr * 0.012); mo.sphere(mw * 0.55, hr * 0.022, hr * 0.022, 12, 8); mo.pop(); }
      mo.set({ bone: BI.mouth });
      const mo2 = G('dark'); mo2.set({ color: lin('#5a1c1a'), bone: BI.mouthO });
      mo2.pushT(0, my - hr * 0.02, mz - hr * 0.055); mo2.sphere(hr * 0.09, hr * 0.065, hr * 0.05, 14, 10); mo2.pop();
      mo2.set({ color: lin('#d36d6a') }); mo2.pushT(0, my - hr * 0.055, mz - hr * 0.045); mo2.sphere(hr * 0.06, hr * 0.03, hr * 0.04, 10, 8); mo2.pop();
    }

    // ---------- HAIR module
    LL.HairStyles[sp.hair](G, S, sp, surfZ);
    // ---------- OUTFIT module
    LL.Outfits[sp.outfit](G, S, sp, J, chainW);
    // ---------- limbs (skin) & hands, shared by all characters
    {
      const arm = G('skin'); arm.set({ color: skinC, spec: 0.12, shin: 0.3, bone: -1 });
      for (const s of ['L', 'R']) {
        const ch = [J('upperarm_' + s), J('forearm_' + s), J('hand_' + s)];
        arm.skin = (p) => chainW(p, ch, 0.05);
        const a = P['forearm_' + s], c = P['hand_' + s];
        const pts = []; for (let k = 0; k <= 8; k++) pts.push(V.lerp(V.lerp(a, P['upperarm_' + s], 0.15), c, k / 8));
        arm.tube(pts, (t) => (0.07 - t * 0.014) * w * sp.limb, 12);
        // hand: palm + thumb + finger mitten
        const sx = s === 'L' ? 1 : -1;
        arm.skin = null; arm.bone = BI['hand_' + s];
        arm.pushT(c[0] + sx * 0.005, c[1] - 0.06 * b, c[2] + 0.005); arm.sphere(0.045 * w * sp.limb, 0.07 * b, 0.062, 16, 12); arm.pop();
        arm.pushT(c[0] - sx * 0.012, c[1] - 0.05 * b, c[2] + 0.055, Q.euler(0.5, 0, sx * 0.5)); arm.sphere(0.022, 0.045, 0.024, 10, 8); arm.pop();
        arm.bone = BI['fingers_' + s];
        const f = P['fingers_' + s];
        arm.pushT(f[0] + sx * 0.004, f[1] - 0.05 * b, f[2] + 0.004); arm.sphere(0.042 * w * sp.limb, 0.06 * b, 0.058, 16, 12); arm.pop();
        arm.bone = -1;
      }
      const leg = G('skin'); leg.set({ color: skinC, bone: -1 });
      for (const s of ['L', 'R']) {
        const ch = [J('thigh_' + s), J('shin_' + s), J('foot_' + s)];
        leg.skin = (p) => chainW(p, ch, 0.06);
        const top = P['thigh_' + s], kn = P['shin_' + s], an = P['foot_' + s];
        const pts = []; for (let k = 0; k <= 14; k++) { const t = k / 14; pts.push(t < 0.5 ? V.lerp(V.add(top, [0, 0.04, 0]), kn, t * 2) : V.lerp(kn, V.add(an, [0, 0.02, 0]), t * 2 - 1)); }
        leg.tube(pts, (t) => (t < 0.5 ? 0.11 - t * 0.05 : 0.085 + Math.sin((t - 0.5) * 2 * Math.PI) * 0.014 - (t - 0.5) * 0.05) * w * sp.limb, 12);
      }
    }
    // build meshes
    const meshes = {};
    for (const [k, g] of Object.entries(groups)) meshes[k] = R.upload(g.build());
    let vcount = 0; for (const g of Object.values(groups)) vcount += g.vcount();
    return { meshes, S, P, vcount };
  }

  // ---------------- HAIR KIT: reusable sculpted-hair primitives shared by every hairstyle
  //  sc(t, ph, k)  point on the scalp: t = polar angle / PI (0 crown, 1 chin), ph = around (0 front, + = character's left), k = radius scale
  //  cap()         scalp shell with a shaped hairline        ribbon()  flat lock hugging the skull (Catmull-Rom path)
  //  sweep()       hairline -> target lock (swept-back)      coil()/tendril()  ringlet curls for buns, afros, loose curls
  LL.HairKit = function (h, S, sp) {
    const { hc, hr } = S; const W = sp.headW;
    const dirOf = (t, ph) => { const th = t * Math.PI; return [Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)]; };
    const onHead = (d, k) => [hc[0] + d[0] * hr * W * k, hc[1] + d[1] * hr * k, hc[2] + d[2] * hr * k];
    const sc = (t, ph, k = 1.05) => onHead(dirOf(t, ph), k);
    const crCurve = (P, per = 6) => { const out = []; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; for (let s = 0; s < per; s++) { const t = s / per, t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); } } out.push(P[P.length - 1]); return out; };
    let hl = { front: 0.34, side: 0.52, back: 0.86 };
    const hairline = (ph) => { const f = Math.cos(ph); return f > 0 ? M.lerp(hl.side, hl.front, M.smooth(f)) : M.lerp(hl.side, hl.back, M.smooth(-f)); };
    const K = {
      sc, hairline,
      cap(o) {
        hl = { front: o.front, side: o.side, back: o.back };
        h.grid(56, 22, (u, v) => { const ph = u * Math.PI * 2; return onHead(dirOf(v * hairline(ph), ph), o.r * (1 - 0.03 * M.smooth((v * hairline(ph) - 0.62) / 0.25))); }, { closedU: true, flip: false, us: 3, vs: 1 });
      },
      ribbon(ctrl, o) {
        const P = crCurve(ctrl, o.per || 5); const n = P.length - 1;
        const wf = o.wf || ((v) => (1 - 0.55 * v) * (0.75 + 0.25 * M.smooth(v / 0.08)));
        h.grid(10, n, (u, v) => {
          const k = Math.round(v * n), p = P[k];
          const t = V.norm(V.sub(P[Math.min(n, k + 1)], P[Math.max(0, k - 1)]));
          const nrm = V.norm([(p[0] - hc[0]) / (W * W), p[1] - hc[1], p[2] - hc[2]]);
          const side = V.norm(V.cross(t, nrm)), bb = V.cross(t, side);
          const a = u * Math.PI * 2, s = wf(v);
          const bulge = Math.cos(a) * Math.cos(a); // lens-shaped cross-section: thick centre, thin edges
          return V.add(p, V.add(V.scale(side, Math.cos(a) * o.w * 0.5 * s), V.scale(bb, Math.sin(a) * o.th * (0.55 + 0.45 * (1 - bulge)) * Math.max(0.4, s))));
        }, { closedU: true, flip: true, us: 1, vs: 2 });
      },
      sweep(ph, target, o) {
        const t0 = hairline(ph) * 0.97; const d0 = dirOf(t0, ph);
        const dt = V.norm([(target[0] - hc[0]) / W, target[1] - hc[1], target[2] - hc[2]]);
        const ang = Math.acos(M.clamp(V.dot(d0, dt), -1, 1)); const ctrl = [];
        for (let i = 0; i <= 6; i++) {
          const f = i / 6; let d;
          if (ang < 1e-3) d = d0; else { const s0 = Math.sin((1 - f) * ang) / Math.sin(ang), s1 = Math.sin(f * ang) / Math.sin(ang); d = V.norm(V.add(V.scale(d0, s0), V.scale(dt, s1))); }
          ctrl.push(onHead(d, 1.035 + (o.lift || 0.06) * Math.sin(Math.PI * Math.min(1, f * 1.15)) - 0.05 * f * f));
        }
        if (o.col) h.set({ color: o.col });
        K.ribbon(ctrl, o);
      },
      coil(c, axis, o) {
        const a = V.norm(axis); const u1 = V.norm(V.cross(a, Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), u2 = V.cross(a, u1);
        const pts = []; const N = Math.ceil(o.turns * 14);
        for (let i = 0; i <= N; i++) { const s = i / N, th = s * o.turns * Math.PI * 2; pts.push(V.add(V.add(c, V.scale(a, (s - 0.5) * o.len)), V.add(V.scale(u1, Math.cos(th) * o.R), V.scale(u2, Math.sin(th) * o.R)))); }
        h.tube(pts, (s) => o.r * (0.55 + 0.45 * Math.sin(Math.PI * s)), 8);
      },
      tendril(p0, o) {
        const out = V.norm([p0[0] - hc[0], 0, p0[2] - hc[2]]); const ax = V.norm(V.add([0, -1, 0], V.scale(out, 0.18)));
        const u1 = V.norm(V.cross(ax, [0, 0, 1])), u2 = V.cross(ax, u1);
        const pts = []; const N = Math.ceil(o.turns * 14);
        for (let i = 0; i <= N; i++) { const s = i / N, th = s * o.turns * Math.PI * 2, R = o.R * (0.35 + 0.65 * s); pts.push(V.add(V.add(p0, V.scale(ax, s * o.len)), V.add(V.scale(u1, Math.cos(th) * R), V.scale(u2, Math.sin(th) * R)))); }
        h.tube(pts, (s) => o.r * (1 - 0.65 * s), 7);
      },
    };
    return K;
  };

  // ---------------- HAIR STYLES (reusable modules)
  LL.HairStyles = {
    // v3: sleek swept-back ribbons from the hairline into a curly side-back bun, a side-swept forehead lock,
    // and coiled tendrils at the temples (design board, Naomi). All pieces are reusable hair primitives (HairKit).
    bun(G, S, sp, surfZ) {
      const { hc, hr } = S; const h = G('hair');
      const K = LL.HairKit(h, S, sp);
      const base = lin(sp.hairColor), hi = lin(sp.hairHi || sp.hairColor);
      h.set({ color: base, spec: 0.32, shin: 0.5, bone: BI.head, skin: null });
      // scalp cap: hairline high at the forehead, low at the temples and nape; no lumpy ripple
      K.cap({ front: 0.34, side: 0.52, back: 0.86, r: 1.035 });
      // bun on the character's right-back crown
      const bunDir = V.norm([-0.62 * sp.bunSide, 0.5, -0.62]);
      const bc = V.add(hc, V.scale(bunDir, hr * 1.22));
      // swept ribbons: hairline -> bun, hugging the skull
      for (let i = 0; i < 30; i++) {
        const ph = -3.0 + (i / 29) * 6.0;
        K.sweep(ph, bc, { lift: 0.1 + 0.05 * Math.max(0, Math.cos(ph)), w: hr * 0.34, th: hr * 0.032, col: V.lerp(base, hi, (i % 4 === 1) ? 0.28 : (i % 4 === 3) ? 0.12 : 0.0) });
      }
      // side-swept forehead lock: from the part (her left) across the forehead, past the temple, tucked behind the ear
      h.set({ color: V.lerp(base, hi, 0.5), spec: 0.18, shin: 0.4 });
      K.ribbon([K.sc(0.06, 0.6 * sp.bunSide, 1.08), K.sc(0.2, 0.25 * sp.bunSide, 1.15), K.sc(0.31, -0.2 * sp.bunSide, 1.13), K.sc(0.38, -0.7 * sp.bunSide, 1.09),
        K.sc(0.47, -1.2 * sp.bunSide, 1.08), K.sc(0.53, -1.7 * sp.bunSide, 1.06), K.sc(0.5, -2.25 * sp.bunSide, 1.06)], { w: hr * 0.46, th: hr * 0.06, wf: (v) => (1 - 0.6 * v * v) * (0.55 + 0.45 * M.smooth(v / 0.2)) });
      h.set({ color: base, spec: 0.3, shin: 0.5 });
      K.ribbon([K.sc(0.12, 0.7 * sp.bunSide, 1.06), K.sc(0.28, 0.65 * sp.bunSide, 1.07), K.sc(0.4, 0.95 * sp.bunSide, 1.06), K.sc(0.5, 1.35 * sp.bunSide, 1.05), K.sc(0.52, 1.85 * sp.bunSide, 1.05)], { w: hr * 0.22, th: hr * 0.06 });
      // curly bun: core + ringlet coils
      h.set({ color: V.lerp(base, hi, 0.25) });
      h.pushT(bc[0], bc[1], bc[2]); h.sphere(hr * 0.5, hr * 0.46, hr * 0.48, 28, 18); h.pop();
      M.rand.seed(91);
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2, e = (k % 2 ? 0.45 : -0.15);
        const d = V.norm([Math.cos(a) * Math.cos(e), Math.sin(e) + 0.15, Math.sin(a) * Math.cos(e)]);
        h.set({ color: V.lerp(base, hi, 0.2 + 0.5 * M.rand.next()) });
        K.coil(V.add(bc, V.scale(d, hr * 0.44)), d, { R: hr * 0.14, r: hr * 0.1, turns: 1.4, len: hr * 0.16 });
      }
      // temple tendrils (coiled), both sides, plus one at the nape
      h.set({ color: V.lerp(base, hi, 0.4) });
      for (const sx of [1, -1]) K.tendril(K.sc(0.52, sx * 1.32, 1.04), { len: hr * 0.48, R: hr * 0.065, r: hr * 0.038, turns: 2.6 });
      K.tendril(K.sc(0.78, -2.6 * sp.bunSide, 1.02), { len: hr * 0.4, R: hr * 0.04, r: hr * 0.026, turns: 2.2 });
    },
    // legacy v2 bun kept for comparison renders (not used by any spec)
    bunV2(G, S, sp, surfZ) {
      const { hc, hr } = S; const h = G('hair');
      const base = lin(sp.hairColor);
      h.set({ color: base, spec: 0.12, shin: 0.3, bone: BI.head, skin: null });
      // skull cap with hairline that is low at the back, higher at the forehead
      h.pushT(hc[0], hc[1] + hr * 0.02, hc[2] - hr * 0.01);
      h.grid(48, 22, (u, v) => {
        const ph = u * Math.PI * 2; const fr = Math.cos(ph); // 1 = front
        const tmax = M.lerp(0.84, 0.29, M.smooth((fr + 0.15) / 1.0));
        const th = v * tmax * Math.PI;
        const tuck = th > 0.62 * Math.PI ? 1 - 0.06 * M.smooth((th / Math.PI - 0.62) / 0.22) : 1; // hug the nape
        const r = hr * 1.055 * tuck * (1 + 0.035 * Math.sin(ph * 9) * v);
        return [Math.sin(th) * Math.sin(ph) * r * sp.headW * 1.02, Math.cos(th) * r * 1.02, Math.sin(th) * Math.cos(ph) * r * 1.03];
      }, { closedU: true, flip: false, us: 3, vs: 1 });
      h.pop();
      // swept volume on both sides of the crown (sculpted lock clumps)
      for (const sx of [1, -1]) {
        for (let k = 0; k < 5; k++) {
          const phi = sx * (0.42 + k * 0.42), th = (0.27 + k * 0.035) * Math.PI;
          const dir = [Math.sin(phi) * Math.sin(th) * sp.headW, Math.cos(th), Math.cos(phi) * Math.sin(th)];
          const tan = V.norm([Math.cos(phi) * sx, -0.25, -Math.sin(phi) * sx]);
          const pc = V.add(hc, V.scale(dir, hr * 1.0));
          h.push(M4.trs(pc, Q.fromTo([0, 0, 1], tan)));
          h.sphere(hr * 0.2, hr * 0.17, hr * 0.42, 18, 12, { deform: (p, u, v) => V.scale(p, 1 + 0.06 * Math.sin(u * 30)) }); h.pop();
        }
      }
      // high messy bun
      const bc = [0, hc[1] + hr * 1.0, hc[2] - hr * 0.28];
      h.pushT(bc[0], bc[1], bc[2]); h.sphere(hr * 0.4, hr * 0.36, hr * 0.38, 24, 16, { deform: (p, u, v) => V.scale(p, 1 + 0.07 * Math.sin(u * 40 + v * 8)) }); h.pop();
      h.pushT(bc[0], bc[1] - hr * 0.22, bc[2], Q.euler(0.35, 0, 0)); h.torus(hr * 0.33, hr * 0.12, 28, 10); h.pop();
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * Math.PI * 2;
        h.pushT(bc[0] + Math.cos(a) * hr * 0.36, bc[1] + Math.sin(a * 2) * hr * 0.12 + hr * 0.04, bc[2] + Math.sin(a) * hr * 0.32, Q.euler(a, a * 0.7, 0.6));
        h.sphere(hr * 0.15, hr * 0.1, hr * 0.24, 12, 8); h.pop();
      }
      // face-framing loose strands (tapered tubes)
      for (const sx of [1, -1]) {
        for (let k = 0; k < 2; k++) {
          const pts = [];
          for (let i = 0; i <= 12; i++) {
            const t = i / 12;
            const x = sx * hr * (0.93 + 0.1 * t - (k ? 0.04 : 0) - 0.14 * Math.pow(t, 3));
            const y = hc[1] + hr * (0.55 - 1.1 * t);
            const zz = hc[2] + hr * (0.42 - 0.22 * t - k * 0.16) + Math.sin(t * 5) * hr * 0.04;
            pts.push([x, y, zz]);
          }
          h.tube(pts, (t) => hr * (0.07 - 0.055 * t) * (k ? 0.7 : 1), 8);
        }
      }
    },
  };

  // ---------------- OUTFITS (reusable modules)
  LL.Outfits = {
    pinafore(G, S, sp, J, chainW) {
      const { P, b, w } = S;
      const cream = lin(sp.blouse || '#f3e7d2');
      const torsoW = (p) => chainW(p, [J('pelvis'), J('spine'), J('chest'), J('neck')], 0.07);
      const ell = (p) => [p[0] * 1.12, p[1], p[2] * 0.8];
      // blouse yoke & shoulders
      const bl = G('cloth'); bl.set({ color: cream, spec: 0.08, shin: 0.2, skin: torsoW, bone: -1 });
      bl.lathe([[0.09, P.neck[1] + 0.01], [0.17, P.neck[1] - 0.03], [0.24, P.upperarm_L[1] - 0.02], [0.27, P.chest[1] + 0.06], [0.265, P.chest[1] - 0.06]].map(([r, y]) => [r * w, y]), 28, { deform: ell });
      // collar ruffle
      bl.set({ color: cream, skin: (p) => chainW(p, [J('chest'), J('neck')], 0.05) });
      bl.pushT(0, P.neck[1] - 0.02, 0.0); bl.grid(40, 4, (u, v) => { const a = u * Math.PI * 2; const r = (0.11 + v * 0.06 + 0.012 * Math.sin(a * 16)) * w; return [Math.sin(a) * r * 1.05, -v * 0.05 + 0.01 * Math.sin(a * 16), Math.cos(a) * r * 0.85]; }, { closedU: true }); bl.pop();
      // floral bodice
      const fl = G('floral'); fl.set({ color: [1, 1, 1], spec: 0.08, shin: 0.25, skin: torsoW, bone: -1 });
      fl.lathe([[0.268, P.chest[1] + 0.02], [0.262, P.chest[1] - 0.06], [0.235, (P.chest[1] + P.spine[1]) / 2], [0.205, P.spine[1] + 0.02], [0.215, P.spine[1] - 0.05]].map(([r, y]) => [r * w * 1.012, y]), 28, { deform: ell, us: 2, vs: 1 });
      // lace bodice trim + waistband
      const lc = G('lace'); lc.set({ color: [1, 1, 1], spec: 0.05, skin: torsoW, bone: -1 });
      lc.lathe([[0.276, P.chest[1] + 0.035], [0.272, P.chest[1] - 0.005]].map(([r, y]) => [r * w, y]), 28, { deform: ell, us: 6 });
      lc.set({ color: lin('#d98c8c') }); lc.lathe([[0.22, P.spine[1] + 0.02], [0.225, P.spine[1] - 0.045]].map(([r, y]) => [r * w * 1.02, y]), 28, { deform: ell, us: 6 });
      // necklace + pendant
      const gold = G('gold'); gold.set({ color: lin('#d6a548'), spec: 0.9, shin: 0.8, skin: null, bone: BI.chest });
      gold.pushT(0, P.neck[1] - 0.06, 0.03, Q.euler(0.55, 0, 0)); gold.torus(0.13 * w, 0.006, 32, 5); gold.pop();
      gold.pushT(0, P.chest[1] + 0.07, 0.2 * w * 0.8 + 0.012); gold.sphere(0.022, 0.03, 0.012, 10, 8); gold.pop();
      // skirt: flared, folded hem (dedicated skirt bones keep sitting & walking clean)
      const top = P.spine[1] - 0.02, hem = (sp.hem || 0.5) * b;
      const skirtW = (p) => {
        const h = M.smooth((top - p[1]) / (top - hem));
        const front = p[2] >= 0; const fz = Math.min(1, Math.abs(p[2]) / 0.3);
        return [BI.pelvis, front ? BI.skirtF : BI.skirtB, 1 - h * fz * 0.95, h * fz * 0.95];
      };
      fl.set({ skin: skirtW });
      const prof = []; for (let k = 0; k <= 12; k++) { const t = k / 12; prof.push([(0.215 + (sp.flare || 0.42) * Math.pow(t, 0.8) - 0.02 * t * t) * w, M.lerp(top, hem, t)]); }
      fl.lathe(prof, 56, { us: 4, vs: 2, deform: (p, u, v) => { const r = 1 + 0.06 * Math.sin(u * Math.PI * 2 * 11) * v * v; return [p[0] * r, p[1], p[2] * r * 0.9]; } });
      // underskirt (dark rose) + lace hem
      const us = G('cloth'); us.set({ color: lin('#7a2e2c'), spec: 0.05, skin: skirtW, bone: -1 });
      us.lathe([[0.6 * w, hem + 0.06], [0.63 * w, hem - 0.04]], 48, { deform: (p, u) => { const r = 1 + 0.05 * Math.sin(u * Math.PI * 2 * 11); return [p[0] * r, p[1], p[2] * r * 0.9]; } });
      lc.set({ color: [1, 1, 1], skin: skirtW });
      lc.lathe([[0.625 * w, hem + 0.05], [0.66 * w, hem - 0.01]], 56, { us: 14, deform: (p, u) => { const r = 1 + 0.062 * Math.sin(u * Math.PI * 2 * 11); return [p[0] * r, p[1], p[2] * r * 0.9]; } });
      // puff sleeves + ruffled cuffs
      for (const s of ['L', 'R']) {
        const sx = s === 'L' ? 1 : -1;
        const ch = [J('upperarm_' + s), J('forearm_' + s), J('hand_' + s)];
        bl.set({ color: cream, skin: (p) => { const r = chainW(p, ch, 0.05); return p[1] > P['upperarm_' + s][1] - 0.04 && Math.abs(p[0]) < 0.3 * w ? [BI.chest, r[0], 0.5, 0.5] : r; } });
        const u0 = P['upperarm_' + s], e0 = P['forearm_' + s];
        const mid = V.lerp(u0, e0, 0.4);
        bl.pushT(mid[0] + sx * 0.02, mid[1] + 0.02, mid[2], Q.euler(0, 0, sx * 0.18));
        bl.sphere(0.13 * w, 0.17 * b, 0.13 * w, 24, 16, { deform: (p, u, v) => { const r = 1 + 0.05 * Math.sin(u * Math.PI * 2 * 8) * Math.sin(v * Math.PI); return [p[0] * r, p[1], p[2] * r]; } });
        bl.pop();
        bl.set({ color: cream, skin: (p) => chainW(p, ch, 0.05) });
        const h0 = P['hand_' + s], cuff = V.lerp(e0, h0, sp.sleeve ?? 0.0);
        if (sp.sleeve) { // gathered lower sleeve down past the elbow
          const sp2 = []; for (let k = 0; k <= 6; k++) sp2.push(V.lerp(V.lerp(u0, e0, 0.75), cuff, k / 6));
          bl.tube(sp2, (t) => (0.1 + 0.025 * Math.sin(t * Math.PI)) * w, 16);
        }
        bl.pushT(cuff[0] + sx * 0.004, cuff[1] + 0.005, cuff[2]);
        bl.grid(32, 3, (u, v) => { const a = u * Math.PI * 2; const r = (0.085 + v * 0.045 + 0.014 * Math.sin(a * 12)) * w; return [Math.sin(a) * r, 0.02 - v * 0.07, Math.cos(a) * r]; }, { closedU: true });
        bl.pop();
      }
      // shoes (mary janes) on foot bones
      const sh = G('shoe'); sh.set({ color: lin(sp.shoe || '#5a3020'), spec: 0.6, shin: 0.7, skin: null });
      for (const s of ['L', 'R']) {
        const f = P['foot_' + s]; sh.set({ bone: BI['foot_' + s] });
        sh.pushT(f[0], 0.027, f[2] + 0.06); sh.sphere(0.075 * w, 0.078, 0.13, 20, 14, { deform: (p) => [p[0], p[1] < 0 ? p[1] * 0.35 : p[1], p[2]] }); sh.pop();
        sh.set({ color: lin('#2a170f') }); sh.pushT(f[0], 0.012, f[2] + 0.06); sh.sphere(0.079 * w, 0.013, 0.135, 16, 6); sh.pop();
        sh.set({ color: lin(sp.shoe || '#5a3020') });
        sh.pushT(f[0], 0.06, f[2] + 0.05, Q.euler(-Math.PI / 2, 0, 0)); sh.torus(0.07 * w, 0.009, 16, 5, 0.5); sh.pop();
      }
      // earrings
      const g2 = G('gold'); g2.set({ skin: null, bone: BI.head });
      for (const sx of [1, -1]) {
        const e = [sx * S.hr * sp.headW * 0.98, S.hc[1] - S.hr * 0.3, S.hc[2] + 0.01];
        g2.pushT(e[0], e[1], e[2]); g2.sphere(0.018, 0.018, 0.018, 8, 6); g2.pop();
        g2.pushT(e[0], e[1] - 0.05, e[2]); g2.sphere(0.02, 0.03, 0.02, 10, 8); g2.pop();
      }
    },
  };

  // ---------------- runtime character instance (pose -> skin matrices)
  class Character {
    constructor(R, spec, texs) {
      this.spec = spec;
      const built = buildCharacter(R, spec);
      this.meshes = built.meshes; this.P = built.P; this.S = built.S; this.vcount = built.vcount;
      this.bones = new Float32Array(LL.Renderer.MAX_BONES * 16);
      for (let i = 0; i < LL.Renderer.MAX_BONES; i++) this.bones.set(M4.ident(), i * 16);
      this.pos = [0, 0, 0]; this.heading = 0; this.model = M4.ident();
      this.world = BONES.map(() => M4.ident()); this.wq = BONES.map(() => Q.ident());
      const mat = { skin: { tex: null, wrap: 0.55, rim: 0.25 }, eye: { tex: texs.iris, wrap: 0.1, rim: 0 }, hair: { tex: texs.hair, wrap: 0.15, rim: 0.35 },
        cloth: { tex: texs.paintCloth, wrap: 0.3, rim: 0.25 }, floral: { tex: texs.floral, wrap: 0.3, rim: 0.25 }, lace: { tex: texs.lace, wrap: 0.3, rim: 0.2 },
        dark: { tex: null, wrap: 0.2 }, gold: { tex: null, wrap: 0 }, shoe: { tex: null, wrap: 0.1, rim: 0.1 } };
      this.items = Object.entries(this.meshes).map(([k, m]) => ({ mesh: m, model: this.model, bones: this.bones, tex: mat[k].tex, wrap: mat[k].wrap, rim: mat[k].rim || 0, interior: true, visible: true, key: k }));
    }
    // pose: {q:{bone:quat}, t:{bone:[x,y,z]}, s:{bone:[x,y,z]}}
    apply(pose, ik) {
      const P = this.P;
      for (let i = 0; i < BONES.length; i++) {
        const n = BONES[i], par = PARENT[n];
        const bp = P[n], pp = par ? P[par] : [0, 0, 0];
        const off = pose.t[n] || [0, 0, 0];
        const q = pose.q[n] || [0, 0, 0, 1];
        const sc = pose.s[n];
        const local = M4.trs([bp[0] - pp[0] + off[0], bp[1] - pp[1] + off[1], bp[2] - pp[2] + off[2]], q, sc);
        this.world[i] = par ? M4.mul(this.world[BI[par]], local) : local;
        this.wq[i] = par ? Q.mul(this.wq[BI[par]], q) : q;
        if (ik && ik[n]) this._ik(n, ik[n], pose);
      }
      for (let i = 0; i < BONES.length; i++) {
        const bp = P[BONES[i]];
        const m = M4.mul(this.world[i], M4.translate(-bp[0], -bp[1], -bp[2]));
        this.bones.set(m, i * 16);
      }
      const mm = M4.mul(M4.translate(this.pos[0], this.pos[1], this.pos[2]), M4.rotY(this.heading));
      this.model.set(mm);
    }
    // two-bone IK; called right after the upper-arm bone is evaluated. target in character space
    _ik(upper, tgt, pose) {
      const s = upper.slice(-1), P = this.P;
      const iu = BI[upper], ifo = BI['forearm_' + s], ih = BI['hand_' + s], ic = BI.chest;
      const Sw = M4.point(this.world[iu], [0, 0, 0]);
      const a = V.dist(P[upper], P['forearm_' + s]), bl = V.dist(P['forearm_' + s], P['hand_' + s]);
      const T = tgt.p; let d = V.sub(T, Sw); let dl = V.len(d); dl = M.clamp(dl, 0.05, a + bl - 0.002); const dn = V.norm(d);
      const pole = tgt.pole || [s === 'L' ? 0.6 : -0.6, -0.3, -1];
      let n = V.cross(dn, pole); if (V.len(n) < 1e-4) n = [1, 0, 0]; n = V.norm(n);
      const alpha = Math.acos(M.clamp((a * a + dl * dl - bl * bl) / (2 * a * dl), -1, 1));
      const elbowDir = Q.rotate(Q.axis(n, alpha), dn);
      const E = V.add(Sw, V.scale(elbowDir, a));
      const qc = this.wq[ic], qcInv = Q.conj(qc);
      const d0u = V.norm(V.sub(P['forearm_' + s], P[upper]));
      const qu = Q.fromTo(d0u, Q.rotate(qcInv, elbowDir));
      const w = tgt.w == null ? 1 : tgt.w;
      const quF = Q.nlerp(pose.q[upper] || Q.ident(), qu, w);
      pose.q[upper] = quF;
      const quW = Q.mul(qc, quF);
      const d0f = V.norm(V.sub(P['hand_' + s], P['forearm_' + s]));
      const tgtF = V.add(Sw, V.scale(dn, dl));
      const dirF = Q.rotate(Q.conj(quW), V.norm(V.sub(tgtF, V.add(Sw, Q.rotate(quW, V.scale(d0u, a))))));
      const qf = Q.fromTo(d0f, dirF);
      pose.q['forearm_' + s] = Q.nlerp(pose.q['forearm_' + s] || Q.ident(), qf, w);
      // recompute upper world immediately (children computed after in loop order)
      const par = PARENT[upper], bp = P[upper], pp = P[par];
      this.world[iu] = M4.mul(this.world[BI[par]], M4.trs(V.sub(bp, pp), quF));
      this.wq[iu] = quW;
      void ifo; void ih; void E;
    }
    // world position of a bone (for hand-held props)
    boneWorld(name) { return M4.mul(this.model, this.world[BI[name]]); }
  }
  LL.Character = Character;

  // Naomi — base proportion set (Mother, 36)
  LL.CharacterSpecs = {
    naomi: { name: 'Naomi', body: 1.0, width: 1.0, headR: 0.465, headW: 1.06, hem: 0.3, flare: 0.46, sleeve: 0.38, jaw: 0.1, cheek: 0.1, faceFlat: 0.9, eye: 0.31, eyeX: 0.37, eyeY: 0.2, mouthY: 0.64, noseY: 0.45, mouthW: 0.1,
      nose: 1.2, limb: 1.3, browW: 1.15, browY: 1.32, neckW: 1.1, headDrop: 0.15, eyeSink: 0.72, irisDrop: 0.12,
      skin: '#cc8e6a', blush: '#e88470', hairColor: '#1a1311', hairHi: '#6a4430', bunSide: 1, browColor: '#2a1710', lip: '#8e4640', blouse: '#f4e8d4', shoe: '#5e321f', hair: 'bun', outfit: 'pinafore', eyeColor: [52, 36, 30] },
  };
})();
