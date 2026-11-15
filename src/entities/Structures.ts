import * as THREE from 'three';
import { BuildGrid, type Placement } from '../core/buildGrid';
import type { AABB } from '../core/collision';
import type { Target } from '../core/combat';
import type { EventBus, GameEvents } from '../core/events';
import { dist2D, type Vec2 } from '../core/math';
import type { TerrainQuery } from '../core/terrain';
import { STATION_RANGE } from '../data/balance';
import { BUILDABLES, CELL, FLOOR_THICKNESS } from '../data/buildables';
import type { Station } from '../data/recipes';
import type { Particles } from '../world/particles';
import { createPieceModel, type PieceModel } from '../world/pieces';

type Piece = {
  p: Placement;
  model: PieceModel;
  hp: number;
  open: boolean;
  shakeUntil: number;
  placedAt: number;
};

const DOOR_REACH = 2.5;

/** Les constructions du joueur : rendu, points de vie, portes, feux de camp. */
export class Structures {
  readonly grid: BuildGrid;
  private pieces = new Map<string, Piece>();
  private order = 0;

  constructor(
    terrain: TerrainQuery,
    private scene: THREE.Scene,
    private particles: Particles,
    private events: EventBus<GameEvents>,
  ) {
    this.grid = new BuildGrid(terrain);
  }

  get count(): number {
    return this.pieces.size;
  }

  add(p: Placement): void {
    this.grid.place(p);
    const model = createPieceModel(p.kind);
    model.group.position.set(p.x, p.y, p.z);
    model.group.rotation.y = p.yaw;
    model.group.traverse((o) => (o.userData.structureKey = p.key));
    this.scene.add(model.group);
    this.pieces.set(p.key, { p, model, hp: BUILDABLES[p.kind].hp, open: false, shakeUntil: 0, placedAt: this.order++ });
    this.events.emit('structurePlaced', { key: p.key });
  }

  /** Démonte une pièce (sans casse). */
  remove(key: string): Placement | undefined {
    const piece = this.pieces.get(key);
    if (!piece) return undefined;
    this.scene.remove(piece.model.group);
    this.pieces.delete(key);
    return this.grid.remove(key);
  }

  get(key: string): Placement | undefined {
    return this.pieces.get(key)?.p;
  }

  meshes(): THREE.Object3D[] {
    return [...this.pieces.values()].map((pc) => pc.model.group);
  }

  hp(key: string): number {
    return this.pieces.get(key)?.hp ?? 0;
  }

  damage(key: string, n: number, now: number): void {
    const piece = this.pieces.get(key);
    if (!piece) return;
    piece.hp -= n;
    piece.shakeUntil = now + 0.3;
    const { p } = piece;
    this.particles.burst({ x: p.x, y: p.y + 1, z: p.z }, '#c08a52', 4, 2, { size: 0.8 });
    if (piece.hp > BUILDABLES[p.kind].hp / 2) return;
    // Fissures : la pièce s'assombrit sous 50 %.
    piece.model.group.traverse((o) => {
      if (o instanceof THREE.Mesh && !o.userData.cracked) {
        o.material = (o.material as THREE.MeshLambertMaterial).clone();
        (o.material as THREE.MeshLambertMaterial).color.multiplyScalar(0.7);
        o.userData.cracked = true;
      }
    });
    if (piece.hp <= 0) {
      this.particles.burst({ x: p.x, y: p.y + 1.2, z: p.z }, '#c08a52', 18, 4, { size: 1.8, life: 1.1 });
      this.remove(key);
      this.events.emit('structureDestroyed', { key, x: p.x, z: p.z });
    }
  }

  nearStation(kind: Station, pos: Vec2): boolean {
    for (const { p } of this.pieces.values()) if (p.kind === kind && dist2D(p, pos) <= STATION_RANGE) return true;
    return false;
  }

