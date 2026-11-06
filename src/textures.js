// Little Lives — procedural canvas textures (all original, generated at load)
(function () {
  const R = LL.M.rand;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const T = {};

  function noise(ctx, w, h, amt, alpha = 0.06) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (R.next() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
  }

  T.wallpaper = () => {
    const [c, x] = mk(512, 512); R.seed(11);
    x.fillStyle = '#efe2c6'; x.fillRect(0, 0, 512, 512);
    // soft vertical stripes
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(214,190,150,0.28)' : 'rgba(255,248,232,0.25)'; x.fillRect(i * 64, 0, 64, 512); }
    // damask medallions
    const motif = (cx, cy, s) => {
      x.save(); x.translate(cx, cy); x.scale(s, s);
      x.fillStyle = 'rgba(176,132,92,0.42)';
      for (let k = 0; k < 2; k++) {
        x.save(); x.scale(k ? -1 : 1, 1);
        x.beginPath(); x.moveTo(0, -46); x.bezierCurveTo(22, -40, 30, -18, 12, -4); x.bezierCurveTo(28, 6, 26, 30, 0, 46); x.lineTo(0, 30);
        x.bezierCurveTo(12, 22, 12, 10, 3, 4); x.bezierCurveTo(16, -10, 10, -30, 0, -32); x.fill();
        x.beginPath(); x.ellipse(20, -26, 6, 11, 0.6, 0, 7); x.fill();
        x.beginPath(); x.ellipse(22, 24, 5, 9, -0.6, 0, 7); x.fill();
        x.restore();
      }
      x.fillStyle = 'rgba(150,104,70,0.45)'; x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill();
      x.restore();
    };
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) motif(64 + i * 128 + (j % 2) * 64, 64 + j * 128, 0.95);
    // tiny sprigs
    x.fillStyle = 'rgba(150,120,80,0.35)';
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(i * 64 + 32 * (j % 2), j * 64 + 32, 2.2, 0, 7); x.fill(); }
    noise(x, 512, 512, 10);
    return c;
  };
  T.planks = (base = [176, 118, 66]) => {
    const [c, x] = mk(512, 512); R.seed(5);
    const rows = 8, h = 512 / rows;
    for (let r = 0; r < rows; r++) {
      let px = -R.next() * 200;
      while (px < 512) {
        const len = 180 + R.next() * 220, t = (R.next() - 0.5) * 34;
        const col = base.map((v) => Math.round(v + t));
        x.fillStyle = `rgb(${col})`; x.fillRect(px, r * h, len, h);
        // grain
        for (let g = 0; g < 14; g++) {
          x.strokeStyle = `rgba(70,38,14,${0.06 + R.next() * 0.1})`; x.lineWidth = 0.6 + R.next() * 1.2;
          const y0 = r * h + R.next() * h; x.beginPath(); x.moveTo(px, y0);
          for (let s = 0; s <= 8; s++) x.lineTo(px + (len * s) / 8, y0 + Math.sin(s * 0.9 + g) * 2.4);
          x.stroke();
        }
        if (R.next() < 0.35) { x.strokeStyle = 'rgba(70,35,12,0.3)'; x.beginPath(); x.ellipse(px + len * R.next(), r * h + h / 2, 7, 3, 0, 0, 7); x.stroke(); }
        x.fillStyle = 'rgba(40,20,8,0.55)'; x.fillRect(px, r * h, 2, h);
        px += len;
      }
      x.fillStyle = 'rgba(40,20,8,0.6)'; x.fillRect(0, r * h, 512, 2);
    }
    noise(x, 512, 512, 12);
    return c;
  };
  T.grain = (base = [120, 70, 38], streak = 0.18) => {
    const [c, x] = mk(256, 256); R.seed(9);
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, 256, 256);
    for (let g = 0; g < 70; g++) {
      x.strokeStyle = `rgba(40,18,6,${0.04 + R.next() * streak})`; x.lineWidth = 0.5 + R.next() * 2;
      const y0 = R.next() * 256; x.beginPath(); x.moveTo(0, y0);
      for (let s = 0; s <= 16; s++) x.lineTo(s * 16, y0 + Math.sin(s * 0.5 + g * 1.3) * 3);
      x.stroke();
    }
    noise(x, 256, 256, 10);
    return c;
  };
  T.paint = (base = [238, 228, 205]) => { // painted wood (cabinets): subtle brush streaks
    const [c, x] = mk(256, 256); R.seed(21);
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, 256, 256);
    for (let g = 0; g < 50; g++) { x.fillStyle = `rgba(150,120,80,${R.next() * 0.05})`; x.fillRect(0, R.next() * 256, 256, 1 + R.next() * 3); }
    noise(x, 256, 256, 6);
    return c;
  };
  T.tiles = () => {
    const [c, x] = mk(256, 256);
    x.fillStyle = '#cbbfa8'; x.fillRect(0, 0, 256, 256);
    const tw = 64, th = 32;
    for (let r = 0; r < 8; r++) for (let i = -1; i < 5; i++) {
      const ox = i * tw + (r % 2) * 32;
      const g = x.createLinearGradient(ox, r * th, ox, r * th + th);
      g.addColorStop(0, '#fbf8f0'); g.addColorStop(1, '#e9e2d2');
      x.fillStyle = g; x.fillRect(ox + 2, r * th + 2, tw - 4, th - 4);
      x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(ox + 4, r * th + 4, tw - 10, 3);
    }
    return c;
  };
  T.floral = (bg = '#f2e6d3') => {
    const [c, x] = mk(512, 512); R.seed(33);
    x.fillStyle = bg; x.fillRect(0, 0, 512, 512);
    const flower = (fx, fy, s, col, centre) => {
      x.save(); x.translate(fx, fy); x.rotate(R.next() * 6);
      x.fillStyle = col;
      for (let k = 0; k < 5; k++) { x.rotate(Math.PI * 2 / 5); x.beginPath(); x.ellipse(0, s * 0.55, s * 0.38, s * 0.55, 0, 0, 7); x.fill(); }
      x.fillStyle = centre; x.beginPath(); x.arc(0, 0, s * 0.28, 0, 7); x.fill();
      x.restore();
    };
    const leaf = (lx, ly, s) => { x.save(); x.translate(lx, ly); x.rotate(R.next() * 6); x.fillStyle = R.next() < 0.5 ? '#9aa978' : '#b5b98c'; x.beginPath(); x.ellipse(0, 0, s * 0.3, s, 0, 0, 7); x.fill(); x.restore(); };
    const cols = ['#e58f86', '#ef9f7a', '#d9779a', '#93acd0', '#f0c27a', '#e8a1a8'];
    for (let i = 0; i < 90; i++) { const px = R.next() * 512, py = R.next() * 512; leaf(px, py, 7 + R.next() * 9); }
    for (let i = 0; i < 70; i++) {
      const px = R.next() * 512, py = R.next() * 512, s = 9 + R.next() * 16;
      for (const [dx, dy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) flower(px + dx, py + dy, s, cols[i % cols.length], '#f6dd9a');
    }
    for (let i = 0; i < 160; i++) { x.fillStyle = cols[i % cols.length]; x.globalAlpha = 0.7; x.beginPath(); x.arc(R.next() * 512, R.next() * 512, 2 + R.next() * 2.5, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    noise(x, 512, 512, 8);
    return c;
  };
  T.lace = () => { // ruffle/hem band
    const [c, x] = mk(256, 64);
    x.fillStyle = '#f7efe0'; x.fillRect(0, 0, 256, 64);
    x.fillStyle = 'rgba(190,160,120,0.45)';
    for (let i = 0; i < 16; i++) { x.beginPath(); x.arc(i * 16 + 8, 46, 6, 0, 7); x.fill(); x.beginPath(); x.arc(i * 16 + 8, 20, 2.5, 0, 7); x.fill(); }
    return c;
  };
  T.iris = (col = [70, 42, 26]) => {
    const [c, x] = mk(256, 256);
    // sclera everywhere, iris at the +z pole (centre of texture mapped via planar uv)
    x.fillStyle = '#fbf8f5'; x.fillRect(0, 0, 256, 256);
    const g0 = x.createRadialGradient(128, 128, 60, 128, 128, 128); g0.addColorStop(0, 'rgba(0,0,0,0)'); g0.addColorStop(1, 'rgba(180,150,150,0.35)');
    x.fillStyle = g0; x.fillRect(0, 0, 256, 256);
    // v3: large, dark, glossy iris (fills most of the visible eye like the design board), soft limbal ring
    const g = x.createRadialGradient(128, 128, 10, 128, 128, 112);
    g.addColorStop(0, `rgb(${col.map((v) => v * 0.45)})`); g.addColorStop(0.5, `rgb(${col.map((v) => v * 1.25)})`); g.addColorStop(0.85, `rgb(${col.map((v) => v * 0.8)})`); g.addColorStop(1, '#0d0706');
    x.fillStyle = g; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,230,200,0.08)'; x.lineWidth = 1.5;
    for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; x.beginPath(); x.moveTo(128 + Math.cos(t) * 52, 128 + Math.sin(t) * 52); x.lineTo(128 + Math.cos(t) * 92, 128 + Math.sin(t) * 92); x.stroke(); }
    x.fillStyle = '#070404'; x.beginPath(); x.arc(128, 128, 56, 0, 7); x.fill();
    // baked catch-lights (controlled reflections): one large soft key, one small fill
    const cl = x.createRadialGradient(96, 94, 4, 96, 94, 27); cl.addColorStop(0, 'rgba(255,255,255,1)'); cl.addColorStop(0.75, 'rgba(255,255,255,0.95)'); cl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = cl; x.beginPath(); x.ellipse(96, 94, 27, 25, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(160, 162, 9, 0, 7); x.fill();
    return c;
  };
  T.hair = (base = [215, 205, 198]) => {
    const [c, x] = mk(256, 256); R.seed(44);
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      const px = R.next() * 256, w = 1 + R.next() * 3, l = R.next() < 0.5;
      x.strokeStyle = l ? `rgba(255,240,225,${0.15 + R.next() * 0.25})` : `rgba(60,40,30,${0.2 + R.next() * 0.3})`;
      x.lineWidth = w; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + 6, 90, px - 6, 170, px + 3, 256); x.stroke();
    }
    return c;
  };
  T.rug = () => {
    const [c, x] = mk(512, 320); R.seed(55);
    x.fillStyle = '#8a2d26'; x.fillRect(0, 0, 512, 320);
    x.strokeStyle = '#d7b57a'; x.lineWidth = 10; x.strokeRect(14, 14, 484, 292);
    x.strokeStyle = '#1f2f4a'; x.lineWidth = 16; x.strokeRect(34, 34, 444, 252);
    x.fillStyle = '#c9a368';
    for (let i = 0; i < 22; i++) { x.beginPath(); x.arc(46 + i * 19.8, 34, 4, 0, 7); x.fill(); x.beginPath(); x.arc(46 + i * 19.8, 286, 4, 0, 7); x.fill(); }
    x.save(); x.translate(256, 160);
    for (let k = 0; k < 4; k++) { x.rotate(Math.PI / 2); x.fillStyle = '#2b3d5c'; x.beginPath(); x.ellipse(0, 52, 26, 50, 0, 0, 7); x.fill(); x.fillStyle = '#d9b478'; x.beginPath(); x.ellipse(0, 60, 10, 22, 0, 0, 7); x.fill(); }
    x.fillStyle = '#e9cf98'; x.beginPath(); x.arc(0, 0, 22, 0, 7); x.fill(); x.fillStyle = '#8a2d26'; x.beginPath(); x.arc(0, 0, 10, 0, 7); x.fill();
    x.restore();
    for (let i = 0; i < 60; i++) { x.fillStyle = ['#c9a368', '#2b3d5c', '#5d7a4f'][i % 3]; x.globalAlpha = 0.6; x.beginPath(); x.arc(70 + R.next() * 372, 60 + R.next() * 200, 3, 0, 7); x.fill(); }
    x.globalAlpha = 1; noise(x, 512, 320, 26);
    return c;
  };
  T.cloth = () => { // white tablecloth with woven check
    const [c, x] = mk(256, 256);
    x.fillStyle = '#f6f1e7'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = 'rgba(200,180,150,0.18)';
    for (let i = 0; i < 256; i += 16) { x.fillRect(i, 0, 6, 256); x.fillRect(0, i, 256, 6); }
    x.fillStyle = 'rgba(190,150,110,0.35)'; for (let i = 0; i < 256; i += 32) for (let j = 0; j < 256; j += 32) { x.beginPath(); x.arc(i + 16, j + 16, 3, 0, 7); x.fill(); }
    noise(x, 256, 256, 6); return c;
  };
  T.backdrop = () => { // the "real" living room behind the dollhouse (gets heavily blurred by DOF)
    const [c, x] = mk(1024, 512); R.seed(66);
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#3a2a22'); g.addColorStop(0.6, '#5b4232'); g.addColorStop(1, '#2a1d16');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    // window with evening light (left)
    x.fillStyle = '#6f7f8c'; x.fillRect(80, 60, 220, 300); x.fillStyle = '#9fb0b8'; x.fillRect(96, 76, 90, 130); x.fillRect(196, 76, 90, 130);
    x.fillStyle = '#7d8f99'; x.fillRect(96, 216, 90, 130); x.fillRect(196, 216, 90, 130);
    // bookshelf
    x.fillStyle = '#2c1c14'; x.fillRect(420, 40, 260, 360);
    for (let r = 0; r < 5; r++) for (let b = 0; b < 16; b++) { x.fillStyle = ['#7a3b2e', '#3f5a4a', '#b08a4a', '#4a3f6a', '#8d6b52'][(r * 7 + b) % 5]; x.fillRect(432 + b * 15.5, 54 + r * 70, 12, 56 - (b % 3) * 6); }
    // plant (right)
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${60 + R.next() * 40},${90 + R.next() * 50},${50 + R.next() * 30},0.85)`; x.beginPath(); x.ellipse(860 + (R.next() - 0.5) * 180, 170 + (R.next() - 0.5) * 220, 22, 46, R.next() * 3, 0, 7); x.fill(); }
    // floor lamp glow (right) + table lamp (left)
    for (const [lx, ly, r] of [[960, 150, 160], [330, 300, 120]]) { const lg = x.createRadialGradient(lx, ly, 4, lx, ly, r); lg.addColorStop(0, 'rgba(255,220,150,1)'); lg.addColorStop(0.3, 'rgba(255,190,110,0.55)'); lg.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = lg; x.fillRect(lx - r, ly - r, r * 2, r * 2); }
    // bokeh specks
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(255,${190 + R.next() * 50},${120 + R.next() * 60},${0.25 + R.next() * 0.4})`; x.beginPath(); x.arc(R.next() * 1024, R.next() * 380, 6 + R.next() * 12, 0, 7); x.fill(); }
    // sofa silhouette
    x.fillStyle = '#5c3f33'; x.beginPath(); x.roundRect ? x.roundRect(560, 360, 360, 110, 30) : x.rect(560, 360, 360, 110); x.fill();
    return c;
  };
  T.walnut = () => T.planks([92, 56, 34]);
  T.siding = () => { const [c, x] = mk(256, 256); x.fillStyle = '#f1e8d4'; x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++) { const g = x.createLinearGradient(0, r * 32, 0, r * 32 + 32); g.addColorStop(0, 'rgba(120,95,60,0.35)'); g.addColorStop(0.25, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.15)'); x.fillStyle = g; x.fillRect(0, r * 32, 256, 32); }
    noise(x, 256, 256, 6); return c; };
  T.slate = () => { // roof shingles
    const [c, x] = mk(256, 256); R.seed(77);
    x.fillStyle = '#4a5866'; x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++) for (let i = -1; i < 9; i++) {
      const ox = i * 32 + (r % 2) * 16, oy = r * 32; const t = (R.next() - 0.5) * 30;
      x.fillStyle = `rgb(${88 + t},${104 + t},${122 + t})`;
      x.beginPath(); x.moveTo(ox + 1, oy); x.lineTo(ox + 31, oy); x.lineTo(ox + 31, oy + 22); x.quadraticCurveTo(ox + 16, oy + 34, ox + 1, oy + 22); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(20,25,35,0.5)'; x.stroke();
    }
    return c;
  };
  T.sky = () => { const [c, x] = mk(64, 128); const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d8d8d8'); x.fillStyle = g; x.fillRect(0, 0, 64, 128);
    // garden silhouette at the bottom of the window view
    x.fillStyle = '#b9c2b0'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(i * 8, 118, 9 + (i % 3) * 3, 0, 7); x.fill(); } return c; };
  T.clockFace = () => {
    const [c, x] = mk(128, 128);
    x.fillStyle = '#f5ecd8'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
    x.strokeStyle = '#6b4a2a'; x.lineWidth = 5; x.stroke();
    x.fillStyle = '#3a2a1a';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.beginPath(); x.arc(64 + Math.sin(a) * 50, 64 - Math.cos(a) * 50, i % 3 ? 2.5 : 4.5, 0, 7); x.fill(); }
    return c;
  };
  T.book = (col = '#7a3b2e') => { const [c, x] = mk(64, 64); x.fillStyle = col; x.fillRect(0, 0, 64, 64); x.fillStyle = '#d9b874'; x.fillRect(0, 10, 64, 4); x.fillRect(0, 50, 64, 4); return c; };
  T.pages = () => { const [c, x] = mk(128, 128); x.fillStyle = '#f4ead2'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(60,40,30,0.5)'; for (let r = 0; r < 14; r++) { x.fillRect(10, 12 + r * 8, 44 - (r % 4) * 4, 2); x.fillRect(74, 12 + r * 8, 44 - (r % 3) * 5, 2); } x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(62, 0, 4, 128); return c; };
  T.stew = () => { const [c, x] = mk(128, 128); R.seed(88); x.fillStyle = '#b0582a'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 60; i++) { x.fillStyle = ['#e7a04a', '#6f9a3c', '#f2d27a', '#8a3a1e', '#d9773a'][i % 5]; x.beginPath(); x.arc(R.next() * 128, R.next() * 128, 3 + R.next() * 6, 0, 7); x.fill(); } return c; };
  T.porridge = () => { const [c, x] = mk(128, 128); R.seed(89); x.fillStyle = '#ead8b2'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 30; i++) { x.fillStyle = ['#5a3a8a', '#c2304a', '#f4e8cc'][i % 3]; x.beginPath(); x.arc(R.next() * 128, R.next() * 128, 3 + R.next() * 4, 0, 7); x.fill(); } return c; };
  LL.Tex = T;
})();
