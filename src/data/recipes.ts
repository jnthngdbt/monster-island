import type { Cost, ItemId } from './items';

export type RecipeId = 'stone_sword' | 'jelly_potion';
export type Station = 'workbench';

export type Recipe = { output: ItemId; amount: number; cost: Cost; station: Station | null; label: string };

export const RECIPES: Record<RecipeId, Recipe> = {
  stone_sword: {
    output: 'stone_sword',
    amount: 1,
    cost: { wood: 3, stone: 5, jelly: 2 },
    station: 'workbench',
    label: 'Épée de pierre',
  },
  jelly_potion: {
    output: 'jelly_potion',
    amount: 1,
    cost: { jelly: 2, berry: 2 },
    station: null,
    label: 'Potion de gelée',
  },
};

export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];
