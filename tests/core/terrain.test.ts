import { createTerrain } from '../../src/core/terrain';
import { CLEARING, ISLAND_RADIUS, MOUNTAIN, WORLD_SEED } from '../../src/data/balance';

const t = createTerrain(WORLD_SEED);

test('déterministe', () => {
  expect(createTerrain(WORLD_SEED).heightAt(10, 20)).toBe(t.heightAt(10, 20));
});

test('centre émergé, large en mer', () => {
  expect(t.heightAt(0, 0)).toBeGreaterThan(0);
  expect(t.heightAt(ISLAND_RADIUS * 1.2, 0)).toBeLessThan(0);
});

test('clairière plate', () => {
  expect(t.heightAt(CLEARING.x, CLEARING.z)).toBeCloseTo(CLEARING.h, 1);
  expect(t.biomeAt(CLEARING.x, CLEARING.z)).toBe('clearing');
});

test('montagne rocheuse', () => {
  expect(t.biomeAt(MOUNTAIN.x, MOUNTAIN.z)).toBe('rocky');
});

test('départ sur la plage et marchable', () => {
  const p = t.spawnPoint;
  expect(t.biomeAt(p.x, p.z)).toBe('beach');
  expect(t.isWalkable(p.x, p.z)).toBe(true);
});

test("la mer n'est pas marchable", () => {
  expect(t.isWalkable(ISLAND_RADIUS * 1.2, 0)).toBe(false);
});
