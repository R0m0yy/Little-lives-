// Shared "look" for Little Lives renders: lighting rig, backdrop and Three.js-side material tuning.
// Blender exports base PBR (+clearcoat/sheen/anisotropy/transmission). Effects glTF can't carry are added here by
// material name: hair (Kajiya-Kay double highlight), skin (wrap lighting + red-orange terminator), cornea (glass).
import * as THREE from 'three';

/** Round 26+ rig (owner brief): warm key upper-left (~3300 K), cool soft fill right, strong warm rim behind-right. */
export function studioLights(scene, { key = 2.3, fill = 0.65, rim = 2.6 } = {}) {
  const hemi = new THREE.HemisphereLight(0xf0dfe8, 0x5a4044, 0.45); scene.add(hemi);
  const k = new THREE.DirectionalLight(0xffc896, key); k.position.set(-2.2, 3.0, 2.8); k.castShadow = true;
  k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -1.2, right: 1.2, top: 1.6, bottom: -0.4 });
  k.shadow.radius = 5; k.shadow.bias = -0.0004; k.shadow.normalBias = 0.01;
  scene.add(k);
  const f = new THREE.DirectionalLight(0xbccbff, fill); f.position.set(2.8, 1.1, 2.2); scene.add(f);
  const r = new THREE.DirectionalLight(0xffb478, rim); r.position.set(2.3, 2.5, -2.7); scene.add(r);
  const r2 = new THREE.DirectionalLight(0xffd8b0, rim * 0.35); r2.position.set(-2.6, 1.8, -2.2); scene.add(r2);
  return { hemi, key: k, fill: f, rim: r, rim2: r2 };
}

/** Painted backdrop sampled from the board behind Naomi: mauve, lighter on the left, soft out-of-focus bokeh. */
export function refBackdrop() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  const gx = g.createLinearGradient(0, 0, 512, 0); gx.addColorStop(0, 'rgb(143,121,130)'); gx.addColorStop(1, 'rgb(112,98,114)');
  g.fillStyle = gx; g.fillRect(0, 0, 512, 512);
  const gy = g.createLinearGradient(0, 0, 0, 512); gy.addColorStop(0, 'rgba(70,55,70,0.18)'); gy.addColorStop(0.5, 'rgba(0,0,0,0)'); gy.addColorStop(1, 'rgba(60,45,55,0.15)');
  g.fillStyle = gy; g.fillRect(0, 0, 512, 512);
  for (const [x, y, r, a] of [[60, 60, 46, 0.10], [450, 90, 60, 0.07], [90, 420, 70, 0.06], [470, 440, 40, 0.08], [300, 30, 30, 0.06]]) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(255,225,215,${a})`); rg.addColorStop(0.7, `rgba(255,225,215,${a * 0.8})`); rg.addColorStop(1, 'rgba(255,225,215,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 512, 512);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const DIR_LOOP = (body) => `
#if NUM_DIR_LIGHTS > 0
  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    vec3 L = directionalLights[i].direction; vec3 Lc = directionalLights[i].color;
    ${body}
  }
#endif`;

