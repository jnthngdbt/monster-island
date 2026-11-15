import * as THREE from 'three';
import { BuildGrid, type Placement } from '../core/buildGrid';
import { circleHitsAABB, segmentHitsAABB, type AABB, type Circle } from '../core/collision';
import type { EventBus, GameEvents } from '../core/events';
import { dist2D, type Vec2 } from '../core/math';
import type { TerrainQuery } from '../core/terrain';
import { STATION_RANGE } from '../data/balance';
import { BUILDABLES, CELL, FLOOR_THICKNESS } from '../data/buildables';
import type { SavedPiece } from '../core/save';
import type { Station } from '../data/recipes';
import { createPieceModel, type PieceModel } from '../world/pieces';

type Piece = {
  p: Placement;
  model: PieceModel;
  open: boolean;
  placedAt: number;
};

const DOOR_REACH = 2.5;
const DOOR_OPEN_ANGLE = -Math.PI / 2;

/** Les constructions du joueur (indestructibles) : rendu, portes, feux de camp. */
export class Structures {
  readonly grid: BuildGrid;
  private pieces = new Map<string, Piece>();
  private order = 0;

  constructor(
    terrain: TerrainQuery,
    private scene: THREE.Scene,
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
    this.pieces.set(p.key, { p, model, open: false, placedAt: this.order++ });
    this.events.emit('structurePlaced', { key: p.key });
  }

  /** Pièces dans l'ordre de pose, avec l'état des portes. */
  snapshot(): SavedPiece[] {
    return [...this.pieces.values()].sort((a, b) => a.placedAt - b.placedAt).map((pc) => ({ p: pc.p, open: pc.open }));
  }

  /** Repose des pièces sauvegardées (sans coût ni validation), portes déjà dans leur position. */
  restore(saved: SavedPiece[]): void {
    for (const { p, open } of saved) {
      this.add(p);
      const pc = this.pieces.get(p.key)!;
      pc.open = open;
      if (pc.model.doorLeaf) pc.model.doorLeaf.rotation.y = open ? DOOR_OPEN_ANGLE : 0;
    }
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

  /** Murs, fenêtres et portes fermées cachent ce qui est derrière (aux yeux des monstres). */
  blocksSight(from: Vec2, to: Vec2): boolean {
    for (const pc of this.pieces.values()) {
      if (BUILDABLES[pc.p.kind].slot !== 'edge') continue;
      if (pc.p.kind === 'door' && pc.open) continue;
      if (segmentHitsAABB(from, to, this.grid.footprint(pc.p))) return true;
    }
    return false;
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
      if (pc.model.doorLeaf) {
        const target = pc.open ? DOOR_OPEN_ANGLE : 0;
        pc.model.doorLeaf.rotation.y += (target - pc.model.doorLeaf.rotation.y) * 0.2;
      }
      if (pc.model.flames) {
        const f = 1 + Math.sin(now * 13 + pc.placedAt) * 0.12 + Math.sin(now * 7.3) * 0.08;
        pc.model.flames[0].scale.set(1, f, 1);
        pc.model.flames[1].scale.set(1, 2 - f, 1);
      }
    }
  }

  /** Position 3D des feux de camp (pour les lumières). */
  campfireSpots(): { x: number; y: number; z: number }[] {
    return [...this.pieces.values()].filter((pc) => pc.p.kind === 'campfire').map((pc) => ({ x: pc.p.x, y: pc.p.y, z: pc.p.z }));
  }

  /** Une construction (n'importe laquelle) recouvre-t-elle ce cercle ? */
  overlaps(c: Circle): boolean {
    for (const pc of this.pieces.values()) if (circleHitsAABB(c, this.grid.footprint(pc.p))) return true;
    return false;
  }
}
