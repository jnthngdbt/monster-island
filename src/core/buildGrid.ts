import {
  BUILDABLES,
  CELL,
  EDGE_THICKNESS,
  FLOOR_THICKNESS,
  MAX_SLOPE,
  OBJECT_SIZE,
  WALL_HEIGHT,
  type PieceKind,
} from '../data/buildables';
import { circleHitsAABB, type AABB, type Circle } from './collision';
import type { Vec2 } from './math';
import type { TerrainQuery } from './terrain';

export type Rot = 0 | 1;

export type Placement = {
  kind: PieceKind;
  key: string;
  cx: number;
  cz: number;
  rot: Rot;
  x: number;
  y: number;
  z: number;
  yaw: number;
};

export type Invalid = 'occupied' | 'water' | 'slope' | 'blocked' | 'needsSupport';
export type Validation = { ok: true } | { ok: false; reason: Invalid };

const snapUp = (h: number): number => Math.ceil(h * 2) / 2;

/**
 * Grille de construction de 2 m. Planchers, toits et objets occupent une case ;
 * murs, fenêtres et portes occupent une arête (et s'excluent entre eux).
 */
export class BuildGrid {
  private pieces = new Map<string, Placement>();

  constructor(private terrain: TerrainQuery) {}

  snap(kind: PieceKind, aim: Vec2, rot: Rot): Placement {
    const slot = BUILDABLES[kind].slot;
    if (slot === 'edge') {
      if (rot === 0) {
        const cx = Math.floor(aim.x / CELL);
        const cz = Math.round(aim.z / CELL);
        const x = (cx + 0.5) * CELL;
        const z = cz * CELL;
        return { kind, key: `edge:${cx}:${cz}:0`, cx, cz, rot, x, z, y: this.edgeBase(cx, cz, 0), yaw: 0 };
      }
      const cx = Math.round(aim.x / CELL);
      const cz = Math.floor(aim.z / CELL);
      const x = cx * CELL;
      const z = (cz + 0.5) * CELL;
      return { kind, key: `edge:${cx}:${cz}:1`, cx, cz, rot, x, z, y: this.edgeBase(cx, cz, 1), yaw: Math.PI / 2 };
    }
    const cx = Math.floor(aim.x / CELL);
    const cz = Math.floor(aim.z / CELL);
    const x = (cx + 0.5) * CELL;
    const z = (cz + 0.5) * CELL;
    let y: number;
    if (slot === 'floor') y = snapUp(this.cornerRange(cx, cz).max);
    else if (slot === 'roof') y = this.roofBase(cx, cz);
    else y = this.floorTop(cx, cz) ?? this.terrain.heightAt(x, z);
    return { kind, key: `${slot}:${cx}:${cz}`, cx, cz, rot, x, z, y, yaw: rot === 1 ? Math.PI / 2 : 0 };
  }

  validate(p: Placement, ctx: { obstacles: readonly Circle[]; player: Circle }): Validation {
    if (this.pieces.has(p.key)) return { ok: false, reason: 'occupied' };
    if (!this.terrain.isWalkable(p.x, p.z)) return { ok: false, reason: 'water' };
    const slot = BUILDABLES[p.kind].slot;
    if (slot !== 'roof') {
      const r = slot === 'edge' ? this.edgeRange(p) : this.cornerRange(p.cx, p.cz);
      if (r.max - r.min > MAX_SLOPE) return { ok: false, reason: 'slope' };
    }
    const fp = this.footprint(p);
    if (slot !== 'roof' && ctx.obstacles.some((o) => circleHitsAABB(o, fp))) return { ok: false, reason: 'blocked' };
    if ((slot === 'edge' || slot === 'object') && circleHitsAABB(ctx.player, fp)) return { ok: false, reason: 'blocked' };
    if (slot === 'roof' && this.supportWalls(p.cx, p.cz).length === 0) return { ok: false, reason: 'needsSupport' };
    return { ok: true };
  }

