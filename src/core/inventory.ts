import type { Cost, ItemId } from '../data/items';

export type { Cost };

/** Sac du joueur : quantités par objet, sans limite pour le MVP. */
export class Inventory {
  private counts = new Map<ItemId, number>();
  onChange?: () => void;

  constructor(initial: Cost = {}) {
    for (const [id, n] of Object.entries(initial) as [ItemId, number][]) {
      if (n > 0) this.counts.set(id, n);
    }
  }

  count(id: ItemId): number {
    return this.counts.get(id) ?? 0;
  }

  add(id: ItemId, n = 1): void {
    if (n <= 0) return;
    this.counts.set(id, this.count(id) + n);
    this.onChange?.();
  }

  addAll(c: Cost): void {
    let changed = false;
    for (const [id, n] of Object.entries(c) as [ItemId, number][]) {
      if (n > 0) {
        this.counts.set(id, this.count(id) + n);
        changed = true;
      }
    }
    if (changed) this.onChange?.();
  }

  has(c: Cost): boolean {
    return (Object.entries(c) as [ItemId, number][]).every(([id, n]) => this.count(id) >= n);
  }

  /** Atomique : retire tout ou rien. */
  remove(c: Cost): boolean {
    if (!this.has(c)) return false;
    for (const [id, n] of Object.entries(c) as [ItemId, number][]) {
      const left = this.count(id) - n;
      if (left > 0) this.counts.set(id, left);
      else this.counts.delete(id);
    }
    this.onChange?.();
    return true;
  }

  missing(c: Cost): Cost {
    const out: Cost = {};
    for (const [id, n] of Object.entries(c) as [ItemId, number][]) {
      const lack = n - this.count(id);
      if (lack > 0) out[id] = lack;
    }
    return out;
  }

  entries(): [ItemId, number][] {
    return [...this.counts.entries()];
  }

  snapshot(): Cost {
    return Object.fromEntries(this.counts) as Cost;
  }
}
