import { angleDelta, forwardFromYaw, moveVector, orbitPosition } from '../../src/core/math';

test('forwardFromYaw(0) = +Z', () => {
  const f = forwardFromYaw(0);
  expect(f.x).toBeCloseTo(0);
  expect(f.z).toBeCloseTo(1);
});

test('angleDelta passe par -π/π', () => {
  expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
});

const keys = (k: Partial<{ forward: boolean; back: boolean; left: boolean; right: boolean }>) => ({
  forward: false, back: false, left: false, right: false, ...k,
});

test('avant = +Z quand yaw 0', () => {
  const v = moveVector(keys({ forward: true }), 0);
  expect(v.x).toBeCloseTo(0);
  expect(v.z).toBeCloseTo(1);
});

test('droite = -X quand yaw 0', () => {
  const v = moveVector(keys({ right: true }), 0);
  expect(v.x).toBeCloseTo(-1);
  expect(v.z).toBeCloseTo(0);
});

test('diagonale normalisée', () => {
  const v = moveVector(keys({ forward: true, right: true }), 0.7);
  expect(Math.hypot(v.x, v.z)).toBeCloseTo(1);
});

test('aucune touche = vecteur nul', () => {
  const v = moveVector(keys({}), 1);
  expect(v).toEqual({ x: 0, z: 0 });
});

test('caméra derrière', () => {
  const c = orbitPosition({ x: 0, y: 0, z: 0 }, 0, 0, 7);
  expect(c.z).toBeCloseTo(-7);
});
