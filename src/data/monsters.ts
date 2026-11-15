import type { LootEntry } from '../core/combat';
import type { Biome } from '../core/terrain';

export type MonsterKind = 'slime';

export type MonsterDef = {
  label: string;
  hp: number;
  radius: number;
  speedDay: number;
  speedNight: number;
  aggroDay: number;
  aggroNight: number;
  attackRange: number;
  attackCooldown: number;
  damage: number;
  nightDamageMult: number;
  leash: number;
  wanderRadius: number;
  loot: LootEntry[];
  dayPopulation: number;
  biomes: Biome[];
};

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  slime: {
    label: 'Slime',
    hp: 30,
    radius: 0.6,
    speedDay: 2.5,
    speedNight: 3.2,
    aggroDay: 7,
    aggroNight: 16,
    attackRange: 1.6,
    attackCooldown: 1.2,
    damage: 8,
    nightDamageMult: 1.25,
    leash: 25,
    wanderRadius: 8,
    loot: [{ item: 'jelly', min: 1, max: 2, chance: 1 }],
    dayPopulation: 10,
    biomes: ['forest', 'clearing'],
  },
};
