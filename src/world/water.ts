import * as THREE from 'three';
import { PALETTE } from '../data/palette';

export type Water = { mesh: THREE.Mesh; update(time: number): void };

/** Grand plan d'eau à y = 0 avec une légère houle. */
export function createWater(): Water {
  const geo = new THREE.PlaneGeometry(600, 600, 60, 60);
  geo.rotateX(-Math.PI / 2);
  const base = Float32Array.from((geo.attributes.position as THREE.BufferAttribute).array);
  const mat = new THREE.MeshLambertMaterial({
    color: PALETTE.water,
    transparent: true,
    opacity: 0.8,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'water';
  return {
    mesh,
    update(time: number) {
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        pos.setY(i, Math.sin(x * 0.15 + time * 0.8) * 0.08 + Math.cos(z * 0.12 + time * 0.6) * 0.08);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}
