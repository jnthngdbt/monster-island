import { BuildGrid } from '../../src/core/buildGrid';

const flat = { heightAt: () => 2, isWalkable: () => true };
const none = { obstacles: [], player: { x: 50, z: 50, r: 0.4 } };

test('snap plancher', () => {
  const p = new BuildGrid(flat).snap('floor', { x: 3.1, z: 0.4 }, 0);
  expect([p.cx, p.cz, p.x, p.z, p.key]).toEqual([1, 0, 3, 1, 'floor:1:0']);
});

test("snap mur rot 0 sur l'arête la plus proche", () => {
  const p = new BuildGrid(flat).snap('wall', { x: 1, z: 1.8 }, 0);
  expect([p.key, p.x, p.z]).toEqual(['edge:0:1:0', 1, 2]);
});

test('snap mur rot 1', () => {
  const p = new BuildGrid(flat).snap('wall', { x: 1.8, z: 1 }, 1);
  expect([p.key, p.x, p.z]).toEqual(['edge:1:0:1', 2, 1]);
  expect(p.yaw).toBeCloseTo(Math.PI / 2);
});

test("mur et porte s'excluent", () => {
  const g = new BuildGrid(flat);
  g.place(g.snap('wall', { x: 1, z: 2 }, 0));
  expect(g.validate(g.snap('door', { x: 1, z: 2 }, 0), none)).toEqual({ ok: false, reason: 'occupied' });
});

test('eau refusée', () => {
  const g = new BuildGrid({ heightAt: () => -1, isWalkable: () => false });
  expect(g.validate(g.snap('floor', { x: 1, z: 1 }, 0), none)).toEqual({ ok: false, reason: 'water' });
});

test('pente refusée', () => {
  const g = new BuildGrid({ heightAt: (x: number) => x, isWalkable: () => true });
  expect(g.validate(g.snap('floor', { x: 1, z: 1 }, 0), none)).toEqual({ ok: false, reason: 'slope' });
});

test('sur un arbre refusé', () => {
  const g = new BuildGrid(flat);
  expect(g.validate(g.snap('floor', { x: 1, z: 1 }, 0), { ...none, obstacles: [{ x: 1, z: 1, r: 0.6 }] })).toEqual({
    ok: false,
    reason: 'blocked',
  });
});

test('mur sur le joueur refusé', () => {
  const g = new BuildGrid(flat);
  expect(g.validate(g.snap('wall', { x: 1, z: 2 }, 0), { obstacles: [], player: { x: 1, z: 2, r: 0.4 } })).toEqual({
    ok: false,
    reason: 'blocked',
  });
});

test('plancher sous le joueur accepté', () => {
  const g = new BuildGrid(flat);
  expect(g.validate(g.snap('floor', { x: 1, z: 1 }, 0), { obstacles: [], player: { x: 1, z: 1, r: 0.4 } })).toEqual({
    ok: true,
  });
});

test("toit : besoin d'un mur", () => {
  const g = new BuildGrid(flat);
  const roof = g.snap('roof', { x: 1, z: 1 }, 0);
  expect(g.validate(roof, none)).toEqual({ ok: false, reason: 'needsSupport' });
  g.place(g.snap('wall', { x: 1, z: 0.1 }, 0));
  expect(g.validate(roof, none)).toEqual({ ok: true });
});

test('mur posé sur un plancher prend sa hauteur', () => {
  const g = new BuildGrid(flat);
  g.place(g.snap('floor', { x: 1, z: 1 }, 0));
  expect(g.snap('wall', { x: 1, z: 0.1 }, 0).y).toBeGreaterThan(2);
});

test('remove libère la case', () => {
  const g = new BuildGrid(flat);
  const p = g.snap('floor', { x: 1, z: 1 }, 0);
  g.place(p);
  expect(g.remove(p.key)?.key).toBe('floor:0:0');
  expect(g.validate(p, none)).toEqual({ ok: true });
});
