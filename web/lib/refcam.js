// Little Lives — reference-matched camera for measuring Naomi against refs/design_board.png.
//
// One physical camera for the whole figure (the board crop is one shot): long lens (85 mm-equivalent on a
// 24 mm-tall sensor => 16.07 deg vertical FOV), yawed 17 deg toward her left, 9 deg above eye level.
// Framing: the full-body crop refs/naomi_full_ref.png (board [1030,85]-[1205,395]) is the camera frame.
//   * distance  -> projected head height (chin to top of hair mass) equals the reference in pixels
//   * translation -> least-squares shift over the face landmarks (so errors measure shape, not placement)
// The head crop (board [1030,85]-[1185,210]) is a view-offset window of that same frame.
import * as THREE from 'three';

export const REF = {
  fovDeg: (2 * Math.atan(12 / 85) * 180) / Math.PI,
  yawDeg: 20,          // she is turned toward her left => camera moves toward her right (-X). Calibrated: 15/17/20 deg tested, 20 fits best
  elevDeg: 9,
  full: [1030, 85, 1205, 395],
  windows: { head: [1030, 85, 1185, 210], full: [1030, 85, 1205, 395] },
};
// landmarks used for the translation fit (face shape)
export const FACE_FIT = ['eye_R', 'eye_L', 'eye_R_outer', 'eye_R_inner', 'eye_L_inner', 'eye_L_outer', 'brow_R', 'brow_L',
  'nose_tip', 'mouth_R', 'mouth_L', 'mouth_centre', 'chin', 'cheek_R', 'cheek_L'];

function groupMeshes(root, test) { const out = []; root.traverse((o) => { if (o.isMesh && test(o.userData || {})) out.push(o); }); return out; }

/** Project every vertex of meshes; returns [{x,y}] in full-frame pixels. */
function projectVerts(meshes, camera, Wf, Hf, keep = null) {
  const v = new THREE.Vector3(), out = [];
  for (const m of meshes) {
    const pos = m.geometry.attributes.position; m.updateMatrixWorld();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (keep && !keep(v)) continue;
      v.project(camera);
      out.push({ x: (v.x + 1) / 2 * Wf, y: (1 - v.y) / 2 * Hf });
    }
  }
  return out;
}

function projectPoint(p, camera, Wf, Hf) { const v = p.clone().project(camera); return { x: (v.x + 1) / 2 * Wf, y: (1 - v.y) / 2 * Hf }; }

/** Landmarks in full-frame px (camera WITHOUT view offset). */
export function measureLandmarks(root, camera, Wf, Hf) {
  const out = {};
  root.traverse((o) => { if (o.name && o.name.startsWith('LM_')) { o.updateMatrixWorld(); out[o.name.slice(3)] = projectPoint(o.getWorldPosition(new THREE.Vector3()), camera, Wf, Hf); } });
  const head = projectVerts(groupMeshes(root, (u) => u.ll_group === 'head'), camera, Wf, Hf);
  // chin: lowest point of the FRONT half of the head (the jaw underside is hidden by neck/collar)
  const headFront = projectVerts(groupMeshes(root, (u) => u.ll_group === 'head'), camera, Wf, Hf, (w) => w.z > 0.02);
  const hair = projectVerts(groupMeshes(root, (u) => u.ll_group === 'hair'), camera, Wf, Hf);
  const bun = projectVerts(groupMeshes(root, (u) => u.ll_group === 'bun'), camera, Wf, Hf);
  const earR = projectVerts(groupMeshes(root, (u) => u.ll_group === 'ear' && u.ll_side === 'R'), camera, Wf, Hf);
  const ext = (arr, key, sgn) => arr.reduce((b, p) => (b === null || sgn * p[key] > sgn * b[key] ? p : b), null);
  if (hair.length) out.hair_top = ext(hair, 'y', -1);
  if (bun.length) out.bun_top = ext(bun, 'y', -1);
  if (head.length) {
    out.chin = ext(headFront, 'y', 1);
    const ny = out.nose_tip ? out.nose_tip.y : out.chin.y - 20, my = out.mouth_centre ? out.mouth_centre.y : ny + 8;
    const band = head.filter((p) => p.y >= ny && p.y <= my + 0.3 * (out.chin.y - my));
    if (band.length) { out.cheek_R = ext(band, 'x', -1); out.cheek_L = ext(band, 'x', 1); }
  }
  if (earR.length) { out.ear_R_top = ext(earR, 'y', -1); out.ear_R_bottom = ext(earR, 'y', 1); }
  return out;
}

