import * as THREE from 'three';
import { clamp, smoothstep } from '../core/math';
import type { Biome, Terrain } from '../core/terrain';
import { PALETTE } from '../data/palette';
import { SEA_DEEP } from './water';

const BIOME_COLOR: Record<Biome, THREE.Color> = {
  water: new THREE.Color(PALETTE.seabed),
  beach: new THREE.Color(PALETTE.sand),
  forest: new THREE.Color(PALETTE.grass),
  clearing: new THREE.Color(PALETTE.clearing),
  rocky: new THREE.Color(PALETTE.rock),
};
const SAND_WET = new THREE.Color('#cfa85f');
const FOAM = new THREE.Color('#f6fdff');
const CLIFF = new THREE.Color('#7d7466');
const PEAK = new THREE.Color('#d2d0c8');

/** Bruit pseudo-aléatoire stable dans ]-1, 1[, propre à chaque triangle. */
const hash = (x: number, z: number): number => (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;

/**
 * Maillage low-poly de l'île. Une couleur par triangle, calculée une fois :
 * biome (mélangé aux frontières), pente, altitude, rivage et profondeur.
 */
export function createTerrainMesh(terrain: Terrain): THREE.Mesh {
  const size = 220;
  const segs = 160;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrain.heightAt(pos.getX(i), pos.getZ(i)));
  }
  const flat = geo.toNonIndexed();
  geo.dispose();

  const p = flat.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const d = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    d.fromBufferAttribute(p, i + 2);
    const cx = (a.x + b.x + d.x) / 3;
    const cz = (a.z + b.z + d.z) / 3;
    const h = (a.y + b.y + d.y) / 3;

    // Biome moyen des trois sommets : les frontières se mélangent sur un triangle.
    c.setRGB(0, 0, 0);
    c.add(BIOME_COLOR[terrain.biomeAt(a.x, a.z)]);
    c.add(BIOME_COLOR[terrain.biomeAt(b.x, b.z)]);
    c.add(BIOME_COLOR[terrain.biomeAt(d.x, d.z)]);
    c.multiplyScalar(1 / 3);

    if (h < 0) {
      // Fond marin : de plus en plus bleu et sombre avec la profondeur.
      c.lerp(SEA_DEEP, smoothstep(0.2, 3.5, -h));
    } else {
      // Sable mouillé juste au-dessus de l'eau.
      c.lerp(SAND_WET, 1 - smoothstep(0.1, 0.5, h));
      // Pentes raides : roche terreuse plus sombre.
      n.subVectors(b, a).cross(d.sub(a)).normalize();
      c.lerp(CLIFF, smoothstep(0.9, 0.65, Math.abs(n.y)) * 0.7);
      // Sommets : roche claire.
      c.lerp(PEAK, smoothstep(8, 12.5, h) * 0.6);
      // Grandes taches douces + légère montée de clarté avec l'altitude.
      const patch = Math.sin(cx * 0.11 + 1.3) * Math.sin(cz * 0.13 + 0.7);
      c.offsetHSL(patch * 0.012, 0, patch * 0.025 + clamp(h * 0.004, 0, 0.04));
    }
    // Bande d'écume à la ligne d'eau.
    if (h > -0.22 && h < 0.1) c.lerp(FOAM, 0.75);

    c.offsetHSL(0, 0, hash(cx, cz) * 0.045);
    for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  flat.computeVertexNormals();

  const mesh = new THREE.Mesh(
    flat,
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  );
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