/** Kajiya-Kay double highlight along the strand direction (UV u): sharp white band + soft warm-brown band. */
function hairShader(m, o = {}) {
  const P = { shift1: -0.10, shift2: 0.16, exp1: 320.0, exp2: 70.0, col1: new THREE.Color(1.0, 0.97, 0.94), col2: new THREE.Color(0.52, 0.30, 0.17),
    s1: 0.10, s2: 0.010, ...o };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { kkS1: { value: P.shift1 }, kkS2: { value: P.shift2 }, kkE1: { value: P.exp1 }, kkE2: { value: P.exp2 },
      kkC1: { value: P.col1 }, kkC2: { value: P.col2 }, kkA1: { value: P.s1 }, kkA2: { value: P.s2 } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vHairUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvHairUv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vHairUv; uniform float kkS1, kkS2, kkE1, kkE2, kkA1, kkA2; uniform vec3 kkC1, kkC2;
float kkTerm(vec3 T, vec3 N, vec3 H, float sh, float ex) { vec3 Ts = normalize(T + N * sh); float d = dot(Ts, H); return pow(sqrt(max(0.0, 1.0 - d * d)), ex) * smoothstep(-1.0, 0.0, d); }`)
      .replace('#include <opaque_fragment>', `{
  vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition); vec2 st0 = dFdx(vHairUv), st1 = dFdy(vHairUv);
  vec3 Nn = normalize(normal); vec3 T = q0 * st1.t - q1 * st0.t; T = normalize(T - Nn * dot(Nn, T) + 1e-6);
  vec3 Vv = normalize(vViewPosition); vec3 kk = vec3(0.0);
  float jit = 0.0;
  #ifdef USE_MAP
    jit = (texture2D(map, vMapUv).r - 0.97) * 0.6;
  #endif
  ${DIR_LOOP('vec3 Hh = normalize(L + Vv); float w = clamp(dot(Nn, L) * 0.6 + 0.4, 0.0, 1.0); kk += Lc * w * (kkC1 * kkA1 * kkTerm(T, Nn, Hh, kkS1 + jit * 0.08, kkE1) + kkC2 * kkA2 * kkTerm(T, Nn, Hh, kkS2 + jit * 0.12, kkE2));')}
  outgoingLight += kk;
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'hairKK';
}

/** Skin: wrap lighting (light bleeds past the terminator) tinted red-orange near the terminator (SSS approximation). */
function skinShader(m, o = {}) {
  const P = { wrap: 0.40, tint: new THREE.Color(1.0, 0.36, 0.20), k: 0.38, ...o };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { skWrap: { value: P.wrap }, skTint: { value: P.tint }, skK: { value: P.k } });
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float skWrap, skK; uniform vec3 skTint;')
      .replace('#include <opaque_fragment>', `{
  vec3 Nn = normalize(normal); vec3 sss = vec3(0.0);
  ${DIR_LOOP('float ndl = dot(Nn, L); float wrapD = max(0.0, (ndl + skWrap) / (1.0 + skWrap)) - max(0.0, ndl); float term = exp(-ndl * ndl / 0.06); sss += Lc * (wrapD + 0.35 * term * step(-0.2, ndl));')}
  outgoingLight += diffuseColor.rgb * sss * skTint * skK;
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'skinSSS';
}

export function tuneCharacterMaterials(root, renderer) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const done = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (done.has(m)) continue; done.add(m);
      for (const t of ['map', 'normalMap', 'roughnessMap']) if (m[t]) m[t].anisotropy = aniso;
      const n = m.name || '';
      if (n.startsWith('skin')) { m.sheen = 0.25; m.sheenColor = new THREE.Color(0xff9a70); m.sheenRoughness = 0.5; m.roughness = Math.max(m.roughness, 0.55); skinShader(m); }
      if (n.startsWith('cornea')) { m.transparent = false; m.opacity = 1; m.transmission = 1; m.thickness = 0; m.ior = 1.376; m.roughness = 0.0; m.clearcoat = 0; m.color.set(0xffffff); m.envMapIntensity = 1.3; m.specularIntensity = 1; }
      if (n === 'hair' || n.startsWith('hair_bun')) { m.envMapIntensity = 0.18; m.roughness = Math.max(m.roughness, 0.6); m.specularIntensity = 0.12; if (m.normalScale) m.normalScale.set(0.5, 0.5); hairShader(m); }
      if (n.startsWith('fabric')) { m.sheen = 0.35; m.sheenRoughness = 0.65; m.sheenColor = (m.map ? new THREE.Color(0xf0d8c8) : m.color.clone().lerp(new THREE.Color(0xffffff), 0.35)); }
    }
  });
}
