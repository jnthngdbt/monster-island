import { resolveCircle } from '../../src/core/collision';

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
