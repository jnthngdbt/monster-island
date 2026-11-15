import { MonsterBrain, type Senses } from '../../src/core/monsterBrain';
import { createRng } from '../../src/core/rng';
import { MONSTERS } from '../../src/data/monsters';

const def = MONSTERS.slime;
const base: Senses = {
  self: { x: 0, z: 0 },
  home: { x: 0, z: 0 },
  player: { x: 0, z: 5 },
  playerAlive: true,
  isNight: false,
  now: 0,
  raider: false,
  nearestStructure: null,
};

test('jour : poursuit à 5 m', () => {
  const b = new MonsterBrain(def, createRng(1));
  b.update(1 / 60, base);
  expect(b.state).toBe('chase');
});

test('jour : ignore à 10 m', () => {
  const b = new MonsterBrain(def, createRng(1));
  b.update(1 / 60, { ...base, player: { x: 0, z: 10 } });
  expect(b.state).not.toBe('chase');
});

test('nuit : poursuit à 10 m', () => {
  const b = new MonsterBrain(def, createRng(1));
  b.update(1 / 60, { ...base, isNight: true, player: { x: 0, z: 10 } });
  expect(b.state).toBe('chase');
});

test('la poursuite va vers le joueur, plus vite la nuit', () => {
  const b = new MonsterBrain(def, createRng(1));
  const day = b.update(1 / 60, base);
  expect(day.move.z).toBeCloseTo(1);
  expect(day.speed).toBe(def.speedDay);
  const night = b.update(1 / 60, { ...base, isNight: true });
  expect(night.speed).toBe(def.speedNight);
});

test('attaque puis respecte le cooldown', () => {
  const b = new MonsterBrain(def, createRng(1));
  const s = { ...base, player: { x: 0, z: 1 } };
  expect(b.update(1 / 60, s).attack).toBe('player');
  expect(b.update(1 / 60, { ...s, now: 0.5 }).attack).toBeNull();
  expect(b.update(1 / 60, { ...s, now: 1.3 }).attack).toBe('player');
});

test('joueur K.O. : pas de poursuite', () => {
  const b = new MonsterBrain(def, createRng(1));
  b.update(1 / 60, { ...base, playerAlive: false });
  expect(b.state).not.toBe('chase');
});

test('raider assiège la structure', () => {
  const b = new MonsterBrain(def, createRng(1));
  const i = b.update(1 / 60, {
    ...base,
    isNight: true,
    raider: true,
    player: { x: 0, z: 40 },
    nearestStructure: { id: 's', key: 'edge:0:1:0', x: 0, z: 1, radius: 1 },
  });
  expect(b.state).toBe('siege');
  expect(i.attack).toBe('structure');
  expect(i.structureKey).toBe('edge:0:1:0');
});

test('raider sans base : vient vers le joueur, même de loin', () => {
  const b = new MonsterBrain(def, createRng(1));
  const i = b.update(1 / 60, { ...base, isNight: true, raider: true, player: { x: 0, z: 40 } });
  expect(b.state).toBe('chase');
  expect(i.move.z).toBeCloseTo(1);
});

test('trop loin de chez lui le jour : rentre', () => {
  const b = new MonsterBrain(def, createRng(1));
  const i = b.update(1 / 60, { ...base, self: { x: 30, z: 0 }, player: { x: 100, z: 100 } });
  expect(i.move.x).toBeLessThan(0);
});
