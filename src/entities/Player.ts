import * as THREE from 'three';
import { EMPTY_WORLD, resolveCircle, type CollisionWorld } from '../core/collision';
import { angleDelta, moveVector } from '../core/math';
import type { TerrainQuery } from '../core/terrain';
import { GRAVITY, JUMP_VELOCITY, PLAYER_SPEED } from '../data/balance';
import type { WeaponId } from '../data/weapons';
import type { InputState } from '../engine/input';
import { createPlayerModel, createWeaponModel, type PlayerModel } from '../world/models';

export type PlayerWorld = { terrain: TerrainQuery; collision?: CollisionWorld };

const SWING_TIME = 0.25;

export class Player {
  readonly position = new THREE.Vector3();
  yaw = 0;
  velocityY = 0;
  readonly radius = 0.4;
  grounded = true;
  readonly model: PlayerModel;
  readonly mesh: THREE.Group;
  private walkPhase = 0;
  private swingStart = -Infinity;
  private simNow = 0;
  /** Direction de marche du dernier pas (pour l'esquive). */
  lastMove = { x: 0, z: 0 };

  constructor() {
    this.model = createPlayerModel();
    this.mesh = this.model.group;
  }

  teleport(x: number, z: number, terrain: TerrainQuery): void {
    this.position.set(x, terrain.heightAt(x, z), z);
    this.velocityY = 0;
    this.grounded = true;
  }

  setWeapon(id: WeaponId): void {
    const hand = this.model.rightHand;
    hand.clear();
    hand.add(createWeaponModel(id));
  }

  startSwing(now: number): void {
    this.swingStart = now;
  }

  update(dt: number, now: number, input: InputState, cameraYaw: number, world: PlayerWorld): void {
    this.simNow = now;
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
    this.lastMove = dir;

    if (moving) {
      this.moveBy(dir.x * PLAYER_SPEED * dt, dir.z * PLAYER_SPEED * dt, world);
      if (now - this.swingStart > SWING_TIME) {
        const target = Math.atan2(dir.x, dir.z);
        this.yaw += angleDelta(this.yaw, target) * Math.min(1, dt * 12);
      }
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

  /**
   * Déplace en glissant le long du rivage (un axe refusé n'empêche pas l'autre),
   * puis repousse hors des obstacles sans jamais finir dans l'eau.
   */
  moveBy(dx: number, dz: number, world: PlayerWorld): void {
    const { terrain } = world;
    const p = this.position;
    if (terrain.isWalkable(p.x + dx, p.z)) p.x += dx;
    if (terrain.isWalkable(p.x, p.z + dz)) p.z += dz;
    const r = resolveCircle(p, this.radius, world.collision ?? EMPTY_WORLD);
    if (terrain.isWalkable(r.x, r.z)) {
      p.x = r.x;
      p.z = r.z;
    }
  }

  private animate(dt: number, moving: boolean): void {
    const m = this.model;
    if (moving && this.grounded) this.walkPhase += dt * 10;
    const s = moving ? Math.sin(this.walkPhase) * 0.7 : 0;
    m.leftLeg.rotation.x = s;
    m.rightLeg.rotation.x = -s;
    m.leftArm.rotation.x = -s * 0.8;
    const swing = (this.simNow - this.swingStart) / SWING_TIME;
    if (swing >= 0 && swing < 1) {
      // Bras levé puis abattu devant.
      m.rightArm.rotation.x = -2.6 + swing * 3.0;
    } else {
      m.rightArm.rotation.x = s * 0.8;
    }
    m.body.position.y = moving ? Math.abs(Math.sin(this.walkPhase)) * 0.06 : 0;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
  }
}
