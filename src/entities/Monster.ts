import * as THREE from 'three';
import { resolveCircle, type CollisionWorld } from '../core/collision';
import { angleDelta, type Vec2 } from '../core/math';
import { MonsterBrain, type Intent, type Senses } from '../core/monsterBrain';
import type { Rng } from '../core/rng';
import type { TerrainQuery } from '../core/terrain';
import { MONSTERS, type MonsterDef, type MonsterKind } from '../data/monsters';
import { PALETTE } from '../data/palette';
import { createSlimeModel, type SlimeModel } from '../world/models';

const HOP_RATE = 2.2;
const KNOCKBACK = 1.5;

/** Barre de vie flottante (deux plans face caméra). */
class HealthBar {
  readonly group = new THREE.Group();
  private fill: THREE.Mesh;

  constructor(y: number) {
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.14), new THREE.MeshBasicMaterial({ color: '#2b2d42' }));
    this.fill = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.08), new THREE.MeshBasicMaterial({ color: '#7cf27c' }));
    this.fill.position.z = 0.001;
    this.group.add(bg, this.fill);
    this.group.position.y = y;
    this.group.visible = false;
  }

  set(ratio: number): void {
    const r = Math.max(0, Math.min(1, ratio));
    this.fill.scale.x = r;
    this.fill.position.x = -(1 - r) * 0.47;
  }
}

export class Monster {
  readonly def: MonsterDef;
  readonly brain: MonsterBrain;
  readonly position = new THREE.Vector3();
  readonly home: Vec2;
  readonly mesh: THREE.Group;
  hp: number;
  yaw = 0;
  /** Disparition en « pouf » programmée (aube pour les raiders). */
  fadeAt: number | null = null;
  private model: SlimeModel;
  private bar: HealthBar;
  private hop = 0;
  private push = { x: 0, z: 0 };
  private flashUntil = 0;
  private lungeUntil = 0;

  constructor(
    readonly id: string,
    readonly kind: MonsterKind,
    x: number,
    z: number,
    terrain: TerrainQuery,
    rng: Rng,
    readonly raider = false,
  ) {
    this.def = MONSTERS[kind];
    this.hp = this.def.hp;
    this.brain = new MonsterBrain(this.def, rng);
    this.home = { x, z };
    this.position.set(x, terrain.heightAt(x, z), z);
    this.model = createSlimeModel(raider ? PALETTE.raider : PALETTE.slime, raider);
    this.mesh = this.model.group;
    this.bar = new HealthBar(1.35);
    this.mesh.add(this.bar.group);
    this.yaw = rng.range(0, Math.PI * 2);
    this.hop = rng.next();
  }

  get radius(): number {
    return this.def.radius;
  }

  /** Retourne true si le monstre est vaincu. */
  takeHit(damage: number, from: Vec2, now: number): boolean {
    this.hp = Math.max(0, this.hp - damage);
    this.flashUntil = now + 0.12;
    const dx = this.position.x - from.x;
    const dz = this.position.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    this.push = { x: (dx / d) * KNOCKBACK * 6, z: (dz / d) * KNOCKBACK * 6 };
    this.bar.group.visible = true;
    this.bar.set(this.hp / this.def.hp);
    this.brain.resetWander();
    return this.hp <= 0;
  }

  update(dt: number, senses: Senses, terrain: TerrainQuery, collision: CollisionWorld): Intent {
    const intent = this.brain.update(dt, senses);
    if (intent.attack) this.lungeUntil = senses.now + 0.25;

    const moving = intent.move.x !== 0 || intent.move.z !== 0;
    if (moving || this.hop > 0.02) this.hop = (this.hop + dt * HOP_RATE) % 1;
    const airborne = this.hop > 0.1 && this.hop < 0.9;
    const stride = airborne ? 1.5 : 0.1;
    let dx = intent.move.x * intent.speed * stride * dt + this.push.x * dt;
    let dz = intent.move.z * intent.speed * stride * dt + this.push.z * dt;
    this.push.x *= Math.max(0, 1 - dt * 8);
    this.push.z *= Math.max(0, 1 - dt * 8);

    const p = this.position;
    if (!terrain.isWalkable(p.x + dx, p.z)) dx = 0;
    if (!terrain.isWalkable(p.x, p.z + dz)) dz = 0;
    const r = resolveCircle({ x: p.x + dx, z: p.z + dz }, this.radius, collision);
    if (terrain.isWalkable(r.x, r.z)) {
      p.x = r.x;
      p.z = r.z;
    }
    const ground = terrain.heightAt(p.x, p.z);
    const hopH = moving ? Math.sin(this.hop * Math.PI) * 0.45 : 0;
    p.y = ground + hopH;

    // Orientation vers la direction de déplacement (ou vers le joueur en attaque).
    const face = moving ? intent.move : intent.attack === 'player' ? { x: senses.player.x - p.x, z: senses.player.z - p.z } : null;
    if (face && (face.x !== 0 || face.z !== 0)) {
      this.yaw += angleDelta(this.yaw, Math.atan2(face.x, face.z)) * Math.min(1, dt * 10);
    }
    this.animate(senses.now, moving);
    return intent;
  }

  /** Oriente la barre de vie vers la caméra (appelé à chaque image). */
  faceCamera(camera: THREE.Camera): void {
    if (!this.bar.group.visible) return;
    this.bar.group.quaternion.copy(this.mesh.quaternion).invert().multiply(camera.quaternion);
  }

  private animate(now: number, moving: boolean): void {
    const b = this.model.body;
    let sy = 1;
    let sxz = 1;
    if (moving) {
      // Écrasé au sol, étiré en l'air.
      const h = Math.sin(this.hop * Math.PI);
      sy = 0.8 + h * 0.35;
      sxz = 1.15 - h * 0.2;
    } else {
      const breathe = Math.sin(now * 3 + this.home.x) * 0.04;
      sy = 1 + breathe;
      sxz = 1 - breathe;
    }
    if (now < this.lungeUntil) {
      sy *= 0.85;
      sxz *= 1.2;
    }
    b.scale.set(sxz, sy, sxz);
    const flash = now < this.flashUntil;
    const m = this.model.skin.material as THREE.MeshLambertMaterial;
    m.emissive.set(flash ? '#ffffff' : this.raider ? PALETTE.raider : '#000000');
    m.emissiveIntensity = flash ? 0.8 : this.raider ? 0.45 : 0;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
  }
}