  place(p: Placement): void {
    this.pieces.set(p.key, p);
  }

  remove(key: string): Placement | undefined {
    const p = this.pieces.get(key);
    this.pieces.delete(key);
    return p;
  }

  get(key: string): Placement | undefined {
    return this.pieces.get(key);
  }

  all(): Placement[] {
    return [...this.pieces.values()];
  }

  footprint(p: Placement): AABB {
    const slot = BUILDABLES[p.kind].slot;
    let hw: number;
    let hd: number;
    if (slot === 'edge') {
      hw = p.rot === 0 ? CELL / 2 : EDGE_THICKNESS / 2;
      hd = p.rot === 0 ? EDGE_THICKNESS / 2 : CELL / 2;
    } else if (slot === 'object') {
      hw = hd = OBJECT_SIZE / 2;
    } else {
      hw = hd = CELL / 2;
    }
    return { minX: p.x - hw, maxX: p.x + hw, minZ: p.z - hd, maxZ: p.z + hd };
  }

  /** Murs/fenêtres/portes posés sur les 4 arêtes d'une case. */
  supportWalls(cx: number, cz: number): Placement[] {
    return [`edge:${cx}:${cz}:0`, `edge:${cx}:${cz + 1}:0`, `edge:${cx}:${cz}:1`, `edge:${cx + 1}:${cz}:1`]
      .map((k) => this.pieces.get(k))
      .filter((p): p is Placement => !!p);
  }

  private floorTop(cx: number, cz: number): number | null {
    const f = this.pieces.get(`floor:${cx}:${cz}`);
    return f ? f.y + FLOOR_THICKNESS : null;
  }

  private cornerRange(cx: number, cz: number): { min: number; max: number } {
    const hs = [
      this.terrain.heightAt(cx * CELL, cz * CELL),
      this.terrain.heightAt((cx + 1) * CELL, cz * CELL),
      this.terrain.heightAt(cx * CELL, (cz + 1) * CELL),
      this.terrain.heightAt((cx + 1) * CELL, (cz + 1) * CELL),
    ];
    return { min: Math.min(...hs), max: Math.max(...hs) };
  }

  private edgeEnds(cx: number, cz: number, rot: Rot): [Vec2, Vec2] {
    return rot === 0
      ? [{ x: cx * CELL, z: cz * CELL }, { x: (cx + 1) * CELL, z: cz * CELL }]
      : [{ x: cx * CELL, z: cz * CELL }, { x: cx * CELL, z: (cz + 1) * CELL }];
  }

  private edgeRange(p: Placement): { min: number; max: number } {
    const hs = this.edgeEnds(p.cx, p.cz, p.rot).map((e) => this.terrain.heightAt(e.x, e.z));
    return { min: Math.min(...hs), max: Math.max(...hs) };
  }

  /** Base d'un mur : dessus du plancher voisin le plus haut, sinon le terrain. */
  private edgeBase(cx: number, cz: number, rot: Rot): number {
    const neighbours = rot === 0 ? [this.floorTop(cx, cz - 1), this.floorTop(cx, cz)] : [this.floorTop(cx - 1, cz), this.floorTop(cx, cz)];
    const floors = neighbours.filter((v): v is number => v !== null);
    if (floors.length) return Math.max(...floors);
    const hs = this.edgeEnds(cx, cz, rot).map((e) => this.terrain.heightAt(e.x, e.z));
    return snapUp(Math.max(...hs)) - 0.25;
  }

  private roofBase(cx: number, cz: number): number {
    const walls = this.supportWalls(cx, cz);
    if (walls.length) return Math.max(...walls.map((w) => w.y)) + WALL_HEIGHT;
    const base = this.floorTop(cx, cz) ?? snapUp(this.cornerRange(cx, cz).max);
    return base + WALL_HEIGHT;
  }
}
