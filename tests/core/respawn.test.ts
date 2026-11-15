import { applyRespawn, chooseRespawnPoint, grantGrace } from '../../src/core/respawn';
import { createTerrain } from '../../src/core/terrain';
import { Vitals } from '../../src/core/vitals';
import { WORLD_SEED } from '../../src/data/balance';

test('réapparaît au dernier feu de camp', () => {
  expect(chooseRespawnPoint([{ x: 0, z: 0 }, { x: 10, z: 10 }], { x: 99, z: 99 })).toEqual({ x: 10, z: 11.5 });
});

test('sinon à la plage', () => {
  expect(chooseRespawnPoint([], { x: 5, z: 80 })).toEqual({ x: 5, z: 80 });
});

test("feu de camp au bord de l'eau : jamais de réapparition dans la mer", () => {
  const t = createTerrain(WORLD_SEED);
  // Feu de camp valide trouvé par la revue : z + 1,5 tombe dans l'eau.
  const p = chooseRespawnPoint([{ x: -67, z: 17 }], t.spawnPoint, t.isWalkable);
  expect(t.isWalkable(p.x, p.z)).toBe(true);
  expect(Math.hypot(p.x + 67, p.z - 17)).toBeLessThan(3);
});

test('aucune place autour du feu : retour à la plage', () => {
  expect(chooseRespawnPoint([{ x: 0, z: 0 }], { x: 5, z: 80 }, () => false)).toEqual({ x: 5, z: 80 });
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

test('grâce au chargement : invulnérable quelques secondes, santé inchangée', () => {
  const v = new Vitals();
  v.health = 40;
  grantGrace(v, 100);
  expect(v.damage(10, 101)).toBe(false);
  expect(v.health).toBe(40);
  expect(applyRespawnInvulnEnd(100)).toBe(v.invulnerableUntil);
});

const applyRespawnInvulnEnd = (now: number) => {
  const v = new Vitals();
  applyRespawn(v, now);
  return v.invulnerableUntil;
};
