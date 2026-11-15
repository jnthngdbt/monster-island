import * as THREE from 'three';
import { angleDelta, moveVector } from '../core/math';
import type { TerrainQuery } from '../core/terrain';
import { GRAVITY, JUMP_VELOCITY, PLAYER_SPEED } from '../data/balance';
import type { InputState } from '../engine/input';
import { createPlayerModel, type PlayerModel } from '../world/models';

export type PlayerWorld = { terrain: TerrainQuery };

export class Player {
  readonly position = new THREE.Vector3();
  yaw = 0;
  velocityY = 0;
  readonly radius = 0.4;
  grounded = true;
  readonly model: PlayerModel;
  readonly mesh: THREE.Group;
  private walkPhase = 0;

  constructor() {
    this.model = createPlayerModel();
    this.mesh = this.model.group;
  }

  teleport(x: number, z: number, terrain: TerrainQuery): void {
    this.position.set(x, terrain.heightAt(x, z), z);
    this.velocityY = 0;
    this.grounded = true;
  }

  update(dt: number, input: InputState, cameraYaw: number, world: PlayerWorld): void {
    const { terrain } = world;
    const dir = moveVector(
      {
        forward: input.isDown('KeyW'),
        back: input.isDown('KeyS'),
        left: input.isDown('KeyA'),
        right: input.isDown('KeyD'),
      },
      cameraYaw,
    );
    const moving = dir.x !== 0 || dir.z !== 0;

    if (moving) {
      this.moveBy(dir.x * PLAYER_SPEED * dt, dir.z * PLAYER_SPEED * dt, world);
      const target = Math.atan2(dir.x, dir.z);
      this.yaw += angleDelta(this.yaw, target) * Math.min(1, dt * 12);
    }

    // Saut et gravité
    if (this.grounded && input.consumePressed('Space')) {
      this.velocityY = JUMP_VELOCITY;
      this.grounded = false;
    }
    const ground = terrain.heightAt(this.position.x, this.position.z);
    this.velocityY -= GRAVITY * dt;
    this.position.y += this.velocityY * dt;
    const stickToSlope = this.grounded && this.velocityY <= 0 && this.position.y - ground < 0.35;
    if (this.position.y <= ground || stickToSlope) {
      this.position.y = ground;
      this.velocityY = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    this.animate(dt, moving);
  }

  /** Déplace en glissant le long du rivage : un axe refusé n'empêche pas l'autre. */
  moveBy(dx: number, dz: number, world: PlayerWorld): void {
    const { terrain } = world;
    const p = this.position;
    if (terrain.isWalkable(p.x + dx, p.z)) p.x += dx;
    if (terrain.isWalkable(p.x, p.z + dz)) p.z += dz;
  }

  private animate(dt: number, moving: boolean): void {
    const m = this.model;
    if (moving && this.grounded) this.walkPhase += dt * 10;
    const s = moving ? Math.sin(this.walkPhase) * 0.7 : 0;
    m.leftLeg.rotation.x = s;
    m.rightLeg.rotation.x = -s;
    m.leftArm.rotation.x = -s * 0.8;
    m.rightArm.rotation.x = s * 0.8;
    m.body.position.y = moving ? Math.abs(Math.sin(this.walkPhase)) * 0.06 : 0;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
  }
}
