import type * as THREE from 'three';
import type { CollisionWorld } from '../core/collision';
import { rollLoot, type Target } from '../core/combat';
import type { EventBus, GameEvents } from '../core/events';
import { dist2D, type Vec2 } from '../core/math';
import type { Rng } from '../core/rng';
import type { Terrain } from '../core/terrain';
import type { Cost, ItemId } from '../data/items';
import { MONSTERS, type MonsterKind } from '../data/monsters';
import type { Particles } from '../world/particles';
import { Monster } from './Monster';
import { Pickup } from './Pickup';

const POPULATION_INTERVAL = 30;
const SPAWN_MIN_PLAYER_DIST = 25;

export type MonsterWorld = {
  player: Vec2;
  playerAlive: boolean;
  isNight: boolean;
  now: number;
  collision: CollisionWorld;
  nearestStructure: (from: Vec2) => (Target & { key: string }) | null;
  attackPlayer: (m: Monster, damage: number) => void;
  attackStructure: (key: string, damage: number) => void;
};

/** Tous les monstres de l'île et leur butin au sol. */
export class Monsters {
  readonly list: Monster[] = [];
  readonly pickups: Pickup[] = [];
  private nextId = 0;
  private nextPopulationCheck = 0;

  constructor(
    private scene: THREE.Scene,
    private terrain: Terrain,
    private rng: Rng,
    private particles: Particles,
    private events: EventBus<GameEvents>,
  ) {}

  spawn(kind: MonsterKind, x: number, z: number, raider = false): Monster {
    const m = new Monster(`m${this.nextId++}`, kind, x, z, this.terrain, this.rng, raider);
    this.list.push(m);
    this.scene.add(m.mesh);
    return m;
  }

  get raiderCount(): number {
    return this.list.filter((m) => m.raider).length;
  }

  /** Garde la population de jour, loin du joueur pour qu'on ne les voie pas apparaître. */
  maintainPopulation(now: number, player: Vec2): void {
    if (now < this.nextPopulationCheck) return;
    this.nextPopulationCheck = now + POPULATION_INTERVAL;
    for (const kind of Object.keys(MONSTERS) as MonsterKind[]) {
      const def = MONSTERS[kind];
      let missing = def.dayPopulation - this.list.filter((m) => !m.raider && m.kind === kind).length;
      for (let tries = 0; missing > 0 && tries < 200; tries++) {
        const R = this.terrain.radius;
        const p = { x: this.rng.range(-R, R), z: this.rng.range(-R, R) };
        if (!this.terrain.isWalkable(p.x, p.z)) continue;
        if (!def.biomes.includes(this.terrain.biomeAt(p.x, p.z))) continue;
        if (dist2D(p, player) < SPAWN_MIN_PLAYER_DIST) continue;
        this.spawn(kind, p.x, p.z);
        missing--;
      }
    }
  }

  update(dt: number, w: MonsterWorld): void {
    for (const m of [...this.list]) {
      if (m.fadeAt !== null && w.now >= m.fadeAt) {
        this.poof(m);
        this.remove(m);
        continue;
      }
      const others = this.list
        .filter((o) => o !== m && Math.abs(o.position.x - m.position.x) < 2 && Math.abs(o.position.z - m.position.z) < 2)
        .map((o) => ({ x: o.position.x, z: o.position.z, r: o.radius }));
      const collision: CollisionWorld = { circles: [...w.collision.circles, ...others], boxes: w.collision.boxes };
      const st = m.raider ? w.nearestStructure(m.position) : null;
      const intent = m.update(
        dt,
        {
          self: m.position,
          home: m.home,
          player: w.player,
          playerAlive: w.playerAlive,
          isNight: w.isNight,
          now: w.now,
          raider: m.raider,
          nearestStructure: st,
        },
        this.terrain,
        collision,
      );
      if (intent.attack === 'player') {
        w.attackPlayer(m, m.def.damage * (w.isNight ? m.def.nightDamageMult : 1));
      } else if (intent.attack === 'structure' && intent.structureKey) {
        w.attackStructure(intent.structureKey, m.def.structureDamage);
      }
    }
  }

  targets(): Target[] {
    return this.list.map((m) => ({ id: m.id, x: m.position.x, z: m.position.z, radius: m.radius }));
  }

  get(id: string): Monster | undefined {
    return this.list.find((m) => m.id === id);
  }

  /** Coup du joueur. Retourne true si le monstre est vaincu (butin laissé au sol). */
  hit(id: string, damage: number, from: Vec2, now: number): boolean {
    const m = this.get(id);
    if (!m) return false;
    if (!m.takeHit(damage, from, now)) {
      this.particles.burst({ x: m.position.x, y: m.position.y + 0.6, z: m.position.z }, '#ffffff', 4, 2, { size: 0.7 });
      return false;
    }
    this.poof(m);
    const loot = rollLoot(m.def.loot, this.rng);
    for (const [item, n] of Object.entries(loot) as [ItemId, number][]) {
      const p = new Pickup(item, n, m.position.x, m.position.z, this.terrain, now);
      this.pickups.push(p);
      this.scene.add(p.mesh);
    }
    this.events.emit('monsterDefeated', { kind: m.kind, x: m.position.x, z: m.position.z });
    this.remove(m);
    return true;
  }

  /** Fait avancer le butin ; retourne ce que le joueur ramasse. */
  updatePickups(dt: number, now: number, player: THREE.Vector3): { gained: Cost; at: THREE.Vector3 }[] {
    const out: { gained: Cost; at: THREE.Vector3 }[] = [];
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const r = p.update(dt, now, player, this.terrain);
      if (!r) continue;
      if (r === 'collect') out.push({ gained: { [p.item]: p.amount }, at: p.mesh.position.clone() });
      this.scene.remove(p.mesh);
      this.pickups.splice(i, 1);
    }
    return out;
  }

  faceCamera(camera: THREE.Camera): void {
    for (const m of this.list) m.faceCamera(camera);
  }

  /** Les raiders encore là au lever du jour disparaissent en douceur. */
  scheduleRaiderFade(now: number): void {
    for (const m of this.list) if (m.raider && m.fadeAt === null) m.fadeAt = now + this.rng.range(0.5, 10);
  }

  private poof(m: Monster): void {
    const at = { x: m.position.x, y: m.position.y + 0.5, z: m.position.z };
    const color = m.raider ? '#8a6cff' : '#6fe36f';
    this.particles.burst(at, color, 14, 3.5, { size: 1.4, life: 0.8 });
    this.particles.burst(at, '#ffe066', 6, 2.5, { size: 0.8, life: 0.9, up: 4 });
  }

  private remove(m: Monster): void {
    this.scene.remove(m.mesh);
    const i = this.list.indexOf(m);
    if (i >= 0) this.list.splice(i, 1);
  }
}
