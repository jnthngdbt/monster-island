import * as THREE from 'three';
import type { TerrainQuery } from '../core/terrain';
import type { ItemId } from '../data/items';
import { mat } from '../world/models';

const COLLECT_DIST = 1.5;
const MAGNET_DIST = 3;
const LIFETIME = 120;

const COLORS: Partial<Record<ItemId, string>> = { jelly: '#6fe36f', wood: '#c08a52', stone: '#a7a9ac', berry: '#4a62d8' };
const geo = new THREE.IcosahedronGeometry(0.22, 0);

/** Butin au sol : ramassé automatiquement en passant à côté. */
export class Pickup {
  readonly mesh: THREE.Mesh;
  readonly position = new THREE.Vector3();
  private bornAt: number;

  constructor(
    readonly item: ItemId,
    readonly amount: number,
    x: number,
    z: number,
    terrain: TerrainQuery,
    now: number,
  ) {
    this.bornAt = now;
    this.position.set(x, terrain.heightAt(x, z), z);
    this.mesh = new THREE.Mesh(geo, mat(COLORS[item] ?? '#ffffff', { emissive: '#224422' }));
    this.mesh.castShadow = true;
  }

  /** 'collect' quand le joueur l'attrape, 'expire' après 2 minutes. */
  update(dt: number, now: number, player: THREE.Vector3, terrain: TerrainQuery): 'collect' | 'expire' | null {
    if (now - this.bornAt > LIFETIME) return 'expire';
    const dx = player.x - this.position.x;
    const dz = player.z - this.position.z;
    const d = Math.hypot(dx, dz);
    if (d < COLLECT_DIST) return 'collect';
    if (d < MAGNET_DIST) {
      this.position.x += (dx / d) * 6 * dt;
      this.position.z += (dz / d) * 6 * dt;
    }
    const age = now - this.bornAt;
    this.position.y = terrain.heightAt(this.position.x, this.position.z);
    this.mesh.position.set(this.position.x, this.position.y + 0.4 + Math.sin(age * 4) * 0.12, this.position.z);
    this.mesh.rotation.y = age * 2;
    return null;
  }
}
