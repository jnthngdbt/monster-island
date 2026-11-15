import { applyRespawn, chooseRespawnPoint } from '../../src/core/respawn';
import { Vitals } from '../../src/core/vitals';

test('réapparaît au dernier feu de camp', () => {
  expect(chooseRespawnPoint([{ x: 0, z: 0 }, { x: 10, z: 10 }], { x: 99, z: 99 })).toEqual({ x: 10, z: 11.5 });
});

test('sinon à la plage', () => {
  expect(chooseRespawnPoint([], { x: 5, z: 80 })).toEqual({ x: 5, z: 80 });
});

test('respawn : santé pleine, faim ≥ 50, invulnérable 3 s', () => {
  const v = new Vitals();
  v.health = 0;
  v.hunger = 10;
  applyRespawn(v, 100);
  expect(v.health).toBe(100);
  expect(v.hunger).toBe(50);
  expect(v.damage(10, 102.9)).toBe(false);
  expect(v.damage(10, 103.1)).toBe(true);
});

test('respawn garde une faim plus haute', () => {
  const v = new Vitals();
  v.hunger = 80;
  applyRespawn(v, 0);
  expect(v.hunger).toBe(80);
});
