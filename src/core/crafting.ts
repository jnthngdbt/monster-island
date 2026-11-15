import type { Cost } from '../data/items';
import { RECIPES, type RecipeId, type Station } from '../data/recipes';
import type { Inventory } from './inventory';

export type CraftCheck = { ok: true } | { ok: false; reason: 'missing'; missing: Cost } | { ok: false; reason: 'station' };

/** La station est vérifiée avant les ressources. */
export function canCraft(id: RecipeId, inv: Inventory, nearStation: (s: Station) => boolean): CraftCheck {
  const r = RECIPES[id];
  if (r.station && !nearStation(r.station)) return { ok: false, reason: 'station' };
  if (!inv.has(r.cost)) return { ok: false, reason: 'missing', missing: inv.missing(r.cost) };
  return { ok: true };
}

/** Retire le coût et ajoute l'objet fabriqué, seulement si c'est possible. */
export function craft(id: RecipeId, inv: Inventory, nearStation: (s: Station) => boolean): CraftCheck {
  const check = canCraft(id, inv, nearStation);
  if (!check.ok) return check;
  const r = RECIPES[id];
  if (!inv.remove(r.cost)) return { ok: false, reason: 'missing', missing: inv.missing(r.cost) };
  inv.add(r.output, r.amount);
  return check;
}
