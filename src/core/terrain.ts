import { createNoise2D } from 'simplex-noise';
import { CLEARING, ISLAND_RADIUS, MOUNTAIN } from '../data/balance';
import { lerp, smoothstep, type Vec2 } from './math';
import { createRng } from './rng';

export type Biome = 'water' | 'beach' | 'forest' | 'rocky' | 'clearing';

export interface TerrainQuery {
  heightAt(x: number, z: number): number;
  isWalkable(x: number, z: number): boolean;
}

export interface Terrain extends TerrainQuery {
  biomeAt(x: number, z: number): Biome;
  spawnPoint: Vec2;
  radius: number;
}

export function createTerrain(seed: number): Terrain {
  const rng = createRng(seed);
  const noise = createNoise2D(rng.next);

  const fbm = (x: number, z: number): number => {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < 4; i++) {
      sum += amp * noise(x * freq, z * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };

  const mountainFactor = (x: number, z: number): number =>
    Math.max(0, 1 - Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z) / MOUNTAIN.r);

  const heightAt = (x: number, z: number): number => {
    const d = Math.hypot(x, z) / ISLAND_RADIUS;
    const fall = 1 - smoothstep(0.55, 1.0, d);
    const hills = 3 + 2.5 * fbm(x * 0.015, z * 0.015);
    const m = mountainFactor(x, z);
    let h = fall * (hills + MOUNTAIN.h * m * m) - (1 - fall) * 4;
    const k = smoothstep(CLEARING.r, CLEARING.r * 0.6, Math.hypot(x - CLEARING.x, z - CLEARING.z));
    h = lerp(h, CLEARING.h, k);
    return h;
  };

  const biomeAt = (x: number, z: number): Biome => {
    const h = heightAt(x, z);
    if (h < 0) return 'water';
    if (h < 1.0) return 'beach';
    if (Math.hypot(x - CLEARING.x, z - CLEARING.z) < CLEARING.r * 0.8) return 'clearing';
    if (mountainFactor(x, z) > 0.25 || h > 6) return 'rocky';
    return 'forest';
  };

  const isWalkable = (x: number, z: number): boolean => heightAt(x, z) > 0.2;

  // Départ : de la mer au sud vers le centre, jusqu'au sable sec, puis 2 m de plus.
  let sz = ISLAND_RADIUS;
  while (sz > 0 && heightAt(0, sz) <= 0.3) sz -= 0.5;
  const spawnPoint: Vec2 = { x: 0, z: sz - 2 };

  return { heightAt, isWalkable, biomeAt, spawnPoint, radius: ISLAND_RADIUS };
}
