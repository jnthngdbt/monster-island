import type * as THREE from 'three';
import { clamp, orbitPosition } from '../core/math';
import type { TerrainQuery } from '../core/terrain';
import { CAM_DIST, CAM_DIST_DEFAULT, CAM_PITCH, MOUSE_SENS } from '../data/balance';
import type { InputState } from '../engine/input';

/** Caméra libre en orbite autour du personnage. */
export class ThirdPersonCamera {
  yaw = 0;
  pitch = 0.35;
  distance = CAM_DIST_DEFAULT;

  constructor(private camera: THREE.PerspectiveCamera) {}

  update(input: InputState, target: THREE.Vector3, terrain: TerrainQuery): void {
    const { dx, dy } = input.consumeMouseDelta();
    this.yaw -= dx * MOUSE_SENS;
    this.pitch = clamp(this.pitch + dy * MOUSE_SENS, CAM_PITCH[0], CAM_PITCH[1]);
    this.distance = clamp(this.distance + input.consumeWheel() * 0.8, CAM_DIST[0], CAM_DIST[1]);

    const p = orbitPosition(target, this.yaw, this.pitch, this.distance);
    p.y = Math.max(p.y, terrain.heightAt(p.x, p.z) + 0.5, 0.5);
    this.camera.position.set(p.x, p.y, p.z);
    this.camera.lookAt(target.x, target.y + 1.6, target.z);
  }
}
