// Little Lives — reference-matched camera for the house (refs/design_board.png, lower-right house).
//
// The board crop refs/house_ref.png (board [990,605]-[1510,1025]) is the camera frame. Camera model: long lens,
// near-front, slight high angle; its fov / elevation / yaw are calibrated once (tools/house_measure.cjs --calibrate)
// and then frozen in HOUSE_CAM so rounds are comparable. Per render:
//   * distance  -> projected house height (centre finial top to plinth bottom) equals the reference in pixels
//   * translation -> least-squares shift over all landmarks (errors then measure shape, not placement)
import * as THREE from 'three';

export const HOUSE_CAM = {
  // Frozen in H0 from the board's own perspective cues (not fitted to our model): both interior side walls of the
  // ground-floor end rooms show ~10 px => camera centred ~43 units away => ~11 deg vertical FOV; the ground-floor
  // floor shows ~25 px and the third-floor floor ~15 px, no ceilings visible => eye ~8.5 units up => ~6 deg elevation.
  // (A grid search on the round-6 blockout preferred fov 8 / el 0 / yaw 2 — the blockout was built near-orthographically,
  // so that fit says more about the model than the board.)
  fovDeg: 11.0,
  elevDeg: 6.0,
  yawDeg: 0.0,
  crop: [990, 605, 1510, 1025],
};

function lmWorld(root) {
  const out = {}; root.updateMatrixWorld(true);
  root.traverse((o) => { if (o.name && o.name.startsWith('LM_')) out[o.name.slice(3)] = o.getWorldPosition(new THREE.Vector3()); });
  return out;
}

export function fitHouseCamera(root, camera, ref, K, cam = HOUSE_CAM) {
  const [x0, y0, x1, y1] = cam.crop;
  const W = (x1 - x0) * K, H = (y1 - y0) * K;
  camera.fov = cam.fovDeg; camera.aspect = W / H; camera.near = 0.5; camera.far = 400; camera.clearViewOffset(); camera.updateProjectionMatrix();
  const L = lmWorld(root);
  const top = L[ref.house_top], bot = L[ref.house_bottom];
  const T = top.clone().add(bot).multiplyScalar(0.5);
  const az = THREE.MathUtils.degToRad(cam.yawDeg), el = THREE.MathUtils.degToRad(cam.elevDeg);
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const R = ref.points;
  const hRef = (R[ref.house_bottom][1] - R[ref.house_top][1]) * K;
  const proj = (p) => { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  let D = 40;
  for (let it = 0; it < 10; it++) {
    camera.position.copy(T).addScaledVector(dir, D); camera.lookAt(T); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    const h = proj(bot)[1] - proj(top)[1];
    D *= h / hRef;
  }
  camera.position.copy(T).addScaledVector(dir, D); camera.lookAt(T); camera.updateMatrixWorld();
  let sx = 0, sy = 0, n = 0;
  const raw = {};
  for (const [k, p] of Object.entries(L)) {
    const q = proj(p); raw[k] = [q[0] / K + x0, q[1] / K + y0];
    if (R[k]) { sx += R[k][0] - raw[k][0]; sy += R[k][1] - raw[k][1]; n++; }
  }
  const shift = [sx / n, sy / n];
  const projected = {}; for (const [k, b] of Object.entries(raw)) projected[k] = [b[0] + shift[0], b[1] + shift[1]];
  camera.setViewOffset(W, H, -shift[0] * K, -shift[1] * K, W, H); camera.updateProjectionMatrix();
  return { W, H, K, D, shift, proj: projected, target: T.toArray(), cam: { ...cam, position: camera.position.toArray(), quaternion: camera.quaternion.toArray() } };
}
