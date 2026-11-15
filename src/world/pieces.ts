import * as THREE from 'three';
import { CELL, EDGE_THICKNESS, WALL_HEIGHT, type PieceKind } from '../data/buildables';
import { PALETTE } from '../data/palette';
import { mat, part } from './models';

const W = PALETTE.wood;
const D = PALETTE.woodDark;

export type PieceModel = {
  group: THREE.Group;
  /** Battant de porte (pivot) — seulement pour les portes. */
  doorLeaf?: THREE.Group;
  /** Flammes animées — seulement pour le feu de camp. */
  flames?: THREE.Mesh[];
};

function box(w: number, h: number, d: number, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = part(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  m.receiveShadow = true;
  return m;
}

/** Planches horizontales entre y0 et y1, sur toute la largeur. */
function planks(g: THREE.Group, y0: number, y1: number, x0 = -CELL / 2, x1 = CELL / 2): void {
  const n = Math.max(1, Math.round((y1 - y0) / 0.5));
  const h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    g.add(box(x1 - x0, h * 0.92, EDGE_THICKNESS * 0.8, i % 2 ? W : '#b07c48', (x0 + x1) / 2, y0 + h * (i + 0.5), 0));
  }
}

function posts(g: THREE.Group, xs: number[]): void {
  for (const x of xs) g.add(box(0.22, WALL_HEIGHT, EDGE_THICKNESS, D, x, WALL_HEIGHT / 2, 0));
}

/** Modèles low-poly des pièces de construction. Origine : centre de la base. */
export function createPieceModel(kind: PieceKind): PieceModel {
  const g = new THREE.Group();
  const half = CELL / 2;
  switch (kind) {
    case 'floor': {
      for (let i = 0; i < 4; i++) {
        g.add(box(CELL / 4 - 0.03, 0.2, CELL, i % 2 ? W : '#b07c48', -half + CELL / 8 + (i * CELL) / 4, 0.1, 0));
      }
      return { group: g };
    }
    case 'wall':
      planks(g, 0, WALL_HEIGHT);
      posts(g, [-half + 0.11, half - 0.11]);
      return { group: g };
    case 'window':
      planks(g, 0, 1.1);
      planks(g, 2.2, WALL_HEIGHT);
      posts(g, [-half + 0.11, half - 0.11]);
      g.add(box(0.12, 1.1, 0.12, D, 0, 1.65, 0));
      g.add(box(CELL, 0.12, EDGE_THICKNESS * 1.2, D, 0, 1.1, 0));
      return { group: g };
    case 'door': {
      posts(g, [-half + 0.11, half - 0.11]);
      g.add(box(CELL, 0.5, EDGE_THICKNESS, D, 0, WALL_HEIGHT - 0.25, 0));
      const leaf = new THREE.Group();
      leaf.position.set(-half + 0.22, 0, 0);
      const lw = CELL - 0.44;
      leaf.add(box(lw, WALL_HEIGHT - 0.55, 0.12, '#c99460', lw / 2, (WALL_HEIGHT - 0.55) / 2, 0));
      leaf.add(box(lw * 0.9, 0.12, 0.16, D, lw / 2, 0.6, 0));
      leaf.add(box(lw * 0.9, 0.12, 0.16, D, lw / 2, 1.8, 0));
      leaf.add(part(new THREE.SphereGeometry(0.07, 6, 6), '#ffd166', lw - 0.2, 1.2, 0.1));
      g.add(leaf);
      return { group: g, doorLeaf: leaf };
    }
    case 'roof': {
      g.add(box(CELL + 0.3, 0.15, CELL + 0.3, D, 0, 0.075, 0));
      const cone = part(new THREE.ConeGeometry(CELL * 0.82, 1.2, 4), '#e76f51', 0, 0.75, 0);
      cone.rotation.y = Math.PI / 4;
      g.add(cone);
      return { group: g };
    }
    case 'campfire': {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        g.add(part(new THREE.DodecahedronGeometry(0.16, 0), PALETTE.stone, Math.cos(a) * 0.45, 0.1, Math.sin(a) * 0.45));
      }
      for (let i = 0; i < 3; i++) {
        const log = box(0.7, 0.13, 0.13, PALETTE.trunk, 0, 0.12, 0);
        log.rotation.y = (i * Math.PI) / 3;
        g.add(log);
      }
      const flames = [
        new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 5), mat('#ff9f1c', { emissive: '#ff7b00' })),
        new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.5, 5), mat('#ffe066', { emissive: '#ffd000' })),
      ];
      flames[0].position.y = 0.5;
      flames[1].position.y = 0.45;
      g.add(...flames);
      return { group: g, flames };
    }
    case 'workbench': {
      g.add(box(1.2, 0.12, 0.7, W, 0, 0.8, 0));
      for (const [x, z] of [[-0.5, -0.27], [0.5, -0.27], [-0.5, 0.27], [0.5, 0.27]]) g.add(box(0.1, 0.8, 0.1, D, x, 0.4, z));
      g.add(box(1.0, 0.08, 0.5, '#b07c48', 0, 0.3, 0));
      // Marteau et scie posés dessus
      g.add(box(0.05, 0.05, 0.35, D, -0.25, 0.89, 0));
      g.add(box(0.16, 0.08, 0.08, '#6d6f73', -0.25, 0.9, 0.17));
      g.add(box(0.4, 0.02, 0.14, '#c9ccd1', 0.25, 0.87, 0));
      return { group: g };
    }
  }
}

/** Matériaux du fantôme de placement. */
export const GHOST_OK = new THREE.MeshBasicMaterial({ color: '#7cf27c', transparent: true, opacity: 0.45, depthWrite: false });
export const GHOST_BAD = new THREE.MeshBasicMaterial({ color: '#ff6b8b', transparent: true, opacity: 0.45, depthWrite: false });

export function setGhostMaterial(g: THREE.Object3D, m: THREE.Material): void {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.material = m;
      o.castShadow = false;
    }
  });
}
