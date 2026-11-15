export type Rng = {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, maxIncl: number): number;
  pick<T>(arr: readonly T[]): T;
};

/** RNG déterministe (mulberry32). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, maxIncl) => min + Math.floor(next() * (maxIncl - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}
