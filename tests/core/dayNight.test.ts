import { DayNightClock } from '../../src/core/dayNight';

const run = (c: DayNightClock, sec: number) => {
  const ev: string[] = [];
  for (let i = 0; i < sec * 60; i++) ev.push(...c.tick(1 / 60));
  return ev;
};

test('commence le jour', () => {
  const c = new DayNightClock();
  expect(c.isNight).toBe(false);
  expect(c.day).toBe(1);
});

test('la nuit arrive une seule fois', () => {
  const c = new DayNightClock(600, 0);
  const ev = run(c, 421);
  expect(c.isNight).toBe(true);
  expect(ev.filter((e) => e === 'nightStarted')).toHaveLength(1);
});

test('nouveau jour après un cycle', () => {
  const c = new DayNightClock(600, 0);
  const ev = run(c, 601);
  expect(c.isNight).toBe(false);
  expect(c.day).toBe(2);
  expect(ev).toContain('dayStarted');
});

test('soleil haut le jour, couché la nuit', () => {
  const c = new DayNightClock(600, 0.35);
  expect(c.sunElevation).toBeGreaterThan(0.9);
  c.skipToNight();
  expect(c.isNight).toBe(true);
  run(c, 30);
  expect(c.sunElevation).toBeLessThan(0);
});
