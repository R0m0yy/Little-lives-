// Little Lives — procedural animation: locomotion cycle, sit blend, activity layers, arm IK, look-at, face
// Conventions (bone local, character faces +z): leg forward = -rx, knee bend = +rx, arm forward = -rx,
// elbow bend = -rx, spine lean forward = +rx, head down = +rx, left arm out = +rz, right arm out = -rz.
(function () {
  const { M, V, Q, M4 } = LL;
  const EYES = ['eye_L', 'eye_R'];
  const BLEND_BONES = ['pelvis', 'spine', 'chest', 'neck', 'head', 'upperarm_L', 'forearm_L', 'hand_L', 'upperarm_R', 'forearm_R', 'hand_R', 'thigh_L', 'shin_L', 'foot_L', 'thigh_R', 'shin_R', 'foot_R', 'fingers_L', 'fingers_R', 'skirtF', 'skirtB'];

  const add = (a, b, k = 1) => { for (const n in b) { const v = b[n]; if (!a[n]) a[n] = [0, 0, 0]; a[n][0] += v[0] * k; a[n][1] += v[1] * k; a[n][2] += v[2] * k; } return a; };
  const mix = (a, b, t) => { const o = {}; const keys = new Set([...Object.keys(a), ...Object.keys(b)]); for (const k of keys) { const x = a[k] || [0, 0, 0], y = b[k] || [0, 0, 0]; o[k] = [M.lerp(x[0], y[0], t), M.lerp(x[1], y[1], t), M.lerp(x[2], y[2], t)]; } return o; };

  const CLIPS = {
    idle(t, p) {
      const br = Math.sin(t * 1.55);
      const sway = Math.sin(t * 0.37), sway2 = Math.sin(t * 0.23 + 1);
      return {
        pelvis: [0, sway * 0.04, sway2 * 0.015], spine: [0.02, -sway * 0.02, -sway2 * 0.01], chest: [0.015 + br * 0.018, -sway * 0.02, 0],
        neck: [0.02, 0, 0], head: [0.02 + br * 0.008, sway2 * 0.08, sway * 0.03],
        upperarm_L: [0.04 + br * 0.01, 0, 0.14 + br * 0.012], upperarm_R: [0.04 + br * 0.01, 0, -0.14 - br * 0.012],
        forearm_L: [-0.22, 0, 0], forearm_R: [-0.22, 0, 0], hand_L: [0, 0, -0.05], hand_R: [0, 0, 0.05], fingers_L: [-0.2, 0, 0], fingers_R: [-0.2, 0, 0],
        thigh_L: [0, -0.06, -0.02 + sway2 * 0.015], thigh_R: [0, 0.06, 0.02 + sway2 * 0.015], shin_L: [0.03, 0, 0], shin_R: [0.03, 0, 0],
        pelvisT: [sway2 * 0.012, br * 0.003, 0],
      };
    },
    walk(t, p) {
      const ph = p.phase, s = Math.sin(ph), c = Math.cos(ph), a = p.stride;
      const swL = Math.max(0, c), swR = Math.max(0, -c);
      const tL = -0.48 * s * a, tR = 0.48 * s * a, kL = 0.08 + 0.75 * swL * a, kR = 0.08 + 0.75 * swR * a;
      return {
        pelvis: [0.03 * a, 0.1 * s * a, 0.04 * c * a], spine: [0.05 * a, -0.05 * s * a, 0], chest: [0.02, -0.08 * s * a, -0.03 * c * a],
        neck: [0, 0.04 * s * a, 0], head: [-0.03 * a, 0.06 * s * a, 0.02 * c * a],
        thigh_L: [tL, 0, -0.02], thigh_R: [tR, 0, 0.02], shin_L: [kL, 0, 0], shin_R: [kR, 0, 0],
        foot_L: [-(tL + kL) * 0.75, 0, 0], foot_R: [-(tR + kR) * 0.75, 0, 0],
        upperarm_L: [0.4 * s * a, 0, 0.16], upperarm_R: [-0.4 * s * a, 0, -0.16],
        forearm_L: [-0.32 - 0.18 * Math.max(0, -s) * a, 0, 0], forearm_R: [-0.32 - 0.18 * Math.max(0, s) * a, 0, 0],
        fingers_L: [-0.25, 0, 0], fingers_R: [-0.25, 0, 0],
        skirtF: [-0.06 * Math.abs(s) * a, 0, 0.05 * s * a], skirtB: [0.05 * Math.abs(s) * a, 0, -0.05 * s * a],
        pelvisT: [0, (Math.abs(c) - 0.6) * 0.045 * a, 0],
      };
    },
    seated(t, p) {
      const br = Math.sin(t * 1.4);
      return {
        pelvis: [0, 0, 0], spine: [0.06, 0, 0], chest: [0.03 + br * 0.015, 0, 0], head: [0.05, 0, 0],
        thigh_L: [-1.52, -0.05, -0.04], thigh_R: [-1.52, 0.05, 0.04], shin_L: [1.45, 0, 0], shin_R: [1.45, 0, 0], foot_L: [0.05, 0, 0], foot_R: [0.05, 0, 0],
        upperarm_L: [-0.3, 0, 0.12], upperarm_R: [-0.3, 0, -0.12], forearm_L: [-0.9, 0, 0], forearm_R: [-0.9, 0, 0],
        fingers_L: [-0.3, 0, 0], fingers_R: [-0.3, 0, 0],
        skirtF: [-1.25, 0, 0], skirtB: [-0.55, 0, 0],
        pelvisT: [0, -0.455, -0.47],
      };
    },
  };
  LL.CLIPS = CLIPS;

  class Animator {
    constructor(ch) {
      this.ch = ch; this.t = 0; this.phase = 0; this.speed = 0; this.stride = 0;
      this.sit = 0; this.sitTarget = 0; this.lean = 0; this.leanT = 0; this.crouch = 0; this.crouchT = 0;
      this.ik = { L: { w: 0, p: [0, 1, 0.4], tw: 0, tp: null, pole: null }, R: { w: 0, p: [0, 1, 0.4], tw: 0, tp: null, pole: null } };
      this.look = null; this.lookW = 0; this.headYaw = 0; this.headPitch = 0; this.eyeYaw = 0; this.eyePitch = 0;
      this.blinkT = 2; this.blink = 0; this.expr = 'neutral'; this.exprW = {}; this.talk = 0; this.chew = 0; this.eyesClosed = 0; this.eyesClosedT = 0;
      this.extra = null; this.extraW = 0;
    }
    // ik target in world space; null to release
    setIK(side, world, opts = {}) { const k = this.ik[side]; if (!world) { k.tw = 0; return; } k.tp = world; k.tw = opts.w == null ? 1 : opts.w; k.pole = opts.pole || null; k.rate = opts.rate || 7; }
    toLocal(p) { const inv = M4.invert(this.ch.model); return M4.point(inv, p); }
    update(dt, moveSpeed, angVel) {
      this.t += dt;
      const ch = this.ch;
      // locomotion: phase advances with distance so feet stay planted
      const turnStep = Math.min(1, Math.abs(angVel) * 0.35);
      const locoSpeed = Math.max(moveSpeed, turnStep * 0.5);
      this.phase += locoSpeed * dt * (Math.PI * 2 / 1.25);
      const strideT = M.clamp(locoSpeed / 0.9, 0, 1);
      this.stride = M.damp(this.stride, strideT, 8, dt);
      this.sit = M.damp(this.sit, this.sitTarget, 3.2, dt);
      this.lean = M.damp(this.lean, this.leanT, 5, dt);
      this.crouch = M.damp(this.crouch, this.crouchT, 4, dt);
      const ctx = { phase: this.phase, stride: this.stride };
      let e = mix(CLIPS.idle(this.t, ctx), CLIPS.walk(this.t, ctx), M.smooth(this.stride * 1.6));
      if (this.sit > 0.001) {
        const s = M.smooth(this.sit);
        // mid-transition: lean forward over the knees (weight shift) for a believable sit/stand
        const mid = Math.sin(s * Math.PI);
        e = mix(e, CLIPS.seated(this.t, ctx), s);
        add(e, { spine: [0.35 * mid, 0, 0], chest: [0.15 * mid, 0, 0], upperarm_L: [-0.3 * mid, 0, 0], upperarm_R: [-0.3 * mid, 0, 0] });
      }
      if (this.lean) add(e, { spine: [this.lean * 0.6, 0, 0], chest: [this.lean * 0.4, 0, 0], head: [-this.lean * 0.2, 0, 0] });
      if (this.crouch) add(e, { thigh_L: [-0.5 * this.crouch, 0, 0], thigh_R: [-0.5 * this.crouch, 0, 0], shin_L: [0.9 * this.crouch, 0, 0], shin_R: [0.9 * this.crouch, 0, 0], foot_L: [-0.4 * this.crouch, 0, 0], foot_R: [-0.4 * this.crouch, 0, 0], spine: [0.4 * this.crouch, 0, 0], pelvisT: [0, -0.16 * this.crouch, -0.08 * this.crouch] });
      if (this.extra) { this.extraW = M.damp(this.extraW, 1, 5, dt); add(e, this.extra(this.t), this.extraW); } else this.extraW = 0;
      // build quaternion pose
      const pose = { q: {}, t: {}, s: {} };
      for (const b of BLEND_BONES) { const r = e[b]; if (r) pose.q[b] = Q.euler(r[0], r[1], r[2]); }
      if (e.pelvisT) pose.t.pelvis = e.pelvisT;
      // look-at (head + eyes) in character space
      this._look(pose, dt);
      this._face(pose, dt);
      // IK (world targets -> character space, smooth weights)
      const ik = {};
      for (const side of ['L', 'R']) {
        const k = this.ik[side];
        k.w = M.damp(k.w, k.tw, k.rate || 7, dt);
        if (k.tp) { const lp = this.toLocal(k.tp); k.p = k.w < 0.02 ? lp : V.lerp(k.p, lp, 1 - Math.exp(-14 * dt)); }
        if (k.w > 0.01) ik['upperarm_' + side] = { p: k.p, w: M.smooth(k.w), pole: k.pole };
      }
      ch.apply(pose, ik);
      return pose;
    }
    _look(pose, dt) {
      let yaw = 0, pitch = 0, w = 0;
      if (this.look) {
        const lp = this.toLocal(this.look);
        const headPos = [0, 2.1 - this.sit * 0.46, -this.sit * 0.47];
        const d = V.sub(lp, headPos);
        yaw = M.clamp(Math.atan2(d[0], d[2]), -1.1, 1.1);
        pitch = M.clamp(-Math.atan2(d[1], Math.hypot(d[0], d[2])), -0.5, 0.75);
        w = Math.abs(Math.atan2(d[0], d[2])) > 2.0 ? 0 : 1;
      }
      this.lookW = M.damp(this.lookW, w, 4, dt);
      this.headYaw = M.damp(this.headYaw, yaw * this.lookW, 6, dt);
      this.headPitch = M.damp(this.headPitch, pitch * this.lookW, 6, dt);
      const hq = Q.euler(this.headPitch * 0.6, this.headYaw * 0.6, 0), nq = Q.euler(this.headPitch * 0.35, this.headYaw * 0.35, 0);
      pose.q.head = Q.mul(pose.q.head || Q.ident(), hq); pose.q.neck = Q.mul(pose.q.neck || Q.ident(), nq);
      // eyes lead the head (residual angle)
      const ey = M.clamp((yaw - this.headYaw * 0.95) * 1.2 + yaw * 0.2, -0.38, 0.38), ep = M.clamp((pitch - this.headPitch * 0.95) + pitch * 0.15, -0.3, 0.35);
      this.eyeYaw = M.damp(this.eyeYaw, ey, 18, dt); this.eyePitch = M.damp(this.eyePitch, ep, 18, dt);
      for (const e of EYES) pose.q[e] = Q.euler(this.eyePitch, this.eyeYaw, 0);
    }
    _face(pose, dt) {
      // blink
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blink = 1; this.blinkT = 1.8 + Math.random() * 3.5; if (Math.random() < 0.15) this.blinkT = 0.25; }
      this.blink = Math.max(0, this.blink - dt * 7);
      const bl = this.blink > 0 ? Math.sin(this.blink * Math.PI) : 0;
      this.eyesClosed = M.damp(this.eyesClosed, this.eyesClosedT, 2.5, dt);
      const E = LL.EXPR[this.expr] || LL.EXPR.neutral;
      for (const k of Object.keys(LL.EXPR.neutral)) { const tgt = E[k] == null ? LL.EXPR.neutral[k] : E[k]; this.exprW[k] = this.exprW[k] == null ? tgt : M.damp(this.exprW[k], tgt, 6, dt); }
      const X = this.exprW;
      const lidOpen = X.lid, lid = M.lerp(lidOpen, 0.32, Math.max(bl, this.eyesClosed));
      pose.q.lid_L = pose.q.lid_R = Q.euler(lid + this.eyePitch * 0.5, 0, 0);
      pose.t.brow_L = [0, X.brow, Math.abs(X.browRot) * 0.04]; pose.t.brow_R = [0, X.brow, Math.abs(X.browRot) * 0.04];
      pose.q.brow_L = Q.euler(0, 0, X.browRot); pose.q.brow_R = Q.euler(0, 0, -X.browRot);
      // mouth: smile curve + open amount (talk / chew)
      this.talk = Math.max(0, this.talk - dt); this.chew = Math.max(0, this.chew - dt);
      let open = X.open;
      if (this.talk > 0) open = Math.max(open, 0.35 + 0.45 * Math.abs(Math.sin(this.t * 11) * Math.sin(this.t * 4.3)));
      if (this.chew > 0) open = Math.max(open, 0.25 * Math.max(0, Math.sin(this.t * 9)));
      pose.s.mouth = [1 + Math.abs(X.smile) * 0.15 - open * 0.3, X.smile * (1 - open * 0.7) * 0.8 + 0.001, 1];
      pose.s.mouthO = open > 0.02 ? [0.7 + open * 0.3, open * 1.3, 1] : [0.001, 0.001, 0.001];
    }
  }
  LL.EXPR = {
    neutral: { lid: -0.86, brow: 0, browRot: 0, smile: 1.0, open: 0 },
    happy: { lid: -0.72, brow: 0.025, smile: 1.6 },
    joy: { lid: -0.6, brow: 0.04, smile: 1.8, open: 0.5 },
    surprised: { lid: -1.0, brow: 0.07, smile: 0.3, open: 0.9 },
    sad: { lid: -0.6, browRot: -0.22, smile: -1.0 },
    angry: { lid: -0.66, browRot: 0.2, brow: -0.02, smile: -0.6 },
    tired: { lid: -0.18, brow: -0.01, smile: 0.4 },
    focused: { lid: -0.68, brow: -0.012, browRot: 0.06, smile: 0.6 },
    content: { lid: -0.64, smile: 1.4 },
  };
  LL.Animator = Animator;
})();
