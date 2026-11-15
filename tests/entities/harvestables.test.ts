import * as THREE from 'three';
import { createRng } from '../../src/core/rng';
import { createTerrain } from '../../src/core/terrain';
import { WORLD_SEED } from '../../src/data/balance';
import { Harvestables } from '../../src/entities/Harvestables';

const make = () => new Harvestables(createTerrain(WORLD_SEED), createRng(1), new THREE.Scene());

const chop = (h: Harvestables, id: string) => {
  for (let i = 0; i < 10; i++) h.hit(id, 1, 0);
};

test("un arbre coupé ne repousse pas à travers une construction", () => {
  const h = make();
  const tree = h.nodes.find((n) => n.kind === 'tree')!;
  chop(h, tree.id);
  h.update(1000, () => true);
  expect(h.targets().some((t) => t.id === tree.id)).toBe(false);
  expect(h.colliders().some((c) => c.x === tree.x && c.z === tree.z)).toBe(false);
});

test('il repousse quand la place est libre', () => {
  const h = make();
  const tree = h.nodes.find((n) => n.kind === 'tree')!;
  chop(h, tree.id);
  h.update(1000, () => true);
  h.update(2000, () => false);
  expect(h.targets().some((t) => t.id === tree.id)).toBe(true);
});

test('snapshot ne garde que les nœuds touchés, restore les rétablit', () => {
  const a = make();
  const tree = a.nodes.find((n) => n.kind === 'tree')!;
  chop(a, tree.id);
  const rock = a.nodes.find((n) => n.kind === 'rock')!;
  a.hit(rock.id, 1, 0);
  const snap = a.snapshot();
  expect(snap).toEqual([
    { id: tree.id, hitsLeft: tree.hitsLeft, respawnAt: tree.respawnAt },
    { id: rock.id, hitsLeft: rock.hitsLeft, respawnAt: null },
  ]);
  const b = make();
  b.restore([...snap, { id: 'tree-99999', hitsLeft: 0, respawnAt: 5 }]);
  expect(b.targets().some((t) => t.id === tree.id)).toBe(false);
  expect(b.snapshot()).toEqual(snap);
});

test("hideUnder cache une ressource intacte sous une construction (sauvegarde d'une ancienne version)", () => {
  const h = make();
  const tree = h.nodes.find((n) => n.kind === 'tree')!;
  const under = (c: { x: number; z: number }) => c.x === tree.x && c.z === tree.z;
  h.hideUnder(500, under);
  expect(h.targets().some((t) => t.id === tree.id)).toBe(false);
  h.update(10_000, under);
  expect(h.targets().some((t) => t.id === tree.id)).toBe(false);
  h.update(20_000, () => false);
  expect(h.targets().some((t) => t.id === tree.id)).toBe(true);
  expect(h.targets()).toHaveLength(h.nodes.length);
});
