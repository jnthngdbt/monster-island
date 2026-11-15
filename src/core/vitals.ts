import {
  HUNGER_DRAIN_PER_SEC,
  MAX_HEALTH,
  MAX_HUNGER,
  REGEN_MIN_HUNGER,
  REGEN_PER_SEC,
  STARVE_DAMAGE_PER_SEC,
} from '../data/balance';

/** Santé et faim du joueur. */
export class Vitals {
  health = MAX_HEALTH;
  hunger = MAX_HUNGER;
  invulnerableUntil = -Infinity;

  tick(dt: number): void {
    if (this.isDead) return;
    this.hunger = Math.max(0, this.hunger - HUNGER_DRAIN_PER_SEC * dt);
    if (this.hunger <= 0) this.health = Math.max(0, this.health - STARVE_DAMAGE_PER_SEC * dt);
    else if (this.hunger >= REGEN_MIN_HUNGER) this.heal(REGEN_PER_SEC * dt);
  }

  /** Retourne false si les dégâts sont ignorés (invulnérable ou déjà K.O.). */
  damage(amount: number, now: number): boolean {
    if (this.isDead || now < this.invulnerableUntil) return false;
    this.health = Math.max(0, this.health - amount);
    return true;
  }

  heal(n: number): void {
    this.health = Math.min(MAX_HEALTH, this.health + n);
  }

  eat(hunger: number): void {
    this.hunger = Math.min(MAX_HUNGER, this.hunger + hunger);
  }

  get isDead(): boolean {
    return this.health <= 0;
  }
}
