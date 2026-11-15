import type { Biome } from '../core/terrain';
import type { ItemId } from './items';

export type HarvestKind = 'tree' | 'rock' | 'bush';

export type HarvestDef = {
  item: ItemId;
  hits: number;
  yieldPerHit: number;
  respawnSec: number;
  radius: number;
  count: number;
  biomes: Biome[];
};

/** count / biomes / radius changent les id des ressources sauvegardées : prévoir une conversion (core/save.ts). */
export const HARVESTABLES: Record<HarvestKind, HarvestDef> = {
  tree: { item: 'wood', hits: 4, yieldPerHit: 1, respawnSec: 90, radius: 0.6, count: 140, biomes: ['forest', 'clearing'] },
  rock: { item: 'stone', hits: 4, yieldPerHit: 1, respawnSec: 120, radius: 0.9, count: 60, biomes: ['rocky', 'forest'] },
  bush: { item: 'berry', hits: 1, yieldPerHit: 3, respawnSec: 60, radius: 0.5, count: 40, biomes: ['forest', 'clearing', 'beach'] },
};
