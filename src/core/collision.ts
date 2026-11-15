import type { Vec2 } from './math';

export type Circle = { x: number; z: number; r: number };
export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };
export type CollisionWorld = { circles: readonly Circle[]; boxes: readonly AABB[] };

export const EMPTY_WORLD: CollisionWorld = { circles: [], boxes: [] };

/** Repousse un cercle (pos, r) hors des obstacles. Deux passes pour les coins. */
export function resolveCircle(pos: Vec2, r: number, world: CollisionWorld): Vec2 {
  let x = pos.x;
  let z = pos.z;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of world.circles) {
      const dx = x - c.x;
      const dz = z - c.z;
      const min = r + c.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2);
      if (d < 1e-6) {
        x = c.x + min;
        continue;
      }
      x = c.x + (dx / d) * min;
      z = c.z + (dz / d) * min;
    }
    for (const b of world.boxes) {
      // Bords inclus : un centre posé sur le bord n'a pas de normale de sortie.
      const inside = x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
      if (inside) {
        // Sortie par l'axe de plus faible pénétration.
        const left = x - b.minX;
        const right = b.maxX - x;
        const down = z - b.minZ;
        const up = b.maxZ - z;
        const m = Math.min(left, right, down, up);
        if (m === up) z = b.maxZ + r;
        else if (m === down) z = b.minZ - r;
        else if (m === left) x = b.minX - r;
        else x = b.maxX + r;
        continue;
      }
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2);
      x = cx + (dx / d) * r;
      z = cz + (dz / d) * r;
    }
  }
  return { x, z };
}

export function circleHitsAABB(c: Circle, b: AABB): boolean {
  const cx = Math.max(b.minX, Math.min(c.x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(c.z, b.maxZ));
  return (c.x - cx) ** 2 + (c.z - cz) ** 2 < c.r * c.r;
}

/** Le segment [a, b] traverse-t-il la boîte (bords compris) ? Méthode des « slabs ». */
export function segmentHitsAABB(a: Vec2, b: Vec2, box: AABB): boolean {
  let t0 = 0;
  let t1 = 1;
  const axes: [number, number, number, number][] = [
    [a.x, b.x - a.x, box.minX, box.maxX],
    [a.z, b.z - a.z, box.minZ, box.maxZ],
  ];
  for (const [p, d, min, max] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (p < min || p > max) return false;
      continue;
    }
    let ta = (min - p) / d;
    let tb = (max - p) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}
