import { parse, SAVE_KEY, SaveStore, serialize, type SaveData } from '../../src/core/save';

const sample = (): SaveData => ({
  version: 1,
  savedAt: 1_700_000_000_000,
  now: 300,
  playTime: 280,
  clock: { t: 0.75, day: 3 },
  player: { x: 10, y: 2.5, z: -4, yaw: 1.2, health: 80, hunger: 55 },
  inventory: { wood: 5, stone_sword: 1 },
  structures: [
    { p: { kind: 'wall', key: 'edge:3:4:0', cx: 3, cz: 4, rot: 0, x: 7, y: 1.5, z: 8, yaw: 0 }, open: false },
    { p: { kind: 'door', key: 'edge:3:5:0', cx: 3, cz: 5, rot: 0, x: 7, y: 1.5, z: 10, yaw: 0 }, open: true },
  ],
  harvest: [{ id: 'tree-0', hitsLeft: 0, respawnAt: 120 }],
});

test('aller-retour serialize/parse', () => {
  expect(parse(serialize(sample()))).toEqual(sample());
});

test('parse rejette null, JSON cassé et mauvaise version', () => {
  expect(parse(null)).toBeNull();
  expect(parse('{oops')).toBeNull();
  expect(parse(serialize({ ...sample(), version: 2 as 1 }))).toBeNull();
});

test('parse rejette un champ manquant ou un nombre invalide', () => {
  const { player, ...noPlayer } = sample();
  expect(parse(JSON.stringify(noPlayer))).toBeNull();
  expect(parse(JSON.stringify({ ...sample(), player: { ...player, x: null } }))).toBeNull();
  expect(parse(JSON.stringify({ ...sample(), clock: { t: 'a', day: 1 } }))).toBeNull();
  expect(parse(JSON.stringify({ ...sample(), harvest: [{ id: 'tree-0', hitsLeft: 'x', respawnAt: null }] }))).toBeNull();
});

test('parse ignore les objets et pièces inconnus', () => {
  const s = sample();
  const d = {
    ...s,
    inventory: { wood: 5, laser: 3 },
    structures: [...s.structures, { p: { ...s.structures[0].p, kind: 'tower' }, open: false }],
  };
  const out = parse(JSON.stringify(d))!;
  expect(out.inventory).toEqual({ wood: 5 });
  expect(out.structures).toHaveLength(s.structures.length);
});

test('SaveStore écrit, relit et efface sous SAVE_KEY', () => {
  const mem = new Map<string, string>();
  const s = new SaveStore({
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  });
  expect(s.load()).toBeNull();
  expect(s.write(sample())).toBe(true);
  expect(mem.has(SAVE_KEY)).toBe(true);
  expect(s.load()).toEqual(sample());
  s.clear();
  expect(s.load()).toBeNull();
});

test('SaveStore survit à un stockage qui lève ou absent', () => {
  const boom = () => {
    throw new Error('quota');
  };
  const s = new SaveStore({ getItem: boom, setItem: boom, removeItem: boom });
  expect(s.load()).toBeNull();
  expect(s.write(sample())).toBe(false);
  expect(() => s.clear()).not.toThrow();
  expect(new SaveStore(null).write(sample())).toBe(false);
  expect(new SaveStore(null).load()).toBeNull();
});
