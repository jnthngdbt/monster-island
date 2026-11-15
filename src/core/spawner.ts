import { RAID_MIN_PLAYER_DIST, RAID_RING, RAIDER_BASE, RAIDER_MAX, RAIDER_PER_NIGHT } from '../data/balance';
import { dist2D, type Vec2 } from './math';
import type { Rng } from './rng';
import type { Terrain } from './terrain';

/** Nombre maximal de monstres d'attaque vivants pendant la nuit N. */
export function raiderCap(day: number): number {
  return Math.min(RAIDER_BASE + RAIDER_PER_NIGHT * (day - 1), RAIDER_MAX);
}

/**
 * Positions d'apparition sur un anneau autour de l'ancre (la base, ou le joueur),
 * toujours sur la terre ferme et loin du joueur. Une position impossible est abandonnée.
 */
export function planNightSpawns(p: { terrain: Terrain; rng: Rng; anchor: Vec2; player: Vec2; count: number }): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < p.count; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const a = p.rng.range(0, Math.PI * 2);
      const r = p.rng.range(RAID_RING[0], RAID_RING[1]);
      const pos = { x: p.anchor.x + Math.cos(a) * r, z: p.anchor.z + Math.sin(a) * r };
      if (!p.terrain.isWalkable(pos.x, pos.z)) continue;
      if (dist2D(pos, p.player) < RAID_MIN_PLAYER_DIST) continue;
      out.push(pos);
      break;
    }
  }
  return out;
}
