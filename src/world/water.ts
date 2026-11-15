import * as THREE from 'three';
import { smoothstep } from '../core/math';
import type { TerrainQuery } from '../core/terrain';
import { PALETTE } from '../data/palette';

export type Water = { mesh: THREE.Mesh; update(time: number): void };

const SHALLOW = new THREE.Color('#6fe0e6');
const DEEP = new THREE.Color(PALETTE.water).offsetHSL(0.02, 0, -0.03);
/** Couleur du fond marin profond, partagée avec le terrain. */
export const SEA_DEEP = new THREE.Color('#2b84b4');

/** Grand plan d'eau à y = 0 avec une légère houle. Turquoise près du rivage, bleu au large. */
export function createWater(terrain: TerrainQuery): Water {
  const geo = new THREE.PlaneGeometry(600, 600, 60, 60);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = Float32Array.from(pos.array);

  // Couleur par sommet selon la profondeur, calculée une seule fois.
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const depth = -terrain.heightAt(base[i * 3], base[i * 3 + 2]);
    c.copy(SHALLOW).lerp(DEEP, smoothstep(0.5, 3.8, depth));
    c.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Phong à facettes : chaque vague renvoie un éclat du soleil ou de la lune.
  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    flatShading: true,
    specular: '#8fa3b0',
    shininess: 70,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'water';

  // Fond plat au large : prolonge le fond marin du terrain, dont le bord carré ne se voit plus.
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: SEA_DEEP }));
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -4.05;
  mesh.add(seabed);
  return {
    mesh,
    update(time: number) {
      // flatShading tire les normales des dérivées à l'écran : inutile de les recalculer.
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        pos.setY(i, Math.sin(x * 0.15 + time * 0.8) * 0.08 + Math.cos(z * 0.12 + time * 0.6) * 0.08);
      }
      pos.needsUpdate = true;
    },
  };
}
