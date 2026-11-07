// Shared "look" for Little Lives renders: studio lights and Three.js-side material tuning.
// Blender exports base PBR (+clearcoat/sheen/anisotropy). Effects glTF can't carry are added here by material name.
import * as THREE from 'three';

export function studioLights(scene, { key = 2.8, warm = 0xffd2a8 } = {}) {
  const hemi = new THREE.HemisphereLight(0xffe8e0, 0x6a4a40, 0.6); scene.add(hemi);
  const k = new THREE.DirectionalLight(warm, key); k.position.set(1.6, 3.2, 3.0); k.castShadow = true;
  k.shadow.mapSize.set(2048, 2048); k.shadow.camera.left = -1.2; k.shadow.camera.right = 1.2; k.shadow.camera.top = 1.6; k.shadow.camera.bottom = -0.4; k.shadow.radius = 6; k.shadow.bias = -0.0004; k.shadow.normalBias = 0.01;
  scene.add(k);
  const fill = new THREE.DirectionalLight(0xd8d0ff, 0.7); fill.position.set(-2.5, 1.5, 2.0); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff0e0, 1.6); rim.position.set(-1.5, 2.5, -2.5); scene.add(rim);
  const rimWarm = new THREE.DirectionalLight(0xffc890, 2.2); rimWarm.position.set(2.2, 2.6, -2.4); scene.add(rimWarm);   // warm hair rim (round 23)
  return { hemi, key: k, fill, rim, rimWarm };
}

export function tuneCharacterMaterials(root, renderer) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      for (const t of ['map', 'normalMap', 'roughnessMap']) if (m[t]) m[t].anisotropy = aniso;
      const n = m.name || '';
      if (n.startsWith('skin')) { m.sheen = 0.25; m.sheenColor = new THREE.Color(0xff8a5a); m.sheenRoughness = 0.5; m.roughness = Math.max(m.roughness, 0.5); }
      if (n.startsWith('cornea')) { m.transparent = false; m.opacity = 1; m.transmission = 1; m.thickness = 0; m.ior = 1.376; m.roughness = 0.0; m.clearcoat = 0; m.color.set(0xffffff); m.envMapIntensity = 1.2; m.specularIntensity = 1; }  // clear glass: reflections only
      if (n.startsWith('hair')) { m.envMapIntensity = 0.75; }  // matte silk, not mirror gloss
      if (n.startsWith('fabric')) { m.sheen = 0.35; m.sheenRoughness = 0.65; m.sheenColor = (m.map ? new THREE.Color(0xf0d8c8) : m.color.clone().lerp(new THREE.Color(0xffffff), 0.35)); }
    }
  });
}
