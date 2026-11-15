import type { Cost, ItemId } from '../data/items';
import { angleDelta, dist2D, type Vec2 } from './math';
import type { Rng } from './rng';

/** La cible est-elle devant (dans l'arc) et à portée ? */
export function isInArc(from: Vec2, yaw: number, to: Vec2, range: number, arcDeg: number): boolean {
  const d = dist2D(from, to);
  if (d > range) return false;
  if (d < 1e-6) return true;
  const angle = Math.atan2(to.x - from.x, to.z - from.z);
  return Math.abs(angleDelta(yaw, angle)) <= ((arcDeg / 2) * Math.PI) / 180;
}

export type Target = { id: string; x: number; z: number; radius: number };

/** Cible la plus proche dont le bord est à portée et dont le centre est dans l'arc. */
export function selectTarget<T extends Target>(
  from: Vec2,
  yaw: number,
  candidates: readonly T[],
  range: number,
  arcDeg: number,
): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = dist2D(from, c);
    if (d - c.radius > range) continue;
    if (!isInArc(from, yaw, c, Math.max(d, 0), arcDeg)) continue;
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

export class AttackTimer {
  private last = -Infinity;
  constructor(public cooldown: number) {}

  tryFire(now: number): boolean {
    if (now - this.last < this.cooldown - 1e-9) return false;
    this.last = now;
    return true;
  }
}

export type DodgeConfig = { duration: number; iframes: number; cooldown: number; distance: number };

export class DodgeState {
  private startedAt = -Infinity;
  constructor(readonly cfg: DodgeConfig = { duration: 0.3, iframes: 0.35, cooldown: 1.0, distance: 4 }) {}

  start(now: number): boolean {
    if (now - this.startedAt < this.cfg.cooldown - 1e-9) return false;
    this.startedAt = now;
    return true;
  }

  isActive(now: number): boolean {
    return now - this.startedAt < this.cfg.duration;
  }

  /** 0 → 1 pendant l'esquive, null sinon. */
  progress(now: number): number | null {
    return this.isActive(now) ? (now - this.startedAt) / this.cfg.duration : null;
  }

  isInvulnerable(now: number): boolean {
    return now - this.startedAt < this.cfg.iframes;
  }
}

export type LootEntry = { item: ItemId; min: number; max: number; chance: number };

export function rollLoot(table: readonly LootEntry[], rng: Rng): Cost {
  const out: Cost = {};
  for (const e of table) {
    if (rng.next() >= e.chance) continue;
    out[e.item] = (out[e.item] ?? 0) + rng.int(e.min, e.max);
  }
  return out;
}
