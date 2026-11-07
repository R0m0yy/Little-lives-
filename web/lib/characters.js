// Little Lives — swappable characters (contract: docs/CHARACTER_CONTRACT.md).
// Any GLB that follows the contract drops in: glTF Y-up, metres-like units where the reference adult (Naomi) is 1.0
// tall, feet at the origin, facing +Z (Blender -Y), materials named skin*/hair*/cornea/fabric* for look-dev tuning.
// The loader only measures and reports; it never silently rescales unless ?normalize=1 asks for it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { tuneCharacterMaterials } from './look.js';

export const CONTRACT = { up: 'Y', forward: '+Z', origin: 'feet', heights: { naomi: 1.0, darius: 1.05, elias: 0.95, laila: 0.78 }, maxTris: 60000 };

export async function loadCharacter(url, renderer, { normalizeTo = null } = {}) {
  const g = await new GLTFLoader().loadAsync(url);
  const root = g.scene;
  tuneCharacterMaterials(root, renderer);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } if (o.name.startsWith('LM_')) o.visible = false; });
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  let tris = 0; root.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  const report = { url, height: +size.y.toFixed(3), width: +size.x.toFixed(3), depth: +size.z.toFixed(3), feetY: +box.min.y.toFixed(3), tris: Math.round(tris),
    animations: g.animations.map((a) => a.name), skinned: (() => { let s = false; root.traverse((o) => { if (o.isSkinnedMesh) s = true; }); return s; })() };
  report.ok = Math.abs(report.feetY) < 0.02 && report.tris <= CONTRACT.maxTris * 2;   // body+outfit may exceed the head+hair budget
  if (normalizeTo) { const k = normalizeTo / size.y; root.scale.setScalar(k); report.scaled = +k.toFixed(3); }
  const holder = new THREE.Group(); holder.add(root);
  return { object: holder, report, animations: g.animations };
}

/** Place at an interaction point from house_data.json (Blender coords -> three: (x, z, -y)); face = character forward. */
export function placeAt(obj, ip) {
  obj.position.set(ip.stand[0], ip.stand[2], -ip.stand[1]);
  const fx = ip.face[0], fz = -ip.face[1];          // three.js forward vector
  obj.rotation.y = Math.atan2(fx, fz);              // model faces +Z at rotation 0
  if (ip.kind === 'sit' && ip.seat_h) { obj.position.set(ip.contact[0], ip.stand[2] + 0, -ip.contact[1]); obj.userData.seated = true; }
  return obj;
}