  /** Feux de camp dans l'ordre où ils ont été posés. */
  campfires(): Vec2[] {
    return [...this.pieces.values()]
      .filter((pc) => pc.p.kind === 'campfire')
      .sort((a, b) => a.placedAt - b.placedAt)
      .map((pc) => ({ x: pc.p.x, z: pc.p.z }));
  }

  centroid(): Vec2 | null {
    if (this.pieces.size === 0) return null;
    let x = 0;
    let z = 0;
    for (const { p } of this.pieces.values()) {
      x += p.x;
      z += p.z;
    }
    return { x: x / this.pieces.size, z: z / this.pieces.size };
  }

  /** Murs, portes fermées, fenêtres et objets bloquent ; planchers et toits non. */
  colliders(): AABB[] {
    const out: AABB[] = [];
    for (const pc of this.pieces.values()) {
      const slot = BUILDABLES[pc.p.kind].slot;
      if (slot === 'floor' || slot === 'roof') continue;
      if (pc.p.kind === 'door' && pc.open) continue;
      out.push(this.grid.footprint(pc.p));
    }
    return out;
  }

  /** Cibles des monstres de nuit (tout sauf les toits). */
  targets(): (Target & { key: string })[] {
    return [...this.pieces.values()]
      .filter((pc) => BUILDABLES[pc.p.kind].slot !== 'roof')
      .map((pc) => ({ id: pc.p.key, key: pc.p.key, x: pc.p.x, z: pc.p.z, radius: BUILDABLES[pc.p.kind].slot === 'object' ? 0.6 : 1 }));
  }

  nearestTarget(from: Vec2, maxDist = 30): (Target & { key: string }) | null {
    let best: (Target & { key: string }) | null = null;
    let bestD = maxDist;
    for (const t of this.targets()) {
      const d = dist2D(from, t);
      if (d < bestD) {
        best = t;
        bestD = d;
      }
    }
    return best;
  }

  /** Ouvre/ferme la porte la plus proche. Retourne true si une porte a bougé. */
  toggleDoor(pos: Vec2): boolean {
    let best: Piece | null = null;
    let bestD = DOOR_REACH;
    for (const pc of this.pieces.values()) {
      if (pc.p.kind !== 'door') continue;
      const d = dist2D(pc.p, pos);
      if (d < bestD) {
        best = pc;
        bestD = d;
      }
    }
    if (!best) return false;
    best.open = !best.open;
    return true;
  }

  /** Dessus du plancher sous (x, z) s'il est atteignable depuis y (marche de 0,8 m). */
  groundAt(x: number, z: number, y: number): number | null {
    const cx = Math.floor(x / CELL);
    const cz = Math.floor(z / CELL);
    const f = this.grid.get(`floor:${cx}:${cz}`);
    if (!f) return null;
    const top = f.y + FLOOR_THICKNESS;
    return top - y < 0.8 ? top : null;
  }

  update(now: number): void {
    for (const pc of this.pieces.values()) {
      const g = pc.model.group;
      const shaking = now < pc.shakeUntil;
      g.position.x = pc.p.x + (shaking ? Math.sin(now * 70) * 0.05 : 0);
      if (pc.model.doorLeaf) {
        const target = pc.open ? -Math.PI / 2 : 0;
        pc.model.doorLeaf.rotation.y += (target - pc.model.doorLeaf.rotation.y) * 0.2;
      }
      if (pc.model.flames) {
        const f = 1 + Math.sin(now * 13 + pc.placedAt) * 0.12 + Math.sin(now * 7.3) * 0.08;
        pc.model.flames[0].scale.set(1, f, 1);
        pc.model.flames[1].scale.set(1, 2 - f, 1);
      }
    }
  }

  /** La lumière des feux de camp ne brille que la nuit (et un peu au crépuscule). */
  setNightLight(k: number): void {
    for (const pc of this.pieces.values()) if (pc.model.light) pc.model.light.intensity = 0.4 + k * 2.6;
  }
}
