import * as THREE from 'three';
import { createRng } from '../core/rng';

const CLOUDS = 16;
const PUFFS = 4;

export type Clouds = { group: THREE.Group; update(time: number): void };

/**
 * Nuages low-poly : un seul InstancedMesh (un appel de dessin), sans ombre.
 * Le groupe tourne lentement autour de l'île : aucun calcul par nuage à chaque image.
 */
export function createClouds(seed: number): Clouds {
  const rng = createRng(seed);
  const mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }),
    CLOUDS * PUFFS,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  for (let i = 0; i < CLOUDS; i++) {
    const angle = (i / CLOUDS) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const radius = rng.range(50, 230);
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius;
    const cy = rng.range(55, 85);
    const size = rng.range(6, 11);
    for (let k = 0; k < PUFFS; k++) {
      const w = size * rng.range(0.6, 1.1);
      p.set(cx + (k - (PUFFS - 1) / 2) * size * 0.85, cy + rng.range(-0.15, 0.15) * size, cz + rng.range(-0.4, 0.4) * size);
      e.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      s.set(w, w * 0.55, w * 0.8);
      mesh.setMatrixAt(i * PUFFS + k, m.compose(p, q.setFromEuler(e), s));
    }
  }
  mesh.computeBoundingSphere();
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group,
    update(time: number) {
      group.rotation.y = time * 0.004;
    },
  };
}
