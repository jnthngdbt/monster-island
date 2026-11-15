import { MAX_HEALTH, RESPAWN_INVULN, RESPAWN_MIN_HUNGER } from '../data/balance';
import type { Vec2 } from './math';
import type { Vitals } from './vitals';

/** Dernier feu de camp posé (décalé de 1,5 m pour ne pas tomber dedans), sinon la plage. */
export function chooseRespawnPoint(campfires: readonly Vec2[], spawn: Vec2): Vec2 {
  const last = campfires[campfires.length - 1];
  return last ? { x: last.x, z: last.z + 1.5 } : { x: spawn.x, z: spawn.z };
}

/** Santé pleine, un peu de faim rendue, quelques secondes d'invulnérabilité. L'inventaire est gardé. */
export function applyRespawn(v: Vitals, now: number): void {
  v.health = MAX_HEALTH;
  v.hunger = Math.max(v.hunger, RESPAWN_MIN_HUNGER);
  v.invulnerableUntil = now + RESPAWN_INVULN;
}
