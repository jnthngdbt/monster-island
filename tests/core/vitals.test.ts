import { Vitals } from '../../src/core/vitals';

const run = (v: Vitals, sec: number) => {
  for (let i = 0; i < sec * 60; i++) v.tick(1 / 60);
};

test('faim vide en 480 s', () => {
  const v = new Vitals();
  run(v, 480);
  expect(v.hunger).toBeCloseTo(0, 0);
});

test('affamé : perd 1 PV/s', () => {
  const v = new Vitals();
  v.hunger = 0;
  run(v, 10);
  expect(v.health).toBeCloseTo(90, 0);
});

test('régénère si faim ≥ 60', () => {
  const v = new Vitals();
  v.health = 50;
  run(v, 10);
  expect(v.health).toBeCloseTo(55, 0);
});

test('pas de régénération sous 60 de faim', () => {
  const v = new Vitals();
  v.health = 50;
  v.hunger = 40;
  run(v, 10);
  expect(v.health).toBeCloseTo(50, 5);
});

test('bornes', () => {
  const v = new Vitals();
  v.heal(50);
  expect(v.health).toBe(100);
  v.eat(50);
  expect(v.hunger).toBe(100);
});

test('invulnérable ignore les dégâts', () => {
  const v = new Vitals();
  v.invulnerableUntil = 5;
  expect(v.damage(10, 4)).toBe(false);
  expect(v.health).toBe(100);
  expect(v.damage(10, 6)).toBe(true);
  expect(v.health).toBe(90);
});

test('K.O. à 0 PV, jamais négatif', () => {
  const v = new Vitals();
  v.damage(150, 0);
  expect(v.health).toBe(0);
  expect(v.isDead).toBe(true);
});
