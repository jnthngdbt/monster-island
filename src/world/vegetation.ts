import * as THREE from 'three';
import type { HarvestKind } from '../data/harvestables';
import { PALETTE } from '../data/palette';
import { localMatrix, type ModelPart } from './instanced';
import { mat } from './models';

/** Pièces low-poly des ressources récoltables (arbre, rocher, buisson). */
export function harvestableParts(kind: HarvestKind): ModelPart[] {
  switch (kind) {
    case 'tree':
      return [
        { geometry: new THREE.CylinderGeometry(0.2, 0.28, 1.6, 6), material: mat(PALETTE.trunk), local: localMatrix(0, 0.8, 0) },
        { geometry: new THREE.ConeGeometry(1.4, 1.8, 7), material: mat(PALETTE.leaves), local: localMatrix(0, 2.2, 0) },
        { geometry: new THREE.ConeGeometry(1.1, 1.5, 7), material: mat(PALETTE.leavesLight), local: localMatrix(0, 3.0, 0, 1, 1, 1, 0.4) },
        { geometry: new THREE.ConeGeometry(0.75, 1.2, 7), material: mat(PALETTE.leaves), local: localMatrix(0, 3.8, 0, 1, 1, 1, 0.9) },
      ];
    case 'rock':
      return [
        { geometry: new THREE.DodecahedronGeometry(0.9, 0), material: mat(PALETTE.stone), local: localMatrix(0, 0.35, 0, 1, 0.75, 1) },
        { geometry: new THREE.DodecahedronGeometry(0.45, 0), material: mat('#8f9296'), local: localMatrix(0.7, 0.2, 0.3, 1, 0.8, 1, 0.7) },
      ];
    case 'bush': {
      const berry = new THREE.IcosahedronGeometry(0.11, 0);
      const b = mat(PALETTE.berry);
      return [
        { geometry: new THREE.IcosahedronGeometry(0.6, 0), material: mat(PALETTE.bush), local: localMatrix(0, 0.45, 0, 1, 0.8, 1), keepWhenDepleted: true },
        { geometry: new THREE.IcosahedronGeometry(0.4, 0), material: mat(PALETTE.leavesLight), local: localMatrix(0.45, 0.35, 0.1), keepWhenDepleted: true },
        { geometry: berry, material: b, local: localMatrix(0.3, 0.75, 0.42) },
        { geometry: berry, material: b, local: localMatrix(-0.35, 0.6, 0.4) },
        { geometry: berry, material: b, local: localMatrix(0.05, 0.9, -0.38) },
        { geometry: berry, material: b, local: localMatrix(-0.45, 0.8, -0.1) },
        { geometry: berry, material: b, local: localMatrix(0.6, 0.55, -0.25) },
      ];
    }
  }
}
