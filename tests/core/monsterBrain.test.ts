import { MonsterBrain, type Senses } from '../../src/core/monsterBrain';
import { createRng } from '../../src/core/rng';
import { MONSTERS } from '../../src/data/monsters';

const def = MONSTERS.slime;
const base: Senses = {
  self: { x: 0, z: 0 },
  home: { x: 0, z: 0 },
  player: { x: 0, z: 5 },
  playerAlive: true,
  playerVisible: true,
  isNight: false,
  now: 0,
  raider: false,
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

test("raider : vient vers le joueur dès qu'il le voit, même de loin", () => {
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

test('joueur caché derrière un mur : ni poursuite ni attaque', () => {
  const b = new MonsterBrain(def, createRng(1));
  const i = b.update(1 / 60, { ...base, player: { x: 0, z: 1 }, playerVisible: false });
  expect(b.state).not.toBe('chase');
  expect(i.attack).toBeNull();
});

test("raider : joueur à l'abri, il flâne près de chez lui", () => {
  const b = new MonsterBrain(def, createRng(1));
  const i = b.update(1 / 60, { ...base, isNight: true, raider: true, player: { x: 0, z: 40 }, playerVisible: false });
  expect(['idle', 'wander']).toContain(b.state);
  expect(i.attack).toBeNull();
});

test('joueur perdu de vue : va voir où il était, puis abandonne', () => {
  const b = new MonsterBrain(def, createRng(1));
  b.update(1 / 60, base); // voit le joueur en (0, 5)
  const hidden = { ...base, player: { x: 3, z: 3 }, playerVisible: false };
  const i = b.update(1 / 60, { ...hidden, now: 1 });
  expect(b.state).toBe('search');
  expect(i.move.z).toBeCloseTo(1); // vers (0, 5), pas vers la vraie position
  b.update(1 / 60, { ...hidden, self: { x: 0, z: 4.9 }, now: 2 });
  expect(b.state).not.toBe('search');
});

test('joueur perdu de vue : abandonne après un moment', () => {
  const b = new MonsterBrain(def, createRng(1));
  b.update(1 / 60, base);
  b.update(1 / 60, { ...base, playerVisible: false, now: 10 });
  expect(b.state).not.toBe('search');
});
