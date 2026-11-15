import { resolveCircle, segmentHitsAABB } from '../../src/core/collision';

test("cercle repoussé hors d'un cercle", () => {
  const p = resolveCircle({ x: 0.5, z: 0 }, 0.4, { circles: [{ x: 0, z: 0, r: 0.6 }], boxes: [] });
  expect(Math.hypot(p.x, p.z)).toBeCloseTo(1.0);
});

test("cercle repoussé hors d'une AABB (centre à l'intérieur)", () => {
  const p = resolveCircle({ x: 0, z: 0.1 }, 0.4, {
    circles: [],
    boxes: [{ minX: -1, maxX: 1, minZ: -0.1, maxZ: 0.1 }],
  });
  expect(p.z).toBeCloseTo(0.5);
});

test("cercle repoussé hors d'une AABB (centre à l'extérieur)", () => {
  const p = resolveCircle({ x: 0, z: 0.3 }, 0.4, {
    circles: [],
    boxes: [{ minX: -1, maxX: 1, minZ: -0.1, maxZ: 0.1 }],
  });
  expect(p.z).toBeCloseTo(0.5);
  expect(p.x).toBeCloseTo(0);
});

test('sans contact : inchangé', () => {
  const p = resolveCircle({ x: 5, z: 5 }, 0.4, { circles: [{ x: 0, z: 0, r: 0.6 }], boxes: [] });
  expect(p).toEqual({ x: 5, z: 5 });
});

const WALL = { minX: -1, maxX: 1, minZ: -0.15, maxZ: 0.15 };

test('segment qui traverse un mur', () => {
  expect(segmentHitsAABB({ x: 0, z: -2 }, { x: 0, z: 2 }, WALL)).toBe(true);
});

test('segment en biais qui traverse un mur', () => {
  expect(segmentHitsAABB({ x: -2, z: -2 }, { x: 1.5, z: 1 }, WALL)).toBe(true);
});

test('segment qui passe à côté du mur', () => {
  expect(segmentHitsAABB({ x: 1.5, z: -2 }, { x: 1.5, z: 2 }, WALL)).toBe(false);
});

test("segment qui s'arrête avant le mur", () => {
  expect(segmentHitsAABB({ x: 0, z: -2 }, { x: 0, z: -0.5 }, WALL)).toBe(false);
});

test('segment parallèle au mur, hors de son épaisseur', () => {
  expect(segmentHitsAABB({ x: -3, z: 0.5 }, { x: 3, z: 0.5 }, WALL)).toBe(false);
});
