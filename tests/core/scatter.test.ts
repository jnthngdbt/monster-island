import { dist2D } from '../../src/core/math';
import { createRng } from '../../src/core/rng';
import { scatter } from '../../src/core/scatter';
import { createTerrain } from '../../src/core/terrain';
import { CLEARING, WORLD_SEED } from '../../src/data/balance';

const t = createTerrain(WORLD_SEED);

test('scatter : biomes, terre ferme, espacement, loin du départ', () => {
  const pts = scatter(t, createRng(1), 'tree', []);
  expect(pts.length).toBeGreaterThan(100);
  for (const p of pts) {
    expect(['forest', 'clearing']).toContain(t.biomeAt(p.x, p.z));
    expect(t.isWalkable(p.x, p.z)).toBe(true);
    expect(dist2D(p, t.spawnPoint)).toBeGreaterThan(6);
    expect(dist2D(p, CLEARING)).toBeGreaterThan(6);
  }
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) expect(dist2D(pts[i], pts[j])).toBeGreaterThanOrEqual(2.5);
});

test('scatter respecte les points existants', () => {
  const trees = scatter(t, createRng(1), 'tree', []);
  const rocks = scatter(t, createRng(2), 'rock', trees);
  for (const r of rocks) for (const tr of trees) expect(dist2D(r, tr)).toBeGreaterThanOrEqual(2.5);
});
