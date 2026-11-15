import * as THREE from 'three';
import { EventBus, type GameEvents } from '../../src/core/events';
import type { PieceKind } from '../../src/data/buildables';
import { createTerrain } from '../../src/core/terrain';
import { WORLD_SEED } from '../../src/data/balance';
import { Structures } from '../../src/entities/Structures';

const terrain = createTerrain(WORLD_SEED);
const sp = terrain.spawnPoint;
const fresh = () => new Structures(terrain, new THREE.Scene(), new EventBus<GameEvents>());

/** Plancher, feu de camp, porte, second feu de camp — dans cet ordre. */
const build = () => {
  const s = fresh();
  const put = (kind: PieceKind, dx: number, dz: number) => s.add(s.grid.snap(kind, { x: sp.x + dx, z: sp.z + dz }, 0));
  put('floor', 0, 0);
  put('campfire', 4, 0);
  put('door', 0, 4);
  put('campfire', 8, 0);
  return s;
};

test('snapshot garde l’ordre de pose', () => {
  expect(build().snapshot().map((x) => x.p.kind)).toEqual(['floor', 'campfire', 'door', 'campfire']);
});

test('restore rouvre les portes et refait les collisions', () => {
  const s = build();
  const door = s.snapshot().find((x) => x.p.kind === 'door')!.p;
  expect(s.toggleDoor(door)).toBe(true);
  const t = fresh();
  t.restore(s.snapshot());
  expect(t.snapshot()).toEqual(s.snapshot());
  expect(t.snapshot().find((x) => x.p.kind === 'door')!.open).toBe(true);
  expect(t.colliders()).toEqual(s.colliders());
  expect(t.campfires()).toEqual(s.campfires());
});
