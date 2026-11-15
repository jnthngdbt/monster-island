import type { MonsterDef } from '../data/monsters';
import { AttackTimer, type Target } from './combat';
import { dist2D, type Vec2 } from './math';
import type { Rng } from './rng';

export type BrainState = 'idle' | 'wander' | 'chase' | 'attack' | 'siege';

export type Senses = {
  self: Vec2;
  home: Vec2;
  player: Vec2;
  playerAlive: boolean;
  isNight: boolean;
  now: number;
  raider: boolean;
  nearestStructure: (Target & { key: string }) | null;
};

export type Intent = {
  move: Vec2;
  speed: number;
  attack: 'player' | 'structure' | null;
  structureKey?: string;
};

const STILL: Vec2 = { x: 0, z: 0 };

function towards(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.hypot(dx, dz);
  return d < 1e-6 ? STILL : { x: dx / d, z: dz / d };
}

/** Intelligence simple d'un monstre : flâner, poursuivre, attaquer, assiéger. */
export class MonsterBrain {
  state: BrainState = 'idle';
  private timer: AttackTimer;
  private wanderTarget: Vec2 | null = null;
  private idleUntil = 0;

  constructor(
    private def: MonsterDef,
    private rng: Rng,
  ) {
    this.timer = new AttackTimer(def.attackCooldown);
  }

  update(_dt: number, s: Senses): Intent {
    const def = this.def;
    const speed = s.isNight ? def.speedNight : def.speedDay;
    const aggro = s.isNight ? def.aggroNight : def.aggroDay;
    const dPlayer = dist2D(s.self, s.player);

    // 1. Le joueur est proche : poursuite / attaque.
    if (s.playerAlive && dPlayer <= aggro) {
      if (dPlayer <= def.attackRange) {
        this.state = 'attack';
        return { move: STILL, speed, attack: this.timer.tryFire(s.now) ? 'player' : null };
      }
      this.state = 'chase';
      return { move: towards(s.self, s.player), speed, attack: null };
    }

    // 2. Raider de nuit : attaque la base.
    if (s.raider && s.nearestStructure) {
      const st = s.nearestStructure;
      this.state = 'siege';
      if (dist2D(s.self, st) - st.radius <= def.attackRange) {
        const fire = this.timer.tryFire(s.now);
        return { move: STILL, speed, attack: fire ? 'structure' : null, structureKey: st.key };
      }
      return { move: towards(s.self, st), speed, attack: null };
    }

    // 3. Trop loin de chez lui : rentre.
    if (dist2D(s.self, s.home) > def.leash) {
      this.state = 'wander';
      this.wanderTarget = null;
      return { move: towards(s.self, s.home), speed, attack: null };
    }

    // 4. Flâner autour de chez lui, avec des pauses.
    if (s.now < this.idleUntil) {
      this.state = 'idle';
      return { move: STILL, speed, attack: null };
    }
    if (!this.wanderTarget) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(0, def.wanderRadius);
      this.wanderTarget = { x: s.home.x + Math.cos(a) * r, z: s.home.z + Math.sin(a) * r };
    }
    if (dist2D(s.self, this.wanderTarget) < 0.6) {
      this.wanderTarget = null;
      this.idleUntil = s.now + this.rng.range(1, 3);
      this.state = 'idle';
      return { move: STILL, speed, attack: null };
    }
    this.state = 'wander';
    return { move: towards(s.self, this.wanderTarget), speed: speed * 0.6, attack: null };
  }

  /** Le monstre a été repoussé hors de son chemin : choisir une nouvelle destination. */
  resetWander(): void {
    this.wanderTarget = null;
  }
}
