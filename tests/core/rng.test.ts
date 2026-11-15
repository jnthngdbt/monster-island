import { createRng } from '../../src/core/rng';

test('déterministe', () => {
  expect(createRng(42).next()).toBe(createRng(42).next());
});

test('int inclusif dans les bornes', () => {
  const r = createRng(1);
  const seen = new Set<number>();
  for (let i = 0; i < 1000; i++) {
    const v = r.int(1, 3);
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(3);
    seen.add(v);
  }
  expect(seen.size).toBe(3);
});
