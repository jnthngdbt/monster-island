import { CLEARING } from '../data/balance';
import { HARVESTABLES, type HarvestKind } from '../data/harvestables';
import { dist2D, type Vec2 } from './math';
import type { Rng } from './rng';
import type { Terrain } from './terrain';

const KEEP_CLEAR = 6;

/** Répartit des ressources sur l'île selon leurs biomes, avec un espacement minimal. */
export function scatter(
  terrain: Terrain,
  rng: Rng,
  kind: HarvestKind,
  existing: readonly Vec2[],
  minSpacing = 2.5,
): Vec2[] {
  const def = HARVESTABLES[kind];
  const out: Vec2[] = [];
  const all: Vec2[] = [...existing];
  const maxTries = def.count * 30;
  const R = terrain.radius;
  for (let i = 0; i < maxTries && out.length < def.count; i++) {
    const p = { x: rng.range(-R, R), z: rng.range(-R, R) };
    if (!terrain.isWalkable(p.x, p.z)) continue;
    if (!def.biomes.includes(terrain.biomeAt(p.x, p.z))) continue;
    if (dist2D(p, terrain.spawnPoint) <= KEEP_CLEAR) continue;
    if (dist2D(p, CLEARING) <= KEEP_CLEAR) continue;
    if (all.some((q) => dist2D(p, q) < minSpacing)) continue;
    out.push(p);
    all.push(p);
  }
  return out;
}
