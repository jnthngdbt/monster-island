import { dist2D } from '../../src/core/math';
import { createRng } from '../../src/core/rng';
import { planNightSpawns, raiderCap } from '../../src/core/spawner';
import { createTerrain } from '../../src/core/terrain';
import { CLEARING, WORLD_SEED } from '../../src/data/balance';

const t = createTerrain(WORLD_SEED);

test('cap par nuit', () => {
  expect(raiderCap(1)).toBe(3);
  expect(raiderCap(3)).toBe(7);
  expect(raiderCap(20)).toBe(12);
});

test("jamais dans l'eau ni sur le joueur", () => {
  const anchor = { x: CLEARING.x, z: CLEARING.z };
  const pts = planNightSpawns({ terrain: t, rng: createRng(9), anchor, player: anchor, count: 50 });
  expect(pts.length).toBeGreaterThan(0);
  for (const p of pts) {
    expect(t.isWalkable(p.x, p.z)).toBe(true);
    expect(dist2D(p, anchor)).toBeGreaterThanOrEqual(15);
  }
});

test("ancre au bord de l'île : jamais de position invalide", () => {
  const anchor = t.spawnPoint;
  const pts = planNightSpawns({ terrain: t, rng: createRng(2), anchor, player: anchor, count: 10 });
  for (const p of pts) {
    expect(t.isWalkable(p.x, p.z)).toBe(true);
    expect(dist2D(p, anchor)).toBeGreaterThanOrEqual(15);
  }
});

test('joueur loin de la base : respecte aussi la distance au joueur', () => {
  const anchor = { x: CLEARING.x, z: CLEARING.z };
  const player = { x: CLEARING.x + 22, z: CLEARING.z };
  const pts = planNightSpawns({ terrain: t, rng: createRng(4), anchor, player, count: 30 });
  for (const p of pts) expect(dist2D(p, player)).toBeGreaterThanOrEqual(15);
});
