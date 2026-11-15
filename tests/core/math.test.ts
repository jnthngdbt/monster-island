import { angleDelta, forwardFromYaw } from '../../src/core/math';

test('forwardFromYaw(0) = +Z', () => {
  const f = forwardFromYaw(0);
  expect(f.x).toBeCloseTo(0);
  expect(f.z).toBeCloseTo(1);
});

test('angleDelta passe par -π/π', () => {
  expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
});
