import type { Inventory } from '../core/inventory';

export type WeaponId = 'stick' | 'stone_sword';

export type WeaponDef = {
  damage: number;
  cooldown: number;
  range: number;
  arcDeg: number;
  harvestPower: number;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  stick: { damage: 8, cooldown: 0.25, range: 2.2, arcDeg: 90, harvestPower: 1 },
  stone_sword: { damage: 12, cooldown: 0.22, range: 2.6, arcDeg: 100, harvestPower: 2 },
};

/** Arme possédée qui fait le plus de dégâts ; le bâton par défaut. */
export function bestWeapon(inv: Inventory): WeaponId {
  let best: WeaponId = 'stick';
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    if (inv.count(id) > 0 && WEAPONS[id].damage > WEAPONS[best].damage) best = id;
  }
  return best;
}
