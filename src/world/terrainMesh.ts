import * as THREE from 'three';
import type { Biome, Terrain } from '../core/terrain';
import { PALETTE } from '../data/palette';

const BIOME_COLOR: Record<Biome, string> = {
  water: PALETTE.seabed,
  beach: PALETTE.sand,
  forest: PALETTE.grass,
  clearing: PALETTE.clearing,
  rocky: PALETTE.rock,
};

/** Maillage low-poly de l'île, coloré par biome. */
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
  const jitter = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    // Une couleur par triangle, prise au centre du triangle.
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    c.set(BIOME_COLOR[terrain.biomeAt(cx, cz)]);
    const n = (Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453) % 1;
    jitter.copy(c).offsetHSL(0, 0, n * 0.04);
    for (let k = 0; k < 3; k++) jitter.toArray(colors, (i + k) * 3);
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
