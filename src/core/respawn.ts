import { MAX_HEALTH, RESPAWN_INVULN, RESPAWN_MIN_HUNGER } from '../data/balance';
import type { Vec2 } from './math';
import type { Vitals } from './vitals';

/** Places essayées autour du feu de camp (assez loin pour ne pas être dedans). */
const OFFSETS: readonly Vec2[] = [
  { x: 0, z: 1.5 },
  { x: 1.5, z: 0 },
  { x: -1.5, z: 0 },
  { x: 0, z: -1.5 },
  { x: 1.2, z: 1.2 },
  { x: -1.2, z: 1.2 },
  { x: 1.2, z: -1.2 },
  { x: -1.2, z: -1.2 },
];

/**
 * À côté du dernier feu de camp posé, sur la terre ferme ; sinon la plage.
 * Un feu au bord de l'eau ne doit jamais faire réapparaître le joueur dans la mer.
 */
export function chooseRespawnPoint(
  campfires: readonly Vec2[],
  spawn: Vec2,
  isWalkable: (x: number, z: number) => boolean = () => true,
): Vec2 {
  const last = campfires[campfires.length - 1];
  if (last) {
    for (const o of OFFSETS) {
      const p = { x: last.x + o.x, z: last.z + o.z };
      if (isWalkable(p.x, p.z)) return p;
    }
  }
  return { x: spawn.x, z: spawn.z };
}

/** Santé pleine, un peu de faim rendue, quelques secondes d'invulnérabilité. L'inventaire est gardé. */
export function applyRespawn(v: Vitals, now: number): void {
  v.health = MAX_HEALTH;
  v.hunger = Math.max(v.hunger, RESPAWN_MIN_HUNGER);
  grantGrace(v, now);
}

/** Quelques secondes d'invulnérabilité (réapparition, reprise d'une partie près d'un monstre). */
export function grantGrace(v: Vitals, now: number): void {
  v.invulnerableUntil = now + RESPAWN_INVULN;
}