/**
 * Fit the reference camera. ref: parsed refs/naomi_landmarks.json. K: render px per board px.
 * Returns { Wf, Hf, shift:[dx,dy] (board px), proj: {name:[bx,by]} in board px (with shift), cam: {...} }
 */
export function fitRefCamera(root, camera, ref, K) {
  const [fx0, fy0, fx1, fy1] = REF.full;
  const Wf = (fx1 - fx0) * K, Hf = (fy1 - fy0) * K;
  camera.fov = REF.fovDeg; camera.aspect = Wf / Hf; camera.near = 0.05; camera.far = 50; camera.clearViewOffset(); camera.updateProjectionMatrix();
  const lmObj = {}; root.traverse((o) => { if (o.name && o.name.startsWith('LM_')) lmObj[o.name.slice(3)] = o; });
  root.updateMatrixWorld(true);
  const eR = lmObj.eye_R.getWorldPosition(new THREE.Vector3()), eL = lmObj.eye_L.getWorldPosition(new THREE.Vector3());
  const T = eR.clone().add(eL).multiplyScalar(0.5);
  const az = THREE.MathUtils.degToRad(-REF.yawDeg), el = THREE.MathUtils.degToRad(REF.elevDeg);
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const R = ref.head;
  const hhRef = (R.chin[1] - R.hair_top[1]) * K;
  let D = 3.8, lm;
  for (let it = 0; it < 8; it++) {
    camera.position.copy(T).addScaledVector(dir, D); camera.lookAt(T); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    lm = measureLandmarks(root, camera, Wf, Hf);
    const hh = lm.chin.y - lm.hair_top.y;
    D *= hh / hhRef;
  }
  camera.position.copy(T).addScaledVector(dir, D); camera.lookAt(T); camera.updateMatrixWorld();
  lm = measureLandmarks(root, camera, Wf, Hf);
  const toBoard = (p) => [p.x / K + fx0, p.y / K + fy0];
  let sx = 0, sy = 0, n = 0;
  for (const k of FACE_FIT) if (lm[k] && R[k]) { const b = toBoard(lm[k]); sx += R[k][0] - b[0]; sy += R[k][1] - b[1]; n++; }
  const shift = [sx / n, sy / n];
  const proj = {}; for (const [k, p] of Object.entries(lm)) { const b = toBoard(p); proj[k] = [b[0] + shift[0], b[1] + shift[1]]; }
  return { Wf, Hf, K, D, shift, proj, target: T.toArray(), cam: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fovDeg: camera.fov } };
}

/** Apply the view-offset window for 'head' or 'full'. Returns window size in px. */
export function applyWindow(camera, fit, name) {
  const [wx0, wy0, wx1, wy1] = REF.windows[name];
  const [fx0, fy0] = REF.full, K = fit.K;
  const ox = (wx0 - fx0) * K - fit.shift[0] * K, oy = (wy0 - fy0) * K - fit.shift[1] * K;
  const w = (wx1 - wx0) * K, h = (wy1 - wy0) * K;
  camera.setViewOffset(fit.Wf, fit.Hf, ox, oy, w, h); camera.updateProjectionMatrix();
  fit.window = { name, ox, oy, w, h, board: REF.windows[name] };
  return [w, h];
}
