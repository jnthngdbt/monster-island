import * as THREE from 'three';
import { nearestPoints, type Vec2 } from '../core/math';

const POOL = 3;

/**
 * Un petit nombre fixe de lumières déplacées vers les feux de camp les plus proches du joueur.
 * Le nombre de lumières de la scène ne change jamais : pas de recompilation de shaders
 * quand on pose ou casse un feu, et un coût par pixel borné.
 */
export class CampfireLights {
  private lights: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < POOL; i++) {
      const l = new THREE.PointLight('#ffb347', 0, 10, 1.5);
      scene.add(l);
      this.lights.push(l);
    }
  }

  /** nightK ∈ [0, 1] : 0 le jour, 1 en pleine nuit. */
  update(fires: readonly (Vec2 & { y: number })[], player: Vec2, nightK: number, time: number): void {
    const near = nearestPoints(fires, player, POOL);
    this.lights.forEach((l, i) => {
      const f = near[i];
      if (!f) {
        l.intensity = 0;
        return;
      }
      l.position.set(f.x, f.y + 0.9, f.z);
      const flicker = 1 + Math.sin(time * 11 + i) * 0.06;
      l.intensity = (0.4 + 2.2 * nightK) * flicker;
    });
  }
}
