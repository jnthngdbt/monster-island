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
