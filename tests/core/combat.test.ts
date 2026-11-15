import { AttackTimer, DodgeState, isInArc, rollLoot, selectTarget } from '../../src/core/combat';
import { createRng } from '../../src/core/rng';

test('arc', () => {
  expect(isInArc({ x: 0, z: 0 }, 0, { x: 0, z: 2 }, 2.2, 90)).toBe(true);
  expect(isInArc({ x: 0, z: 0 }, 0, { x: 0, z: -2 }, 2.2, 90)).toBe(false);
  expect(isInArc({ x: 0, z: 0 }, 0, { x: 0, z: 3 }, 2.2, 90)).toBe(false);
});

test("selectTarget prend le plus proche dans l'arc", () => {
  const t = selectTarget(
    { x: 0, z: 0 },
    0,
    [
      { id: 'far', x: 0, z: 2, radius: 0.5 },
      { id: 'near', x: 0.3, z: 1, radius: 0.5 },
      { id: 'behind', x: 0, z: -1, radius: 0.5 },
    ],
    2.2,
    90,
  );
  expect(t?.id).toBe('near');
});

test('selectTarget : rien à portée', () => {
  expect(selectTarget({ x: 0, z: 0 }, 0, [{ id: 'x', x: 0, z: 10, radius: 0.5 }], 2.2, 90)).toBeNull();
});

test('cooldown', () => {
  const a = new AttackTimer(0.5);
  expect(a.tryFire(0)).toBe(true);
  expect(a.tryFire(0.4)).toBe(false);
  expect(a.tryFire(0.5)).toBe(true);
});

test('esquive : iframes puis cooldown', () => {
  const d = new DodgeState();
  expect(d.start(0)).toBe(true);
  expect(d.isInvulnerable(0.3)).toBe(true);
  expect(d.isInvulnerable(0.4)).toBe(false);
  expect(d.start(0.5)).toBe(false);
  expect(d.start(1.0)).toBe(true);
});

test('esquive : progression 0 → 1 pendant la durée, null ensuite', () => {
  const d = new DodgeState();
  expect(d.progress(0)).toBeNull();
  d.start(1);
  expect(d.progress(1)).toBeCloseTo(0);
  expect(d.progress(1.15)).toBeCloseTo(0.5);
  expect(d.progress(1.31)).toBeNull();
});

test('rollLoot respecte min/max', () => {
  const r = createRng(3);
  for (let i = 0; i < 200; i++) {
    const c = rollLoot([{ item: 'jelly', min: 1, max: 2, chance: 1 }], r);
    expect(c.jelly).toBeGreaterThanOrEqual(1);
    expect(c.jelly).toBeLessThanOrEqual(2);
  }
});

test('rollLoot : chance 0 ne donne rien', () => {
  expect(rollLoot([{ item: 'jelly', min: 1, max: 2, chance: 0 }], createRng(1))).toEqual({});
});
