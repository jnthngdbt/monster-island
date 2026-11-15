export type ItemId = 'wood' | 'stone' | 'berry' | 'jelly' | 'stick' | 'stone_sword' | 'jelly_potion';

export type ItemKind = 'resource' | 'food' | 'weapon' | 'consumable';

export const ITEMS: Record<ItemId, { label: string; icon: string; kind: ItemKind }> = {
  wood: { label: 'Bois', icon: '🪵', kind: 'resource' },
  stone: { label: 'Pierre', icon: '🪨', kind: 'resource' },
  berry: { label: 'Baies', icon: '🫐', kind: 'food' },
  jelly: { label: 'Gelée magique', icon: '🟢', kind: 'resource' },
  stick: { label: 'Bâton', icon: '🦯', kind: 'weapon' },
  stone_sword: { label: 'Épée de pierre', icon: '🗡️', kind: 'weapon' },
  jelly_potion: { label: 'Potion de gelée', icon: '🧪', kind: 'consumable' },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export type Cost = Partial<Record<ItemId, number>>;

/** « 2 🪵 + 1 🪨 » */
export function formatCost(c: Cost): string {
  return (Object.entries(c) as [ItemId, number][])
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${n} ${ITEMS[id].icon}`)
    .join(' + ');
}
